'use strict';

const mongoose = require('mongoose');

/**
 * @module Client
 * @description
 * Client model for FinFlow Pro.
 *
 * A Client is an individual or entity that sends/receives money through
 * the platform. Clients belong to a single Admin and may be optionally
 * assigned to a specific Agent.
 *
 * Fee and commission can be overridden per-client:
 *  - customFeePercent: if null, the Admin's defaultFeePercent is used
 *  - customCommissionPercent: if null, the Admin's defaultCommissionPercent is used
 *
 * Fee formula:  Fee = (Amount / 1000) × FeePercent
 * All monetary values in stats are stored in paisa (BDT × 100).
 */

const clientSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Admin reference is required'],
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number'],
    },

    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      sparse: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    address: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },

    customFeePercent: {
      type: Number,
      default: null,
      min: [0, 'Custom fee percent cannot be negative'],
      max: [100, 'Custom fee percent cannot exceed 100'],
    },

    customCommissionPercent: {
      type: Number,
      default: null,
      min: [0, 'Custom commission percent cannot be negative'],
      max: [100, 'Custom commission percent cannot exceed 100'],
    },

    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      default: null,
    },

    tags: {
      type: [String],
      default: [],
      set: (tags) => [...new Set(tags.map((t) => t.trim().toLowerCase()))],
    },

    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
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
      totalFeesPaid: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastTransactionAt: {
        type: Date,
        default: null,
      },
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

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

// ─── Compound Indexes ─────────────────────────────────────────
clientSchema.index({ adminId: 1, isArchived: 1 });
clientSchema.index({ adminId: 1, phone: 1 });
clientSchema.index({ adminId: 1, assignedAgentId: 1 });

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
