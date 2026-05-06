'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @module Admin
 * @description
 * Admin (Business Owner) model for FinFlow Pro.
 *
 * Each Admin represents a business owner who manages mobile banking wallets
 * (bKash, Nagad, Bank, Cash), configures agents, and processes transactions.
 *
 * Password is hashed with bcrypt (12 rounds) on save.
 * All monetary fields in `settings` are stored as integers in paisa (BDT × 100).
 *
 * Roles:
 *  - SUPER_ADMIN: Platform-level access (future multi-tenant)
 *  - ADMIN: Standard business owner
 */

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Admin name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password by default
    },

    businessName: {
      type: String,
      trim: true,
      maxlength: [200, 'Business name cannot exceed 200 characters'],
    },

    businessLogo: {
      type: String,
      trim: true,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number'],
    },

    role: {
      type: String,
      enum: {
        values: ['SUPER_ADMIN', 'ADMIN'],
        message: 'Role must be either SUPER_ADMIN or ADMIN',
      },
      default: 'ADMIN',
    },

    settings: {
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
      },
    },

    branding: {
      primaryColor: {
        type: String,
        default: '#6366F1',
        trim: true,
      },
      reportFooterText: {
        type: String,
        default: '',
        trim: true,
        maxlength: [500, 'Footer text cannot exceed 500 characters'],
      },
    },

    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'SUSPENDED'],
        message: 'Status must be either ACTIVE or SUSPENDED',
      },
      default: 'ACTIVE',
    },

    lastLoginAt: {
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
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// ─── Pre-save: Hash password ──────────────────────────────────
adminSchema.pre('save', async function preSaveHashPassword(next) {
  // Only hash when password is new or modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// ─── Instance Methods ─────────────────────────────────────────

/**
 * Compare a plaintext password against the stored hash.
 * @param {string} plainPassword - The plaintext password to verify.
 * @returns {Promise<boolean>} True if passwords match.
 */
adminSchema.methods.comparePassword = async function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
