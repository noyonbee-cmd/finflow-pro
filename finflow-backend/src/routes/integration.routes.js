'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const integrationCtrl = require('../controllers/integration.controller');

/**
 * @module integration.routes
 * @description Integration API routes for FinFlow Pro.
 *
 * POST   /integrations/telegram/connect  — Connect Telegram bot (Admin)
 * POST   /integrations/telegram/test     — Test Telegram connection (Admin)
 * DELETE /integrations/telegram          — Disconnect Telegram (Admin)
 * PATCH  /integrations/notifications     — Toggle notification channels (Admin)
 * PATCH  /integrations/receipt-template  — Update receipt template (Admin)
 */

router.post(
  '/telegram/connect',
  authenticate,
  roleGuard('ADMIN'),
  integrationCtrl.connectTelegram
);

router.post(
  '/telegram/test',
  authenticate,
  roleGuard('ADMIN'),
  integrationCtrl.testTelegram
);

router.delete(
  '/telegram',
  authenticate,
  roleGuard('ADMIN'),
  integrationCtrl.disconnectTelegram
);

router.patch(
  '/notifications',
  authenticate,
  roleGuard('ADMIN'),
  integrationCtrl.updateNotificationSettings
);

router.patch(
  '/receipt-template',
  authenticate,
  roleGuard('ADMIN'),
  integrationCtrl.updateReceiptTemplate
);

module.exports = router;
