'use strict';

const mongoose = require('mongoose');

/**
 * @module Wallet
 * @description
 * Wallet model for FinFlow Pro.
 *
 * Represents a financial wallet (bKash, Nagad, Bank, Cash, or Custom)
 * belonging to an Admin. Each wallet tracks real-time balance with
 * support for locked (pending) balances.
 *
 * All monetary values are stored as integers in paisa (BDT × 100).
 * Example: ৳5,000 = 500000 paisa.
 *
 * Balance updates MUST use atomic MongoDB operations ($inc) to prevent
 * race conditions in concurrent transaction processing.
 *
 * Virtual field `availableBalance` = balance - lockedBalance.
 */

const walletSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Admin reference is required'],
      index: true,
    },

    type: {
      type: String,
      required: [true, 'Wallet type is required'],
      enum: {
        values: ['BKASH', 'NAGAD', 'BANK', 'CASH', 'CUSTOM'],
        message: 'Wallet type must be BKASH, NAGAD, BANK, CASH, or CUSTOM',
      },
    },

    name: {
      type: String,
      required: [true, 'Wallet display name is required'],
      trim: true,
      maxlength: [100, 'Wallet name cannot exceed 100 characters'],
    },

    accountNumber: {
      type: String,
      default: null,
      trim: true,
      maxlength: [50, 'Account number cannot exceed 50 characters'],
    },

    balance: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Balance must be an integer (paisa)',
      },
    },

    lockedBalance: {
      type: Number,
      default: 0,
      min: [0, 'Locked balance cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Locked balance must be an integer (paisa)',
      },
    },

    currency: {
      type: String,
      default: 'BDT',
      uppercase: true,
      trim: true,
    },

    lowBalanceThreshold: {
      type: Number,
      default: 500000, // ৳5,000 in paisa
      min: [0, 'Threshold cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Threshold must be an integer (paisa)',
      },
    },

    stats: {
      totalIn: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalOut: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalCommissionEarned: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastTransactionAt: {
        type: Date,
        default: null,
      },
    },

    displayOrder: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
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

// ─── Virtual: Available Balance ───────────────────────────────
walletSchema.virtual('availableBalance').get(function getAvailableBalance() {
  return this.balance - this.lockedBalance;
});

// ─── Compound Indexes ─────────────────────────────────────────
walletSchema.index({ adminId: 1, isActive: 1 });
walletSchema.index({ adminId: 1, type: 1 });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
