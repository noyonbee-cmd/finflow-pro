'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { Wallet, WalletLog } = require('../models');
const { queueNotification } = require('./notificationService');

/**
 * @module walletService
 * @description
 * Wallet management service for FinFlow Pro.
 *
 * Provides:
 *  - Manual wallet balance adjustments (ADD / DEDUCT)
 *  - Inter-wallet transfers (atomic)
 *  - Dashboard wallet summary
 *  - Low balance alert detection and notification dispatch
 *
 * All monetary values in PAISA (integer). All multi-document
 * mutations use Mongoose sessions for atomicity.
 *
 * Exports:
 *  - adjustWalletBalance()
 *  - transferBetweenWallets()
 *  - getWalletSummary()
 *  - checkLowBalanceAlerts()
 */

// ═══════════════════════════════════════════════════════════════
// MANUAL ADJUSTMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Manually adjust a wallet's balance (admin action).
 *
 * @param {Object} params
 * @param {string} params.adminId    - Admin document ID.
 * @param {string} params.walletId   - Target wallet document ID.
 * @param {number} params.amount     - Adjustment amount in paisa (positive integer).
 * @param {string} params.type       - 'ADD' or 'DEDUCT'.
 * @param {string} [params.note]     - Reason for adjustment.
 * @param {Object} params.adjustedBy - { id, role } of the person making the adjustment.
 * @returns {Promise<{ wallet: Object, walletLog: Object }>}
 * @throws {AppError} If wallet not found, insufficient balance, or invalid input.
 */
