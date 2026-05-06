'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const walletCtrl = require('../controllers/wallet.controller');

/**
 * @module wallet.routes
 * @description Wallet API routes for FinFlow Pro (Admin only).
 *
 * GET    /wallets              — List all wallets
 * GET    /wallets/:id          — Single wallet detail
 * GET    /wallets/:id/ledger   — Paginated wallet ledger
 * PATCH  /wallets/:id          — Update wallet settings
 * POST   /wallets/:id/adjust   — Manual balance adjustment
 * POST   /wallets/transfer     — Inter-wallet transfer
 */

// Transfer must be before :id routes
router.post(
  '/transfer',
  authenticate,
  roleGuard('ADMIN'),
  walletCtrl.transferBetweenWallets
);

router.get(
  '/',
  authenticate,
  roleGuard('ADMIN'),
  walletCtrl.getWallets
);

router.get(
  '/:id',
  authenticate,
  roleGuard('ADMIN'),
  walletCtrl.getWallet
);

router.get(
  '/:id/ledger',
  authenticate,
  roleGuard('ADMIN'),
  walletCtrl.getWalletLedger
);

router.patch(
  '/:id',
  authenticate,
  roleGuard('ADMIN'),
  walletCtrl.updateWalletSettings
);

router.post(
  '/:id/adjust',
  authenticate,
  roleGuard('ADMIN'),
  walletCtrl.adjustWallet
);

module.exports = router;
