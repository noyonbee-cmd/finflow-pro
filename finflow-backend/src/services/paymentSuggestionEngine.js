'use strict';

const logger = require('../utils/logger');
const { Wallet } = require('../models');

/**
 * @module paymentSuggestionEngine
 * @description
 * Auto-payment suggestion system for FinFlow Pro.
 *
 * Given a required amount and an optional preferred wallet, this engine
 * suggests the optimal wallet(s) to fulfil the transaction. If a single
 * wallet suffices, it is returned directly. Otherwise a greedy split
 * algorithm generates up to 3 combinations ranked by scoring.
 *
 * All monetary values are in PAISA (integer).
 *
 * Exports:
 *  - suggestPayment()
 *  - validateManualSplit()
 */

// ─── Scoring constants ────────────────────────────────────────
const WALLET_COUNT_PENALTY = -10;   // Each additional wallet costs -10 points
const PREFERENCE_BONUS = 50;        // Bonus for using the preferred wallet
const EXACT_MATCH_BONUS = 20;       // Bonus for exact single-wallet match
const MAX_COMBINATIONS = 3;         // Maximum suggestion variants to return

// ═══════════════════════════════════════════════════════════════
// MAIN SUGGESTION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Suggest the best wallet(s) to cover a required payment amount.
 *
 * Algorithm:
 *  1. Fetch all active wallets for adminId, sorted by availableBalance desc
 *  2. Filter wallets with availableBalance > 0
 *  3. Try single-wallet match:
 *     - Rank by: preferredWalletId first, then highest balance
 *  4. If no single wallet: run greedy split algorithm
 *     - Fill from highest-balance wallet first
 *     - Generate top 3 combinations
 *     - Score each: (numWallets × -10) + preferenceBonus
 *  5. If total < requiredAmount: return INSUFFICIENT with deficit
 *
 * @param {Object} params
 * @param {string} params.adminId             - Admin document ID.
 * @param {number} params.requiredAmount      - Required amount in paisa.
 * @param {string} [params.preferredWalletId] - Preferred wallet ID.
 * @returns {Promise<{
 *   suggestions: Array<{
 *     wallets: Array<{ walletId: string, walletName: string, walletType: string, amount: number, availableBalance: number }>,
 *     totalAmount: number,
 *     score: number,
 *     label: string
 *   }>,
 *   isInsufficient: boolean,
 *   deficit: number,
 *   totalAvailable: number
 * }>}
 */
