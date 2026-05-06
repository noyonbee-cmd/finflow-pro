'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const clientCtrl = require('../controllers/client.controller');

/**
 * @module client.routes
 * @description Client API routes for FinFlow Pro.
 *
 * GET    /clients                   — List clients (Admin + Agent filtered)
 * POST   /clients                   — Create client (Admin + Agent w/ permission)
 * GET    /clients/:id               — Single client (Admin + Agent)
 * PATCH  /clients/:id               — Update client (Admin all, Agent limited)
 * DELETE /clients/:id/archive       — Archive client (Admin only)
 * GET    /clients/:id/transactions  — Client transactions (Admin + Agent)
 */

router.get(
  '/',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  clientCtrl.getClients
);

router.post(
  '/',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  clientCtrl.createClient
);

router.get(
  '/:id',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  clientCtrl.getClient
);

router.patch(
  '/:id',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  clientCtrl.updateClient
);

router.delete(
  '/:id/archive',
  authenticate,
  roleGuard('ADMIN'),
  clientCtrl.archiveClient
);

router.get(
  '/:id/transactions',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  clientCtrl.getClientTransactions
);

module.exports = router;
