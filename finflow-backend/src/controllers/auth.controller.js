'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { AppError } = require('../middleware/errorHandler');
const { Admin, Settings, Wallet, RefreshToken, Agent } = require('../models');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashToken,
  parseDurationMs,
} = require('../config/jwt');
const config = require('../config/env');

/**
 * @module auth.controller
 * @description
 * Authentication controller for FinFlow Pro.
 *
 * Handles:
 *  - adminSignup       → Register a new admin with business setup
 *  - adminLogin        → Authenticate admin by email + password
 *  - agentLogin        → Authenticate agent by phone + password
 *  - refreshToken      → Rotate access/refresh token pair
 *  - logout            → Revoke current refresh token
 *  - adminSelfSetup    → Complete admin profile after signup
 *
 * Security:
 *  - Passwords hashed with bcrypt (12 rounds, handled by model pre-save)
 *  - Refresh tokens hashed with SHA-256 before DB storage
 *  - Refresh token rotation on every use (old token revoked)
 *  - All auth events logged with IP address
 *  - Consistent error messages (never reveal if email/phone exists)
 */

// ─── Constants ────────────────────────────────────────────────
const GENERIC_AUTH_ERROR = 'Invalid credentials. Please check your email and password.';
const GENERIC_AGENT_AUTH_ERROR = 'Invalid credentials. Please check your phone number and password.';
const DEFAULT_WALLET_TYPES = [
  { type: 'BKASH', name: 'bKash Wallet', displayOrder: 0 },
  { type: 'NAGAD', name: 'Nagad Wallet', displayOrder: 1 },
  { type: 'BANK', name: 'Bank Account', displayOrder: 2 },
  { type: 'CASH', name: 'Cash Register', displayOrder: 3 },
];

// ═══════════════════════════════════════════════════════════════
// HELPER: Store Refresh Token in DB
// ═══════════════════════════════════════════════════════════════

/**
 * Hash and store a refresh token in the RefreshToken collection.
 *
 * @param {Object} params
 * @param {string} params.rawToken    - Raw refresh token string.
 * @param {string} params.userId      - User (admin/agent) document ID.
 * @param {'ADMIN'|'AGENT'} params.userType - User type.
 * @param {string} [params.deviceInfo] - Device/UA string.
 * @param {mongoose.ClientSession} [params.session] - Mongoose session.
 * @returns {Promise<Object>} Created RefreshToken document.
 */
async function storeRefreshToken({ rawToken, userId, userType, deviceInfo = null, session = null }) {
  const hashedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + parseDurationMs(config.jwt.refreshExpiresIn));

  const createOpts = session ? { session } : {};

  const docs = await RefreshToken.create(
    [
      {
        userId,
        userType,
        token: hashedToken,
        expiresAt,
        deviceInfo,
      },
    ],
    createOpts
  );

  return docs[0];
}

