'use strict';

const mongoose = require('mongoose');
const dayjs = require('dayjs');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const {
  Transaction,
  Wallet,
  WalletLog,
  CommissionLedger,
  Agent,
  Client,
} = require('../models');
const {
  calculateFee,
  resolveFeePercent,
  validateTransaction,
} = require('./feeCalculator');
const { queueNotification } = require('./notificationService');

/**
 * @module transactionEngine
 * @description
 * Core transaction processing engine for FinFlow Pro.
 *
 * Orchestrates the complete transaction lifecycle:
 *  - Creation (with idempotency, fee calculation, atomic wallet updates)
 *  - Cancellation (full reversal of all wallet and commission entries)
 *  - Editing (within 24-hour window, admin-only)
 *
 * All monetary values in PAISA (integer). All multi-document
 * mutations use Mongoose sessions for atomicity. If any step
 * fails, the entire operation is rolled back.
 *
 * Exports:
 *  - createTransaction()
 *  - cancelTransaction()
 *  - editTransaction()
 */

// ─── Constants ────────────────────────────────────────────────
const EDIT_WINDOW_HOURS = 24;

// ═══════════════════════════════════════════════════════════════
// CREATE TRANSACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Create a complete transaction with atomic wallet updates.
 *
 * Steps:
 *  1. Check idempotency key — return existing if duplicate
 *  2. Resolve fee percent using feeCalculator.resolveFeePercent
 *  3. Calculate all fees using feeCalculator.calculateFee
 *  4. Validate using feeCalculator.validateTransaction
 *  5. Check each wallet has sufficient availableBalance
 *  6. Run Mongoose session transaction (atomic):
 *     a. Create Transaction document
 *     b. For each walletEntry:
 *        - Update wallet.balance (increment/decrement)
 *        - Update wallet.stats.totalIn or totalOut
 *        - Create WalletLog entry
 *     c. If agentId exists:
 *        - Create CommissionLedger entry (EARNED)
 *        - Update Agent.wallet.balance += commission
 *        - Update Agent.stats
 *     d. Update Client.stats
 *  7. Dispatch async jobs (notifications, telegram) — do NOT await
 *  8. Return created transaction (populated)
 *
 * @param {Object} params
 * @param {string}  params.adminId               - Admin document ID.
 * @param {string}  [params.agentId]             - Agent document ID (optional).
 * @param {string}  params.type                  - 'CR' or 'DR'.
 * @param {string}  params.clientId              - Client document ID.
 * @param {number}  params.amount                - Transaction amount in paisa.
 * @param {number}  [params.feePercent]          - Override fee percent (if null, resolved).
 * @param {string}  [params.feeSource]           - Source of fee percent.
 * @param {Object}  [params.extraFee]            - Extra fee configuration.
 * @param {number}  [params.agentCommissionPercent] - Agent commission percent.
 * @param {Array}   params.walletEntries         - Array of { walletId, amount, direction }.
 * @param {string}  [params.note]                - Transaction note.
 * @param {string}  [params.idempotencyKey]      - Idempotency key for dedup.
 * @param {Object}  params.createdBy             - { id, role, name }.
 * @returns {Promise<Object>} Created and populated transaction document.
 * @throws {AppError} On validation failure, insufficient balance, or DB error.
 */