async function adjustWalletBalance({ adminId, walletId, amount, type, note = '', adjustedBy }) {
  const session = await mongoose.startSession();

  try {
    if (!adminId || !walletId || !amount || !type || !adjustedBy) {
      throw new AppError('Missing required fields for wallet adjustment', 400, 'INVALID_INPUT');
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive integer (paisa)', 400, 'INVALID_AMOUNT');
    }
    if (!['ADD', 'DEDUCT'].includes(type)) {
      throw new AppError('Type must be ADD or DEDUCT', 400, 'INVALID_TYPE');
    }

    let wallet;
    let walletLog;

    await session.withTransaction(async () => {
      // ── Fetch and lock wallet ──────────────────────────────
      wallet = await Wallet.findOne({
        _id: new mongoose.Types.ObjectId(walletId),
        adminId: new mongoose.Types.ObjectId(adminId),
        isActive: true,
      }).session(session);

      if (!wallet) {
        throw new AppError('Wallet not found or inactive', 404, 'WALLET_NOT_FOUND');
      }

      // ── Balance check for deductions ────────────────────────
      if (type === 'DEDUCT') {
        const availableBalance = wallet.balance - wallet.lockedBalance;
        if (availableBalance < amount) {
          throw new AppError(
            `Insufficient balance: available ${availableBalance}, required ${amount}`,
            400,
            'INSUFFICIENT_BALANCE'
          );
        }
      }

      // ── Update wallet balance ──────────────────────────────
      const incAmount = type === 'ADD' ? amount : -amount;
      const statsUpdate = type === 'ADD'
        ? { 'stats.totalIn': amount }
        : { 'stats.totalOut': amount };

      wallet = await Wallet.findByIdAndUpdate(
        walletId,
        {
          $inc: {
            balance: incAmount,
            ...statsUpdate,
          },
          $set: { 'stats.lastTransactionAt': new Date() },
        },
        { new: true, session }
      );

      // ── Create WalletLog ────────────────────────────────────
      walletLog = await WalletLog.create(
        [
          {
            adminId,
            walletId,
            type: 'ADJUSTMENT',
            amount: type === 'ADD' ? amount : -amount,
            balanceAfter: wallet.balance,
            note: note || `Manual ${type.toLowerCase()} adjustment`,
            createdBy: adjustedBy,
          },
        ],
        { session }
      );
      walletLog = walletLog[0];
    });

    logger.info('Wallet balance adjusted', {
      walletId,
      adminId,
      type,
      amount,
      newBalance: wallet.balance,
    });

    return { wallet, walletLog };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Wallet adjustment failed', {
      walletId,
      adminId,
      type,
      amount,
      error: err.message,
    });
    throw err;
  } finally {
    await session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════════
// INTER-WALLET TRANSFER
// ═══════════════════════════════════════════════════════════════

/**
 * Transfer funds between two wallets atomically.
 *
 * Creates two WalletLog entries: TRANSFER_OUT on source, TRANSFER_IN on destination.
 *
 * @param {Object} params
 * @param {string} params.adminId       - Admin document ID.
 * @param {string} params.fromWalletId  - Source wallet ID.
 * @param {string} params.toWalletId    - Destination wallet ID.
 * @param {number} params.amount        - Transfer amount in paisa.
 * @param {string} [params.note]        - Transfer note.
 * @param {Object} params.createdBy     - { id, role } of the person initiating.
 * @returns {Promise<{
 *   fromWallet: Object,
 *   toWallet: Object,
 *   fromLog: Object,
 *   toLog: Object
 * }>}
 * @throws {AppError} If wallets not found, same wallet, or insufficient balance.
 */
async function transferBetweenWallets({ adminId, fromWalletId, toWalletId, amount, note = '', createdBy }) {
  const session = await mongoose.startSession();

  try {
    if (!adminId || !fromWalletId || !toWalletId || !amount || !createdBy) {
      throw new AppError('Missing required fields for wallet transfer', 400, 'INVALID_INPUT');
    }
    if (fromWalletId === toWalletId) {
      throw new AppError('Cannot transfer to the same wallet', 400, 'SAME_WALLET');
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive integer (paisa)', 400, 'INVALID_AMOUNT');
    }

    let fromWallet, toWallet, fromLog, toLog;

    await session.withTransaction(async () => {
      // ── Fetch both wallets ──────────────────────────────────
      [fromWallet, toWallet] = await Promise.all([
        Wallet.findOne({
          _id: new mongoose.Types.ObjectId(fromWalletId),
          adminId: new mongoose.Types.ObjectId(adminId),
          isActive: true,
        }).session(session),
        Wallet.findOne({
          _id: new mongoose.Types.ObjectId(toWalletId),
          adminId: new mongoose.Types.ObjectId(adminId),
          isActive: true,
        }).session(session),
      ]);

      if (!fromWallet) {
        throw new AppError('Source wallet not found or inactive', 404, 'SOURCE_WALLET_NOT_FOUND');
      }
      if (!toWallet) {
        throw new AppError('Destination wallet not found or inactive', 404, 'DEST_WALLET_NOT_FOUND');
      }

      // ── Balance check ──────────────────────────────────────
      const availableBalance = fromWallet.balance - fromWallet.lockedBalance;
      if (availableBalance < amount) {
        throw new AppError(
          `Insufficient balance in source wallet: available ${availableBalance}, required ${amount}`,
          400,
          'INSUFFICIENT_BALANCE'
        );
      }

      // ── Deduct from source ──────────────────────────────────
      fromWallet = await Wallet.findByIdAndUpdate(
        fromWalletId,
        {
          $inc: {
            balance: -amount,
            'stats.totalOut': amount,
          },
          $set: { 'stats.lastTransactionAt': new Date() },
        },
        { new: true, session }
      );

      // ── Credit to destination ──────────────────────────────
      toWallet = await Wallet.findByIdAndUpdate(
        toWalletId,
        {
          $inc: {
            balance: amount,
            'stats.totalIn': amount,
          },
          $set: { 'stats.lastTransactionAt': new Date() },
        },
        { new: true, session }
      );

      // ── Create WalletLogs ──────────────────────────────────
      const transferNote = note || `Transfer from ${fromWallet.name} to ${toWallet.name}`;

      const logs = await WalletLog.create(
        [
          {
            adminId,
            walletId: fromWalletId,
            type: 'TRANSFER_OUT',
            amount: -amount,
            balanceAfter: fromWallet.balance,
            note: transferNote,
            createdBy,
          },
          {
            adminId,
            walletId: toWalletId,
            type: 'TRANSFER_IN',
            amount,
            balanceAfter: toWallet.balance,
            note: transferNote,
            createdBy,
          },
        ],
        { session }
      );

      fromLog = logs[0];
      toLog = logs[1];
    });

    logger.info('Wallet transfer completed', {
      adminId,
      fromWalletId,
      toWalletId,
      amount,
      fromBalance: fromWallet.balance,
      toBalance: toWallet.balance,
    });

    return { fromWallet, toWallet, fromLog, toLog };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Wallet transfer failed', {
      adminId,
      fromWalletId,
      toWalletId,
      amount,
      error: err.message,
    });
    throw err;
  } finally {
    await session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════════
// WALLET SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Get a complete wallet summary for the admin dashboard.
 *
 * @param {Object} params
 * @param {string} params.adminId - Admin document ID.
 * @returns {Promise<{
 *   wallets: Object[],
 *   totalBalance: number,
 *   totalAvailable: number,
 *   totalLocked: number,
 *   walletCount: number
 * }>}
 */
async function getWalletSummary({ adminId }) {
  try {
    if (!adminId) {
      throw new AppError('adminId is required', 400, 'INVALID_INPUT');
    }

    const wallets = await Wallet.find({
      adminId: new mongoose.Types.ObjectId(adminId),
      isActive: true,
    })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean({ virtuals: true });

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const totalLocked = wallets.reduce((sum, w) => sum + w.lockedBalance, 0);
    const totalAvailable = totalBalance - totalLocked;

    return {
      wallets,
      totalBalance,
      totalAvailable,
      totalLocked,
      walletCount: wallets.length,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Failed to get wallet summary', {
      adminId,
      error: err.message,
    });
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// LOW BALANCE ALERTS
// ═══════════════════════════════════════════════════════════════

/**
 * Check all active wallets for low balance and dispatch notifications.
 *
 * For each wallet where `balance < lowBalanceThreshold`, a BALANCE_ALERT
 * notification is queued for the admin.
 *
 * @param {Object} params
 * @param {string} params.adminId - Admin document ID.
 * @returns {Promise<{
 *   alertedWallets: Array<{ walletId: string, walletName: string, balance: number, threshold: number }>,
 *   totalChecked: number
 * }>}
 */
async function checkLowBalanceAlerts({ adminId }) {
  try {
    if (!adminId) {
      throw new AppError('adminId is required', 400, 'INVALID_INPUT');
    }

    const wallets = await Wallet.find({
      adminId: new mongoose.Types.ObjectId(adminId),
      isActive: true,
    }).lean({ virtuals: true });

    const alertedWallets = [];

    for (const wallet of wallets) {
      if (wallet.balance < wallet.lowBalanceThreshold) {
        alertedWallets.push({
          walletId: wallet._id.toString(),
          walletName: wallet.name,
          balance: wallet.balance,
          threshold: wallet.lowBalanceThreshold,
        });

        // Dispatch notification — fire and forget
        queueNotification({
          adminId,
          recipientId: adminId,
          recipientType: 'ADMIN',
          type: 'BALANCE_ALERT',
          title: `Low Balance: ${wallet.name}`,
          body: `${wallet.name} balance is ৳${(wallet.balance / 100).toFixed(2)}, below threshold of ৳${(wallet.lowBalanceThreshold / 100).toFixed(2)}.`,
          data: {
            walletId: wallet._id.toString(),
            walletType: wallet.type,
            balance: wallet.balance,
            threshold: wallet.lowBalanceThreshold,
          },
          channels: ['IN_APP', 'TELEGRAM'],
        }).catch((err) => {
          logger.error('Failed to send low balance alert', {
            walletId: wallet._id.toString(),
            error: err.message,
          });
        });
      }
    }

    if (alertedWallets.length > 0) {
      logger.warn('Low balance alerts triggered', {
        adminId,
        alertCount: alertedWallets.length,
        wallets: alertedWallets.map((w) => w.walletName),
      });
    }

    return {
      alertedWallets,
      totalChecked: wallets.length,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Low balance check failed', {
      adminId,
      error: err.message,
    });
    throw err;
  }
}

module.exports = {
  adjustWalletBalance,
  transferBetweenWallets,
  getWalletSummary,
  checkLowBalanceAlerts,
};