// ═══════════════════════════════════════════════════════════════
// ADMIN SIGNUP
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/admin/signup
 *
 * Register a new admin (business owner) account.
 *
 * Steps:
 *  1. Validate input (handled by middleware)
 *  2. Check email uniqueness
 *  3. Create Admin document (password auto-hashed by pre-save hook)
 *  4. Create default Settings document
 *  5. Create 4 default wallets: BKASH, NAGAD, BANK, CASH
 *  6. Generate access + refresh tokens
 *  7. Store hashed refresh token in DB
 *  8. Return admin data + tokens
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function adminSignup(req, res) {
  const session = await mongoose.startSession();

  try {
    const { name, email, password, businessName, phone } = req.body;

    let admin, tokens;

    await session.withTransaction(async () => {
      // ── Step 2: Check email uniqueness ────────────────────────
      const existingAdmin = await Admin.findOne({ email }).session(session).lean();
      if (existingAdmin) {
        throw new AppError(
          'An account with this email already exists.',
          409,
          'EMAIL_EXISTS'
        );
      }

      // ── Step 3: Create Admin ──────────────────────────────────
      const adminDocs = await Admin.create(
        [
          {
            name,
            email,
            password,
            businessName,
            phone,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        ],
        { session }
      );
      admin = adminDocs[0];

      // ── Step 4: Create default Settings ───────────────────────
      await Settings.create(
        [
          {
            adminId: admin._id,
          },
        ],
        { session }
      );

      // ── Step 5: Create 4 default wallets ──────────────────────
      const walletDocs = DEFAULT_WALLET_TYPES.map((w) => ({
        adminId: admin._id,
        type: w.type,
        name: w.name,
        balance: 0,
        lockedBalance: 0,
        displayOrder: w.displayOrder,
        isActive: true,
      }));
      await Wallet.create(walletDocs, { session });

      // ── Step 6: Generate tokens ───────────────────────────────
      const payload = {
        sub: admin._id.toString(),
        role: 'ADMIN',
        businessId: admin._id.toString(),
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      tokens = { accessToken, refreshToken };

      // ── Step 7: Store hashed refresh token ────────────────────
      await storeRefreshToken({
        rawToken: refreshToken,
        userId: admin._id,
        userType: 'ADMIN',
        deviceInfo: req.headers['user-agent'] || null,
        session,
      });
    });

    // ── Log auth event ────────────────────────────────────────
    logger.info('Admin signup successful', {
      adminId: admin._id.toString(),
      email: admin.email,
      ip: req.ip,
      event: 'ADMIN_SIGNUP',
    });

    return ApiResponse.success(
      res,
      {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          businessName: admin.businessName,
        },
        tokens,
      },
      'Account created successfully',
      201
    );
  } catch (err) {
    if (err instanceof AppError) {
      return ApiResponse.error(res, err.message, err.statusCode, err.errorCode);
    }

    // Handle MongoDB duplicate key (race condition on email)
    if (err.code === 11000) {
      return ApiResponse.error(
        res,
        'An account with this email already exists.',
        409,
        'EMAIL_EXISTS'
      );
    }

    logger.error('Admin signup failed', {
      email: req.body?.email,
      ip: req.ip,
      error: err.message,
      event: 'ADMIN_SIGNUP_FAILED',
    });

    return ApiResponse.error(res, 'Registration failed. Please try again.', 500, 'SIGNUP_FAILED');
  } finally {
    await session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/admin/login
 *
 * Authenticate an admin by email and password.
 *
 * Steps:
 *  1. Find admin by email (include password field)
 *  2. Compare password
 *  3. Check admin.status === 'ACTIVE'
 *  4. Update lastLoginAt
 *  5. Generate + store tokens
 *  6. Return admin data + tokens
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    // ── Step 1: Find admin ──────────────────────────────────────
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      logger.warn('Admin login failed: email not found', {
        ip: req.ip,
        event: 'ADMIN_LOGIN_FAILED',
      });
      return ApiResponse.error(res, GENERIC_AUTH_ERROR, 401, 'INVALID_CREDENTIALS');
    }

    // ── Step 2: Compare password ────────────────────────────────
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn('Admin login failed: invalid password', {
        adminId: admin._id.toString(),
        ip: req.ip,
        event: 'ADMIN_LOGIN_FAILED',
      });
      return ApiResponse.error(res, GENERIC_AUTH_ERROR, 401, 'INVALID_CREDENTIALS');
    }

    // ── Step 3: Check status ────────────────────────────────────
    if (admin.status !== 'ACTIVE') {
      logger.warn('Admin login failed: account suspended', {
        adminId: admin._id.toString(),
        ip: req.ip,
        event: 'ADMIN_LOGIN_SUSPENDED',
      });
      return ApiResponse.error(
        res,
        'Your account has been suspended. Please contact support.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    // ── Step 4: Update lastLoginAt ──────────────────────────────
    admin.lastLoginAt = new Date();
    await admin.save({ validateModifiedOnly: true });

    // ── Step 5: Generate tokens ─────────────────────────────────
    const payload = {
      sub: admin._id.toString(),
      role: 'ADMIN',
      businessId: admin._id.toString(),
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await storeRefreshToken({
      rawToken: refreshToken,
      userId: admin._id,
      userType: 'ADMIN',
      deviceInfo: req.headers['user-agent'] || null,
    });

    // ── Log auth event ────────────────────────────────────────
    logger.info('Admin login successful', {
      adminId: admin._id.toString(),
      ip: req.ip,
      event: 'ADMIN_LOGIN',
    });

    return ApiResponse.success(res, {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      tokens: { accessToken, refreshToken },
    }, 'Login successful');
  } catch (err) {
    logger.error('Admin login error', {
      ip: req.ip,
      error: err.message,
      event: 'ADMIN_LOGIN_ERROR',
    });
    return ApiResponse.error(res, 'Login failed. Please try again.', 500, 'LOGIN_FAILED');
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT LOGIN
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/agent/login
 *
 * Authenticate an agent by phone and password.
 *
 * Steps:
 *  1. Find agent by phone (populate adminId scope)
 *  2. Check agent.status === 'ACTIVE'
 *  3. Fetch the associated User doc for password comparison
 *  4. Compare password
 *  5. Generate tokens (agentId in sub, role: 'AGENT')
 *  6. Return agent data + tokens
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function agentLogin(req, res) {
  try {
    const { phone, password } = req.body;

    // ── Step 1: Find agent by phone ─────────────────────────────
    const agent = await Agent.findOne({ phone });

    if (!agent) {
      logger.warn('Agent login failed: phone not found', {
        ip: req.ip,
        event: 'AGENT_LOGIN_FAILED',
      });
      return ApiResponse.error(res, GENERIC_AGENT_AUTH_ERROR, 401, 'INVALID_CREDENTIALS');
    }

    // ── Step 2: Check agent status ──────────────────────────────
    if (agent.status !== 'ACTIVE') {
      const statusMessages = {
        PENDING_APPROVAL: 'Your account is pending approval from the administrator.',
        SUSPENDED: 'Your account has been suspended. Please contact your administrator.',
      };

      logger.warn('Agent login failed: account not active', {
        agentId: agent._id.toString(),
        status: agent.status,
        ip: req.ip,
        event: 'AGENT_LOGIN_INACTIVE',
      });

      return ApiResponse.error(
        res,
        statusMessages[agent.status] || 'Your account is not active.',
        403,
        'ACCOUNT_NOT_ACTIVE'
      );
    }

    // ── Step 3: Get User doc for password ───────────────────────
    if (!agent.userId) {
      logger.error('Agent has no associated User document', {
        agentId: agent._id.toString(),
      });
      return ApiResponse.error(res, GENERIC_AGENT_AUTH_ERROR, 401, 'INVALID_CREDENTIALS');
    }

    const { User } = require('../models');
    const user = await User.findById(agent.userId).select('+password');

    if (!user) {
      logger.error('Agent User document not found', {
        agentId: agent._id.toString(),
        userId: agent.userId.toString(),
      });
      return ApiResponse.error(res, GENERIC_AGENT_AUTH_ERROR, 401, 'INVALID_CREDENTIALS');
    }

    // ── Step 4: Compare password ────────────────────────────────
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn('Agent login failed: invalid password', {
        agentId: agent._id.toString(),
        ip: req.ip,
        event: 'AGENT_LOGIN_FAILED',
      });
      return ApiResponse.error(res, GENERIC_AGENT_AUTH_ERROR, 401, 'INVALID_CREDENTIALS');
    }

    // ── Step 5: Generate tokens ─────────────────────────────────
    const payload = {
      sub: agent._id.toString(),
      role: 'AGENT',
      adminId: agent.adminId.toString(),
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await storeRefreshToken({
      rawToken: refreshToken,
      userId: agent._id,
      userType: 'AGENT',
      deviceInfo: req.headers['user-agent'] || null,
    });

    // ── Log auth event ────────────────────────────────────────
    logger.info('Agent login successful', {
      agentId: agent._id.toString(),
      adminId: agent.adminId.toString(),
      ip: req.ip,
      event: 'AGENT_LOGIN',
    });

    return ApiResponse.success(res, {
      agent: {
        id: agent._id,
        name: agent.name,
        phone: agent.phone,
        commissionPercent: agent.commissionPercent,
      },
      tokens: { accessToken, refreshToken },
    }, 'Login successful');
  } catch (err) {
    logger.error('Agent login error', {
      ip: req.ip,
      error: err.message,
      event: 'AGENT_LOGIN_ERROR',
    });
    return ApiResponse.error(res, 'Login failed. Please try again.', 500, 'LOGIN_FAILED');
  }
}

// ═══════════════════════════════════════════════════════════════
// REFRESH TOKEN
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/refresh
 *
 * Rotate access and refresh tokens.
 *
 * Steps:
 *  1. Accept refresh token from Authorization header or body
 *  2. Hash and find in DB
 *  3. Validate: exists, not revoked, not expired
 *  4. Verify JWT signature
 *  5. Revoke old token (isRevoked = true)
 *  6. Generate new token pair
 *  7. Store new refresh token
 *  8. Return new tokens
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function refreshTokenHandler(req, res) {
  try {
    // ── Step 1: Extract refresh token ───────────────────────────
    let rawRefreshToken = req.body?.refreshToken || null;

    if (!rawRefreshToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        rawRefreshToken = authHeader.slice(7).trim();
      }
    }

    if (!rawRefreshToken) {
      return ApiResponse.error(
        res,
        'Refresh token is required.',
        400,
        'REFRESH_TOKEN_REQUIRED'
      );
    }

    // ── Step 2: Hash and find in DB ─────────────────────────────
    const hashedToken = hashToken(rawRefreshToken);
    const storedToken = await RefreshToken.findOne({ token: hashedToken });

    // ── Step 3: Validate ────────────────────────────────────────
    if (!storedToken) {
      logger.warn('Refresh token not found in DB', {
        ip: req.ip,
        event: 'REFRESH_TOKEN_NOT_FOUND',
      });
      return ApiResponse.error(
        res,
        'Invalid refresh token.',
        401,
        'INVALID_REFRESH_TOKEN'
      );
    }

    if (storedToken.isRevoked) {
      // Potential token reuse attack — revoke ALL tokens for this user
      logger.warn('Revoked refresh token reuse detected — revoking all sessions', {
        userId: storedToken.userId.toString(),
        userType: storedToken.userType,
        ip: req.ip,
        event: 'TOKEN_REUSE_DETECTED',
      });

      await RefreshToken.updateMany(
        { userId: storedToken.userId, isRevoked: false },
        { isRevoked: true }
      );

      return ApiResponse.error(
        res,
        'Refresh token has been revoked. Please log in again.',
        401,
        'TOKEN_REVOKED'
      );
    }

    if (storedToken.expiresAt < new Date()) {
      return ApiResponse.error(
        res,
        'Refresh token has expired. Please log in again.',
        401,
        'TOKEN_EXPIRED'
      );
    }

    // ── Step 4: Verify JWT signature ────────────────────────────
    let decoded;
    try {
      decoded = verifyToken(rawRefreshToken, 'refresh');
    } catch (jwtErr) {
      logger.warn('Refresh token JWT verification failed', {
        ip: req.ip,
        error: jwtErr.message,
        event: 'REFRESH_JWT_INVALID',
      });

      // Revoke the stored token since the JWT is invalid
      storedToken.isRevoked = true;
      await storedToken.save();

      return ApiResponse.error(
        res,
        'Invalid refresh token.',
        401,
        'INVALID_REFRESH_TOKEN'
      );
    }

    // ── Step 5: Revoke old token ────────────────────────────────
    storedToken.isRevoked = true;
    await storedToken.save();

    // ── Step 6: Generate new token pair ─────────────────────────
    const newPayload = {
      sub: decoded.sub,
      role: decoded.role,
    };

    if (decoded.role === 'ADMIN') {
      newPayload.businessId = decoded.businessId || decoded.sub;
    } else if (decoded.role === 'AGENT') {
      newPayload.adminId = decoded.adminId;
    }

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    // ── Step 7: Store new refresh token ─────────────────────────
    await storeRefreshToken({
      rawToken: newRefreshToken,
      userId: storedToken.userId,
      userType: storedToken.userType,
      deviceInfo: req.headers['user-agent'] || null,
    });

    // ── Log auth event ────────────────────────────────────────
    logger.info('Token refresh successful', {
      userId: decoded.sub,
      role: decoded.role,
      ip: req.ip,
      event: 'TOKEN_REFRESH',
    });

    return ApiResponse.success(res, {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    }, 'Token refreshed successfully');
  } catch (err) {
    logger.error('Token refresh failed', {
      ip: req.ip,
      error: err.message,
      event: 'TOKEN_REFRESH_FAILED',
    });
    return ApiResponse.error(res, 'Token refresh failed. Please log in again.', 500, 'REFRESH_FAILED');
  }
}

// ═══════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/logout
 *
 * Revoke the current refresh token.
 *
 * Accepts refresh token from body.refreshToken or Authorization header.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function logout(req, res) {
  try {
    // Extract refresh token from body or header
    let rawRefreshToken = req.body?.refreshToken || null;

    if (!rawRefreshToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        rawRefreshToken = authHeader.slice(7).trim();
      }
    }

    if (rawRefreshToken) {
      const hashedToken = hashToken(rawRefreshToken);
      const result = await RefreshToken.findOneAndUpdate(
        { token: hashedToken, isRevoked: false },
        { isRevoked: true },
        { new: true }
      );

      if (result) {
        logger.info('Logout: refresh token revoked', {
          userId: result.userId.toString(),
          userType: result.userType,
          ip: req.ip,
          event: 'LOGOUT',
        });
      }
    } else {
      // If no refresh token provided but user is authenticated,
      // revoke all tokens for this user (nuclear logout)
      if (req.user) {
        await RefreshToken.updateMany(
          { userId: req.user.id, isRevoked: false },
          { isRevoked: true }
        );

        logger.info('Logout: all sessions revoked (no token provided)', {
          userId: req.user.id,
          role: req.user.role,
          ip: req.ip,
          event: 'LOGOUT_ALL',
        });
      }
    }

    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (err) {
    logger.error('Logout failed', {
      ip: req.ip,
      error: err.message,
      event: 'LOGOUT_FAILED',
    });
    return ApiResponse.error(res, 'Logout failed. Please try again.', 500, 'LOGOUT_FAILED');
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN SELF-SETUP
// ═══════════════════════════════════════════════════════════════

/**
 * PATCH /api/v1/auth/admin/setup
 *
 * After signup, admin can complete their profile: businessLogo, address, phone, etc.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function adminSelfSetup(req, res) {
  try {
    const adminId = req.user.id;
    const { businessLogo, address, phone, businessName } = req.body;

    const updateFields = {};
    if (businessLogo !== undefined) updateFields.businessLogo = businessLogo;
    if (address !== undefined) updateFields.address = address;
    if (phone !== undefined) updateFields.phone = phone;
    if (businessName !== undefined) updateFields.businessName = businessName;

    if (Object.keys(updateFields).length === 0) {
      return ApiResponse.error(
        res,
        'No fields provided to update.',
        400,
        'NO_UPDATE_FIELDS'
      );
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedAdmin) {
      return ApiResponse.error(res, 'Admin account not found.', 404, 'ADMIN_NOT_FOUND');
    }

    logger.info('Admin self-setup completed', {
      adminId,
      updatedFields: Object.keys(updateFields),
      ip: req.ip,
      event: 'ADMIN_SELF_SETUP',
    });

    return ApiResponse.success(
      res,
      {
        admin: {
          id: updatedAdmin._id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          businessName: updatedAdmin.businessName,
          businessLogo: updatedAdmin.businessLogo,
          phone: updatedAdmin.phone,
        },
      },
      'Profile updated successfully'
    );
  } catch (err) {
    logger.error('Admin self-setup failed', {
      adminId: req.user?.id,
      ip: req.ip,
      error: err.message,
      event: 'ADMIN_SELF_SETUP_FAILED',
    });
    return ApiResponse.error(res, 'Profile update failed. Please try again.', 500, 'SETUP_FAILED');
  }
}

module.exports = {
  adminSignup,
  adminLogin,
  agentLogin,
  refreshToken: refreshTokenHandler,
  logout,
  adminSelfSetup,
};
