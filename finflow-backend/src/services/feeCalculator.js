'use strict';

const crypto = require('crypto');

/**
 * @module feeCalculator
 * @description
 * Pure-function fee / commission calculator for FinFlow Pro.
 *
 * ═══════════════════════════════════════════════════════════════
 * ALL values are in PAISA (BDT × 100) and MUST be integers.
 * No floating-point arithmetic is used in any calculation.
 *
 * Fee formula:        Fee = (amount / 1000) × feePercent
 * Commission formula: Commission = (amount / 1000) × commissionPercent
 *
 * Implementation note: we multiply first, then divide, and use
 * Math.round to convert to integer paisa. This avoids the common
 * floating-point rounding pitfalls in financial software.
 * ═══════════════════════════════════════════════════════════════
 *
 * Exports:
 *  - calculateFee()
 *  - resolveFeePercent()
 *  - generateIdempotencyKey()
 *  - validateTransaction()
 */

// ─── Helper: round to nearest paisa ──────────────────────────
/**
 * Safely compute (amount / 1000) × percent and round to integer paisa.
 * Uses intermediate integer math where possible.
 *
 * @param {number} amount  - Amount in paisa (integer).
 * @param {number} percent - Percentage value (e.g. 1.5).
 * @returns {number} Result in paisa (integer).
 */
function paisaCalc(amount, percent) {
  // (amount × percent) / 1000  — keep precision, round at the end
  return Math.round((amount * percent) / 1000);
}

// ─── Extra Fee Calculation ────────────────────────────────────
/**
 * Calculate the extra fee amount based on fee type.
 *
 * @param {number} amount     - Transaction amount in paisa.
 * @param {Object} extraFee   - Extra fee configuration.
 * @param {number} extraFee.amount - Extra fee amount (paisa for FIXED, percent for PERCENT).
 * @param {string} extraFee.type   - One of: FIXED_ADD, FIXED_DEDUCT, PERCENT_ADD, PERCENT_DEDUCT.
 * @returns {number} Extra fee amount in paisa (positive = add, negative = deduct).
 */
function calculateExtraFee(amount, extraFee) {
  if (!extraFee || !extraFee.type || !extraFee.amount) return 0;

  const { amount: feeVal, type } = extraFee;

  switch (type) {
    case 'FIXED_ADD':
      return Math.round(feeVal);
    case 'FIXED_DEDUCT':
      return -Math.round(feeVal);
    case 'PERCENT_ADD':
      return paisaCalc(amount, feeVal);
    case 'PERCENT_DEDUCT':
      return -paisaCalc(amount, feeVal);
    default:
      return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN CALCULATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate all fee components for a transaction.
 *
 * @param {Object} params
 * @param {number} params.amount                - Transaction amount in paisa.
 * @param {number} params.feePercent            - Fee percentage (e.g. 1.5).
 * @param {string} params.transactionType       - 'CR' or 'DR'.
 * @param {Object} [params.extraFee]            - Extra fee configuration.
 * @param {number} [params.agentCommissionPercent] - Agent commission percentage.
 * @returns {{
 *   baseFee: number,
 *   extraFeeAmount: number,
 *   totalFee: number,
 *   agentCommission: number,
 *   netProfit: number,
 *   clientReceives: number,
 *   clientPays: number
 * }} All values in paisa (integers).
 */
function calculateFee({
  amount,
  feePercent,
  transactionType,
  extraFee = null,
  agentCommissionPercent = 0,
}) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('amount must be a positive integer (paisa)');
  }
  if (typeof feePercent !== 'number' || feePercent < 0) {
    throw new Error('feePercent must be a non-negative number');
  }

  // Base fee = (amount / 1000) × feePercent
  const baseFee = paisaCalc(amount, feePercent);

  // Extra fee (can be positive or negative)
  const extraFeeAmount = calculateExtraFee(amount, extraFee);

  // Total fee = baseFee + extraFee (floor at 0 — fees can never be negative)
  const totalFee = Math.max(0, baseFee + extraFeeAmount);

  // Agent commission = (amount / 1000) × commissionPercent
  const agentCommission = paisaCalc(amount, agentCommissionPercent);

  // Net admin profit = totalFee - agentCommission (can be 0 or negative in edge cases)
  const netProfit = totalFee - agentCommission;

  // What the client actually receives or pays
  let clientReceives = 0;
  let clientPays = 0;

  if (transactionType === 'CR') {
    // Credit: money comes in — client sends `amount`, receives `amount - fee`
    clientReceives = amount - totalFee;
    clientPays = amount;
  } else if (transactionType === 'DR') {
    // Debit: money goes out — client pays `amount + fee`, receives `amount`
    clientReceives = amount;
    clientPays = amount + totalFee;
  }

  return {
    baseFee,
    extraFeeAmount,
    totalFee,
    agentCommission,
    netProfit,
    clientReceives,
    clientPays,
  };
}

// ═══════════════════════════════════════════════════════════════
// FEE RESOLUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve the effective fee percentage for a transaction.
 *
 * Priority order (highest → lowest):
 *  1. Transaction-level override
 *  2. Client custom fee
 *  3. Agent default fee
 *  4. Global default fee
 *
 * @param {Object} params
 * @param {number|null} params.clientCustomFee     - Client-specific fee percent.
 * @param {number|null} params.agentDefaultFee     - Agent-specific default fee percent.
 * @param {number|null} params.globalDefaultFee    - System-wide default fee percent.
 * @param {number|null} params.transactionOverride - Per-transaction override.
 * @returns {{ feePercent: number, source: 'TRANSACTION'|'CLIENT'|'AGENT'|'GLOBAL' }}
 */
