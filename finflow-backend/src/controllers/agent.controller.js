'use strict';

const mongoose = require('mongoose');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { Agent, CommissionLedger } = require('../models');
const commissionService = require('../services/commissionService');

/**
 * @module agent.controller
 * @description Agent API controllers for FinFlow Pro.
 */

function paisaToBdt(paisa) { return (paisa / 100).toFixed(2); }
function bdtToPaisa(bdt) { return Math.round(Number(bdt) * 100); }
function resolveAdminId(user) { return user.role === 'ADMIN' ? user.id : user.adminId; }

function enrichAgent(a) {
  const obj = a.toJSON ? a.toJSON() : { ...a };
  if (obj.wallet) {
    obj.wallet.balance_bdt = paisaToBdt(obj.wallet.balance || 0);
    obj.wallet.totalEarned_bdt = paisaToBdt(obj.wallet.totalEarned || 0);
    obj.wallet.totalSettled_bdt = paisaToBdt(obj.wallet.totalSettled || 0);
  }
  if (obj.stats) {
    obj.stats.totalVolume_bdt = paisaToBdt(obj.stats.totalVolume || 0);
    obj.stats.currentMonthCommission_bdt = paisaToBdt(obj.stats.currentMonthCommission || 0);
  }
  return obj;
}

// ═══════════════════════════════════════════════════════════════
// GET ALL AGENTS (Admin only)
// ═══════════════════════════════════════════════════════════════

async function getAgents(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { status, cursor, limit: rawLimit = 20 } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 100);

    const query = { adminId: new mongoose.Types.ObjectId(adminId) };
    if (status) query.status = status;
    if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) };

    const agents = await Agent.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = agents.length > limit;
    const results = hasMore ? agents.slice(0, limit) : agents;
    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    return res.status(200).json({
      success: true,
      message: 'Agents retrieved',
      data: results.map(enrichAgent),
      pagination: { limit, hasMore, nextCursor },
    });
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET SINGLE AGENT (Admin only)
// ═══════════════════════════════════════════════════════════════

async function getAgent(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const agent = await Agent.findOne({
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    }).lean();

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    // Commission summary (all time)
    const summary = await commissionService.getAgentCommissionSummary({
      agentId: id,
    });

    return ApiResponse.success(res, {
      ...enrichAgent(agent),
      commissionSummary: {
        totalEarned: summary.totalEarned,
        totalEarned_bdt: paisaToBdt(summary.totalEarned),
        totalSettled: summary.totalSettled,
        totalSettled_bdt: paisaToBdt(summary.totalSettled),
        pending: summary.pending,
        pending_bdt: paisaToBdt(summary.pending),
        transactionCount: summary.transactionCount,
      },
    }, 'Agent retrieved');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// UPDATE AGENT (Admin only)
// ═══════════════════════════════════════════════════════════════

async function updateAgent(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { name, phone, email, commissionPercent, status } = req.body;

    const agent = await Agent.findOne({
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    if (name !== undefined) agent.name = name;
    if (phone !== undefined) agent.phone = phone;
    if (email !== undefined) agent.email = email;
    if (commissionPercent !== undefined) agent.commissionPercent = commissionPercent;
    if (status !== undefined) agent.status = status;

    await agent.save();

    logger.info('Agent updated', { agentId: id, adminId });

    return ApiResponse.success(res, enrichAgent(agent), 'Agent updated');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET AGENT COMMISSION
// ═══════════════════════════════════════════════════════════════

async function getAgentCommission(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { dateFrom, dateTo } = req.query;

    // Agent can only view own commission
    if (req.user.role === 'AGENT' && req.user.id !== id) {
      return ApiResponse.error(res, 'Access denied', 403, 'ACCESS_DENIED');
    }

    // Verify agent belongs to admin
    const agent = await Agent.findOne({
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    }).lean();

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    const summary = await commissionService.getAgentCommissionSummary({
      agentId: id,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    });

    // Enrich ledger entries
    const enrichedEntries = summary.ledgerEntries.map((entry) => ({
      ...entry,
      amount_bdt: paisaToBdt(Math.abs(entry.amount)),
      balanceAfter_bdt: paisaToBdt(entry.balanceAfter),
    }));

    return ApiResponse.success(res, {
      agent: { id: agent._id, name: agent.name },
      summary: {
        totalEarned: summary.totalEarned,
        totalEarned_bdt: paisaToBdt(summary.totalEarned),
        totalSettled: summary.totalSettled,
        totalSettled_bdt: paisaToBdt(summary.totalSettled),
        totalHeld: summary.totalHeld,
        totalHeld_bdt: paisaToBdt(summary.totalHeld),
        totalReversed: summary.totalReversed,
        totalReversed_bdt: paisaToBdt(summary.totalReversed),
        pending: summary.pending,
        pending_bdt: paisaToBdt(summary.pending),
        transactionCount: summary.transactionCount,
      },
      ledgerEntries: enrichedEntries,
    }, 'Commission data retrieved');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// SETTLE AGENT COMMISSION (Admin only)
// ═══════════════════════════════════════════════════════════════

async function settleAgentCommission(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { amount: amountBdt, payFromWalletId, note } = req.body;

    if (!amountBdt || amountBdt <= 0) {
      return ApiResponse.error(res, 'Amount must be positive', 400, 'INVALID_AMOUNT');
    }
    if (!payFromWalletId) {
      return ApiResponse.error(res, 'payFromWalletId is required', 400, 'MISSING_WALLET');
    }

    const amountPaisa = bdtToPaisa(amountBdt);

    const result = await commissionService.settleCommission({
      adminId,
      agentId: id,
      amount: amountPaisa,
      payFromWalletId,
      note: note || '',
      settledBy: {
        id: new mongoose.Types.ObjectId(req.user.id),
        role: req.user.role,
      },
    });

    return ApiResponse.success(res, {
      agent: enrichAgent(result.agent),
      amount: amountPaisa,
      amount_bdt: paisaToBdt(amountPaisa),
      ledgerEntry: result.commissionLedger,
    }, 'Commission settled successfully');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// REQUEST COMMISSION PAYOUT (Agent only)
// ═══════════════════════════════════════════════════════════════

async function requestCommissionPayout(req, res, next) {
  try {
    const { amount: amountBdt, payoutMethod, payoutDetails } = req.body;

    if (!amountBdt || amountBdt <= 0) {
      return ApiResponse.error(res, 'Amount must be positive', 400, 'INVALID_AMOUNT');
    }
    if (!payoutMethod) {
      return ApiResponse.error(res, 'payoutMethod is required', 400, 'MISSING_METHOD');
    }

    const amountPaisa = bdtToPaisa(amountBdt);

    const result = await commissionService.requestCommissionPayout({
      agentId: req.user.id,
      amount: amountPaisa,
      payoutMethod,
      payoutDetails: payoutDetails || {},
    });

    return ApiResponse.success(res, {
      payoutRequest: result.payoutRequest,
      amount: amountPaisa,
      amount_bdt: paisaToBdt(amountPaisa),
      agentBalance: result.agent.wallet.balance,
      agentBalance_bdt: paisaToBdt(result.agent.wallet.balance),
    }, 'Payout request submitted', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAgents,
  getAgent,
  updateAgent,
  getAgentCommission,
  settleAgentCommission,
  requestCommissionPayout,
};
