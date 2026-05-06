'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const agentCtrl = require('../controllers/agent.controller');

/**
 * @module agent.routes
 * @description Agent API routes for FinFlow Pro.
 *
 * POST   /agents/commission/request  — Agent requests payout (Agent only)
 * GET    /agents                     — List agents (Admin only)
 * GET    /agents/:id                 — Single agent (Admin only)
 * PATCH  /agents/:id                 — Update agent (Admin only)
 * GET    /agents/:id/commission      — Commission data (Admin + own Agent)
 * POST   /agents/:id/settle          — Settle commission (Admin only)
 */

// Agent-only: must be before :id routes
router.post(
  '/commission/request',
  authenticate,
  roleGuard('AGENT'),
  agentCtrl.requestCommissionPayout
);

router.get(
  '/',
  authenticate,
  roleGuard('ADMIN'),
  agentCtrl.getAgents
);

router.get(
  '/:id',
  authenticate,
  roleGuard('ADMIN'),
  agentCtrl.getAgent
);

router.patch(
  '/:id',
  authenticate,
  roleGuard('ADMIN'),
  agentCtrl.updateAgent
);

router.get(
  '/:id/commission',
  authenticate,
  roleGuard('ADMIN', 'AGENT'),
  agentCtrl.getAgentCommission
);

router.post(
  '/:id/settle',
  authenticate,
  roleGuard('ADMIN'),
  agentCtrl.settleAgentCommission
);

module.exports = router;
