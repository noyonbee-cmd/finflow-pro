'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const config = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// ── Route imports ─────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const transactionRoutes = require('./routes/transaction.routes');
const walletRoutes = require('./routes/wallet.routes');
const clientRoutes = require('./routes/client.routes');
const agentRoutes = require('./routes/agent.routes');
const reportRoutes = require('./routes/report.routes');
const integrationRoutes = require('./routes/integration.routes');
const telegramService = require('./services/telegramService');

/**
 * @module app
 * @description
 * FinFlow Pro — Express application bootstrap.
 *
 * Registers security middleware, rate limiters, API routes,
 * health check, 404 handler, and global error handler.
 */

const app = express();

// ═══════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

app.use(helmet());

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
}));

app.use(mongoSanitize());
app.use(hpp());

// ═══════════════════════════════════════════════════════════════
// PARSING & UTILITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ═══════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════

if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (_req, res) => res.statusCode < 400,
  }));
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════

app.use('/api', generalLimiter);

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'FinFlow Pro API is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

const API_PREFIX = config.apiPrefix || '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/transactions`, transactionRoutes);
app.use(`${API_PREFIX}/wallets`, walletRoutes);
app.use(`${API_PREFIX}/clients`, clientRoutes);
app.use(`${API_PREFIX}/agents`, agentRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/integrations`, integrationRoutes);

// ── Telegram Webhook (public — no auth) ───────────────────────
telegramService.setupWebhookRoute(app);

// ═══════════════════════════════════════════════════════════════
// 404 HANDLER
// ═══════════════════════════════════════════════════════════════

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${_req.method} ${_req.originalUrl}`,
    errorCode: 'ROUTE_NOT_FOUND',
  });
});

// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER (must be last)
// ═══════════════════════════════════════════════════════════════

app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected');

    const PORT = config.port || 5000;

    app.listen(PORT, () => {
      logger.info(`FinFlow Pro API server running on port ${PORT} [${config.nodeEnv}]`);
      console.log(`\n🚀 FinFlow Pro API ready at http://localhost:${PORT}`);
      console.log(`📋 Health check:    http://localhost:${PORT}/health`);
      console.log(`📡 API base:        http://localhost:${PORT}${API_PREFIX}\n`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    console.error('❌ Server startup failed:', err.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
  console.error('❌ Unhandled Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Graceful shutdown
const mongoose = require('mongoose');

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  logger.info('MongoDB connection closed.');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await mongoose.connection.close();
  logger.info('MongoDB connection closed.');
  process.exit(0);
});

startServer();

module.exports = app;
