'use strict';

const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

/**
 * @module env
 * @description
 * Centralised environment variable loader with Joi validation.
 *
 * Loads variables from .env file and validates against a strict schema.
 * Fails fast on missing required variables — prevents runtime surprises.
 *
 * Usage:
 *   const config = require('./config/env');
 *   console.log(config.port); // 5000
 */

// Load .env file (only in non-production)
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

const envSchema = Joi.object({
  // ── Server ──────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(5000),
  API_PREFIX: Joi.string().default('/api/v1'),

  // ── MongoDB ─────────────────────────────────────────────────
  MONGODB_URI: Joi.string().required(),
  MONGODB_DB_NAME: Joi.string().default('finflow_pro'),

  // ── JWT ─────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(4).max(16).default(12),

  // ── Redis ───────────────────────────────────────────────────
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().integer().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_TLS: Joi.string().valid('true', 'false').default('false'),
  BULL_QUEUE_PREFIX: Joi.string().default('finflow'),

  // ── Cloudinary ──────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),
  CLOUDINARY_FOLDER: Joi.string().default('finflow-receipts'),

  // ── Twilio ──────────────────────────────────────────────────
  TWILIO_ACCOUNT_SID: Joi.string().allow('').default(''),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').default(''),
  TWILIO_SMS_FROM: Joi.string().allow('').default(''),
  TWILIO_WHATSAPP_FROM: Joi.string().allow('').default(''),

  // ── Telegram ────────────────────────────────────────────────
  TELEGRAM_BOT_TOKEN: Joi.string().allow('').default(''),
  TELEGRAM_WEBHOOK_URL: Joi.string().allow('').default(''),
  TELEGRAM_ADMIN_CHAT_ID: Joi.string().allow('').default(''),

  // ── Puppeteer ───────────────────────────────────────────────
  PUPPETEER_EXECUTABLE_PATH: Joi.string().allow('').default(''),
  PUPPETEER_HEADLESS: Joi.string().valid('true', 'false').default('true'),

  // ── Rate Limiting ───────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().default(100),
  AUTH_RATE_LIMIT_WINDOW_MS: Joi.number().integer().default(900000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().default(10),

  // ── CORS ────────────────────────────────────────────────────
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // ── Encryption ──────────────────────────────────────────────
  ENCRYPTION_KEY: Joi.string().min(16).required(),

  // ── Logging ─────────────────────────────────────────────────
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  LOG_FILE_PATH: Joi.string().default('./logs'),

  // ── Defaults ────────────────────────────────────────────────
  DEFAULT_FEE_PERCENT: Joi.number().min(0).max(100).default(1.5),
  DEFAULT_COMMISSION_PERCENT: Joi.number().min(0).max(100).default(0.5),
  DEFAULT_CURRENCY: Joi.string().default('BDT'),
  DEFAULT_CURRENCY_SYMBOL: Joi.string().default('৳'),
})
  .unknown(true); // Allow extra env vars (PATH, etc.)

const { error, value: validatedEnv } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  const details = error.details.map((d) => `  - ${d.message}`).join('\n');
  console.error(`\n❌ Environment validation failed:\n${details}\n`);
  process.exit(1);
}

/** @type {Object} Validated and typed environment configuration */
const config = {
  nodeEnv: validatedEnv.NODE_ENV,
  isProduction: validatedEnv.NODE_ENV === 'production',
  isDevelopment: validatedEnv.NODE_ENV === 'development',
  isTest: validatedEnv.NODE_ENV === 'test',
  port: validatedEnv.PORT,
  apiPrefix: validatedEnv.API_PREFIX,

  mongodb: {
    uri: validatedEnv.MONGODB_URI,
    dbName: validatedEnv.MONGODB_DB_NAME,
  },

  jwt: {
    accessSecret: validatedEnv.JWT_ACCESS_SECRET,
    refreshSecret: validatedEnv.JWT_REFRESH_SECRET,
    accessExpiresIn: validatedEnv.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: validatedEnv.JWT_REFRESH_EXPIRES_IN,
  },

  bcrypt: {
    saltRounds: validatedEnv.BCRYPT_SALT_ROUNDS,
  },

  redis: {
    host: validatedEnv.REDIS_HOST,
    port: validatedEnv.REDIS_PORT,
    password: validatedEnv.REDIS_PASSWORD,
    tls: validatedEnv.REDIS_TLS === 'true',
  },

  bull: {
    prefix: validatedEnv.BULL_QUEUE_PREFIX,
  },

  cloudinary: {
    cloudName: validatedEnv.CLOUDINARY_CLOUD_NAME,
    apiKey: validatedEnv.CLOUDINARY_API_KEY,
    apiSecret: validatedEnv.CLOUDINARY_API_SECRET,
    folder: validatedEnv.CLOUDINARY_FOLDER,
  },

  twilio: {
    accountSid: validatedEnv.TWILIO_ACCOUNT_SID,
    authToken: validatedEnv.TWILIO_AUTH_TOKEN,
    smsFrom: validatedEnv.TWILIO_SMS_FROM,
    whatsappFrom: validatedEnv.TWILIO_WHATSAPP_FROM,
  },

  telegram: {
    botToken: validatedEnv.TELEGRAM_BOT_TOKEN,
    webhookUrl: validatedEnv.TELEGRAM_WEBHOOK_URL,
    adminChatId: validatedEnv.TELEGRAM_ADMIN_CHAT_ID,
  },

  rateLimit: {
    windowMs: validatedEnv.RATE_LIMIT_WINDOW_MS,
    maxRequests: validatedEnv.RATE_LIMIT_MAX_REQUESTS,
    authWindowMs: validatedEnv.AUTH_RATE_LIMIT_WINDOW_MS,
    authMaxRequests: validatedEnv.AUTH_RATE_LIMIT_MAX_REQUESTS,
  },

  cors: {
    origin: validatedEnv.CORS_ORIGIN.split(',').map((s) => s.trim()),
  },

  encryption: {
    key: validatedEnv.ENCRYPTION_KEY,
  },

  logging: {
    level: validatedEnv.LOG_LEVEL,
    filePath: validatedEnv.LOG_FILE_PATH,
  },

  defaults: {
    feePercent: validatedEnv.DEFAULT_FEE_PERCENT,
    commissionPercent: validatedEnv.DEFAULT_COMMISSION_PERCENT,
    currency: validatedEnv.DEFAULT_CURRENCY,
    currencySymbol: validatedEnv.DEFAULT_CURRENCY_SYMBOL,
  },
};

module.exports = config;
