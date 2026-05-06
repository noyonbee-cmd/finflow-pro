'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { AppError } = require('../middleware/errorHandler');
const { Admin, Agent, User, RefreshToken } = require('../models');
const { getRedisClient } = require('../config/redis');

/**
 * @module agentAuth.controller
 * @description
 * Agent authentication lifecycle controller for FinFlow Pro.
 *
 * Handles:
 *  - agentSelfRegister    → Agent registers with an admin's unique code
 *  - adminCreateAgent     → Admin creates an agent directly
 *  - adminApproveAgent    → Admin approves a pending agent
 *  - adminSuspendAgent    → Admin suspends an active agent
 *
 * Security:
 *  - Agent self-registration requires a valid adminCode
 *  - Admin-created agents get auto-generated temporary passwords
 *  - Status transitions invalidate the Redis agent status cache
 *  - All events logged with IP and actor info
 */

// ─── Redis key prefix for agent status cache ──────────────────
const AGENT_STATUS_PREFIX = 'agent:status:';

/**
 * Generate a cryptographically random temporary password.
 *
 * @param {number} [length=12] - Password length.
 * @returns {string} Random password string.
 */
function generateTempPassword(length = 12) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

/**
 * Invalidate agent status cache in Redis.
 *
 * @param {string} agentId - Agent document ID.
 */
