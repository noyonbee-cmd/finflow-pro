'use strict';

const { Bot, webhookCallback } = require('grammy');
const logger = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * @module telegramService
 * @description
 * Telegram Bot integration service for FinFlow Pro using Grammy.js.
 *
 * Provides:
 *  - Bot instance creation & token validation via getMe API
 *  - Message sending with HTML/Markdown parse modes
 *  - Webhook setup for production deployments
 *  - Rich HTML message formatters for alerts & summaries
 *  - Admin bot command registration
 *  - Express webhook route handler
 *
 * All bot tokens are encrypted with AES-256-GCM before storage.
 * Failures are logged but never thrown for non-critical operations.
 */

// ─── Bot instance cache (botToken hash → Bot) ─────────────────
const botCache = new Map();

// ═══════════════════════════════════════════════════════════════
// BOT LIFECYCLE
// ═══════════════════════════════════════════════════════════════

/**
 * Create and configure a Grammy Bot instance from a plaintext token.
 * Validates the token by calling the Telegram getMe API.
 *
 * @param {string} botToken - The Telegram bot token.
 * @returns {Promise<import('grammy').Bot>} Configured Bot instance.
 * @throws {Error} If the token is invalid or getMe fails.
 */
async function createBot(botToken) {
  if (!botToken || typeof botToken !== 'string') {
    throw new Error('createBot() requires a valid bot token string');
  }

  // Return cached instance if available
  if (botCache.has(botToken)) {
    return botCache.get(botToken);
  }

  const bot = new Bot(botToken);

  // Validate token by calling getMe
  try {
    const me = await bot.api.getMe();
    logger.info('Telegram bot validated', {
      botUsername: me.username,
      botName: me.first_name,
    });
  } catch (err) {
    logger.error('Telegram bot token validation failed', { error: err.message });
    throw new Error(`Invalid Telegram bot token: ${err.message}`);
  }

  botCache.set(botToken, bot);
  return bot;
}

/**
 * Validate a Telegram bot token without caching the instance.
 *
 * @param {string} botToken - The Telegram bot token to validate.
 * @returns {Promise<{valid: boolean, botUsername: string, botName: string}>}
 * @throws {Error} If the token is invalid.
 */
