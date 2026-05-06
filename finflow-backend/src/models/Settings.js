'use strict';

const mongoose = require('mongoose');

/**
 * @module Settings
 * @description
 * Settings model for FinFlow Pro — singleton document per Admin.
 *
 * Stores all configurable preferences for a business owner including:
 *  - Fee defaults for transactions
 *  - Notification channel configuration (Telegram, SMS, WhatsApp)
 *  - Receipt template customization
 *  - Report branding (logo, colors, footer)
 *  - Security preferences (PIN, biometric)
 *
 * Enforced as a singleton per admin via unique index on adminId.
 * Sensitive fields (telegramBotToken) are stored encrypted using
 * AES-256 via the crypto-js library.
 */

const DEFAULT_RECEIPT_TEMPLATE = [
  '═══════════════════════════',
  '      {{businessName}}',
  '═══════════════════════════',
  'Receipt: {{refId}}',
  'Date: {{date}}',
  'Type: {{type}}',
  '───────────────────────────',
  'Client: {{clientName}}',
  'Phone: {{clientPhone}}',
  'Amount: ৳{{amount}}',
  'Fee: ৳{{fee}}',
  '───────────────────────────',
  'Wallet: {{walletName}}',
  'Processed by: {{agentName}}',
  '═══════════════════════════',
  '  {{footerText}}',
  '═══════════════════════════',
].join('\n');

const settingsSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Admin reference is required'],
      unique: true,
    },

    feeDefaults: {
      defaultFeePercent: {
        type: Number,
        default: 1.5,
        min: [0, 'Fee percent cannot be negative'],
        max: [100, 'Fee percent cannot exceed 100'],
      },
      defaultCommissionPercent: {
        type: Number,
        default: 0.5,
        min: [0, 'Commission percent cannot be negative'],
        max: [100, 'Commission percent cannot exceed 100'],
      },
    },

    notifications: {
      telegramEnabled: {
        type: Boolean,
        default: false,
      },
      telegramBotToken: {
        type: String,
        default: null,
        select: false, // Encrypted — never expose by default
      },
      telegramChatId: {
        type: String,
        default: null,
        trim: true,
      },
      smsEnabled: {
        type: Boolean,
        default: false,
      },
      whatsappEnabled: {
        type: Boolean,
        default: false,
      },
      receiptEnabled: {
        type: Boolean,
        default: true,
      },
      receiptChannel: {
        type: String,
        enum: {
          values: ['SMS', 'WHATSAPP', 'BOTH'],
          message: 'Receipt channel must be SMS, WHATSAPP, or BOTH',
        },
        default: 'SMS',
      },
    },

    receiptTemplate: {
      type: String,
      default: DEFAULT_RECEIPT_TEMPLATE,
      maxlength: [5000, 'Receipt template cannot exceed 5000 characters'],
    },

    reportBranding: {
      logoUrl: {
        type: String,
        default: null,
        trim: true,
      },
      primaryColor: {
        type: String,
        default: '#6366F1',
        trim: true,
      },
      footerText: {
        type: String,
        default: 'Powered by FinFlow Pro',
        trim: true,
        maxlength: [500, 'Footer text cannot exceed 500 characters'],
      },
    },

    security: {
      requirePinOnOpen: {
        type: Boolean,
        default: false,
      },
      biometricEnabled: {
        type: Boolean,
        default: false,
      },
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
        delete ret.notifications?.telegramBotToken;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.notifications?.telegramBotToken;
        return ret;
      },
    },
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
