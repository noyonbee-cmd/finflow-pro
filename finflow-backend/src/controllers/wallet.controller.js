'use strict';

const mongoose = require('mongoose');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { Wallet, WalletLog } = require('../models');
const walletService = require('../services/walletService');

/**
 * @module wallet.controller
 * @description
 * Wallet API controllers for FinFlow Pro.
 * All monetary values stored as integers in paisa (BDT × 100).
 */

function bdtToPaisa(bdt) {
  return Math.round(Number(bdt) * 100);
}

function paisaToBdt(paisa) {
  return (paisa / 100).toFixed(2);
}

function resolveAdminId(user) {
  return user.role === 'ADMIN' ? user.id : user.adminId;
}

function enrichWallet(w) {
  const obj = w.toJSON ? w.toJSON() : { ...w };
  obj.balance_bdt = paisaToBdt(obj.balance || 0);
  obj.lockedBalance_bdt = paisaToBdt(obj.lockedBalance || 0);
  obj.availableBalance_bdt = paisaToBdt(obj.availableBalance || 0);
  obj.lowBalanceThreshold_bdt = paisaToBdt(obj.lowBalanceThreshold || 0);
  return obj;
}

// ═══════════════════════════════════════════════════════════════
// GET ALL WALLETS
// ═══════════════════════════════════════════════════════════════

async function getWallets(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);

    const wallets = await Wallet.find({
      adminId: new mongoose.Types.ObjectId(adminId),
    })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean({ virtuals: true });

    const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
    const totalLocked = wallets.reduce((s, w) => s + w.lockedBalance, 0);
    const totalAvailable = totalBalance - totalLocked;

    const enriched = wallets.map(enrichWallet);

    return ApiResponse.success(res, {
      wallets: enriched,
      summary: {
        totalBalance,
        totalBalance_bdt: paisaToBdt(totalBalance),
        totalAvailable,
        totalAvailable_bdt: paisaToBdt(totalAvailable),
        totalLocked,
        totalLocked_bdt: paisaToBdt(totalLocked),
        walletCount: wallets.length,
      },
    }, 'Wallets retrieved');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET SINGLE WALLET
// ═══════════════════════════════════════════════════════════════

async function getWallet(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const wallet = await Wallet.findOne({
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    }).lean({ virtuals: true });

    if (!wallet) {
      return ApiResponse.error(res, 'Wallet not found', 404, 'WALLET_NOT_FOUND');
    }

    // Fetch last 10 ledger entries
    const recentLedger = await WalletLog.find({
      walletId: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('transactionId', 'refId type')
      .lean();

    const enrichedLedger = recentLedger.map((entry) => ({
      ...entry,
      amount_bdt: paisaToBdt(entry.amount),
      balanceAfter_bdt: paisaToBdt(entry.balanceAfter),
    }));

    return ApiResponse.success(res, {
      ...enrichWallet(wallet),
      recentLedger: enrichedLedger,
    }, 'Wallet retrieved');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET WALLET LEDGER (paginated, cursor-based)
// ═══════════════════════════════════════════════════════════════

async function getWalletLedger(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { type, dateFrom, dateTo, cursor, limit: rawLimit = 30 } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 30, 1), 100);

    // Verify wallet ownership
    const wallet = await Wallet.findOne({
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    }).lean();

    if (!wallet) {
      return ApiResponse.error(res, 'Wallet not found', 404, 'WALLET_NOT_FOUND');
    }

    const query = {
      walletId: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    };

    if (type) query.type = type;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const entries = await WalletLog.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('transactionId', 'refId type amount')
      .lean();

    const hasMore = entries.length > limit;
    const results = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    const enriched = results.map((entry) => ({
      ...entry,
      amount_bdt: paisaToBdt(entry.amount),
      balanceAfter_bdt: paisaToBdt(entry.balanceAfter),
    }));

    return res.status(200).json({
      success: true,
      message: 'Wallet ledger retrieved',
      data: enriched,
      wallet: { id: wallet._id, name: wallet.name, type: wallet.type },
      pagination: { limit, hasMore, nextCursor },
    });
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// ADJUST WALLET BALANCE (Admin only)
// ═══════════════════════════════════════════════════════════════

async function adjustWallet(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { amount: amountBdt, type, note } = req.body;

    if (!amountBdt || amountBdt <= 0) {
      return ApiResponse.error(res, 'Amount must be a positive number', 400, 'INVALID_AMOUNT');
    }
    if (!['ADD', 'DEDUCT'].includes(type)) {
      return ApiResponse.error(res, 'Type must be ADD or DEDUCT', 400, 'INVALID_TYPE');
    }

    const amountPaisa = bdtToPaisa(amountBdt);

    const result = await walletService.adjustWalletBalance({
      adminId,
      walletId: id,
      amount: amountPaisa,
      type,
      note: note || '',
      adjustedBy: {
        id: new mongoose.Types.ObjectId(req.user.id),
        role: req.user.role,
      },
    });

    return ApiResponse.success(res, {
      wallet: enrichWallet(result.wallet),
      walletLog: {
        ...result.walletLog.toJSON(),
        amount_bdt: paisaToBdt(result.walletLog.amount),
        balanceAfter_bdt: paisaToBdt(result.walletLog.balanceAfter),
      },
    }, `Wallet ${type === 'ADD' ? 'credited' : 'debited'} successfully`);
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER BETWEEN WALLETS (Admin only)
// ═══════════════════════════════════════════════════════════════

async function transferBetweenWallets(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { fromWalletId, toWalletId, amount: amountBdt, note } = req.body;

    if (!fromWalletId || !toWalletId) {
      return ApiResponse.error(res, 'fromWalletId and toWalletId are required', 400, 'MISSING_FIELDS');
    }
    if (!amountBdt || amountBdt <= 0) {
      return ApiResponse.error(res, 'Amount must be a positive number', 400, 'INVALID_AMOUNT');
    }

    const amountPaisa = bdtToPaisa(amountBdt);

    const result = await walletService.transferBetweenWallets({
      adminId,
      fromWalletId,
      toWalletId,
      amount: amountPaisa,
      note: note || '',
      createdBy: {
        id: new mongoose.Types.ObjectId(req.user.id),
        role: req.user.role,
      },
    });

    return ApiResponse.success(res, {
      fromWallet: enrichWallet(result.fromWallet),
      toWallet: enrichWallet(result.toWallet),
      amount: amountPaisa,
      amount_bdt: paisaToBdt(amountPaisa),
    }, 'Transfer completed successfully');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// UPDATE WALLET SETTINGS (Admin only)
// ═══════════════════════════════════════════════════════════════

async function updateWalletSettings(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { name, lowBalanceThreshold, displayOrder, isActive } = req.body;

    const wallet = await Wallet.findOne({
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    });

    if (!wallet) {
      return ApiResponse.error(res, 'Wallet not found', 404, 'WALLET_NOT_FOUND');
    }

    if (name !== undefined) wallet.name = name;
    if (lowBalanceThreshold !== undefined) wallet.lowBalanceThreshold = bdtToPaisa(lowBalanceThreshold);
    if (displayOrder !== undefined) wallet.displayOrder = displayOrder;
    if (isActive !== undefined) wallet.isActive = isActive;

    await wallet.save();

    logger.info('Wallet settings updated', { walletId: id, adminId });

    return ApiResponse.success(res, enrichWallet(wallet), 'Wallet settings updated');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWallets,
  getWallet,
  getWalletLedger,
  adjustWallet,
  transferBetweenWallets,
  updateWalletSettings,
};
