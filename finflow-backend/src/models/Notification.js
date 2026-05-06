'use strict';

const mongoose = require('mongoose');

/**
 * @module Notification
 * @description
 * Notification model for FinFlow Pro.
 *
 * Tracks multi-channel notifications sent to Admins and Agents.
 * Each notification can be delivered across multiple channels
 * (in-app, Telegram, SMS, WhatsApp, Push) with independent
 * delivery status tracking per channel.
 *
 * Types:
 *  TRANSACTION_CREATED  — New transaction processed
 *  BALANCE_ALERT        — Wallet balance dropped below threshold
 *  COMMISSION_REQUEST   — Agent requested commission settlement
 *  COMMISSION_SETTLED   — Commission has been paid out
 *  SYSTEM               — Platform-level announcements
 *  REPORT_READY         — Scheduled report generated and available
 */

/** Sub-schema for per-channel delivery tracking */
const channelStatusSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      required: true,
      enum: {
        values: ['IN_APP', 'TELEGRAM', 'SMS', 'WHATSAPP', 'PUSH'],
        message: 'Channel must be IN_APP, TELEGRAM, SMS, WHATSAPP, or PUSH',
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['PENDING', 'SENT', 'FAILED'],
        message: 'Status must be PENDING, SENT, or FAILED',
      },
      default: 'PENDING',
    },
    sentAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
      trim: true,
      maxlength: [1000, 'Error message cannot exceed 1000 characters'],
    },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Admin reference is required'],
      index: true,
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Recipient ID is required'],
      index: true,
    },

    recipientType: {
      type: String,
      required: [true, 'Recipient type is required'],
      enum: {
        values: ['ADMIN', 'AGENT'],
        message: 'Recipient type must be ADMIN or AGENT',
      },
    },

    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          'TRANSACTION_CREATED',
          'BALANCE_ALERT',
          'COMMISSION_REQUEST',
          'COMMISSION_SETTLED',
          'SYSTEM',
          'REPORT_READY',
        ],
        message: 'Invalid notification type',
      },
    },

    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true,
      maxlength: [2000, 'Body cannot exceed 2000 characters'],
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    channels: {
      type: [channelStatusSchema],
      default: [],
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Use manual createdAt (no updatedAt needed for immutable notifications)
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
// Inbox query: unread first, then recent
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

// Admin filtered queries by type
notificationSchema.index({ adminId: 1, type: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
