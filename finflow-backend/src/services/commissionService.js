'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { Agent, CommissionLedger, Wallet, WalletLog } = require('../models');
const { queueNotification } = require('./notificationService');

/**
 * @module commissionService
 * @description
 * Commission management service for FinFlow Pro.
 *
 * Handles:
 *  - Settling agent commission (admin pays agent from a wallet)
 *  - Agent payout requests (creates pending request, notifies admin)
 *  - Commission summary for a time period
 *
 * All monetary values in PAISA (integer). All multi-document
 * mutations use Mongoose sessions for atomicity.
 *
 * Exports:
 *  - settleCommission()
 *  - requestCommissionPayout()
 *  - getAgentCommissionSummary()
 */

// ═══════════════════════════════════════════════════════════════
// SETTLE COMMISSION
// ═══════════════════════════════════════════════════════════════

/**
 * Settle (pay out) agent commission from an admin wallet.
 *
 * Steps:
 *  1. Verify agent has sufficient pending commission (>= amount)
 *  2. Check wallet has sufficient available balance
 *  3. Atomic transaction:
 *     a. Deduct from admin wallet
 *     b. Create WalletLog (DEBIT)
 *     c. Create CommissionLedger entry (SETTLED)
 *     d. Update Agent.wallet.balance -= amount
 *     e. Update Agent.wallet.totalSettled += amount
 *  4. Send notification to agent
 *
 * @param {Object} params
 * @param {string} params.adminId          - Admin document ID.
 * @param {string} params.agentId          - Agent document ID.
 * @param {number} params.amount           - Settlement amount in paisa.
 * @param {string} params.payFromWalletId  - Wallet to pay from.
 * @param {string} [params.note]           - Settlement note.
 * @param {Object} params.settledBy        - { id, role } of the admin settling.
 * @returns {Promise<{
 *   commissionLedger: Object,
 *   walletLog: Object,
 *   agent: Object,
 *   wallet: Object
 * }>}
 * @throws {AppError} If insufficient commission, insufficient balance, or not found.
 */