async function validateToken(botToken) {
  if (!botToken || typeof botToken !== 'string') {
    throw new Error('validateToken() requires a non-empty bot token string');
  }

  try {
    const tempBot = new Bot(botToken);
    const me = await tempBot.api.getMe();

    return {
      valid: true,
      botUsername: me.username,
      botName: me.first_name,
    };
  } catch (err) {
    logger.warn('Telegram token validation failed', { error: err.message });
    throw new Error(`Invalid bot token: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE SENDING
// ═══════════════════════════════════════════════════════════════

/**
 * Send a message to a Telegram chat via bot.
 *
 * @param {Object} params
 * @param {string} params.botToken  - The Telegram bot token (plaintext).
 * @param {string} params.chatId    - The target chat ID.
 * @param {string} params.text      - Message text.
 * @param {string} [params.parseMode='HTML'] - 'HTML' or 'Markdown'.
 * @returns {Promise<{success: boolean, messageId: number}>}
 */
async function sendMessage({ botToken, chatId, text, parseMode = 'HTML' }) {
  if (!botToken || !chatId || !text) {
    logger.warn('sendMessage() called with missing params — skipping');
    return { success: false, messageId: null };
  }

  try {
    const bot = await createBot(botToken);
    const result = await bot.api.sendMessage(chatId, text, {
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });

    logger.info('Telegram message sent', {
      chatId,
      messageId: result.message_id,
    });

    return {
      success: true,
      messageId: result.message_id,
    };
  } catch (err) {
    logger.error('Failed to send Telegram message', {
      chatId,
      error: err.message,
    });

    return { success: false, messageId: null, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK SETUP
// ═══════════════════════════════════════════════════════════════

/**
 * Set up a webhook URL for a Telegram bot.
 *
 * @param {Object} params
 * @param {string} params.botToken   - The bot token (plaintext).
 * @param {string} params.webhookUrl - The full webhook URL.
 * @returns {Promise<{success: boolean}>}
 */
async function setWebhook({ botToken, webhookUrl }) {
  if (!botToken || !webhookUrl) {
    throw new Error('setWebhook() requires botToken and webhookUrl');
  }

  try {
    const bot = await createBot(botToken);
    await bot.api.setWebhook(webhookUrl, {
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query'],
    });

    logger.info('Telegram webhook set', { webhookUrl });
    return { success: true };
  } catch (err) {
    logger.error('Failed to set Telegram webhook', {
      webhookUrl,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Remove webhook for a Telegram bot (for disconnection).
 *
 * @param {string} botToken - The bot token (plaintext).
 * @returns {Promise<{success: boolean}>}
 */
async function removeWebhook(botToken) {
  try {
    const bot = await createBot(botToken);
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    botCache.delete(botToken);

    logger.info('Telegram webhook removed');
    return { success: true };
  } catch (err) {
    logger.error('Failed to remove Telegram webhook', { error: err.message });
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE FORMATTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format a currency amount from paisa to display string.
 * @param {number} paisa - Amount in paisa (integer).
 * @returns {string} Formatted amount string with ৳ prefix.
 */
function formatAmount(paisa) {
  const amount = (paisa / 100).toFixed(2);
  return `৳${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

/**
 * Format a transaction alert for Telegram.
 *
 * @param {Object} params
 * @param {'CR'|'DR'} params.type
 * @param {string} params.clientName
 * @param {number} params.amount    - Amount in paisa.
 * @param {number} params.fee       - Fee in paisa.
 * @param {number} params.profit    - Net profit in paisa.
 * @param {string} params.wallet
 * @param {string} [params.agentName]
 * @param {string} params.refId
 * @param {string} params.time
 * @returns {string} HTML-formatted message.
 */
function formatTransactionAlert({
  type,
  clientName,
  amount,
  fee,
  profit,
  wallet,
  agentName,
  refId,
  time,
}) {
  const emoji = type === 'CR' ? '📥' : '📤';
  const label = type === 'CR' ? 'CREDIT' : 'DEBIT';
  const profitEmoji = profit > 0 ? '🟢' : '🔴';

  return [
    `${emoji} <b>${label} TRANSACTION</b>`,
    '',
    `👤 <b>Client:</b> ${clientName}`,
    `💰 <b>Amount:</b> ${formatAmount(amount)}`,
    `📋 <b>Fee:</b> ${formatAmount(fee)}`,
    `${profitEmoji} <b>Profit:</b> ${formatAmount(profit)}`,
    `💳 <b>Wallet:</b> ${wallet}`,
    agentName ? `🧑‍💼 <b>Agent:</b> ${agentName}` : '',
    `🔖 <b>Ref:</b> <code>${refId}</code>`,
    `🕐 <b>Time:</b> ${time}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Format a low balance alert for Telegram.
 *
 * @param {Object} params
 * @param {string} params.walletName
 * @param {string} params.walletType
 * @param {number} params.currentBalance - In paisa.
 * @param {number} params.threshold      - In paisa.
 * @returns {string} HTML-formatted message.
 */
function formatLowBalanceAlert({ walletName, walletType, currentBalance, threshold }) {
  return [
    '⚠️ <b>LOW BALANCE ALERT</b>',
    '',
    `💳 <b>Wallet:</b> ${walletName} (${walletType})`,
    `💰 <b>Current:</b> ${formatAmount(currentBalance)}`,
    `📉 <b>Threshold:</b> ${formatAmount(threshold)}`,
    '',
    '⚡ <i>Please top up this wallet to avoid transaction failures.</i>',
  ].join('\n');
}

/**
 * Format a daily summary for Telegram.
 *
 * @param {Object} params
 * @param {string} params.date
 * @param {number} params.totalCR         - Total credit in paisa.
 * @param {number} params.totalDR         - Total debit in paisa.
 * @param {number} params.totalTransactions
 * @param {number} params.netProfit       - Net profit in paisa.
 * @param {string} params.topWallet
 * @returns {string} HTML-formatted message.
 */
function formatDailySummary({ date, totalCR, totalDR, totalTransactions, netProfit, topWallet }) {
  const profitEmoji = netProfit >= 0 ? '🟢' : '🔴';

  return [
    '📊 <b>DAILY SUMMARY</b>',
    `📅 <b>Date:</b> ${date}`,
    '',
    `📥 <b>Total CR:</b> ${formatAmount(totalCR)}`,
    `📤 <b>Total DR:</b> ${formatAmount(totalDR)}`,
    `📝 <b>Transactions:</b> ${totalTransactions}`,
    `${profitEmoji} <b>Net Profit:</b> ${formatAmount(netProfit)}`,
    '',
    `🏆 <b>Top Wallet:</b> ${topWallet}`,
    '',
    '<i>— FinFlow Pro Daily Report</i>',
  ].join('\n');
}

/**
 * Format a commission request notification for Telegram.
 *
 * @param {Object} params
 * @param {string} params.agentName
 * @param {number} params.amount    - Requested amount in paisa.
 * @param {string} params.requestId
 * @returns {string} HTML-formatted message.
 */
function formatCommissionRequest({ agentName, amount, requestId }) {
  return [
    '💸 <b>COMMISSION REQUEST</b>',
    '',
    `🧑‍💼 <b>Agent:</b> ${agentName}`,
    `💰 <b>Amount:</b> ${formatAmount(amount)}`,
    `🔖 <b>Request ID:</b> <code>${requestId}</code>`,
    '',
    `✅ Approve: /approve_${requestId}`,
    `❌ Reject: /reject_${requestId}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════
// ADMIN BOT COMMANDS
// ═══════════════════════════════════════════════════════════════

/**
 * Set up admin bot commands for a Grammy bot instance.
 *
 * Registered commands:
 *  /start              — Register chat ID
 *  /balance            — Show wallet balances
 *  /summary            — Today's summary
 *  /approve_{requestId} — Approve commission request
 *  /reject_{requestId}  — Reject commission request
 *
 * @param {import('grammy').Bot} bot - Grammy bot instance.
 * @param {Object} handlers - Command handler callbacks.
 * @param {Function} handlers.onStart    - (ctx, chatId) => void
 * @param {Function} handlers.onBalance  - (ctx, chatId) => void
 * @param {Function} handlers.onSummary  - (ctx, chatId) => void
 * @param {Function} handlers.onApprove  - (ctx, requestId) => void
 * @param {Function} handlers.onReject   - (ctx, requestId) => void
 */
function setupAdminBotCommands(bot, handlers = {}) {
  // Set command list for Telegram UI
  bot.api.setMyCommands([
    { command: 'start', description: 'Register this chat for notifications' },
    { command: 'balance', description: 'Show current wallet balances' },
    { command: 'summary', description: "Today's transaction summary" },
  ]).catch((err) => {
    logger.warn('Failed to set bot commands', { error: err.message });
  });

  // /start command — register chat ID
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    try {
      if (handlers.onStart) {
        await handlers.onStart(ctx, chatId);
      } else {
        await ctx.reply(
          '✅ <b>FinFlow Pro Bot Connected!</b>\n\n' +
          `Your Chat ID: <code>${chatId}</code>\n\n` +
          'You will receive transaction alerts and reports here.',
          { parse_mode: 'HTML' }
        );
      }
    } catch (err) {
      logger.error('Error in /start command', { chatId, error: err.message });
      await ctx.reply('❌ Something went wrong. Please try again.');
    }
  });

  // /balance command
  bot.command('balance', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    try {
      if (handlers.onBalance) {
        await handlers.onBalance(ctx, chatId);
      } else {
        await ctx.reply('📊 Wallet balance feature not configured yet.');
      }
    } catch (err) {
      logger.error('Error in /balance command', { chatId, error: err.message });
      await ctx.reply('❌ Failed to retrieve balances.');
    }
  });

  // /summary command
  bot.command('summary', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    try {
      if (handlers.onSummary) {
        await handlers.onSummary(ctx, chatId);
      } else {
        await ctx.reply('📊 Summary feature not configured yet.');
      }
    } catch (err) {
      logger.error('Error in /summary command', { chatId, error: err.message });
      await ctx.reply('❌ Failed to retrieve summary.');
    }
  });

  // /approve_{requestId} and /reject_{requestId} — pattern matching
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;

    // Match /approve_XXXXX
    const approveMatch = text.match(/^\/approve_([a-zA-Z0-9]+)$/);
    if (approveMatch) {
      const requestId = approveMatch[1];
      try {
        if (handlers.onApprove) {
          await handlers.onApprove(ctx, requestId);
        } else {
          await ctx.reply(`✅ Approving commission request: ${requestId}`);
        }
      } catch (err) {
        logger.error('Error in /approve command', { requestId, error: err.message });
        await ctx.reply('❌ Failed to approve request.');
      }
      return;
    }

    // Match /reject_XXXXX
    const rejectMatch = text.match(/^\/reject_([a-zA-Z0-9]+)$/);
    if (rejectMatch) {
      const requestId = rejectMatch[1];
      try {
        if (handlers.onReject) {
          await handlers.onReject(ctx, requestId);
        } else {
          await ctx.reply(`❌ Rejecting commission request: ${requestId}`);
        }
      } catch (err) {
        logger.error('Error in /reject command', { requestId, error: err.message });
        await ctx.reply('❌ Failed to reject request.');
      }
    }
  });

  logger.info('Admin bot commands registered');
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK HANDLER (Express middleware)
// ═══════════════════════════════════════════════════════════════

/**
 * Create an Express route handler for incoming Telegram webhook updates.
 *
 * Route: POST /webhooks/telegram/:adminId
 *
 * Looks up the admin's encrypted bot token from Settings, decrypts it,
 * creates a Bot instance, and delegates to Grammy's webhookCallback.
 *
 * @param {import('express').Router} router - Express router to attach to.
 */
function setupWebhookRoute(router) {
  const { Settings } = require('../models');

  router.post('/webhooks/telegram/:adminId', async (req, res) => {
    const { adminId } = req.params;

    try {
      // Look up admin's bot token (encrypted)
      const settings = await Settings.findOne({ adminId })
        .select('+notifications.telegramBotToken')
        .lean();

      if (!settings || !settings.notifications?.telegramBotToken) {
        logger.warn('Telegram webhook received for admin without bot token', { adminId });
        return res.sendStatus(200); // Acknowledge to Telegram
      }

      // Decrypt bot token
      const botToken = decrypt(settings.notifications.telegramBotToken);
      const bot = await createBot(botToken);

      // Delegate to Grammy webhook handler
      const handler = webhookCallback(bot, 'express');
      return handler(req, res);
    } catch (err) {
      logger.error('Telegram webhook processing error', {
        adminId,
        error: err.message,
      });
      // Always respond 200 to Telegram to prevent retry floods
      return res.sendStatus(200);
    }
  });

  logger.info('Telegram webhook route registered: POST /webhooks/telegram/:adminId');
}

// ═══════════════════════════════════════════════════════════════
// TOKEN ENCRYPTION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Encrypt a bot token for secure storage.
 * @param {string} botToken - Plaintext token.
 * @returns {string} Encrypted token string.
 */
function encryptToken(botToken) {
  return encrypt(botToken);
}

/**
 * Decrypt a stored bot token.
 * @param {string} encryptedToken - Encrypted token string.
 * @returns {string} Plaintext token.
 */
function decryptToken(encryptedToken) {
  return decrypt(encryptedToken);
}

module.exports = {
  createBot,
  validateToken,
  sendMessage,
  setWebhook,
  removeWebhook,
  formatTransactionAlert,
  formatLowBalanceAlert,
  formatDailySummary,
  formatCommissionRequest,
  formatAmount,
  setupAdminBotCommands,
  setupWebhookRoute,
  encryptToken,
  decryptToken,
};
