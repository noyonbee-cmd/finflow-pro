'use strict';

const logger = require('../utils/logger');

/**
 * @module errorHandler
 * @description
 * Global Express error-handling middleware for FinFlow Pro.
 *
 * Catches all unhandled errors thrown or passed via `next(err)` and
 * returns a consistent JSON error response. Handles known error types:
 *
 *  - Mongoose ValidationError  → 422 Unprocessable Entity
 *  - Mongoose CastError        → 400 Bad Request (invalid ObjectId)
 *  - MongoDB 11000             → 409 Conflict (duplicate key)
 *  - JWT errors                → 401 Unauthorized
 *  - Custom AppError           → dynamic status code
 *  - All others                → 500 Internal Server Error
 *
 * Stack traces are NEVER exposed in production.
 * All 5xx errors are logged at `error` level with full stack.
 */

/**
 * Custom application error class.
 * Throw this in services / controllers for known error conditions.
 *
 * @example
 *   throw new AppError('Insufficient wallet balance', 400, 'INSUFFICIENT_BALANCE');
 */
class AppError extends Error {
  /**
   * @param {string} message    - Human-readable error message.
   * @param {number} statusCode - HTTP status code.
   * @param {string} [errorCode] - Machine-readable error code.
   * @param {*}      [details]   - Additional error context.
   */
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Extract validation error details from a Mongoose ValidationError.
 * @param {import('mongoose').Error.ValidationError} err
 * @returns {Object[]}
 */
function formatValidationErrors(err) {
  return Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
    value: e.value,
  }));
}

/**
 * Global error handler middleware.
 * MUST be registered as the LAST middleware in the Express app.
 *
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || null;
  let details = err.details || null;

  // ── Custom AppError (checked first — most specific) ──────────
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
    details = err.details;
  }
  // ── Mongoose ValidationError ─────────────────────────────────
  else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 422;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    details = formatValidationErrors(err);
  }
  // ── Mongoose CastError (invalid ObjectId) ────────────────────
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    errorCode = 'INVALID_ID';
  }
  // ── MongoDB duplicate key (error code 11000) ─────────────────
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate value for field: ${field}`;
    errorCode = 'DUPLICATE_KEY';
    details = { field, value: err.keyValue };
  }
  // ── JWT errors ───────────────────────────────────────────────
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errorCode = 'INVALID_TOKEN';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // ── Log 5xx errors ──────────────────────────────────────────
  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      message: err.message,
      stack: err.stack,
      statusCode,
      errorCode,
    });
  }

  // ── Build response ──────────────────────────────────────────
  const response = {
    success: false,
    message,
  };

  if (errorCode) response.errorCode = errorCode;
  if (details) response.details = details;

  // Never expose stack traces in production
  if (!IS_PRODUCTION && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

module.exports = { errorHandler, AppError };
