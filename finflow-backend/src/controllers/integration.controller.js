'use strict';

const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { AppError } = require('../middleware/errorHandler');
const { encrypt, decrypt } = require('../utils/encryption');
const telegramService = require('../services/telegramService');
const Settings = require('../models/Settings');

/**
 * @module integration.controller
 * @description
 * Integration management controller for FinFlow Pro.
 *
 * Handles Telegram bot connection/disconnection, notification
 * settings toggles, and receipt template customization.
 */

// ═══════════════════════════════════════════════════════════════
// TELEGRAM
// ═══════════════════════════════════════════════════════════════

/**
 * POST /integrations/telegram/connect
 * Connect a Telegram bot for the admin.
 */
async function connectTelegram(req, res, next) {
  try {
    const adminId = req.user.id;
    const { botToken, chatId } = req.body;

    if (!botToken || !chatId) {
      throw new AppError('botToken and chatId are required', 400, 'INVALID_INPUT');
    }

    // Validate bot token via Telegram API
    const validation = await telegramService.validateToken(botToken);

    // Encrypt token before storage
    const encryptedToken = encrypt(botToken);

    // Save to Settings
    await Settings.findOneAndUpdate(
      { adminId },
      {
        $set: {
          'notifications.telegramBotToken': encryptedToken,
          'notifications.telegramChatId': chatId,
          'notifications.telegramEnabled': true,
        },
      },
      { upsert: true, new: true }
    );

    // Setup webhook (production)
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await telegramService.setWebhook({
          botToken,
          webhookUrl: `${webhookUrl}/webhooks/telegram/${adminId}`,
        });
      } catch (whErr) {
        logger.warn('Webhook setup failed but connection saved', { error: whErr.message });
      }
    }

    logger.info('Telegram connected', { adminId, botUsername: validation.botUsername });

    return ApiResponse.success(res, {
      connected: true,
      botUsername: validation.botUsername,
      botName: validation.botName,
    }, 'Telegram bot connected successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /integrations/telegram/test
 * Send a test message to verify Telegram connection.
 */
async function testTelegram(req, res, next) {
  try {
    const adminId = req.user.id;

    const settings = await Settings.findOne({ adminId })
      .select('+notifications.telegramBotToken')
      .lean();

    if (!settings?.notifications?.telegramBotToken || !settings.notifications.telegramChatId) {
      throw new AppError('Telegram is not configured', 400, 'TELEGRAM_NOT_CONFIGURED');
    }

    const botToken = decrypt(settings.notifications.telegramBotToken);
    const chatId = settings.notifications.telegramChatId;

    const result = await telegramService.sendMessage({
      botToken,
      chatId,
      text: '✅ <b>FinFlow Pro Test</b>\n\nYour Telegram integration is working correctly!',
      parseMode: 'HTML',
    });

    if (!result.success) {
      throw new AppError('Failed to send test message', 500, 'TELEGRAM_SEND_FAILED');
    }

    return ApiResponse.success(res, { sent: true, messageId: result.messageId }, 'Test message sent');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /integrations/telegram
 * Disconnect Telegram bot.
 */
async function disconnectTelegram(req, res, next) {
  try {
    const adminId = req.user.id;

    const settings = await Settings.findOne({ adminId })
      .select('+notifications.telegramBotToken')
      .lean();

    // Remove webhook if token exists
    if (settings?.notifications?.telegramBotToken) {
      try {
        const botToken = decrypt(settings.notifications.telegramBotToken);
        await telegramService.removeWebhook(botToken);
      } catch (whErr) {
        logger.warn('Failed to remove webhook during disconnect', { error: whErr.message });
      }
    }

    await Settings.findOneAndUpdate(
      { adminId },
      {
        $set: {
          'notifications.telegramBotToken': null,
          'notifications.telegramChatId': null,
          'notifications.telegramEnabled': false,
        },
      }
    );

    logger.info('Telegram disconnected', { adminId });
    return ApiResponse.success(res, { disconnected: true }, 'Telegram bot disconnected');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * PATCH /integrations/notifications
 * Toggle notification channels.
 */
async function updateNotificationSettings(req, res, next) {
  try {
    const adminId = req.user.id;
    const { telegramEnabled, smsEnabled, whatsappEnabled, receiptEnabled, receiptChannel } = req.body;

    const update = {};
    if (telegramEnabled !== undefined) update['notifications.telegramEnabled'] = Boolean(telegramEnabled);
    if (smsEnabled !== undefined) update['notifications.smsEnabled'] = Boolean(smsEnabled);
    if (whatsappEnabled !== undefined) update['notifications.whatsappEnabled'] = Boolean(whatsappEnabled);
    if (receiptEnabled !== undefined) update['notifications.receiptEnabled'] = Boolean(receiptEnabled);
    if (receiptChannel !== undefined) {
      if (!['SMS', 'WHATSAPP', 'BOTH'].includes(receiptChannel)) {
        throw new AppError('receiptChannel must be SMS, WHATSAPP, or BOTH', 400, 'INVALID_INPUT');
      }
      update['notifications.receiptChannel'] = receiptChannel;
    }

    if (Object.keys(update).length === 0) {
      throw new AppError('No settings to update', 400, 'INVALID_INPUT');
    }

    const settings = await Settings.findOneAndUpdate(
      { adminId },
      { $set: update },
      { upsert: true, new: true }
    );

    logger.info('Notification settings updated', { adminId });
    return ApiResponse.success(res, settings.notifications, 'Notification settings updated');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// RECEIPT TEMPLATE
// ═══════════════════════════════════════════════════════════════

/**
 * PATCH /integrations/receipt-template
 * Update the receipt message template.
 */
async function updateReceiptTemplate(req, res, next) {
  try {
    const adminId = req.user.id;
    const { template } = req.body;

    if (!template || typeof template !== 'string') {
      throw new AppError('template is required and must be a string', 400, 'INVALID_INPUT');
    }

    // Validate required placeholders
    const required = ['{{amount}}', '{{ref_id}}', '{{client_name}}'];
    const missing = required.filter((p) => !template.includes(p));
    if (missing.length > 0) {
      throw new AppError(
        `Template must contain placeholders: ${missing.join(', ')}`,
        400,
        'MISSING_PLACEHOLDERS'
      );
    }

    const settings = await Settings.findOneAndUpdate(
      { adminId },
      { $set: { receiptTemplate: template } },
      { upsert: true, new: true }
    );

    logger.info('Receipt template updated', { adminId });
    return ApiResponse.success(res, { template: settings.receiptTemplate }, 'Receipt template updated');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  connectTelegram,
  testTelegram,
  disconnectTelegram,
  updateNotificationSettings,
  updateReceiptTemplate,
};