async function suggestPayment({ adminId, requiredAmount, preferredWalletId = null }) {
  try {
    if (!adminId) throw new Error('adminId is required');
    if (!Number.isInteger(requiredAmount) || requiredAmount <= 0) {
      throw new Error('requiredAmount must be a positive integer (paisa)');
    }

    // ── Step 1: Fetch active wallets ──────────────────────────
    const wallets = await Wallet.find({
      adminId,
      isActive: true,
    }).sort({ balance: -1 }).lean({ virtuals: true });

    // ── Step 2: Filter wallets with positive balance ──────────
    const availableWallets = wallets.filter((w) => w.availableBalance > 0);

    const totalAvailable = availableWallets.reduce(
      (sum, w) => sum + w.availableBalance,
      0
    );

    // ── Step 5 (early): Check overall sufficiency ─────────────
    if (totalAvailable < requiredAmount) {
      return {
        suggestions: [],
        isInsufficient: true,
        deficit: requiredAmount - totalAvailable,
        totalAvailable,
      };
    }

    const suggestions = [];

    // ── Step 3: Try single-wallet solutions ───────────────────
    const singleWalletCandidates = availableWallets
      .filter((w) => w.availableBalance >= requiredAmount)
      .sort((a, b) => {
        // Preferred wallet always comes first
        const aPreferred = preferredWalletId && a._id.toString() === preferredWalletId ? 1 : 0;
        const bPreferred = preferredWalletId && b._id.toString() === preferredWalletId ? 1 : 0;
        if (aPreferred !== bPreferred) return bPreferred - aPreferred;
        // Then by highest balance
        return b.availableBalance - a.availableBalance;
      });

    for (const wallet of singleWalletCandidates.slice(0, MAX_COMBINATIONS)) {
      const isPreferred = preferredWalletId && wallet._id.toString() === preferredWalletId;
      const isExact = wallet.availableBalance === requiredAmount;

      let score = 100; // Base score for single wallet
      if (isPreferred) score += PREFERENCE_BONUS;
      if (isExact) score += EXACT_MATCH_BONUS;

      suggestions.push({
        wallets: [
          {
            walletId: wallet._id.toString(),
            walletName: wallet.name,
            walletType: wallet.type,
            amount: requiredAmount,
            availableBalance: wallet.availableBalance,
          },
        ],
        totalAmount: requiredAmount,
        score,
        label: isPreferred
          ? `Preferred: ${wallet.name}`
          : `Single wallet: ${wallet.name}`,
      });
    }

    // If we have single-wallet solutions, return them
    if (suggestions.length >= MAX_COMBINATIONS) {
      return {
        suggestions: suggestions
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_COMBINATIONS),
        isInsufficient: false,
        deficit: 0,
        totalAvailable,
      };
    }

    // ── Step 4: Greedy split algorithm ────────────────────────
    const splitSuggestions = generateSplitCombinations(
      availableWallets,
      requiredAmount,
      preferredWalletId,
      MAX_COMBINATIONS - suggestions.length
    );

    suggestions.push(...splitSuggestions);

    // Sort all suggestions by score descending
    suggestions.sort((a, b) => b.score - a.score);

    return {
      suggestions: suggestions.slice(0, MAX_COMBINATIONS),
      isInsufficient: false,
      deficit: 0,
      totalAvailable,
    };
  } catch (err) {
    logger.error('Payment suggestion failed', {
      adminId,
      requiredAmount,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Generate split payment combinations using a greedy algorithm.
 *
 * @param {Object[]} wallets         - Available wallets (sorted by balance desc).
 * @param {number}   requiredAmount  - Amount to cover in paisa.
 * @param {string|null} preferredId  - Preferred wallet ID.
 * @param {number}   maxResults      - Maximum combinations to generate.
 * @returns {Array} Array of suggestion objects.
 */
function generateSplitCombinations(wallets, requiredAmount, preferredId, maxResults) {
  const results = [];

  // Strategy 1: Preferred wallet first (if applicable), then fill by highest balance
  if (preferredId) {
    const preferred = wallets.find((w) => w._id.toString() === preferredId);
    if (preferred && preferred.availableBalance > 0) {
      const combo = buildGreedySplit(
        wallets,
        requiredAmount,
        preferredId
      );
      if (combo) {
        combo.score += PREFERENCE_BONUS;
        combo.label = `Preferred split: ${preferred.name} + ${combo.wallets.length - 1} more`;
        results.push(combo);
      }
    }
  }

  // Strategy 2: Pure greedy (highest balance first)
  const greedy = buildGreedySplit(wallets, requiredAmount, null);
  if (greedy) {
    greedy.label = `Optimal split: ${greedy.wallets.length} wallets`;
    results.push(greedy);
  }

  // Strategy 3: Fewest wallets (try from largest only)
  if (wallets.length >= 2) {
    const topWallets = wallets.slice(0, Math.min(wallets.length, 3));
    const minimal = buildGreedySplit(topWallets, requiredAmount, null);
    if (minimal && minimal.wallets.length <= (greedy ? greedy.wallets.length : Infinity)) {
      minimal.label = `Minimal split: ${minimal.wallets.length} wallets`;
      results.push(minimal);
    }
  }

  // Deduplicate by wallet combination
  const seen = new Set();
  const unique = [];
  for (const combo of results) {
    const key = combo.wallets
      .map((w) => `${w.walletId}:${w.amount}`)
      .sort()
      .join('|');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(combo);
    }
  }

  return unique.slice(0, maxResults);
}

/**
 * Build a single greedy split: fill from a starting wallet, then
 * fill remaining from highest balance first.
 *
 * @param {Object[]} wallets       - Available wallets.
 * @param {number}   required      - Amount needed in paisa.
 * @param {string|null} startId    - Wallet ID to start with.
 * @returns {Object|null} Suggestion object or null if impossible.
 */
function buildGreedySplit(wallets, required, startId) {
  let remaining = required;
  const selected = [];

  // Reorder: put startId first if provided
  const ordered = [...wallets];
  if (startId) {
    const idx = ordered.findIndex((w) => w._id.toString() === startId);
    if (idx > 0) {
      const [preferred] = ordered.splice(idx, 1);
      ordered.unshift(preferred);
    }
  }

  for (const wallet of ordered) {
    if (remaining <= 0) break;

    const take = Math.min(wallet.availableBalance, remaining);
    if (take <= 0) continue;

    selected.push({
      walletId: wallet._id.toString(),
      walletName: wallet.name,
      walletType: wallet.type,
      amount: take,
      availableBalance: wallet.availableBalance,
    });

    remaining -= take;
  }

  if (remaining > 0) return null;

  const totalAmount = selected.reduce((s, w) => s + w.amount, 0);
  const score = 100 + (selected.length * WALLET_COUNT_PENALTY);

  return {
    wallets: selected,
    totalAmount,
    score,
    label: '',
  };
}

// ═══════════════════════════════════════════════════════════════
// MANUAL SPLIT VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a manually chosen wallet split against the required amount.
 *
 * @param {Object} params
 * @param {Array<{ walletId: string, amount: number }>} params.walletSelections
 *   - Manually selected wallets with amounts.
 * @param {number} params.requiredAmount - Required total in paisa.
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   totalSelected: number,
 *   deficit: number
 * }}
 */
function validateManualSplit({ walletSelections, requiredAmount }) {
  const errors = [];

  if (!Array.isArray(walletSelections) || walletSelections.length === 0) {
    errors.push('At least one wallet selection is required');
    return { valid: false, errors, totalSelected: 0, deficit: requiredAmount };
  }

  if (!Number.isInteger(requiredAmount) || requiredAmount <= 0) {
    errors.push('requiredAmount must be a positive integer (paisa)');
  }

  // Check for duplicate wallets
  const walletIds = walletSelections.map((s) => s.walletId);
  const uniqueIds = new Set(walletIds);
  if (uniqueIds.size !== walletIds.length) {
    errors.push('Duplicate wallet selections are not allowed');
  }

  // Validate individual entries
  let totalSelected = 0;
  walletSelections.forEach((selection, idx) => {
    if (!selection.walletId) {
      errors.push(`Selection [${idx}]: walletId is required`);
    }
    if (!Number.isInteger(selection.amount) || selection.amount <= 0) {
      errors.push(`Selection [${idx}]: amount must be a positive integer (paisa)`);
    } else {
      totalSelected += selection.amount;
    }
  });

  // Check total matches
  const deficit = requiredAmount - totalSelected;

  if (totalSelected < requiredAmount) {
    errors.push(
      `Total selected (${totalSelected}) is less than required (${requiredAmount}). Deficit: ${deficit} paisa`
    );
  }

  if (totalSelected > requiredAmount) {
    errors.push(
      `Total selected (${totalSelected}) exceeds required (${requiredAmount}) by ${-deficit} paisa`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    totalSelected,
    deficit: Math.max(0, deficit),
  };
}

module.exports = {
  suggestPayment,
  validateManualSplit,
};
