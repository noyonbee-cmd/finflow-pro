'use strict';

const mongoose = require('mongoose');

/**
 * @module CommissionLedger
 * @description
 * Commission Ledger model for FinFlow Pro.
 *
 * Immutable financial ledger tracking every commission event for Agents.
 * Each entry records the event type, amount, and a running balance
 * snapshot at the time of the event.
 *
 * This ledger is the authoritative record for:
 *  - Agent commission earnings
 *  - Settlement (payout) history
 *  - Commission holds and reversals
 *  - Manual adjustments by admin
 *
 * All monetary values are stored as integers in paisa (BDT × 100).
 *
 * Types:
 *  EARNED   — Commission credited from a completed transaction
 *  SETTLED  — Commission paid out to the agent
 *  HELD     — Commission temporarily held (pending review)
 *  REVERSED — Previously earned commission clawed back
 *  ADJUSTED — Manual admin correction
 */

const commissionLedgerSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Admin reference is required'],
      index: true,
    },

    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: [true, 'Agent reference is required'],
      index: true,
    },

    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },

    type: {
      type: String,
      required: [true, 'Ledger entry type is required'],
      enum: {
        values: ['EARNED', 'SETTLED', 'HELD', 'REVERSED', 'ADJUSTED'],
        message: 'Type must be EARNED, SETTLED, HELD, REVERSED, or ADJUSTED',
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
      required: [true, 'Running balance snapshot is required'],
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

    settledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
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
commissionLedgerSchema.index({ agentId: 1, createdAt: -1 });
commissionLedgerSchema.index({ adminId: 1, agentId: 1, type: 1, createdAt: -1 });

const CommissionLedger = mongoose.model('CommissionLedger', commissionLedgerSchema);

module.exports = CommissionLedger;
