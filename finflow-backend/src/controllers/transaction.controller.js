'use strict';

const mongoose = require('mongoose');
const dayjs = require('dayjs');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { Transaction, Client, Agent, Settings, Admin } = require('../models');
const { calculateFee, resolveFeePercent } = require('../services/feeCalculator');
const { suggestPayment } = require('../services/paymentSuggestionEngine');
const transactionEngine = require('../services/transactionEngine');

/**
 * @module transaction.controller
 * @description
 * Transaction API controllers for FinFlow Pro.
 *
 * All input amounts from Flutter are in BDT (decimal) and converted
 * to paisa (integer, BDT × 100) immediately upon receipt.
 *
 * Fee formula:  Fee = (amount / 1000) × feePercent
 * All monetary values stored/returned as integers in paisa.
 */

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Convert BDT decimal to paisa integer.
 * @param {number} bdt - Amount in BDT.
 * @returns {number} Amount in paisa (integer).
 */
function bdtToPaisa(bdt) {
  return Math.round(Number(bdt) * 100);
}

/**
 * Format paisa to BDT string.
 * @param {number} paisa
 * @returns {string}
 */
function paisaToBdt(paisa) {
  return (paisa / 100).toFixed(2);
}

/**
 * Enrich a transaction document with formatted BDT fields.
 * @param {Object} txn - Transaction document (lean or toJSON).
 * @returns {Object}
 */
function enrichWithBdt(txn) {
  if (!txn) return txn;
  const obj = txn.toJSON ? txn.toJSON() : { ...txn };
  obj.amountBdt = paisaToBdt(obj.amount || 0);
  obj.baseFee_bdt = paisaToBdt(obj.baseFee || 0);
  obj.totalFee_bdt = paisaToBdt(obj.totalFee || 0);
  obj.agentCommission_bdt = paisaToBdt(obj.agentCommission || 0);
  obj.netProfit_bdt = paisaToBdt(obj.netProfit || 0);
  return obj;
}

/**
 * Resolve the adminId from the authenticated user.
 * Admin: req.user.id is the adminId.
 * Agent: req.user.adminId is the adminId.
 */
function resolveAdminId(user) {
  return user.role === 'ADMIN' ? user.id : user.adminId;
}

// ═══════════════════════════════════════════════════════════════
// CREATE TRANSACTION
// ═══════════════════════════════════════════════════════════════

