'use strict';

const mongoose = require('mongoose');

/**
 * @module Report
 * @description
 * Report model for FinFlow Pro.
 *
 * Stores generated report metadata, status, and PDF URLs.
 * Reports are generated asynchronously via BullMQ and uploaded
 * to Cloudinary when ready.
 *
 * Lifecycle: GENERATING → READY | FAILED
 */

const reportSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Admin reference is required'],
      index: true,
    },

    type: {
      type: String,
      required: [true, 'Report type is required'],
      enum: {
        values: ['DAILY_SUMMARY', 'CLIENT_STATEMENT', 'AGENT_COMMISSION', 'WALLET_LEDGER'],
        message: 'Type must be DAILY_SUMMARY, CLIENT_STATEMENT, AGENT_COMMISSION, or WALLET_LEDGER',
      },
    },

    status: {
      type: String,
      enum: {
        values: ['GENERATING', 'READY', 'FAILED'],
        message: 'Status must be GENERATING, READY, or FAILED',
      },
      default: 'GENERATING',
    },

    dateRange: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },

    filters: {
      clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
      agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
      walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', default: null },
    },

    fileUrl: {
      type: String,
      default: null,
      trim: true,
    },

    cloudinaryPublicId: {
      type: String,
      default: null,
      trim: true,
    },

    fileSize: {
      type: Number,
      default: null,
    },

    jobId: {
      type: String,
      default: null,
      trim: true,
    },

    error: {
      type: String,
      default: null,
      trim: true,
      maxlength: [2000, 'Error message cannot exceed 2000 characters'],
    },

    generatedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
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
reportSchema.index({ adminId: 1, type: 1, createdAt: -1 });
reportSchema.index({ status: 1 });
reportSchema.index({ generatedAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
