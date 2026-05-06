'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { transactionLimiter } = require('../middleware/rateLimiter');
const txnCtrl = require('../controllers/transaction.controller');

/**
 * @module transaction.routes
 * @description Transaction API routes for FinFlow Pro.
 *
 * POST   /transactions/calculate       — Fee preview (authenticated)
 * POST   /transactions/suggest-payment — Payment suggestion (authenticated)
 * POST   /transactions                 — Create transaction (Admin|Agent)
 * GET    /transactions                 — List transactions (Admin|Agent)
 * GET    /transactions/:id             — Single transaction (Admin|Agent)
 * PATCH  /transactions/:id             — Edit transaction (Admin only)
 * DELETE /transactions/:id/cancel      — Cancel transaction (Admin only)
 * GET    /transactions/:id/receipt     — Generate receipt (Admin|Agent)
 * POST   /transactions/:id/send-receipt — Send receipt (Admin)
 */

// ── Stateless endpoints (before :id routes) ────────────────────
router.post(
  '/calculate',
  authenticate,
  txnCtrl.calculateFeePreview
);

router.post(
  '/suggest-payment',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  txnCtrl.suggestPayment
);

// ── CRUD ───────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  transactionLimiter,
  txnCtrl.createTransaction
);

router.get(
  '/',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  txnCtrl.getTransactions
);

router.get(
  '/:id',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  txnCtrl.getTransaction
);

router.patch(
  '/:id',
  authenticate,
  roleGuard('ADMIN'),
  txnCtrl.editTransaction
);

router.delete(
  '/:id/cancel',
  authenticate,
  roleGuard('ADMIN'),
  txnCtrl.cancelTransaction
);

// ── Receipt ────────────────────────────────────────────────────
router.get(
  '/:id/receipt',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  txnCtrl.getTransactionReceipt
);

router.post(
  '/:id/send-receipt',
  authenticate,
  roleGuard('ADMIN'),
  txnCtrl.sendReceipt
);

module.exports = router;