async function createTransaction(req, res, next) {
  try {
    const {
      type, clientId, amount: amountBdt, feePercent,
      extraFee, walletEntries, note, idempotencyKey,
    } = req.body;

    const adminId = resolveAdminId(req.user);
    const amountPaisa = bdtToPaisa(amountBdt);

    // Resolve agentId
    let agentId = null;
    if (req.user.role === 'AGENT') {
      agentId = req.user.id;
    } else if (req.body.agentId) {
      agentId = req.body.agentId;
    }

    // Resolve fee percent if not provided
    let resolvedFeePercent = feePercent;
    let feeSource = feePercent != null ? 'TRANSACTION' : null;

    if (resolvedFeePercent == null) {
      const client = await Client.findOne({
        _id: new mongoose.Types.ObjectId(clientId),
        adminId: new mongoose.Types.ObjectId(adminId),
      }).lean();

      if (!client) {
        return ApiResponse.error(res, 'Client not found', 404, 'CLIENT_NOT_FOUND');
      }

      let agentDefaultFee = null;
      if (agentId) {
        const agent = await Agent.findById(agentId).lean();
        agentDefaultFee = agent?.commissionPercent || null;
      }

      const settings = await Settings.findOne({ adminId: new mongoose.Types.ObjectId(adminId) }).lean();
      const globalFee = settings?.feeDefaults?.defaultFeePercent ?? null;

      const resolved = resolveFeePercent({
        clientCustomFee: client.customFeePercent,
        agentDefaultFee: null,
        globalDefaultFee: globalFee,
        transactionOverride: null,
      });

      resolvedFeePercent = resolved.feePercent;
      feeSource = resolved.source;
    }

    // Resolve wallet entries if not provided
    let resolvedWalletEntries = walletEntries;
    if (!resolvedWalletEntries || resolvedWalletEntries.length === 0) {
      const suggestion = await suggestPayment({
        adminId,
        requiredAmount: amountPaisa,
        preferredWalletId: null,
      });

      if (suggestion.isInsufficient) {
        return ApiResponse.error(
          res,
          `Insufficient wallet balance. Deficit: ৳${paisaToBdt(suggestion.deficit)}`,
          400,
          'INSUFFICIENT_BALANCE',
          { deficit: suggestion.deficit, totalAvailable: suggestion.totalAvailable }
        );
      }

      const best = suggestion.suggestions[0];
      resolvedWalletEntries = best.wallets.map((w) => ({
        walletId: w.walletId,
        amount: w.amount,
        direction: type === 'CR' ? 'IN' : 'OUT',
      }));
    } else {
      // Convert any BDT wallet entry amounts to paisa
      resolvedWalletEntries = resolvedWalletEntries.map((e) => ({
        ...e,
        amount: Number.isInteger(e.amount) && e.amount > 10000 ? e.amount : bdtToPaisa(e.amount),
      }));
    }

    // Resolve agent commission percent
    let agentCommissionPercent = 0;
    if (agentId) {
      const agent = await Agent.findById(agentId).lean();
      agentCommissionPercent = agent?.commissionPercent || 0;
    }

    // Convert extraFee amounts to paisa if present
    let resolvedExtraFee = extraFee || null;
    if (resolvedExtraFee && resolvedExtraFee.amount && resolvedExtraFee.type) {
      if (['FIXED_ADD', 'FIXED_DEDUCT'].includes(resolvedExtraFee.type)) {
        resolvedExtraFee = { ...resolvedExtraFee, amount: bdtToPaisa(resolvedExtraFee.amount) };
      }
    }

    const transaction = await transactionEngine.createTransaction({
      adminId,
      agentId,
      type,
      clientId,
      amount: amountPaisa,
      feePercent: resolvedFeePercent,
      feeSource,
      extraFee: resolvedExtraFee,
      agentCommissionPercent,
      walletEntries: resolvedWalletEntries,
      note: note || '',
      idempotencyKey: idempotencyKey || null,
      createdBy: {
        id: new mongoose.Types.ObjectId(req.user.id),
        role: req.user.role,
        name: req.user.name || req.user.role,
      },
    });

    return ApiResponse.success(res, enrichWithBdt(transaction), 'Transaction created successfully', 201);
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET TRANSACTIONS (paginated, cursor-based)
// ═══════════════════════════════════════════════════════════════

async function getTransactions(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const {
      type, status, clientId, agentId, walletId,
      dateFrom, dateTo, amountMin, amountMax,
      search, cursor, page = 1, limit: rawLimit = 20,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 100);

    // Build query — always scoped to adminId
    const query = { adminId: new mongoose.Types.ObjectId(adminId) };

    // Agent can only see own transactions
    if (req.user.role === 'AGENT') {
      query.agentId = new mongoose.Types.ObjectId(req.user.id);
    } else if (agentId) {
      query.agentId = new mongoose.Types.ObjectId(agentId);
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (clientId) query.clientId = new mongoose.Types.ObjectId(clientId);
    if (walletId) query['walletEntries.walletId'] = new mongoose.Types.ObjectId(walletId);

    // Date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Amount range (in paisa)
    if (amountMin || amountMax) {
      query.amount = {};
      if (amountMin) query.amount.$gte = bdtToPaisa(amountMin);
      if (amountMax) query.amount.$lte = bdtToPaisa(amountMax);
    }

    // Text search on clientName or refId
    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { refId: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } },
      ];
    }

    // Cursor-based pagination
    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // Fetch transactions
    const transactions = await Transaction.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('clientId', 'name phone')
      .populate('agentId', 'name')
      .lean({ virtuals: true });

    const hasMore = transactions.length > limit;
    const results = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    // Summary aggregation (same query without cursor/limit)
    const summaryQuery = { ...query };
    delete summaryQuery._id;

    const [summary] = await Transaction.aggregate([
      { $match: summaryQuery },
      {
        $group: {
          _id: null,
          totalCR: { $sum: { $cond: [{ $eq: ['$type', 'CR'] }, '$amount', 0] } },
          totalDR: { $sum: { $cond: [{ $eq: ['$type', 'DR'] }, '$amount', 0] } },
          totalFee: { $sum: '$totalFee' },
          totalProfit: { $sum: '$netProfit' },
          count: { $sum: 1 },
        },
      },
    ]);

    const enriched = results.map(enrichWithBdt);

    return res.status(200).json({
      success: true,
      message: 'Transactions retrieved',
      data: enriched,
      summary: {
        totalCR: summary?.totalCR || 0,
        totalCR_bdt: paisaToBdt(summary?.totalCR || 0),
        totalDR: summary?.totalDR || 0,
        totalDR_bdt: paisaToBdt(summary?.totalDR || 0),
        totalFee: summary?.totalFee || 0,
        totalFee_bdt: paisaToBdt(summary?.totalFee || 0),
        totalProfit: summary?.totalProfit || 0,
        totalProfit_bdt: paisaToBdt(summary?.totalProfit || 0),
        count: summary?.count || 0,
      },
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET SINGLE TRANSACTION
// ═══════════════════════════════════════════════════════════════

async function getTransaction(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    // Support lookup by _id or refId
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = {
      adminId: new mongoose.Types.ObjectId(adminId),
      ...(isObjectId ? { _id: new mongoose.Types.ObjectId(id) } : { refId: id }),
    };

    // Agent scope
    if (req.user.role === 'AGENT') {
      query.agentId = new mongoose.Types.ObjectId(req.user.id);
    }

    const transaction = await Transaction.findOne(query)
      .populate('clientId', 'name phone email address')
      .populate('agentId', 'name phone')
      .populate('walletEntries.walletId', 'name type accountNumber');

    if (!transaction) {
      return ApiResponse.error(res, 'Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    return ApiResponse.success(res, enrichWithBdt(transaction), 'Transaction retrieved');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// EDIT TRANSACTION (Admin only, 24h window)
// ═══════════════════════════════════════════════════════════════

async function editTransaction(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { note, extraFee } = req.body;

    const changes = {};
    if (note !== undefined) changes.note = note;
    if (extraFee !== undefined) {
      // Convert fixed extraFee amounts from BDT to paisa
      if (extraFee && ['FIXED_ADD', 'FIXED_DEDUCT'].includes(extraFee.type)) {
        changes.extraFee = { ...extraFee, amount: bdtToPaisa(extraFee.amount) };
      } else {
        changes.extraFee = extraFee;
      }
    }

    if (Object.keys(changes).length === 0) {
      return ApiResponse.error(res, 'No editable fields provided', 400, 'NO_CHANGES');
    }

    const updated = await transactionEngine.editTransaction({
      transactionId: id,
      adminId,
      changes,
      editedBy: {
        id: new mongoose.Types.ObjectId(req.user.id),
        role: req.user.role,
        name: req.user.name || req.user.role,
      },
    });

    return ApiResponse.success(res, enrichWithBdt(updated), 'Transaction updated');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// CANCEL TRANSACTION (Admin only)
// ═══════════════════════════════════════════════════════════════

async function cancelTransaction(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return ApiResponse.error(res, 'Cancellation reason is required', 400, 'REASON_REQUIRED');
    }

    const cancelled = await transactionEngine.cancelTransaction({
      transactionId: id,
      adminId,
      reason: reason.trim(),
      cancelledBy: {
        id: new mongoose.Types.ObjectId(req.user.id),
        role: req.user.role,
      },
    });

    return ApiResponse.success(res, enrichWithBdt(cancelled), 'Transaction cancelled');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTION RECEIPT
// ═══════════════════════════════════════════════════════════════

async function getTransactionReceipt(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const query = {
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    };
    if (req.user.role === 'AGENT') {
      query.agentId = new mongoose.Types.ObjectId(req.user.id);
    }

    const txn = await Transaction.findOne(query)
      .populate('clientId', 'name phone email')
      .populate('agentId', 'name')
      .populate('walletEntries.walletId', 'name type');

    if (!txn) {
      return ApiResponse.error(res, 'Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    // Fetch admin branding
    const admin = await Admin.findById(adminId).lean();
    const settings = await Settings.findOne({ adminId: new mongoose.Types.ObjectId(adminId) }).lean();

    const businessName = admin?.businessName || 'FinFlow Pro';
    const footerText = settings?.reportBranding?.footerText || 'Powered by FinFlow Pro';
    const primaryColor = settings?.reportBranding?.primaryColor || '#6366F1';

    const walletNames = txn.walletEntries.map((e) => {
      const w = e.walletId;
      return w && w.name ? w.name : 'Unknown';
    }).join(', ');

    const receipt = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:'Segoe UI',sans-serif;max-width:400px;margin:0 auto;padding:20px;color:#1a1a2e}
.header{text-align:center;border-bottom:3px solid ${primaryColor};padding-bottom:12px;margin-bottom:16px}
.header h2{color:${primaryColor};margin:0 0 4px}
.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
.row .label{color:#666;font-size:13px}.row .value{font-weight:600;font-size:14px}
.total{background:${primaryColor}11;padding:12px;border-radius:8px;margin:16px 0}
.footer{text-align:center;color:#999;font-size:11px;margin-top:20px}
</style></head><body>
<div class="header"><h2>${businessName}</h2><p style="color:#666;font-size:12px">Transaction Receipt</p></div>
<div class="row"><span class="label">Reference</span><span class="value">${txn.refId}</span></div>
<div class="row"><span class="label">Date</span><span class="value">${dayjs(txn.createdAt).format('DD MMM YYYY, hh:mm A')}</span></div>
<div class="row"><span class="label">Type</span><span class="value">${txn.type === 'CR' ? 'Credit (Cash In)' : 'Debit (Cash Out)'}</span></div>
<div class="row"><span class="label">Client</span><span class="value">${txn.clientName}</span></div>
<div class="row"><span class="label">Phone</span><span class="value">${txn.clientId?.phone || 'N/A'}</span></div>
<div class="total">
<div class="row" style="border:none"><span class="label">Amount</span><span class="value" style="font-size:18px;color:${primaryColor}">৳${paisaToBdt(txn.amount)}</span></div>
<div class="row" style="border:none"><span class="label">Fee</span><span class="value">৳${paisaToBdt(txn.totalFee)}</span></div>
</div>
<div class="row"><span class="label">Wallet</span><span class="value">${walletNames}</span></div>
${txn.agentName ? `<div class="row"><span class="label">Processed by</span><span class="value">${txn.agentName}</span></div>` : ''}
<div class="row"><span class="label">Status</span><span class="value">${txn.status}</span></div>
<div class="footer"><p>${footerText}</p></div>
</body></html>`;

    return ApiResponse.success(res, { receipt, refId: txn.refId }, 'Receipt generated');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// SEND RECEIPT
// ═══════════════════════════════════════════════════════════════

async function sendReceipt(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { channel = 'SMS' } = req.body;

    const txn = await Transaction.findOne({
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    }).populate('clientId', 'name phone');

    if (!txn) {
      return ApiResponse.error(res, 'Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    const phone = txn.clientId?.phone;
    if (!phone) {
      return ApiResponse.error(res, 'Client phone number not available', 400, 'NO_PHONE');
    }

    // TODO: Integrate actual SMS/WhatsApp service when implemented
    // const message = `Receipt ${txn.refId}: ৳${paisaToBdt(txn.amount)} ${txn.type}. Fee: ৳${paisaToBdt(txn.totalFee)}`;
    // if (channel === 'SMS') await smsService.send(phone, message);
    // if (channel === 'WHATSAPP') await whatsappService.send(phone, message);

    txn.receiptSent = true;
    txn.receiptChannel = channel;
    txn.receiptSentAt = new Date();
    await txn.save();

    logger.info('Receipt sent', { refId: txn.refId, channel, phone });

    return ApiResponse.success(res, {
      refId: txn.refId,
      channel,
      sentTo: phone,
      sentAt: txn.receiptSentAt,
    }, 'Receipt sent successfully');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// CALCULATE FEE PREVIEW (stateless)
// ═══════════════════════════════════════════════════════════════

async function calculateFeePreview(req, res, next) {
  try {
    const {
      amount: amountBdt, feePercent, transactionType = 'CR',
      extraFee, agentCommissionPercent = 0,
    } = req.body;

    if (!amountBdt || amountBdt <= 0) {
      return ApiResponse.error(res, 'Amount is required and must be positive', 400, 'INVALID_AMOUNT');
    }

    const amountPaisa = bdtToPaisa(amountBdt);

    let resolvedExtraFee = extraFee || null;
    if (resolvedExtraFee && ['FIXED_ADD', 'FIXED_DEDUCT'].includes(resolvedExtraFee.type)) {
      resolvedExtraFee = { ...resolvedExtraFee, amount: bdtToPaisa(resolvedExtraFee.amount) };
    }

    const result = calculateFee({
      amount: amountPaisa,
      feePercent: feePercent || 1.5,
      transactionType,
      extraFee: resolvedExtraFee,
      agentCommissionPercent,
    });

    return ApiResponse.success(res, {
      amount: amountPaisa,
      amount_bdt: paisaToBdt(amountPaisa),
      baseFee: result.baseFee,
      baseFee_bdt: paisaToBdt(result.baseFee),
      extraFeeAmount: result.extraFeeAmount,
      extraFeeAmount_bdt: paisaToBdt(result.extraFeeAmount),
      totalFee: result.totalFee,
      totalFee_bdt: paisaToBdt(result.totalFee),
      agentCommission: result.agentCommission,
      agentCommission_bdt: paisaToBdt(result.agentCommission),
      netProfit: result.netProfit,
      netProfit_bdt: paisaToBdt(result.netProfit),
      clientReceives: result.clientReceives,
      clientReceives_bdt: paisaToBdt(result.clientReceives),
      clientPays: result.clientPays,
      clientPays_bdt: paisaToBdt(result.clientPays),
    }, 'Fee preview calculated');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// SUGGEST PAYMENT
// ═══════════════════════════════════════════════════════════════

async function suggestPaymentHandler(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { requiredAmount: amountBdt, preferredWalletId } = req.body;

    if (!amountBdt || amountBdt <= 0) {
      return ApiResponse.error(res, 'requiredAmount is required', 400, 'INVALID_AMOUNT');
    }

    const amountPaisa = bdtToPaisa(amountBdt);

    const result = await suggestPayment({
      adminId,
      requiredAmount: amountPaisa,
      preferredWalletId: preferredWalletId || null,
    });

    // Enrich suggestions with BDT
    const enrichedSuggestions = result.suggestions.map((s) => ({
      ...s,
      totalAmount_bdt: paisaToBdt(s.totalAmount),
      wallets: s.wallets.map((w) => ({
        ...w,
        amount_bdt: paisaToBdt(w.amount),
        availableBalance_bdt: paisaToBdt(w.availableBalance),
      })),
    }));

    return ApiResponse.success(res, {
      suggestions: enrichedSuggestions,
      isInsufficient: result.isInsufficient,
      deficit: result.deficit,
      deficit_bdt: paisaToBdt(result.deficit),
      totalAvailable: result.totalAvailable,
      totalAvailable_bdt: paisaToBdt(result.totalAvailable),
    }, 'Payment suggestions generated');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  editTransaction,
  cancelTransaction,
  getTransactionReceipt,
  sendReceipt,
  calculateFeePreview,
  suggestPayment: suggestPaymentHandler,
};