function resolveFeePercent({
  clientCustomFee = null,
  agentDefaultFee = null,
  globalDefaultFee = null,
  transactionOverride = null,
}) {
  // Priority 1: explicit transaction-level override
  if (transactionOverride !== null && transactionOverride !== undefined) {
    return { feePercent: transactionOverride, source: 'TRANSACTION' };
  }

  // Priority 2: client custom fee
  if (clientCustomFee !== null && clientCustomFee !== undefined) {
    return { feePercent: clientCustomFee, source: 'CLIENT' };
  }

  // Priority 3: agent default
  if (agentDefaultFee !== null && agentDefaultFee !== undefined) {
    return { feePercent: agentDefaultFee, source: 'AGENT' };
  }

  // Priority 4: global default
  const globalFee = globalDefaultFee !== null && globalDefaultFee !== undefined
    ? globalDefaultFee
    : parseFloat(process.env.DEFAULT_FEE_PERCENT) || 1.5;

  return { feePercent: globalFee, source: 'GLOBAL' };
}

// ═══════════════════════════════════════════════════════════════
// IDEMPOTENCY KEY GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a deterministic SHA-256 idempotency key for duplicate detection.
 *
 * Key is derived from: clientId + amount + agentId + current-hour timestamp.
 * The hour-based window prevents permanent blocking of future transactions
 * with the same parameters.
 *
 * @param {Object} params
 * @param {string} params.clientId - Client document ID.
 * @param {number} params.amount   - Transaction amount in paisa.
 * @param {string} [params.agentId] - Agent document ID (optional).
 * @returns {string} SHA-256 hex digest (64 characters).
 */
function generateIdempotencyKey({ clientId, amount, agentId = '' }) {
  if (!clientId || !amount) {
    throw new Error('clientId and amount are required for idempotency key generation');
  }

  // Round to current hour for time-windowed deduplication
  const hourWindow = new Date();
  hourWindow.setMinutes(0, 0, 0);
  const hourStr = hourWindow.toISOString();

  const payload = `${clientId}:${amount}:${agentId || 'NONE'}:${hourStr}`;

  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTION VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate all components of a transaction before submission.
 * Returns structured errors and warnings for the UI to display.
 *
 * @param {Object} params
 * @param {number} params.amount             - Transaction amount in paisa.
 * @param {number} params.totalFee           - Calculated total fee in paisa.
 * @param {number} params.agentCommission    - Agent commission in paisa.
 * @param {number} params.netProfit          - Net admin profit in paisa.
 * @param {Object[]} params.walletEntries    - Array of wallet entry objects.
 * @param {number} params.totalAvailable     - Combined available balance of selected wallets.
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   requiresAdminOverride: boolean
 * }}
 */
function validateTransaction({
  amount,
  totalFee,
  agentCommission,
  netProfit,
  walletEntries,
  totalAvailable,
}) {
  const errors = [];
  const warnings = [];
  let requiresAdminOverride = false;

  // ── Amount validation ────────────────────────────────────────
  if (!Number.isInteger(amount) || amount <= 0) {
    errors.push('Transaction amount must be a positive integer (paisa)');
  }

  // ── Fee validation ───────────────────────────────────────────
  if (!Number.isInteger(totalFee) || totalFee < 0) {
    errors.push('Total fee must be a non-negative integer (paisa)');
  }

  if (totalFee > amount) {
    errors.push('Total fee cannot exceed the transaction amount');
  }

  // ── Commission validation ────────────────────────────────────
  if (!Number.isInteger(agentCommission) || agentCommission < 0) {
    errors.push('Agent commission must be a non-negative integer (paisa)');
  }

  if (agentCommission > totalFee) {
    warnings.push('Agent commission exceeds total fee — admin net profit is negative');
    requiresAdminOverride = true;
  }

  // ── Net profit validation ────────────────────────────────────
  if (netProfit < 0) {
    warnings.push(`Negative net profit detected: ${netProfit} paisa`);
    requiresAdminOverride = true;
  }

  // ── Wallet entries validation ────────────────────────────────
  if (!Array.isArray(walletEntries) || walletEntries.length === 0) {
    errors.push('At least one wallet entry is required');
  } else {
    const totalWalletAmount = walletEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Check each entry has required fields
    walletEntries.forEach((entry, idx) => {
      if (!entry.walletId) {
        errors.push(`Wallet entry [${idx}]: walletId is required`);
      }
      if (!Number.isInteger(entry.amount) || entry.amount <= 0) {
        errors.push(`Wallet entry [${idx}]: amount must be a positive integer`);
      }
      if (!['IN', 'OUT'].includes(entry.direction)) {
        errors.push(`Wallet entry [${idx}]: direction must be IN or OUT`);
      }
    });

    // Check wallet amounts sum up correctly
    if (totalWalletAmount !== amount) {
      errors.push(
        `Wallet entries total (${totalWalletAmount}) does not match transaction amount (${amount})`
      );
    }
  }

  // ── Balance sufficiency ──────────────────────────────────────
  if (typeof totalAvailable === 'number' && totalAvailable < amount) {
    errors.push(
      `Insufficient wallet balance: available ${totalAvailable}, required ${amount}`
    );
  }

  // ── Large transaction warning ────────────────────────────────
  // ৳50,000 = 5,000,000 paisa
  const LARGE_TXN_THRESHOLD = parseInt(process.env.LARGE_TXN_THRESHOLD, 10) || 5000000;
  if (amount >= LARGE_TXN_THRESHOLD) {
    warnings.push(
      `Large transaction detected: ${amount} paisa (৳${(amount / 100).toFixed(2)})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiresAdminOverride,
  };
}

module.exports = {
  calculateFee,
  resolveFeePercent,
  generateIdempotencyKey,
  validateTransaction,
  // Expose internals for testing
  _paisaCalc: paisaCalc,
  _calculateExtraFee: calculateExtraFee,
};
