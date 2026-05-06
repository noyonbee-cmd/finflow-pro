'use strict';

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * @module rateLimiter
 * @description
 * Express rate-limiting middleware for FinFlow Pro.
 *
 * Provides separate limiters for:
 *  - General API:       100 requests / 15 minutes per IP
 *  - Auth endpoints:      5 requests / 15 minutes per IP (strict)
 *  - Transaction:        30 requests / 1 minute per IP
 *
 * Uses in-memory store by default. For multi-instance deployments,
 * replace with rate-limit-redis store.
 *
 * All rate-limit violations are logged.
 */

/**
 * Build a standardized rate-limit response payload.
 *
 * @param {string} message - User-facing message.
 * @returns {Object}
 */
function buildRateLimitResponse(message) {
  return {
    success: false,
    message,
    errorCode: 'RATE_LIMIT_EXCEEDED',
  };
}

// ═══════════════════════════════════════════════════════════════
// GENERAL API RATE LIMITER
// ═══════════════════════════════════════════════════════════════

/**
 * 100 requests per 15 minutes per IP.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    logger.warn('General rate limit exceeded', { ip: _req.ip });
    return res.status(429).json(
      buildRateLimitResponse('Too many requests. Please try again later.')
    );
  },
});

// ═══════════════════════════════════════════════════════════════
// AUTH RATE LIMITER (Strict)
// ═══════════════════════════════════════════════════════════════

/**
 * 5 requests per 15 minutes per IP.
 * Applies to login, signup, refresh, and password reset endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: _req.ip,
      path: _req.originalUrl,
    });
    return res.status(429).json(
      buildRateLimitResponse(
        'Too many authentication attempts. Please wait 15 minutes before trying again.'
      )
    );
  },
});

// ═══════════════════════════════════════════════════════════════
// TRANSACTION RATE LIMITER
// ═══════════════════════════════════════════════════════════════

/**
 * 30 requests per 1 minute per IP.
 * Applies to transaction creation endpoints.
 */
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    logger.warn('Transaction rate limit exceeded', {
      ip: _req.ip,
      userId: _req.user?.id,
    });
    return res.status(429).json(
      buildRateLimitResponse(
        'Too many transaction requests. Please slow down.'
      )
    );
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  transactionLimiter,
};
