'use strict';

const Joi = require('joi');

/**
 * @module auth.validators
 * @description
 * Joi validation schemas for all authentication endpoints in FinFlow Pro.
 *
 * Schema naming convention: <action>Schema
 * All schemas use stripUnknown and abortEarly: false (handled by validate middleware).
 *
 * Password policy: minimum 8 characters.
 * Phone format:    10-15 digits, optional leading +.
 * Email:           standard RFC-compliant email.
 */

// ─── Reusable field definitions ───────────────────────────────

const nameField = Joi.string()
  .trim()
  .min(2)
  .max(120)
  .required()
  .messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 120 characters',
    'any.required': 'Name is required',
  });

const emailField = Joi.string()
  .trim()
  .lowercase()
  .email({ tlds: { allow: false } })
  .required()
  .messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  });

const passwordField = Joi.string()
  .min(8)
  .max(128)
  .required()
  .messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password cannot exceed 128 characters',
    'any.required': 'Password is required',
  });

const phoneField = Joi.string()
  .trim()
  .pattern(/^\+?[0-9]{10,15}$/)
  .required()
  .messages({
    'string.empty': 'Phone number is required',
    'string.pattern.base': 'Please provide a valid phone number (10-15 digits)',
    'any.required': 'Phone number is required',
  });

// ═══════════════════════════════════════════════════════════════
// ADMIN SIGNUP
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/admin/signup
 *
 * Required: name, email, password, businessName, phone
 */
const adminSignupSchema = Joi.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  businessName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Business name is required',
      'string.min': 'Business name must be at least 2 characters',
      'string.max': 'Business name cannot exceed 200 characters',
      'any.required': 'Business name is required',
    }),
  phone: phoneField,
});

// ═══════════════════════════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/admin/login
 *
 * Required: email, password
 */
const adminLoginSchema = Joi.object({
  email: emailField,
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
});

// ═══════════════════════════════════════════════════════════════
// AGENT LOGIN
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/agent/login
 *
 * Required: phone, password
 */
const agentLoginSchema = Joi.object({
  phone: phoneField,
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
});

// ═══════════════════════════════════════════════════════════════
// AGENT SELF-REGISTER
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/agent/register
 *
 * Required: name, phone, password, adminCode
 */
const agentRegisterSchema = Joi.object({
  name: nameField,
  phone: phoneField,
  password: passwordField,
  adminCode: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Admin code is required',
      'any.required': 'Admin code is required to register as an agent',
    }),
});

// ═══════════════════════════════════════════════════════════════
// REFRESH TOKEN
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/refresh
 *
 * Accepts token from body.refreshToken
 * (also checked from Authorization header in the controller)
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .trim()
    .optional()
    .messages({
      'string.empty': 'Refresh token is required',
    }),
});

// ═══════════════════════════════════════════════════════════════
// ADMIN SELF-SETUP (Post-signup profile completion)
// ═══════════════════════════════════════════════════════════════

/**
 * PATCH /api/v1/auth/admin/setup
 *
 * Optional: businessLogo, address, phone, businessName
 */
const adminSelfSetupSchema = Joi.object({
  businessLogo: Joi.string().trim().uri().allow('', null).optional().messages({
    'string.uri': 'Business logo must be a valid URL',
  }),
  address: Joi.string().trim().max(500).allow('', null).optional().messages({
    'string.max': 'Address cannot exceed 500 characters',
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  businessName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Business name must be at least 2 characters',
      'string.max': 'Business name cannot exceed 200 characters',
    }),
});

// ═══════════════════════════════════════════════════════════════
// ADMIN CREATE AGENT
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/auth/admin/agents
 *
 * Admin creates an agent with initial credentials.
 */
const adminCreateAgentSchema = Joi.object({
  name: nameField,
  phone: phoneField,
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  commissionPercent: Joi.number()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.min': 'Commission percent cannot be negative',
      'number.max': 'Commission percent cannot exceed 100',
    }),
});

// ═══════════════════════════════════════════════════════════════
// ADMIN APPROVE / SUSPEND AGENT
// ═══════════════════════════════════════════════════════════════

const agentStatusActionSchema = Joi.object({
  agentId: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Agent ID is required',
      'any.required': 'Agent ID is required',
    }),
});

module.exports = {
  adminSignupSchema,
  adminLoginSchema,
  agentLoginSchema,
  agentRegisterSchema,
  refreshTokenSchema,
  adminSelfSetupSchema,
  adminCreateAgentSchema,
  agentStatusActionSchema,
};
