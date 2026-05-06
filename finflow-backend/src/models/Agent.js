'use strict';

const mongoose = require('mongoose');

/**
 * @module Agent
 * @description
 * Agent model for FinFlow Pro.
 *
 * An Agent is a field operator linked to an Admin (business owner).
 * Agents process transactions on behalf of clients and earn commission
 * calculated as: Commission = (Amount / 1000) × CommissionPercent.
 *
 * Each Agent has an embedded wallet tracking earned, settled, and pending
 * commission balances. All monetary values are in paisa (BDT × 100).
 *
 * Agents may optionally have a personal Telegram bot for real-time
 * transaction notifications.
 *
 * Lifecycle: PENDING_APPROVAL → ACTIVE ↔ SUSPENDED
 */

const agentSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Admin reference is required'],
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    name: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number'],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    commissionPercent: {
      type: Number,
      default: 0,
      min: [0, 'Commission percent cannot be negative'],
      max: [100, 'Commission percent cannot exceed 100'],
    },

    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL'],
        message: 'Status must be ACTIVE, SUSPENDED, or PENDING_APPROVAL',
      },
      default: 'PENDING_APPROVAL',
    },

    wallet: {
      balance: {
        type: Number,
        default: 0,
        min: [0, 'Wallet balance cannot be negative'],
      },
      totalEarned: {
        type: Number,
        default: 0,
        min: [0, 'Total earned cannot be negative'],
      },
      totalSettled: {
        type: Number,
        default: 0,
        min: [0, 'Total settled cannot be negative'],
      },
    },

    stats: {
      totalTransactions: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalVolume: {
        type: Number,
        default: 0,
        min: 0,
      },
      currentMonthCommission: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    telegramChatId: {
      type: String,
      default: null,
      trim: true,
    },

    telegramBotToken: {
      type: String,
      default: null,
      trim: true,
      select: false, // Encrypted — never expose by default
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.telegramBotToken;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.telegramBotToken;
        return ret;
      },
    },
  }
);

// ─── Compound Indexes ─────────────────────────────────────────
agentSchema.index({ adminId: 1, status: 1 });
agentSchema.index({ adminId: 1, phone: 1 }, { unique: true });

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;
