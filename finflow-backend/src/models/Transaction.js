'use strict';

const mongoose = require('mongoose');
const dayjs = require('dayjs');

/**
 * @module Transaction
 * @description
 * Transaction model for FinFlow Pro — the core financial record.
 *
 * Each transaction represents a Credit (CR) or Debit (DR) operation
 * processed through the platform. Transactions link a Client, an
 * optional Agent, and one or more Wallets.
 *
 * Fee calculation:    Fee = (Amount / 1000) × FeePercent
 * Commission calc:    Commission = (Amount / 1000) × CommissionPercent
 * Net profit:         netProfit = totalFee - agentCommission
 *
 * All monetary values are stored as integers in paisa (BDT × 100).
 *
 * Features:
 *  - Auto-generated reference ID: TXN-YYYYMMDD-XXXX
 *  - Idempotency key support for duplicate prevention
 *  - Multi-wallet entries for split transactions
 *  - Full audit trail with edit history
 *  - Denormalized client/agent names for query performance
 */

/** Sub-schema for wallet entries within a transaction */
const walletEntrySchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    walletType: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Wallet entry amount must be an integer (paisa)',
      },
    },
    direction: {
      type: String,
      required: true,
      enum: {
        values: ['IN', 'OUT'],
        message: 'Direction must be IN or OUT',
      },
    },
  },
  { _id: false }
);

/** Sub-schema for extra fee configuration */
const extraFeeSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Extra fee amount must be an integer (paisa)',
      },
    },
    type: {
      type: String,
      enum: {
        values: ['FIXED_ADD', 'FIXED_DEDUCT', 'PERCENT_ADD', 'PERCENT_DEDUCT'],
        message: 'Extra fee type is invalid',
      },
      default: null,
    },
    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Extra fee note cannot exceed 500 characters'],
    },
    visibility: {
      type: String,
      enum: {
        values: ['RECEIPT_VISIBLE', 'INTERNAL_ONLY'],
        message: 'Visibility must be RECEIPT_VISIBLE or INTERNAL_ONLY',
      },
      default: 'RECEIPT_VISIBLE',
    },
  },
  { _id: false }
);

/** Sub-schema for edit history entries */
const editHistorySchema = new mongoose.Schema(
  {
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

// ─── Main Transaction Schema ─────────────────────────────────
const transactionSchema = new mongoose.Schema(
  {
    refId: {
      type: String,
      unique: true,
      required: [true, 'Reference ID is required'],
      trim: true,
      match: [
        /^TXN-\d{8}-[A-Z0-9]{4}$/,
        'refId must match format TXN-YYYYMMDD-XXXX',
      ],
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Admin reference is required'],
      index: true,
    },

    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: ['CR', 'DR'],
        message: 'Transaction type must be CR (Credit) or DR (Debit)',
      },
    },

    status: {
      type: String,
      enum: {
        values: ['COMPLETED', 'PENDING', 'CANCELLED', 'FAILED'],
        message: 'Status must be COMPLETED, PENDING, CANCELLED, or FAILED',
      },
      default: 'COMPLETED',
    },

    // ── Parties ────────────────────────────────────────────────
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client reference is required'],
    },

    clientName: {
      type: String,
      required: [true, 'Client name (denormalized) is required'],
      trim: true,
    },

    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      default: null,
    },

    agentName: {
      type: String,
      default: null,
      trim: true,
    },

    // ── Amounts (all in paisa) ─────────────────────────────────
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [1, 'Amount must be greater than zero'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer (paisa)',
      },
    },

    feePercent: {
      type: Number,
      default: 0,
      min: [0, 'Fee percent cannot be negative'],
      max: [100, 'Fee percent cannot exceed 100'],
    },

    feeSource: {
      type: String,
      enum: {
        values: ['TRANSACTION', 'CLIENT', 'AGENT', 'GLOBAL'],
        message: 'feeSource must be TRANSACTION, CLIENT, AGENT, or GLOBAL',
      },
      default: 'GLOBAL',
    },

    baseFee: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Base fee must be an integer (paisa)',
      },
    },

    extraFee: {
      type: extraFeeSchema,
      default: () => ({}),
    },

    totalFee: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Total fee must be an integer (paisa)',
      },
    },

    agentCommissionPercent: {
      type: Number,
      default: 0,
      min: [0, 'Commission percent cannot be negative'],
      max: [100, 'Commission percent cannot exceed 100'],
    },

    agentCommission: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Agent commission must be an integer (paisa)',
      },
    },

    netProfit: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Net profit must be an integer (paisa)',
      },
    },

    // ── Wallet Entries ─────────────────────────────────────────
    walletEntries: {
      type: [walletEntrySchema],
      default: [],
      validate: {
        validator: (entries) => entries.length > 0,
        message: 'At least one wallet entry is required',
      },
    },

    // ── Notifications ──────────────────────────────────────────
    receiptSent: {
      type: Boolean,
      default: false,
    },

    receiptChannel: {
      type: String,
      enum: {
        values: ['SMS', 'WHATSAPP', null],
        message: 'Receipt channel must be SMS, WHATSAPP, or null',
      },
      default: null,
    },

    receiptSentAt: {
      type: Date,
      default: null,
    },

    telegramNotified: {
      type: Boolean,
      default: false,
    },

    // ── Idempotency ────────────────────────────────────────────
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
    },

    // ── Audit ──────────────────────────────────────────────────
    createdBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      role: {
        type: String,
        required: true,
        enum: ['ADMIN', 'SUPER_ADMIN', 'AGENT'],
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
    },

    editHistory: {
      type: [editHistorySchema],
      default: [],
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    cancelReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: [1000, 'Cancel reason cannot exceed 1000 characters'],
    },

    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
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
// Primary query index (dashboard listing)
transactionSchema.index({ adminId: 1, createdAt: -1 });

// Client transaction history
transactionSchema.index({ adminId: 1, clientId: 1, createdAt: -1 });

// Agent transaction history
transactionSchema.index({ adminId: 1, agentId: 1, createdAt: -1 });

// Filtered queries by type + status
transactionSchema.index({ adminId: 1, type: 1, status: 1, createdAt: -1 });

// Wallet-based queries
transactionSchema.index({ adminId: 1, 'walletEntries.walletId': 1, createdAt: -1 });

// Idempotency — unique + sparse (nulls are ignored)
transactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true }
);

// ─── Static Methods ───────────────────────────────────────────

/**
 * Generate a unique transaction reference ID.
 * Format: TXN-YYYYMMDD-XXXX where XXXX is a random alphanumeric string.
 *
 * Uses a retry loop (max 5 attempts) to handle the astronomically
 * unlikely case of a collision on the unique index.
 *
 * @returns {Promise<string>} A unique refId string.
 * @throws {Error} If unable to generate a unique ID after max retries.
 */
transactionSchema.statics.generateRefId = async function generateRefId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous: 0/O, 1/I
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const datePart = dayjs().format('YYYYMMDD');
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const refId = `TXN-${datePart}-${randomPart}`;

    // Check uniqueness
    const exists = await this.exists({ refId });
    if (!exists) return refId;
  }

  throw new Error(
    'Failed to generate a unique transaction reference ID after maximum retries'
  );
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
