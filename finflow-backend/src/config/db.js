'use strict';

const mongoose = require('mongoose');

/**
 * @module db
 * @description
 * MongoDB Atlas connection manager for FinFlow Pro.
 *
 * Features:
 *  - Connects to MongoDB Atlas using MONGODB_URI from environment
 *  - Automatic retry logic (3 attempts, 5-second delay between retries)
 *  - Comprehensive connection event logging
 *  - Graceful shutdown handlers for SIGINT and SIGTERM
 *  - Mongoose 8 strict query mode and proper connection options
 *
 * Usage:
 *   const connectDB = require('./config/db');
 *   await connectDB();
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Wait for a specified duration.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect to MongoDB Atlas with retry logic.
 *
 * Attempts connection up to MAX_RETRIES times with RETRY_DELAY_MS
 * between each attempt. Throws on final failure so the process
 * can exit cleanly.
 *
 * @returns {Promise<mongoose.Connection>} The active Mongoose connection.
 * @throws {Error} If all connection attempts fail.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[DB] ✘ MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  /** @type {mongoose.ConnectOptions} */
  const options = {
    // Mongoose 8 defaults are sensible; we only override what we need
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4 (avoids IPv6 issues on some hosts)
    autoIndex: process.env.NODE_ENV !== 'production', // Disable auto-index in prod
  };

  // ── Connection event listeners ────────────────────────────────
  mongoose.connection.on('connected', () => {
    console.log('[DB] ✔ MongoDB connection established successfully');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DB] ✘ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] ⚠ MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[DB] ↻ MongoDB reconnected');
  });

  // ── Retry loop ────────────────────────────────────────────────
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[DB] → Connection attempt ${attempt}/${MAX_RETRIES}...`
      );
      await mongoose.connect(uri, options);

      const { host, port, name } = mongoose.connection;
      console.log(`[DB] ✔ Connected to database "${name}" at ${host}:${port}`);

      return mongoose.connection;
    } catch (err) {
      console.error(
        `[DB] ✘ Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`
      );

      if (attempt < MAX_RETRIES) {
        console.log(
          `[DB] ↻ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`
        );
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error('[DB] ✘ All connection attempts exhausted. Exiting.');
        throw err;
      }
    }
  }
}

// ─── Graceful Shutdown ──────────────────────────────────────────

/**
 * Close the MongoDB connection gracefully.
 * @param {string} signal - The signal that triggered the shutdown.
 */
async function gracefulShutdown(signal) {
  console.log(`\n[DB] ⏻ Received ${signal}. Closing MongoDB connection...`);

  try {
    await mongoose.connection.close();
    console.log('[DB] ✔ MongoDB connection closed gracefully');
    process.exit(0);
  } catch (err) {
    console.error('[DB] ✘ Error during graceful shutdown:', err.message);
    process.exit(1);
  }
}

// Register shutdown handlers (idempotent — safe to require multiple times)
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = connectDB;
