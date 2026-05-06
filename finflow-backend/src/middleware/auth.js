'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');
const { Agent } = require('../models');

/**
 * @module auth
 * @description
 * Authentication and authorization middleware for FinFlow Pro.
 *
 * Provides:
 *  - authenticate       → Verify JWT access token from Authorization header
 *  - requireAdmin       → Enforce ADMIN role
 *  - requireAgent       → Enforce AGENT role
 *  - requireActiveAgent → Verify agent status is ACTIVE (cached in Redis, 60s TTL)
 *
 * JWT payload structure:
 *  Admin: { sub, role: 'ADMIN', businessId }
 *  Agent: { sub, role: 'AGENT', adminId }
 */

// ─── Redis key prefix for agent status cache ──────────────────
const AGENT_STATUS_PREFIX = 'agent:status:';
const AGENT_STATUS_TTL = 60; // seconds

/**
 * Extract Bearer token from Authorization header.
 *
 * @param {import('express').Request} req
 * @returns {string|null} Token string or null.
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
}

/**
 * authenticate — Verify JWT access token.
 *
 * Extracts Bearer token from the Authorization header, verifies
 * the JWT signature and expiration, and attaches the decoded payload
 * to `req.user`.
 *
 * Decoded payload shape:
 *  { sub, role, businessId?, adminId?, iat, exp }
 *
 * Mapped to req.user as:
 *  { id: sub, role, businessId?, adminId? }
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticate(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid access token.',
      errorCode: 'AUTH_REQUIRED',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret, {
      issuer: 'finflow-pro',
      audience: 'finflow-api',
    });

    // Map JWT payload to a consistent req.user shape
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      businessId: decoded.businessId || null,
      adminId: decoded.adminId || null,
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token has expired. Please refresh your token.',
        errorCode: 'TOKEN_EXPIRED',
      });
    }

    logger.warn('JWT verification failed', {
      error: err.message,
      ip: req.ip,
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      errorCode: 'INVALID_TOKEN',
    });
  }
}

/**
 * requireAdmin — Enforce that the authenticated user has ADMIN role.
 *
 * Must be used AFTER authenticate middleware.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
      errorCode: 'ADMIN_REQUIRED',
    });
  }
  return next();
}

/**
 * requireAgent — Enforce that the authenticated user has AGENT role.
 *
 * Must be used AFTER authenticate middleware.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAgent(req, res, next) {
  if (!req.user || req.user.role !== 'AGENT') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Agent privileges required.',
      errorCode: 'AGENT_REQUIRED',
    });
  }
  return next();
}

/**
 * requireActiveAgent — Verify the agent's status is ACTIVE in the database.
 *
 * Uses Redis caching with a 60-second TTL to avoid hitting MongoDB
 * on every request. If the agent is SUSPENDED or PENDING_APPROVAL,
 * access is denied.
 *
 * If Redis is unavailable, falls back to a direct MongoDB query.
 *
 * Must be used AFTER authenticate + requireAgent middlewares.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function requireActiveAgent(req, res, next) {
  if (!req.user || req.user.role !== 'AGENT') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Agent privileges required.',
      errorCode: 'AGENT_REQUIRED',
    });
  }

  const agentId = req.user.id;
  const cacheKey = `${AGENT_STATUS_PREFIX}${agentId}`;

  try {
    // ── Try Redis cache first ─────────────────────────────────
    let status = null;

    try {
      const redis = getRedisClient();
      status = await redis.get(cacheKey);
    } catch (redisErr) {
      logger.warn('Redis unavailable for agent status check, falling back to DB', {
        agentId,
        error: redisErr.message,
      });
    }

    // ── Cache miss — query MongoDB ────────────────────────────
    if (!status) {
      const agent = await Agent.findById(agentId).select('status').lean();

      if (!agent) {
        return res.status(403).json({
          success: false,
          message: 'Agent account not found.',
          errorCode: 'AGENT_NOT_FOUND',
        });
      }

      status = agent.status;

      // Cache the status in Redis (fire-and-forget)
      try {
        const redis = getRedisClient();
        await redis.setex(cacheKey, AGENT_STATUS_TTL, status);
      } catch (cacheSetErr) {
        logger.warn('Failed to cache agent status in Redis', {
          agentId,
          error: cacheSetErr.message,
        });
      }
    }

    // ── Check status ──────────────────────────────────────────
    if (status !== 'ACTIVE') {
      const statusMessages = {
        SUSPENDED: 'Your agent account has been suspended. Contact your administrator.',
        PENDING_APPROVAL: 'Your agent account is pending approval from the administrator.',
      };

      return res.status(403).json({
        success: false,
        message: statusMessages[status] || 'Agent account is not active.',
        errorCode: 'AGENT_NOT_ACTIVE',
      });
    }

    return next();
  } catch (err) {
    logger.error('Agent status check failed', {
      agentId,
      error: err.message,
    });

    return res.status(500).json({
      success: false,
      message: 'Unable to verify agent status. Please try again.',
      errorCode: 'STATUS_CHECK_FAILED',
    });
  }
}

module.exports = {
  authenticate,
  requireAdmin,
  requireAgent,
  requireActiveAgent,
};
