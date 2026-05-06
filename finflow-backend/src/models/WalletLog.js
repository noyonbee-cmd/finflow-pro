'use strict';

const mongoose = require('mongoose');

/**
 * @module WalletLog
 * @description
 * WalletLog model for FinFlow Pro.
 *
 * Immutable ledger of every balance mutation on a Wallet. Each entry
 * records the operation type, amount, and a snapshot of the balance
 * *after* the operation.
 *
 * This log serves as the source of truth for:
 *  - Wallet balance audit trail
 *  - Transaction reconciliation
 *  - Balance dispute resolution
 *  - Wallet activity reporting
 *
 * All monetary values are stored as integers in paisa (BDT × 100).
 *
 * Types:
 *  CREDIT       — Funds added via transaction
 *  DEBIT        — Funds removed via transaction
 *  TRANSFER_IN  — Funds received from another wallet
 *  TRANSFER_OUT — Funds sent to another wallet
 *  ADJUSTMENT   — Manual admin correction
 *  LOCK         — Funds reserved (pending transaction)
 *  UNLOCK       — Reserved funds released
 */

const walletLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Admin reference is required'],
      index: true,
    },

    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: [true, 'Wallet reference is required'],
      index: true,
    },

    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },

    type: {
      type: String,
      required: [true, 'Log type is required'],
      enum: {
        values: [
          'CREDIT',
          'DEBIT',
          'TRANSFER_IN',
          'TRANSFER_OUT',
          'ADJUSTMENT',
          'LOCK',
          'UNLOCK',
        ],
        message:
          'Type must be CREDIT, DEBIT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, LOCK, or UNLOCK',
      },
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer (paisa)',
      },
    },

    balanceAfter: {
      type: Number,
      required: [true, 'Balance-after snapshot is required'],
      validate: {
        validator: Number.isInteger,
        message: 'Balance after must be an integer (paisa)',
      },
    },

    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters'],
    },

    createdBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      role: {
        type: String,
        required: true,
        enum: ['ADMIN', 'SUPER_ADMIN', 'AGENT', 'SYSTEM'],
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
walletLogSchema.index({ walletId: 1, createdAt: -1 });
walletLogSchema.index({ adminId: 1, createdAt: -1 });

const WalletLog = mongoose.model('WalletLog', walletLogSchema);

module.exports = WalletLog;
