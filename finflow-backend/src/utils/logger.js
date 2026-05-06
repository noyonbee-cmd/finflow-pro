'use strict';

const path = require('path');
const winston = require('winston');

/**
 * @module logger
 * @description
 * Winston logger configuration for FinFlow Pro.
 *
 * Outputs structured JSON logs in production, colorized text in development.
 * Transports:
 *  - Console (always)
 *  - File: error.log  (errors only)
 *  - File: combined.log (all levels)
 *
 * All log entries include ISO timestamp, service name, and request context
 * when available (via child loggers).
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── Custom format: add service tag ───────────────────────────
const serviceFormat = winston.format((info) => {
  info.service = 'finflow-backend';
  return info;
});

// ─── Production format: structured JSON ───────────────────────
const productionFormat = winston.format.combine(
  serviceFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ─── Development format: colorized, human-readable ────────────
const developmentFormat = winston.format.combine(
  serviceFormat(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 2
      ? ` ${JSON.stringify(meta, null, 0)}`
      : '';
    return `${timestamp} ${level}: ${stack || message}${metaStr}`;
  })
);

// ─── Transports ───────────────────────────────────────────────
const transports = [
  new winston.transports.Console({
    handleExceptions: true,
    handleRejections: true,
  }),
];

// File transports only in non-test environments
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 20 * 1024 * 1024, // 20 MB
      maxFiles: 5,
      tailable: true,
    })
  );
}

// ─── Create logger instance ───────────────────────────────────
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: IS_PRODUCTION ? productionFormat : developmentFormat,
  transports,
  exitOnError: false,
});

/**
 * Create a child logger with additional default metadata.
 * Useful for attaching requestId, userId, etc. to all log entries.
 *
 * @param {Object} meta - Default metadata for the child logger.
 * @returns {winston.Logger} A child logger instance.
 */
logger.child = (meta) => {
  return winston.createLogger({
    level: LOG_LEVEL,
    format: IS_PRODUCTION ? productionFormat : developmentFormat,
    defaultMeta: meta,
    transports,
    exitOnError: false,
  });
};

module.exports = logger;
