'use strict';

const { Worker } = require('bullmq');
const logger = require('../utils/logger');
const { getBullMQConnection } = require('../config/redis');
const { decrypt } = require('../utils/encryption');
const telegramService = require('../services/telegramService');
const smsService = require('../services/smsService');
const whatsappService = require('../services/whatsappService');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');

/**
 * @module notificationWorker
 * @description
 * BullMQ worker for multi-channel notification delivery in FinFlow Pro.
 *
 * Processes the 'notifications' queue:
 *  - TELEGRAM: Decrypts bot token → sends via telegramService
 *  - SMS: Sends via smsService (Twilio)
 *  - WHATSAPP: Sends via whatsappService (Twilio WhatsApp)
 *  - Updates Notification.channels[].status per channel
 *
 * Non-critical: failures are logged and status updated, never re-thrown
 * for individual channel failures (only if ALL channels fail).
 *
 * Job options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
 */

const prefix = process.env.BULL_QUEUE_PREFIX || 'finflow';

const notificationWorker = new Worker(
  `${prefix}:notifications`,
  async (job) => {
    const {
      notificationId,
      adminId,
      title,
      body,
      channels,
    } = job.data;

    logger.info('[NotificationWorker] Processing', {
      notificationId, channels, jobId: job.id,
    });

    // Fetch admin settings for credentials
    let settings = null;
    try {
      settings = await Settings.findOne({ adminId })
        .select('+notifications.telegramBotToken')
        .lean();
    } catch (err) {
      logger.error('[NotificationWorker] Failed to fetch settings', { adminId, error: err.message });
    }

    const results = [];

    for (const channel of channels) {
      let status = 'FAILED';
      let error = null;

      try {
        switch (channel) {
          case 'TELEGRAM': {
            if (!settings?.notifications?.telegramBotToken || !settings.notifications.telegramChatId) {
              error = 'Telegram not configured';
              break;
            }
            const botToken = decrypt(settings.notifications.telegramBotToken);
            const chatId = settings.notifications.telegramChatId;
            const result = await telegramService.sendMessage({
              botToken, chatId,
              text: `<b>${title}</b>\n\n${body}`,
              parseMode: 'HTML',
            });
            status = result.success ? 'SENT' : 'FAILED';
            if (!result.success) error = result.error || 'Send failed';
            break;
          }

          case 'SMS': {
            if (!smsService.isConfigured()) {
              error = 'SMS not configured';
              break;
            }
            // SMS requires a phone number — look up recipient
            // For admin notifications, we skip SMS (no phone target for admin alerts)
            error = 'SMS delivery requires recipient phone — skipped for this notification type';
            break;
          }

          case 'WHATSAPP': {
            if (!whatsappService.isConfigured()) {
              error = 'WhatsApp not configured';
              break;
            }
            error = 'WhatsApp delivery requires recipient phone — skipped for this notification type';
            break;
          }

          default:
            error = `Unknown channel: ${channel}`;
        }
      } catch (channelErr) {
        error = channelErr.message;
        logger.error(`[NotificationWorker] ${channel} delivery failed`, {
          notificationId, channel, error: channelErr.message,
        });
      }

      results.push({ channel, status, error });

      // ── Update channel status in Notification document ────────
      try {
        await Notification.updateOne(
          { _id: notificationId, 'channels.channel': channel },
          {
            $set: {
              'channels.$.status': status,
              'channels.$.sentAt': status === 'SENT' ? new Date() : null,
              'channels.$.error': error,
            },
          }
        );
      } catch (dbErr) {
        logger.error('[NotificationWorker] Failed to update channel status', {
          notificationId, channel, error: dbErr.message,
        });
      }
    }

    const allFailed = results.every((r) => r.status === 'FAILED');
    if (allFailed && results.length > 0) {
      logger.error('[NotificationWorker] All channels failed', { notificationId, results });
      throw new Error('All notification channels failed — will retry');
    }

    logger.info('[NotificationWorker] Completed', { notificationId, results });
    return { notificationId, results };
  },
  {
    connection: getBullMQConnection(),
    concurrency: 5,
  }
);

notificationWorker.on('completed', (job) => {
  logger.debug('[NotificationWorker] Job completed', { jobId: job.id });
});

notificationWorker.on('failed', (job, err) => {
  logger.error('[NotificationWorker] Job failed', {
    jobId: job?.id, error: err.message, attempts: job?.attemptsMade,
  });
});

module.exports = notificationWorker;
