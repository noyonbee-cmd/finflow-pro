'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('./env');
const logger = require('../utils/logger');

/**
 * @module jwt
 * @description
 * JWT token management for FinFlow Pro.
 *
 * Provides:
 *  - generateAccessToken(payload)  → short-lived access JWT (15 min)
 *  - generateRefreshToken(payload) → long-lived refresh JWT (7 days)
 *  - verifyToken(token, type)      → verify and decode a JWT
 *  - hashToken(token)              → SHA-256 hash for DB storage
 *
 * Access tokens use JWT_ACCESS_SECRET and are meant for API authorization.
 * Refresh tokens use JWT_REFRESH_SECRET and are rotated on every use.
 * Refresh tokens are hashed with SHA-256 before being stored in the database
 * so that a database breach does not compromise active sessions.
 *
 * Token Payloads:
 *  Admin: { sub: adminId, role: 'ADMIN', businessId: adminId }
 *  Agent: { sub: agentId, role: 'AGENT', adminId: adminId }
 */

/**
 * Generate a short-lived access token (default 15 minutes).
 *
 * @param {Object} payload - Token payload.
 * @param {string} payload.sub         - Subject (userId).
 * @param {string} payload.role        - 'ADMIN' or 'AGENT'.
 * @param {string} [payload.businessId] - Admin's own ID (admin tokens).
 * @param {string} [payload.adminId]    - Parent admin ID (agent tokens).
 * @returns {string} Signed JWT access token.
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
    issuer: 'finflow-pro',
    audience: 'finflow-api',
  });
}

/**
 * Generate a long-lived refresh token (default 7 days).
 *
 * @param {Object} payload - Token payload (same shape as access token).
 * @returns {string} Signed JWT refresh token.
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'finflow-pro',
    audience: 'finflow-api',
  });
}

/**
 * Verify a JWT and return the decoded payload.
 *
 * @param {string} token - The JWT string to verify.
 * @param {'access'|'refresh'} type - Token type determines which secret to use.
 * @returns {Object} Decoded token payload.
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError} On invalid/expired token.
 */
function verifyToken(token, type = 'access') {
  const secret = type === 'refresh' ? config.jwt.refreshSecret : config.jwt.accessSecret;

  return jwt.verify(token, secret, {
    issuer: 'finflow-pro',
    audience: 'finflow-api',
  });
}

/**
 * Hash a token using SHA-256 for secure database storage.
 * Never store raw tokens in the database.
 *
 * @param {string} token - Raw token string.
 * @returns {string} Hex-encoded SHA-256 hash.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse a duration string (e.g. '7d', '15m', '1h') into milliseconds.
 * Used to calculate expiresAt for refresh token storage.
 *
 * @param {string} durationStr - Duration string.
 * @returns {number} Duration in milliseconds.
 */
function parseDurationMs(durationStr) {
  const ms = require('ms');
  const result = ms(durationStr);
  if (!result) {
    logger.warn('Failed to parse duration string, defaulting to 7 days', { durationStr });
    return 7 * 24 * 60 * 60 * 1000;
  }
  return result;
}

/**
 * Generate a complete token pair (access + refresh) for a given payload.
 * Convenience wrapper around generateAccessToken + generateRefreshToken.
 *
 * @param {Object} payload - Token payload.
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function generateTokenPair(payload) {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashToken,
  parseDurationMs,
  generateTokenPair,
};