async function settleCommission({ adminId, agentId, amount, payFromWalletId, note = '', settledBy }) {
  const session = await mongoose.startSession();

  try {
    if (!adminId || !agentId || !amount || !payFromWalletId || !settledBy) {
      throw new AppError('Missing required fields for commission settlement', 400, 'INVALID_INPUT');
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive integer (paisa)', 400, 'INVALID_AMOUNT');
    }

    let agent, wallet, commissionLedger, walletLog;

    await session.withTransaction(async () => {
      // ── Step 1: Verify agent's pending commission ───────────
      agent = await Agent.findOne({
        _id: new mongoose.Types.ObjectId(agentId),
        adminId: new mongoose.Types.ObjectId(adminId),
        status: 'ACTIVE',
      }).session(session);

      if (!agent) {
        throw new AppError('Agent not found or inactive', 404, 'AGENT_NOT_FOUND');
      }

      const pendingCommission = agent.wallet.balance;
      if (pendingCommission < amount) {
        throw new AppError(
          `Insufficient pending commission: available ${pendingCommission}, requested ${amount}`,
          400,
          'INSUFFICIENT_COMMISSION'
        );
      }

      // ── Step 2: Check wallet balance ────────────────────────
      wallet = await Wallet.findOne({
        _id: new mongoose.Types.ObjectId(payFromWalletId),
        adminId: new mongoose.Types.ObjectId(adminId),
        isActive: true,
      }).session(session);

      if (!wallet) {
        throw new AppError('Payment wallet not found or inactive', 404, 'WALLET_NOT_FOUND');
      }

      const availableBalance = wallet.balance - wallet.lockedBalance;
      if (availableBalance < amount) {
        throw new AppError(
          `Insufficient wallet balance: available ${availableBalance}, required ${amount}`,
          400,
          'INSUFFICIENT_BALANCE'
        );
      }

      // ── Step 3a: Deduct from admin wallet ───────────────────
      wallet = await Wallet.findByIdAndUpdate(
        payFromWalletId,
        {
          $inc: {
            balance: -amount,
            'stats.totalOut': amount,
          },
          $set: { 'stats.lastTransactionAt': new Date() },
        },
        { new: true, session }
      );

      // ── Step 3b: Create WalletLog ──────────────────────────
      const logs = await WalletLog.create(
        [
          {
            adminId,
            walletId: payFromWalletId,
            type: 'DEBIT',
            amount: -amount,
            balanceAfter: wallet.balance,
            note: note || `Commission settlement for agent: ${agent.name}`,
            createdBy: settledBy,
          },
        ],
        { session }
      );
      walletLog = logs[0];

      // ── Step 3c: Create CommissionLedger entry ──────────────
      const newAgentBalance = agent.wallet.balance - amount;
      const ledgerEntries = await CommissionLedger.create(
        [
          {
            adminId,
            agentId,
            type: 'SETTLED',
            amount: -amount,
            balanceAfter: newAgentBalance,
            note: note || 'Commission settlement',
            settledBy: settledBy.id,
            createdBy: settledBy,
          },
        ],
        { session }
      );
      commissionLedger = ledgerEntries[0];

      // ── Step 3d-e: Update Agent wallet ──────────────────────
      agent = await Agent.findByIdAndUpdate(
        agentId,
        {
          $inc: {
            'wallet.balance': -amount,
            'wallet.totalSettled': amount,
          },
        },
        { new: true, session }
      );
    });

    // ── Step 4: Send notification (fire-and-forget) ───────────
    queueNotification({
      adminId,
      recipientId: agentId,
      recipientType: 'AGENT',
      type: 'COMMISSION_SETTLED',
      title: 'Commission Settled',
      body: `৳${(amount / 100).toFixed(2)} commission has been settled to your account.`,
      data: {
        amount,
        walletName: wallet.name,
        ledgerId: commissionLedger._id.toString(),
      },
      channels: ['IN_APP', 'TELEGRAM'],
    }).catch((err) => {
      logger.error('Failed to send commission settlement notification', {
        agentId,
        error: err.message,
      });
    });

    logger.info('Commission settled', {
      adminId,
      agentId,
      amount,
      walletId: payFromWalletId,
      agentBalanceAfter: agent.wallet.balance,
    });

    return { commissionLedger, walletLog, agent, wallet };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Commission settlement failed', {
      adminId,
      agentId,
      amount,
      error: err.message,
    });
    throw err;
  } finally {
    await session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT PAYOUT REQUEST
// ═══════════════════════════════════════════════════════════════

/**
 * Agent requests a commission payout.
 *
 * Creates a PENDING CommissionLedger entry (type: HELD) and notifies
 * the admin for approval. The actual payout is processed via settleCommission()
 * after admin approval.
 *
 * @param {Object} params
 * @param {string} params.agentId       - Agent document ID.
 * @param {number} params.amount        - Requested payout amount in paisa.
 * @param {string} params.payoutMethod  - Payout method (e.g. 'BKASH', 'BANK').
 * @param {Object} [params.payoutDetails] - Method-specific details (account number, etc.).
 * @returns {Promise<{ payoutRequest: Object, agent: Object }>}
 * @throws {AppError} If agent not found or insufficient commission.
 */
async function requestCommissionPayout({ agentId, amount, payoutMethod, payoutDetails = {} }) {
  const session = await mongoose.startSession();

  try {
    if (!agentId || !amount || !payoutMethod) {
      throw new AppError('agentId, amount, and payoutMethod are required', 400, 'INVALID_INPUT');
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive integer (paisa)', 400, 'INVALID_AMOUNT');
    }

    let agent, payoutRequest;

    await session.withTransaction(async () => {
      // ── Fetch agent ─────────────────────────────────────────
      agent = await Agent.findOne({
        _id: new mongoose.Types.ObjectId(agentId),
        status: 'ACTIVE',
      }).session(session);

      if (!agent) {
        throw new AppError('Agent not found or inactive', 404, 'AGENT_NOT_FOUND');
      }

      // ── Check pending commission ────────────────────────────
      if (agent.wallet.balance < amount) {
        throw new AppError(
          `Insufficient pending commission: available ${agent.wallet.balance}, requested ${amount}`,
          400,
          'INSUFFICIENT_COMMISSION'
        );
      }

      // ── Create HELD ledger entry ────────────────────────────
      const entries = await CommissionLedger.create(
        [
          {
            adminId: agent.adminId,
            agentId,
            type: 'HELD',
            amount: -amount,
            balanceAfter: agent.wallet.balance, // Balance unchanged (just held)
            note: `Payout request via ${payoutMethod}: ৳${(amount / 100).toFixed(2)}`,
            createdBy: {
              id: new mongoose.Types.ObjectId(agentId),
              role: 'AGENT',
            },
          },
        ],
        { session }
      );
      payoutRequest = entries[0];
    });

    // ── Notify admin of payout request ────────────────────────
    queueNotification({
      adminId: agent.adminId.toString(),
      recipientId: agent.adminId.toString(),
      recipientType: 'ADMIN',
      type: 'COMMISSION_REQUEST',
      title: `Payout Request: ${agent.name}`,
      body: `Agent ${agent.name} requests ৳${(amount / 100).toFixed(2)} via ${payoutMethod}.`,
      data: {
        agentId,
        agentName: agent.name,
        amount,
        payoutMethod,
        payoutDetails,
        ledgerId: payoutRequest._id.toString(),
      },
      channels: ['IN_APP', 'TELEGRAM'],
    }).catch((err) => {
      logger.error('Failed to send payout request notification', {
        agentId,
        error: err.message,
      });
    });

    logger.info('Commission payout requested', {
      agentId,
      adminId: agent.adminId.toString(),
      amount,
      payoutMethod,
    });

    return { payoutRequest, agent };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Commission payout request failed', {
      agentId,
      amount,
      error: err.message,
    });
    throw err;
  } finally {
    await session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════════
// COMMISSION SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Get a comprehensive commission summary for an agent over a date range.
 *
 * @param {Object} params
 * @param {string} params.agentId   - Agent document ID.
 * @param {Date}   params.dateFrom  - Start date (inclusive).
 * @param {Date}   params.dateTo    - End date (inclusive).
 * @returns {Promise<{
 *   totalEarned: number,
 *   totalSettled: number,
 *   totalHeld: number,
 *   totalReversed: number,
 *   pending: number,
 *   transactionCount: number,
 *   ledgerEntries: Object[]
 * }>}
 */
async function getAgentCommissionSummary({ agentId, dateFrom, dateTo }) {
  try {
    if (!agentId) {
      throw new AppError('agentId is required', 400, 'INVALID_INPUT');
    }

    // Build date filter
    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }

    const query = {
      agentId: new mongoose.Types.ObjectId(agentId),
    };

    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }

    // ── Fetch ledger entries ──────────────────────────────────
    const ledgerEntries = await CommissionLedger.find(query)
      .sort({ createdAt: -1 })
      .populate('transactionId', 'refId amount type')
      .lean();

    // ── Aggregate totals ─────────────────────────────────────
    let totalEarned = 0;
    let totalSettled = 0;
    let totalHeld = 0;
    let totalReversed = 0;
    let transactionCount = 0;

    for (const entry of ledgerEntries) {
      const absAmount = Math.abs(entry.amount);

      switch (entry.type) {
        case 'EARNED':
          totalEarned += absAmount;
          transactionCount += 1;
          break;
        case 'SETTLED':
          totalSettled += absAmount;
          break;
        case 'HELD':
          totalHeld += absAmount;
          break;
        case 'REVERSED':
          totalReversed += absAmount;
          break;
        case 'ADJUSTED':
          // Adjustments can be positive or negative
          if (entry.amount > 0) {
            totalEarned += entry.amount;
          } else {
            totalReversed += absAmount;
          }
          break;
        default:
          break;
      }
    }

    const pending = totalEarned - totalSettled - totalReversed;

    return {
      totalEarned,
      totalSettled,
      totalHeld,
      totalReversed,
      pending: Math.max(0, pending),
      transactionCount,
      ledgerEntries,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Commission summary retrieval failed', {
      agentId,
      error: err.message,
    });
    throw err;
  }
}

module.exports = {
  settleCommission,
  requestCommissionPayout,
  getAgentCommissionSummary,
};