async function createTransaction({
  adminId,
  agentId = null,
  type,
  clientId,
  amount,
  feePercent = null,
  feeSource = null,
  extraFee = null,
  agentCommissionPercent = 0,
  walletEntries,
  note = '',
  idempotencyKey = null,
  createdBy,
}) {
  // ── Step 1: Idempotency check ──────────────────────────────
  if (idempotencyKey) {
    const existing = await Transaction.findOne({ idempotencyKey })
      .populate('clientId', 'name phone')
      .populate('agentId', 'name phone')
      .populate('walletEntries.walletId', 'name type');

    if (existing) {
      logger.info('Duplicate transaction detected — returning existing', {
        idempotencyKey,
        refId: existing.refId,
      });
      return existing;
    }
  }

  // ── Fetch client ────────────────────────────────────────────
  const client = await Client.findOne({
    _id: new mongoose.Types.ObjectId(clientId),
    adminId: new mongoose.Types.ObjectId(adminId),
  });

  if (!client) {
    throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  // ── Fetch agent (optional) ──────────────────────────────────
  let agent = null;
  if (agentId) {
    agent = await Agent.findOne({
      _id: new mongoose.Types.ObjectId(agentId),
      adminId: new mongoose.Types.ObjectId(adminId),
      status: 'ACTIVE',
    });

    if (!agent) {
      throw new AppError('Agent not found or inactive', 404, 'AGENT_NOT_FOUND');
    }
  }

  // ── Step 2: Resolve fee percent ─────────────────────────────
  const resolvedFee = resolveFeePercent({
    clientCustomFee: client.customFeePercent,
    agentDefaultFee: null, // Agent model has no defaultFeePercent — skip agent level
    globalDefaultFee: null, // Falls back to env var
    transactionOverride: feePercent,
  });

  const effectiveFeePercent = resolvedFee.feePercent;
  const effectiveFeeSource = feeSource || resolvedFee.source;

  // Resolve commission percent
  const effectiveCommissionPercent = agentCommissionPercent ||
    (agent ? agent.commissionPercent : 0);

  // ── Step 3: Calculate fees ──────────────────────────────────
  const fees = calculateFee({
    amount,
    feePercent: effectiveFeePercent,
    transactionType: type,
    extraFee,
    agentCommissionPercent: effectiveCommissionPercent,
  });

  // ── Step 4: Validate ────────────────────────────────────────
  // Compute total available across selected wallets
  const walletIds = walletEntries.map((e) => e.walletId);
  const walletDocs = await Wallet.find({
    _id: { $in: walletIds.map((id) => new mongoose.Types.ObjectId(id)) },
    adminId: new mongoose.Types.ObjectId(adminId),
    isActive: true,
  }).lean({ virtuals: true });

  const walletMap = new Map();
  for (const w of walletDocs) {
    walletMap.set(w._id.toString(), w);
  }

  // Enrich wallet entries with walletType
  const enrichedEntries = walletEntries.map((entry) => {
    const w = walletMap.get(entry.walletId.toString());
    return {
      ...entry,
      walletType: w ? w.type : 'UNKNOWN',
    };
  });

  const totalAvailable = walletDocs.reduce(
    (sum, w) => sum + (w.availableBalance || 0),
    0
  );

  const validation = validateTransaction({
    amount,
    totalFee: fees.totalFee,
    agentCommission: fees.agentCommission,
    netProfit: fees.netProfit,
    walletEntries: enrichedEntries,
    totalAvailable,
  });

  if (!validation.valid) {
    throw new AppError(
      `Transaction validation failed: ${validation.errors.join('; ')}`,
      400,
      'VALIDATION_FAILED',
      { errors: validation.errors, warnings: validation.warnings }
    );
  }

  // ── Step 5: Check individual wallet balances ────────────────
  for (const entry of enrichedEntries) {
    if (entry.direction === 'OUT') {
      const w = walletMap.get(entry.walletId.toString());
      if (!w) {
        throw new AppError(
          `Wallet ${entry.walletId} not found`,
          404,
          'WALLET_NOT_FOUND'
        );
      }
      if (w.availableBalance < entry.amount) {
        throw new AppError(
          `Insufficient balance in wallet ${w.name}: available ${w.availableBalance}, required ${entry.amount}`,
          400,
          'INSUFFICIENT_BALANCE',
          { walletId: entry.walletId, walletName: w.name }
        );
      }
    }
  }

  // ── Step 6: Atomic session ──────────────────────────────────
  const session = await mongoose.startSession();
  let transaction;

  try {
    await session.withTransaction(async () => {
      // ── 6a: Generate refId and create Transaction document ──
      const refId = await Transaction.generateRefId();

      const txnData = {
        refId,
        adminId,
        type,
        status: 'COMPLETED',
        clientId,
        clientName: client.name,
        agentId: agentId || null,
        agentName: agent ? agent.name : null,
        amount,
        feePercent: effectiveFeePercent,
        feeSource: effectiveFeeSource,
        baseFee: fees.baseFee,
        extraFee: extraFee || { amount: 0, type: null, note: '', visibility: 'RECEIPT_VISIBLE' },
        totalFee: fees.totalFee,
        agentCommissionPercent: effectiveCommissionPercent,
        agentCommission: fees.agentCommission,
        netProfit: fees.netProfit,
        walletEntries: enrichedEntries,
        note,
        idempotencyKey,
        createdBy,
      };

      const txns = await Transaction.create([txnData], { session });
      transaction = txns[0];

      // ── 6b: Update wallets and create WalletLogs ───────────
      for (const entry of enrichedEntries) {
        const isIn = entry.direction === 'IN';
        const incAmount = isIn ? entry.amount : -entry.amount;
        const statsField = isIn ? 'stats.totalIn' : 'stats.totalOut';

        const updatedWallet = await Wallet.findByIdAndUpdate(
          entry.walletId,
          {
            $inc: {
              balance: incAmount,
              [statsField]: entry.amount,
            },
            $set: { 'stats.lastTransactionAt': new Date() },
          },
          { new: true, session }
        );

        await WalletLog.create(
          [
            {
              adminId,
              walletId: entry.walletId,
              transactionId: transaction._id,
              type: isIn ? 'CREDIT' : 'DEBIT',
              amount: incAmount,
              balanceAfter: updatedWallet.balance,
              note: `${type} transaction ${refId}`,
              createdBy,
            },
          ],
          { session }
        );
      }

      // ── 6c: Agent commission ────────────────────────────────
      if (agent && fees.agentCommission > 0) {
        const updatedAgent = await Agent.findByIdAndUpdate(
          agentId,
          {
            $inc: {
              'wallet.balance': fees.agentCommission,
              'wallet.totalEarned': fees.agentCommission,
              'stats.totalTransactions': 1,
              'stats.totalVolume': amount,
              'stats.currentMonthCommission': fees.agentCommission,
            },
          },
          { new: true, session }
        );

        await CommissionLedger.create(
          [
            {
              adminId,
              agentId,
              transactionId: transaction._id,
              type: 'EARNED',
              amount: fees.agentCommission,
              balanceAfter: updatedAgent.wallet.balance,
              note: `Commission from ${type} transaction ${refId}`,
              createdBy,
            },
          ],
          { session }
        );
      }

      // ── 6d: Update client stats ─────────────────────────────
      await Client.findByIdAndUpdate(
        clientId,
        {
          $inc: {
            'stats.totalTransactions': 1,
            'stats.totalVolume': amount,
            'stats.totalFeesPaid': fees.totalFee,
          },
          $set: { 'stats.lastTransactionAt': new Date() },
        },
        { session }
      );
    });

    // ── Step 7: Async jobs (fire-and-forget) ──────────────────
    // Notification to admin
    queueNotification({
      adminId,
      recipientId: adminId,
      recipientType: 'ADMIN',
      type: 'TRANSACTION_CREATED',
      title: `${type} Transaction: ${transaction.refId}`,
      body: `৳${(amount / 100).toFixed(2)} ${type === 'CR' ? 'credited to' : 'debited from'} ${client.name}. Fee: ৳${(fees.totalFee / 100).toFixed(2)}`,
      data: {
        transactionId: transaction._id.toString(),
        refId: transaction.refId,
        amount,
        type,
        clientName: client.name,
      },
      channels: ['IN_APP', 'TELEGRAM'],
    }).catch((err) => {
      logger.error('Failed to queue transaction notification', {
        transactionId: transaction._id.toString(),
        error: err.message,
      });
    });

    // Notification to agent (if applicable)
    if (agent && fees.agentCommission > 0) {
      queueNotification({
        adminId,
        recipientId: agentId,
        recipientType: 'AGENT',
        type: 'TRANSACTION_CREATED',
        title: `Commission Earned: ${transaction.refId}`,
        body: `৳${(fees.agentCommission / 100).toFixed(2)} earned from ${type} transaction for ${client.name}.`,
        data: {
          transactionId: transaction._id.toString(),
          commission: fees.agentCommission,
        },
        channels: ['IN_APP', 'TELEGRAM'],
      }).catch((err) => {
        logger.error('Failed to queue agent notification', {
          agentId,
          error: err.message,
        });
      });
    }

    // ── Step 8: Return populated transaction ──────────────────
    const populated = await Transaction.findById(transaction._id)
      .populate('clientId', 'name phone email')
      .populate('agentId', 'name phone')
      .populate('walletEntries.walletId', 'name type accountNumber');

    logger.info('Transaction created successfully', {
      refId: transaction.refId,
      adminId,
      clientId,
      agentId,
      amount,
      totalFee: fees.totalFee,
      agentCommission: fees.agentCommission,
      netProfit: fees.netProfit,
    });

    return populated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Transaction creation failed', {
      adminId,
      clientId,
      agentId,
      amount,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  } finally {
    await session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════════
// CANCEL TRANSACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Cancel a transaction and reverse all wallet / commission entries atomically.
 *
 * @param {Object} params
 * @param {string} params.transactionId - Transaction document ID.
 * @param {string} params.adminId       - Admin document ID (ownership check).
 * @param {string} params.reason        - Cancellation reason.
 * @param {Object} params.cancelledBy   - { id, role } of the cancelling admin.
 * @returns {Promise<Object>} Updated transaction document.
 * @throws {AppError} If not found, already cancelled, or not owned.
 */
async function cancelTransaction({ transactionId, adminId, reason, cancelledBy }) {
  const session = await mongoose.startSession();

  try {
    if (!transactionId || !adminId || !reason || !cancelledBy) {
      throw new AppError('Missing required fields for cancellation', 400, 'INVALID_INPUT');
    }

    let transaction;

    await session.withTransaction(async () => {
      // ── Fetch transaction ──────────────────────────────────
      transaction = await Transaction.findOne({
        _id: new mongoose.Types.ObjectId(transactionId),
        adminId: new mongoose.Types.ObjectId(adminId),
      }).session(session);

      if (!transaction) {
        throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }

      if (transaction.status === 'CANCELLED') {
        throw new AppError('Transaction is already cancelled', 400, 'ALREADY_CANCELLED');
      }

      // ── Reverse wallet entries ──────────────────────────────
      for (const entry of transaction.walletEntries) {
        const isIn = entry.direction === 'IN';
        // Reverse: if it was IN, now deduct; if it was OUT, now add
        const reverseAmount = isIn ? -entry.amount : entry.amount;
        const reverseStatsField = isIn ? 'stats.totalIn' : 'stats.totalOut';

        const updatedWallet = await Wallet.findByIdAndUpdate(
          entry.walletId,
          {
            $inc: {
              balance: reverseAmount,
              [reverseStatsField]: -entry.amount,
            },
            $set: { 'stats.lastTransactionAt': new Date() },
          },
          { new: true, session }
        );

        await WalletLog.create(
          [
            {
              adminId,
              walletId: entry.walletId,
              transactionId: transaction._id,
              type: isIn ? 'DEBIT' : 'CREDIT',
              amount: reverseAmount,
              balanceAfter: updatedWallet.balance,
              note: `Reversal of ${transaction.refId}: ${reason}`,
              createdBy: cancelledBy,
            },
          ],
          { session }
        );
      }

      // ── Reverse agent commission ────────────────────────────
      if (transaction.agentId && transaction.agentCommission > 0) {
        const updatedAgent = await Agent.findByIdAndUpdate(
          transaction.agentId,
          {
            $inc: {
              'wallet.balance': -transaction.agentCommission,
              'wallet.totalEarned': -transaction.agentCommission,
              'stats.totalTransactions': -1,
              'stats.totalVolume': -transaction.amount,
              'stats.currentMonthCommission': -transaction.agentCommission,
            },
          },
          { new: true, session }
        );

        await CommissionLedger.create(
          [
            {
              adminId,
              agentId: transaction.agentId,
              transactionId: transaction._id,
              type: 'REVERSED',
              amount: -transaction.agentCommission,
              balanceAfter: updatedAgent.wallet.balance,
              note: `Commission reversed for ${transaction.refId}: ${reason}`,
              createdBy: cancelledBy,
            },
          ],
          { session }
        );
      }

      // ── Reverse client stats ────────────────────────────────
      await Client.findByIdAndUpdate(
        transaction.clientId,
        {
          $inc: {
            'stats.totalTransactions': -1,
            'stats.totalVolume': -transaction.amount,
            'stats.totalFeesPaid': -transaction.totalFee,
          },
        },
        { session }
      );

      // ── Mark transaction as cancelled ───────────────────────
      transaction.status = 'CANCELLED';
      transaction.cancelledAt = new Date();
      transaction.cancelledBy = cancelledBy.id;
      transaction.cancelReason = reason;
      await transaction.save({ session });
    });

    logger.info('Transaction cancelled', {
      refId: transaction.refId,
      transactionId,
      adminId,
      reason,
    });

    return transaction;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Transaction cancellation failed', {
      transactionId,
      adminId,
      error: err.message,
    });
    throw err;
  } finally {
    await session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════════
// EDIT TRANSACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Edit a transaction within the 24-hour window (admin only).
 *
 * Only editable fields: note, feePercent, extraFee, agentCommissionPercent.
 * Fee/commission changes trigger recalculation and wallet adjustments.
 *
 * @param {Object} params
 * @param {string} params.transactionId - Transaction document ID.
 * @param {string} params.adminId       - Admin document ID.
 * @param {Object} params.changes       - Fields to update.
 * @param {Object} params.editedBy      - { id, role, name } of the editor.
 * @returns {Promise<Object>} Updated transaction document.
 * @throws {AppError} If outside edit window, not found, or invalid changes.
 */
async function editTransaction({ transactionId, adminId, changes, editedBy }) {
  const session = await mongoose.startSession();

  try {
    if (!transactionId || !adminId || !changes || !editedBy) {
      throw new AppError('Missing required fields for transaction edit', 400, 'INVALID_INPUT');
    }

    let transaction;

    await session.withTransaction(async () => {
      // ── Fetch transaction ──────────────────────────────────
      transaction = await Transaction.findOne({
        _id: new mongoose.Types.ObjectId(transactionId),
        adminId: new mongoose.Types.ObjectId(adminId),
      }).session(session);

      if (!transaction) {
        throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }

      if (transaction.status !== 'COMPLETED') {
        throw new AppError(
          `Cannot edit transaction with status: ${transaction.status}`,
          400,
          'INVALID_STATUS'
        );
      }

      // ── Check edit window ──────────────────────────────────
      const hoursSinceCreation = dayjs().diff(dayjs(transaction.createdAt), 'hour');
      if (hoursSinceCreation >= EDIT_WINDOW_HOURS) {
        throw new AppError(
          `Edit window expired: transactions can only be edited within ${EDIT_WINDOW_HOURS} hours`,
          400,
          'EDIT_WINDOW_EXPIRED'
        );
      }

      // ── Record previous state for history ───────────────────
      const previousState = {
        note: transaction.note,
        feePercent: transaction.feePercent,
        extraFee: transaction.extraFee ? transaction.extraFee.toObject() : null,
        agentCommissionPercent: transaction.agentCommissionPercent,
        baseFee: transaction.baseFee,
        totalFee: transaction.totalFee,
        agentCommission: transaction.agentCommission,
        netProfit: transaction.netProfit,
      };

      // ── Apply note changes ──────────────────────────────────
      if (changes.note !== undefined) {
        transaction.note = changes.note;
      }

      // ── Recalculate fees if fee-related fields changed ──────
      const feeChanged =
        changes.feePercent !== undefined ||
        changes.extraFee !== undefined ||
        changes.agentCommissionPercent !== undefined;

      if (feeChanged) {
        const newFeePercent = changes.feePercent !== undefined
          ? changes.feePercent
          : transaction.feePercent;
        const newExtraFee = changes.extraFee !== undefined
          ? changes.extraFee
          : (transaction.extraFee ? transaction.extraFee.toObject() : null);
        const newCommPercent = changes.agentCommissionPercent !== undefined
          ? changes.agentCommissionPercent
          : transaction.agentCommissionPercent;

        const newFees = calculateFee({
          amount: transaction.amount,
          feePercent: newFeePercent,
          transactionType: transaction.type,
          extraFee: newExtraFee,
          agentCommissionPercent: newCommPercent,
        });

        // ── Adjust wallet balances for fee difference ─────────
        const feeDiff = newFees.totalFee - transaction.totalFee;
        if (feeDiff !== 0) {
          // The fee difference is absorbed by the primary wallet (first entry)
          const primaryEntry = transaction.walletEntries[0];
          if (primaryEntry) {
            const updatedWallet = await Wallet.findByIdAndUpdate(
              primaryEntry.walletId,
              {
                $inc: { balance: feeDiff },
                $set: { 'stats.lastTransactionAt': new Date() },
              },
              { new: true, session }
            );

            await WalletLog.create(
              [
                {
                  adminId,
                  walletId: primaryEntry.walletId,
                  transactionId: transaction._id,
                  type: 'ADJUSTMENT',
                  amount: feeDiff,
                  balanceAfter: updatedWallet.balance,
                  note: `Fee adjustment for ${transaction.refId}`,
                  createdBy: editedBy,
                },
              ],
              { session }
            );
          }
        }

        // ── Adjust agent commission ───────────────────────────
        if (transaction.agentId) {
          const commDiff = newFees.agentCommission - transaction.agentCommission;
          if (commDiff !== 0) {
            const updatedAgent = await Agent.findByIdAndUpdate(
              transaction.agentId,
              {
                $inc: {
                  'wallet.balance': commDiff,
                  'wallet.totalEarned': commDiff,
                  'stats.currentMonthCommission': commDiff,
                },
              },
              { new: true, session }
            );

            await CommissionLedger.create(
              [
                {
                  adminId,
                  agentId: transaction.agentId,
                  transactionId: transaction._id,
                  type: 'ADJUSTED',
                  amount: commDiff,
                  balanceAfter: updatedAgent.wallet.balance,
                  note: `Commission adjusted for ${transaction.refId}`,
                  createdBy: editedBy,
                },
              ],
              { session }
            );
          }
        }

        // ── Update client fee stats ───────────────────────────
        const clientFeeDiff = newFees.totalFee - transaction.totalFee;
        if (clientFeeDiff !== 0) {
          await Client.findByIdAndUpdate(
            transaction.clientId,
            { $inc: { 'stats.totalFeesPaid': clientFeeDiff } },
            { session }
          );
        }

        // ── Apply new fee values to transaction ───────────────
        transaction.feePercent = newFeePercent;
        transaction.baseFee = newFees.baseFee;
        transaction.totalFee = newFees.totalFee;
        transaction.agentCommissionPercent = newCommPercent;
        transaction.agentCommission = newFees.agentCommission;
        transaction.netProfit = newFees.netProfit;

        if (changes.extraFee !== undefined) {
          transaction.extraFee = newExtraFee;
        }
      }

      // ── Add edit history entry ──────────────────────────────
      transaction.editHistory.push({
        editedBy: editedBy.id,
        editedAt: new Date(),
        changes: {
          previous: previousState,
          updated: changes,
        },
      });

      await transaction.save({ session });
    });

    // Populate and return
    const populated = await Transaction.findById(transaction._id)
      .populate('clientId', 'name phone email')
      .populate('agentId', 'name phone')
      .populate('walletEntries.walletId', 'name type accountNumber');

    logger.info('Transaction edited', {
      refId: transaction.refId,
      transactionId,
      adminId,
      changes: Object.keys(changes),
    });

    return populated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Transaction edit failed', {
      transactionId,
      adminId,
      error: err.message,
    });
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createTransaction,
  cancelTransaction,
  editTransaction,
};
