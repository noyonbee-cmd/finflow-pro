'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { Notification } = require('../models');

/**
 * @module notificationService
 * @description
 * Notification management service for FinFlow Pro.
 *
 * Handles queueing notifications via BullMQ (fire-and-forget),
 * marking notifications as read, and counting unread items.
 *
 * Channels supported: IN_APP, TELEGRAM, SMS, WHATSAPP, PUSH.
 * The actual delivery of non-IN_APP channels is handled by
 * the BullMQ notification worker (jobs/notificationWorker.js).
 *
 * Exports:
 *  - queueNotification()
 *  - markAsRead()
 *  - getUnreadCount()
 */

// ─── BullMQ lazy import ───────────────────────────────────────
// BullMQ requires a Redis connection. We lazy-init to allow the
// service to load even when Redis is not yet connected.
let notificationQueue = null;

/**
 * Get or create the BullMQ notification queue.
 * @returns {import('bullmq').Queue}
 */
function getQueue() {
  if (!notificationQueue) {
    try {
      const { Queue } = require('bullmq');
      const prefix = process.env.BULL_QUEUE_PREFIX || 'finflow';
      notificationQueue = new Queue(`${prefix}:notifications`, {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT, 10) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      });
    } catch (err) {
      logger.warn('BullMQ notification queue unavailable — notifications will be IN_APP only', {
        error: err.message,
      });
    }
  }
  return notificationQueue;
}

// ═══════════════════════════════════════════════════════════════
// QUEUE NOTIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Queue a notification for delivery.
 *
 * Creates an IN_APP notification document immediately, then dispatches
 * any additional channels (Telegram, SMS, etc.) via BullMQ for async
 * processing.
 *
 * @param {Object} params
 * @param {string}   params.adminId        - Admin document ID.
 * @param {string}   params.recipientId    - Recipient document ID.
 * @param {string}   params.recipientType  - 'ADMIN' or 'AGENT'.
 * @param {string}   params.type           - Notification type enum.
 * @param {string}   params.title          - Notification title.
 * @param {string}   params.body           - Notification body.
 * @param {Object}   [params.data]         - Additional data payload.
 * @param {string[]} [params.channels]     - Channels to deliver on. Default: ['IN_APP'].
 * @returns {Promise<Object>} Created notification document.
 */
async function queueNotification({
  adminId,
  recipientId,
  recipientType,
  type,
  title,
  body,
  data = null,
  channels = ['IN_APP'],
}) {
  try {
    if (!adminId || !recipientId || !recipientType || !type || !title || !body) {
      throw new AppError('Missing required notification fields', 400, 'NOTIFICATION_INVALID');
    }

    // ── Build channel status array ────────────────────────────
    const uniqueChannels = [...new Set(channels)];
    const channelStatuses = uniqueChannels.map((channel) => ({
      channel,
      status: channel === 'IN_APP' ? 'SENT' : 'PENDING',
      sentAt: channel === 'IN_APP' ? new Date() : null,
    }));

    // ── Create notification document ──────────────────────────
    const notification = await Notification.create({
      adminId,
      recipientId,
      recipientType,
      type,
      title,
      body,
      data,
      channels: channelStatuses,
      isRead: false,
    });

    // ── Dispatch async channels via BullMQ ────────────────────
    const asyncChannels = uniqueChannels.filter((ch) => ch !== 'IN_APP');
    if (asyncChannels.length > 0) {
      const queue = getQueue();
      if (queue) {
        // Fire and forget — do NOT await
        queue
          .add('deliver-notification', {
            notificationId: notification._id.toString(),
            adminId,
            recipientId,
            recipientType,
            type,
            title,
            body,
            data,
            channels: asyncChannels,
          })
          .catch((err) => {
            logger.error('Failed to enqueue notification delivery job', {
              notificationId: notification._id.toString(),
              error: err.message,
            });
          });
      } else {
        logger.warn('BullMQ queue unavailable — async notification channels skipped', {
          channels: asyncChannels,
        });
      }
    }

    logger.info('Notification queued', {
      notificationId: notification._id.toString(),
      recipientId,
      type,
      channels: uniqueChannels,
    });

    return notification;
  } catch (err) {
    logger.error('Failed to queue notification', {
      adminId,
      recipientId,
      type,
      error: err.message,
    });
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// MARK AS READ
// ═══════════════════════════════════════════════════════════════

/**
 * Mark a notification as read for a specific recipient.
 *
 * @param {Object} params
 * @param {string} params.notificationId - Notification document ID.
 * @param {string} params.recipientId    - Recipient document ID (for ownership check).
 * @returns {Promise<Object>} Updated notification document.
 * @throws {AppError} If notification not found or ownership mismatch.
 */
async function markAsRead({ notificationId, recipientId }) {
  try {
    if (!notificationId || !recipientId) {
      throw new AppError('notificationId and recipientId are required', 400, 'INVALID_INPUT');
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        recipientId: new mongoose.Types.ObjectId(recipientId),
      },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      throw new AppError('Notification not found or access denied', 404, 'NOTIFICATION_NOT_FOUND');
    }

    return notification;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Failed to mark notification as read', {
      notificationId,
      recipientId,
      error: err.message,
    });
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// UNREAD COUNT
// ═══════════════════════════════════════════════════════════════

/**
 * Get the count of unread notifications for a recipient.
 *
 * @param {Object} params
 * @param {string} params.recipientId   - Recipient document ID.
 * @param {string} params.recipientType - 'ADMIN' or 'AGENT'.
 * @returns {Promise<number>} Count of unread notifications.
 */
async function getUnreadCount({ recipientId, recipientType }) {
  try {
    if (!recipientId || !recipientType) {
      throw new AppError('recipientId and recipientType are required', 400, 'INVALID_INPUT');
    }

    const count = await Notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(recipientId),
      recipientType,
      isRead: false,
    });

    return count;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Failed to get unread count', {
      recipientId,
      recipientType,
      error: err.message,
    });
    throw err;
  }
}

module.exports = {
  queueNotification,
  markAsRead,
  getUnreadCount,
};
