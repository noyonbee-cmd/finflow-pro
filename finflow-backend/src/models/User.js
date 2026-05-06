'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @module User
 * @description
 * User model for FinFlow Pro — unified authentication identity.
 *
 * This model serves as the single auth entry point for both Admins
 * and Agents. The `role` field determines which domain model
 * (Admin or Agent) is referenced via `roleRef`.
 *
 * Password is hashed with bcrypt (12 rounds) on save.
 * The `comparePassword` instance method enables secure login verification.
 *
 * This model is referenced by:
 *  - Agent.userId — linking agent profiles to their auth identity
 *  - RefreshToken.userId — linking refresh tokens to their owner
 */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
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

    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['ADMIN', 'AGENT'],
        message: 'Role must be ADMIN or AGENT',
      },
    },

    /**
     * Reference to the domain-specific model (Admin or Agent).
     * Use `role` to determine which collection to populate from.
     */
    roleRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'role === "ADMIN" ? "Admin" : "Agent"',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    profileImage: {
      type: String,
      default: null,
      trim: true,
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

// ─── Indexes ──────────────────────────────────────────────────
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1 });

// ─── Pre-save: Hash password ──────────────────────────────────
userSchema.pre('save', async function preSaveHashPassword(next) {
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
userSchema.methods.comparePassword = async function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
