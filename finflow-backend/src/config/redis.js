'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * @module redis
 * @description
 * Redis (ioredis) client singleton for FinFlow Pro.
 *
 * Used by:
 *  - BullMQ job queues (notifications, reports)
 *  - Application-level caching (wallet balances, sessions)
 *  - Rate-limit counters
 *
 * Supports Upstash-style TLS connections via REDIS_TLS env var.
 * Includes reconnection strategy, error logging, and health check.
 */

/**
 * Build Redis connection options from environment variables.
 * @returns {import('ioredis').RedisOptions}
 */
function buildRedisOptions() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 500, 5000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNREFUSED', 'ECONNRESET'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  };
}

// ─── Create singleton client ──────────────────────────────────
let redisClient = null;

/**
 * Get or create the Redis client singleton.
 * @returns {import('ioredis').Redis}
 */
function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(buildRedisOptions());

    redisClient.on('connect', () => {
      logger.info('[Redis] ✔ Connected');
    });

    redisClient.on('ready', () => {
      logger.info('[Redis] ✔ Ready to accept commands');
    });

    redisClient.on('error', (err) => {
      logger.error('[Redis] ✘ Connection error', { error: err.message });
    });

    redisClient.on('close', () => {
      logger.warn('[Redis] ⚠ Connection closed');
    });
  }

  return redisClient;
}

/**
 * Get Redis connection options for BullMQ (does not create a client).
 * BullMQ creates its own connections internally.
 * @returns {Object} Connection options for BullMQ.
 */
function getBullMQConnection() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

/**
 * Gracefully disconnect the Redis client.
 * Call during application shutdown.
 * @returns {Promise<void>}
 */
async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('[Redis] ✔ Disconnected gracefully');
      redisClient = null;
    } catch (err) {
      logger.error('[Redis] ✘ Error during disconnect', { error: err.message });
      redisClient = null;
    }
  }
}

module.exports = {
  getRedisClient,
  getBullMQConnection,
  disconnectRedis,
};
