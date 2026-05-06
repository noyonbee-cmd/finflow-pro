'use strict';

const express = require('express');
const router = express.Router();

const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  adminSignupSchema,
  adminLoginSchema,
  agentLoginSchema,
  agentRegisterSchema,
  refreshTokenSchema,
  adminSelfSetupSchema,
  adminCreateAgentSchema,
} = require('../validators/auth.validators');

const authController = require('../controllers/auth.controller');
const agentAuthController = require('../controllers/agentAuth.controller');

/**
 * @module auth.routes
 * @description
 * Authentication routes for FinFlow Pro.
 *
 * All auth endpoints are rate-limited (5 requests / 15 minutes per IP).
 *
 * Public routes:
 *  POST /api/v1/auth/admin/signup    → Register new admin
 *  POST /api/v1/auth/admin/login     → Admin login
 *  POST /api/v1/auth/agent/login     → Agent login
 *  POST /api/v1/auth/agent/register  → Agent self-registration
 *  POST /api/v1/auth/refresh         → Rotate tokens
 *
 * Protected routes:
 *  POST  /api/v1/auth/logout                         → Revoke refresh token
 *  PATCH /api/v1/auth/admin/setup                    → Complete admin profile
 *  POST  /api/v1/auth/admin/agents                   → Admin creates agent
 *  PATCH /api/v1/auth/admin/agents/:agentId/approve  → Admin approves agent
 *  PATCH /api/v1/auth/admin/agents/:agentId/suspend  → Admin suspends agent
 */

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES (with rate limiting)
// ═══════════════════════════════════════════════════════════════

// Admin signup
router.post(
  '/admin/signup',
  authLimiter,
  validate(adminSignupSchema),
  authController.adminSignup
);

// Admin login
router.post(
  '/admin/login',
  authLimiter,
  validate(adminLoginSchema),
  authController.adminLogin
);

// Agent login
router.post(
  '/agent/login',
  authLimiter,
  validate(agentLoginSchema),
  authController.agentLogin
);

// Agent self-registration
router.post(
  '/agent/register',
  authLimiter,
  validate(agentRegisterSchema),
  agentAuthController.agentSelfRegister
);

// Refresh token (rotate tokens)
router.post(
  '/refresh',
  authLimiter,
  validate(refreshTokenSchema),
  authController.refreshToken
);

// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTES
// ═══════════════════════════════════════════════════════════════

// Logout (requires authentication)
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// Admin self-setup (profile completion)
router.patch(
  '/admin/setup',
  authenticate,
  requireAdmin,
  validate(adminSelfSetupSchema),
  authController.adminSelfSetup
);

// Admin creates an agent directly
router.post(
  '/admin/agents',
  authenticate,
  requireAdmin,
  validate(adminCreateAgentSchema),
  agentAuthController.adminCreateAgent
);

// Admin approves a pending agent
router.patch(
  '/admin/agents/:agentId/approve',
  authenticate,
  requireAdmin,
  agentAuthController.adminApproveAgent
);

// Admin suspends an active agent
router.patch(
  '/admin/agents/:agentId/suspend',
  authenticate,
  requireAdmin,
  agentAuthController.adminSuspendAgent
);

module.exports = router;
