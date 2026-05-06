'use strict';

const mongoose = require('mongoose');

/**
 * @module RefreshToken
 * @description
 * Refresh Token model for FinFlow Pro.
 *
 * Stores hashed JWT refresh tokens with automatic expiry via MongoDB TTL.
 * Supports both Admin and Agent user types.
 *
 * Security features:
 *  - Token is stored as a SHA-256 hash (never plaintext)
 *  - TTL index auto-deletes expired tokens from the database
 *  - Revocation flag for immediate invalidation
 *  - Device info tracking for session management
 *
 * Token lifecycle:
 *  1. Created on login → stored with expiresAt
 *  2. Used on token refresh → validated, then rotated
 *  3. Revoked on logout → isRevoked = true
 *  4. Auto-deleted by TTL after expiresAt
 */

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      index: true,
    },

    userType: {
      type: String,
      required: [true, 'User type is required'],
      enum: {
        values: ['ADMIN', 'AGENT'],
        message: 'User type must be ADMIN or AGENT',
      },
    },

    token: {
      type: String,
      required: [true, 'Hashed token is required'],
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },

    isRevoked: {
      type: Boolean,
      default: false,
    },

    deviceInfo: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Device info cannot exceed 500 characters'],
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // We manage createdAt manually, so no auto timestamps needed
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.token; // Never expose hash in API responses
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.token;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
// Query sessions by user
refreshTokenSchema.index({ userId: 1, userType: 1 });

// TTL index — MongoDB automatically removes documents after expiresAt
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