async function invalidateAgentStatusCache(agentId) {
  try {
    const redis = getRedisClient();
    await redis.del(`${AGENT_STATUS_PREFIX}${agentId}`);
  } catch (err) {
    logger.warn('Failed to invalidate agent status cache', {
      agentId,
      error: err.message,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT SELF-REGISTER
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/agent/register
 *
 * Agent self-registers using an admin's unique code.
 *
 * Steps:
 *  1. Validate input (handled by middleware)
 *  2. Look up admin by adminCode (admin._id or a dedicated code field)
 *  3. Check phone uniqueness within the admin's scope
 *  4. Create User document (for authentication)
 *  5. Create Agent document (status: PENDING_APPROVAL)
 *  6. Link Agent.userId to User
 *  7. Notify admin (fire-and-forget)
 *  8. Return agent data
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function agentSelfRegister(req, res) {
  const session = await mongoose.startSession();

  try {
    const { name, phone, password, adminCode } = req.body;

    let agent, user;

    await session.withTransaction(async () => {
      // ── Step 2: Look up admin by adminCode ────────────────────
      // adminCode is the admin's _id hex string (shareable unique code)
      let admin = null;

      if (mongoose.Types.ObjectId.isValid(adminCode)) {
        admin = await Admin.findOne({
          _id: new mongoose.Types.ObjectId(adminCode),
          status: 'ACTIVE',
        })
          .session(session)
          .lean();
      }

      if (!admin) {
        throw new AppError(
          'Invalid admin code. Please verify the code and try again.',
          400,
          'INVALID_ADMIN_CODE'
        );
      }

      // ── Step 3: Check phone uniqueness within admin scope ─────
      const existingAgent = await Agent.findOne({
        adminId: admin._id,
        phone,
      })
        .session(session)
        .lean();

      if (existingAgent) {
        throw new AppError(
          'An agent with this phone number already exists for this business.',
          409,
          'PHONE_EXISTS'
        );
      }

      // ── Step 4: Create User doc ───────────────────────────────
      // Generate a placeholder email for agents registering with phone only
      const placeholderEmail = `agent_${phone.replace(/\+/g, '')}@finflow.local`;

      const userDocs = await User.create(
        [
          {
            name,
            email: placeholderEmail,
            phone,
            password,
            role: 'AGENT',
            roleRef: new mongoose.Types.ObjectId(), // Placeholder, updated below
            isActive: true,
          },
        ],
        { session }
      );
      user = userDocs[0];

      // ── Step 5: Create Agent doc ──────────────────────────────
      const agentDocs = await Agent.create(
        [
          {
            adminId: admin._id,
            userId: user._id,
            name,
            phone,
            status: 'PENDING_APPROVAL',
            commissionPercent: 0,
          },
        ],
        { session }
      );
      agent = agentDocs[0];

      // ── Step 6: Update User.roleRef to point to Agent ─────────
      user.roleRef = agent._id;
      await user.save({ session, validateModifiedOnly: true });
    });

    // ── Step 7: Notify admin (fire-and-forget) ────────────────
    try {
      const { queueNotification } = require('../services/notificationService');
      queueNotification({
        adminId: agent.adminId.toString(),
        recipientId: agent.adminId.toString(),
        recipientType: 'ADMIN',
        type: 'AGENT_REGISTRATION',
        title: 'New Agent Registration',
        body: `${name} (${phone}) has requested to join your business as an agent.`,
        data: {
          agentId: agent._id.toString(),
          agentName: name,
          agentPhone: phone,
        },
        channels: ['IN_APP', 'TELEGRAM'],
      }).catch((notifErr) => {
        logger.error('Failed to send agent registration notification', {
          agentId: agent._id.toString(),
          error: notifErr.message,
        });
      });
    } catch (notifImportErr) {
      logger.warn('Notification service not available', {
        error: notifImportErr.message,
      });
    }

    // ── Log event ─────────────────────────────────────────────
    logger.info('Agent self-registration submitted', {
      agentId: agent._id.toString(),
      adminId: agent.adminId.toString(),
      phone,
      ip: req.ip,
      event: 'AGENT_SELF_REGISTER',
    });

    return ApiResponse.success(
      res,
      {
        agent: {
          id: agent._id,
          name: agent.name,
          phone: agent.phone,
          status: agent.status,
        },
        message: 'Registration submitted. Please wait for admin approval.',
      },
      'Registration submitted successfully',
      201
    );
  } catch (err) {
    if (err instanceof AppError) {
      return ApiResponse.error(res, err.message, err.statusCode, err.errorCode);
    }

    if (err.code === 11000) {
      return ApiResponse.error(
        res,
        'An agent with this phone number already exists.',
        409,
        'PHONE_EXISTS'
      );
    }

    logger.error('Agent self-registration failed', {
      phone: req.body?.phone,
      ip: req.ip,
      error: err.message,
      event: 'AGENT_SELF_REGISTER_FAILED',
    });

    return ApiResponse.error(
      res,
      'Registration failed. Please try again.',
      500,
      'REGISTRATION_FAILED'
    );
  } finally {
    await session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN CREATE AGENT
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/admin/agents (Admin only)
 *
 * Admin creates an agent directly with auto-generated credentials.
 *
 * Steps:
 *  1. Validate input
 *  2. Check phone uniqueness within admin scope
 *  3. Generate temp password
 *  4. Create User doc
 *  5. Create Agent doc (status: ACTIVE immediately)
 *  6. Return agent credentials for admin to share
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function adminCreateAgent(req, res) {
  const session = await mongoose.startSession();

  try {
    const adminId = req.user.id;
    const { name, phone, email, commissionPercent = 0 } = req.body;

    let agent, user;
    const tempPassword = generateTempPassword();

    await session.withTransaction(async () => {
      // ── Check phone uniqueness ────────────────────────────────
      const existingAgent = await Agent.findOne({
        adminId: new mongoose.Types.ObjectId(adminId),
        phone,
      })
        .session(session)
        .lean();

      if (existingAgent) {
        throw new AppError(
          'An agent with this phone number already exists.',
          409,
          'PHONE_EXISTS'
        );
      }

      // ── Create User doc ───────────────────────────────────────
      const agentEmail = email || `agent_${phone.replace(/\+/g, '')}@finflow.local`;

      const userDocs = await User.create(
        [
          {
            name,
            email: agentEmail,
            phone,
            password: tempPassword,
            role: 'AGENT',
            roleRef: new mongoose.Types.ObjectId(), // Placeholder
            isActive: true,
          },
        ],
        { session }
      );
      user = userDocs[0];

      // ── Create Agent doc ──────────────────────────────────────
      const agentDocs = await Agent.create(
        [
          {
            adminId: new mongoose.Types.ObjectId(adminId),
            userId: user._id,
            name,
            phone,
            email: email || undefined,
            commissionPercent,
            status: 'ACTIVE',
            approvedAt: new Date(),
            approvedBy: new mongoose.Types.ObjectId(adminId),
          },
        ],
        { session }
      );
      agent = agentDocs[0];

      // Update User.roleRef
      user.roleRef = agent._id;
      await user.save({ session, validateModifiedOnly: true });
    });

    logger.info('Agent created by admin', {
      adminId,
      agentId: agent._id.toString(),
      phone,
      ip: req.ip,
      event: 'ADMIN_CREATE_AGENT',
    });

    return ApiResponse.success(
      res,
      {
        agent: {
          id: agent._id,
          name: agent.name,
          phone: agent.phone,
          email: agent.email,
          commissionPercent: agent.commissionPercent,
          status: agent.status,
        },
        credentials: {
          phone,
          temporaryPassword: tempPassword,
          note: 'Share these credentials securely with the agent. They should change their password on first login.',
        },
      },
      'Agent created successfully',
      201
    );
  } catch (err) {
    if (err instanceof AppError) {
      return ApiResponse.error(res, err.message, err.statusCode, err.errorCode);
    }

    if (err.code === 11000) {
      return ApiResponse.error(
        res,
        'An agent with this phone number already exists.',
        409,
        'PHONE_EXISTS'
      );
    }

    logger.error('Admin create agent failed', {
      adminId: req.user?.id,
      ip: req.ip,
      error: err.message,
      event: 'ADMIN_CREATE_AGENT_FAILED',
    });

    return ApiResponse.error(
      res,
      'Failed to create agent. Please try again.',
      500,
      'CREATE_AGENT_FAILED'
    );
  } finally {
    await session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN APPROVE AGENT
// ═══════════════════════════════════════════════════════════════

/**
 * PATCH /api/v1/auth/admin/agents/:agentId/approve (Admin only)
 *
 * Approve a pending agent registration.
 *
 * Transition: PENDING_APPROVAL → ACTIVE
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function adminApproveAgent(req, res) {
  try {
    const adminId = req.user.id;
    const { agentId } = req.params;

    const agent = await Agent.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(agentId),
        adminId: new mongoose.Types.ObjectId(adminId),
        status: 'PENDING_APPROVAL',
      },
      {
        $set: {
          status: 'ACTIVE',
          approvedAt: new Date(),
          approvedBy: new mongoose.Types.ObjectId(adminId),
        },
      },
      { new: true }
    );

    if (!agent) {
      return ApiResponse.error(
        res,
        'Agent not found or is not in pending approval status.',
        404,
        'AGENT_NOT_FOUND'
      );
    }

    // Invalidate Redis cache
    await invalidateAgentStatusCache(agentId);

    // Notify agent (fire-and-forget)
    try {
      const { queueNotification } = require('../services/notificationService');
      queueNotification({
        adminId,
        recipientId: agentId,
        recipientType: 'AGENT',
        type: 'AGENT_APPROVED',
        title: 'Account Approved',
        body: 'Your agent account has been approved. You can now log in and start processing transactions.',
        data: { agentId },
        channels: ['IN_APP', 'TELEGRAM'],
      }).catch((notifErr) => {
        logger.error('Failed to send agent approval notification', {
          agentId,
          error: notifErr.message,
        });
      });
    } catch (notifImportErr) {
      logger.warn('Notification service not available', {
        error: notifImportErr.message,
      });
    }

    logger.info('Agent approved', {
      adminId,
      agentId,
      ip: req.ip,
      event: 'ADMIN_APPROVE_AGENT',
    });

    return ApiResponse.success(
      res,
      {
        agent: {
          id: agent._id,
          name: agent.name,
          phone: agent.phone,
          status: agent.status,
          approvedAt: agent.approvedAt,
        },
      },
      'Agent approved successfully'
    );
  } catch (err) {
    logger.error('Admin approve agent failed', {
      adminId: req.user?.id,
      agentId: req.params?.agentId,
      ip: req.ip,
      error: err.message,
      event: 'ADMIN_APPROVE_AGENT_FAILED',
    });

    return ApiResponse.error(
      res,
      'Failed to approve agent. Please try again.',
      500,
      'APPROVE_FAILED'
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN SUSPEND AGENT
// ═══════════════════════════════════════════════════════════════

/**
 * PATCH /api/v1/auth/admin/agents/:agentId/suspend (Admin only)
 *
 * Suspend an active agent.
 *
 * Transition: ACTIVE → SUSPENDED
 * Also revokes all active refresh tokens for the agent.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function adminSuspendAgent(req, res) {
  try {
    const adminId = req.user.id;
    const { agentId } = req.params;

    const agent = await Agent.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(agentId),
        adminId: new mongoose.Types.ObjectId(adminId),
        status: 'ACTIVE',
      },
      {
        $set: { status: 'SUSPENDED' },
      },
      { new: true }
    );

    if (!agent) {
      return ApiResponse.error(
        res,
        'Agent not found or is not currently active.',
        404,
        'AGENT_NOT_FOUND'
      );
    }

    // Revoke all active refresh tokens for the suspended agent
    await RefreshToken.updateMany(
      { userId: new mongoose.Types.ObjectId(agentId), userType: 'AGENT', isRevoked: false },
      { isRevoked: true }
    );

    // Invalidate Redis cache
    await invalidateAgentStatusCache(agentId);

    // Notify agent (fire-and-forget)
    try {
      const { queueNotification } = require('../services/notificationService');
      queueNotification({
        adminId,
        recipientId: agentId,
        recipientType: 'AGENT',
        type: 'AGENT_SUSPENDED',
        title: 'Account Suspended',
        body: 'Your agent account has been suspended. Contact your administrator for more information.',
        data: { agentId },
        channels: ['IN_APP', 'TELEGRAM'],
      }).catch((notifErr) => {
        logger.error('Failed to send agent suspension notification', {
          agentId,
          error: notifErr.message,
        });
      });
    } catch (notifImportErr) {
      logger.warn('Notification service not available', {
        error: notifImportErr.message,
      });
    }

    logger.info('Agent suspended', {
      adminId,
      agentId,
      ip: req.ip,
      event: 'ADMIN_SUSPEND_AGENT',
    });

    return ApiResponse.success(
      res,
      {
        agent: {
          id: agent._id,
          name: agent.name,
          phone: agent.phone,
          status: agent.status,
        },
      },
      'Agent suspended successfully'
    );
  } catch (err) {
    logger.error('Admin suspend agent failed', {
      adminId: req.user?.id,
      agentId: req.params?.agentId,
      ip: req.ip,
      error: err.message,
      event: 'ADMIN_SUSPEND_AGENT_FAILED',
    });

    return ApiResponse.error(
      res,
      'Failed to suspend agent. Please try again.',
      500,
      'SUSPEND_FAILED'
    );
  }
}

module.exports = {
  agentSelfRegister,
  adminCreateAgent,
  adminApproveAgent,
  adminSuspendAgent,
};
