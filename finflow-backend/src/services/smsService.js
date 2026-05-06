'use strict';

const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * @module smsService
 * @description
 * SMS integration service for FinFlow Pro using Twilio.
 *
 * Provides:
 *  - SMS sending with automatic retry on first failure
 *  - Payment receipt SMS with template interpolation
 *  - Default receipt message generation
 *  - Bangladesh phone number validation (01XXXXXXXXX + intl)
 *
 * Non-critical service: never throws on delivery failure.
 * All errors are logged and a failure result is returned.
 *
 * Env vars required:
 *  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM
 */

// ─── Lazy-loaded Twilio client ────────────────────────────────
let twilioClient = null;

/**
 * Get or create the Twilio client singleton.
 * @returns {import('twilio').Twilio|null} Twilio client or null if not configured.
 */
function getClient() {
  if (twilioClient) return twilioClient;

  const { accountSid, authToken } = config.twilio;
  if (!accountSid || !authToken) {
    logger.debug('Twilio SMS not configured — missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
    return null;
  }

  try {
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    logger.info('[SMS] Twilio client initialized');
    return twilioClient;
  } catch (err) {
    logger.error('[SMS] Failed to initialize Twilio client', { error: err.message });
    return null;
  }
}

/**
 * Check if SMS service is configured and ready.
 * @returns {boolean}
 */
function isConfigured() {
  return Boolean(
    config.twilio.accountSid &&
    config.twilio.authToken &&
    config.twilio.smsFrom
  );
}

// ═══════════════════════════════════════════════════════════════
// PHONE VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a phone number.
 *
 * Supported formats:
 *  - Bangladesh local:  01XXXXXXXXX (11 digits)
 *  - Bangladesh intl:   +8801XXXXXXXXX
 *  - General intl:      +XXXXXXXXXXX (10-15 digits)
 *
 * @param {string} phone - The phone number to validate.
 * @returns {{valid: boolean, normalized: string, error?: string}}
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, normalized: '', error: 'Phone number is required' };
  }

  // Strip whitespace and dashes
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Bangladesh local format: 01XXXXXXXXX
  const bdLocalRegex = /^01[3-9]\d{8}$/;
  if (bdLocalRegex.test(cleaned)) {
    return { valid: true, normalized: `+88${cleaned}` };
  }

  // Bangladesh international: +8801XXXXXXXXX
  const bdIntlRegex = /^\+8801[3-9]\d{8}$/;
  if (bdIntlRegex.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  // General international format: +XXXXXXXXXXX (10–15 digits after +)
  const intlRegex = /^\+\d{10,15}$/;
  if (intlRegex.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  return { valid: false, normalized: '', error: 'Invalid phone number format' };
}

// ═══════════════════════════════════════════════════════════════
// SEND SMS
// ═══════════════════════════════════════════════════════════════

/**
 * Send an SMS message via Twilio.
 *
 * Handles:
 *  - Twilio API call with from/to/body
 *  - Automatic retry once on failure
 *  - Graceful degradation (never throws)
 *
 * @param {Object} params
 * @param {string} params.to      - Recipient phone number.
 * @param {string} params.message - SMS message body.
 * @returns {Promise<{success: boolean, messageId?: string, provider: string, error?: string}>}
 */
async function sendSMS({ to, message }) {
  if (!to || !message) {
    logger.warn('[SMS] sendSMS() called with missing params — skipping');
    return { success: false, provider: 'TWILIO', error: 'Missing to or message' };
  }

  if (!isConfigured()) {
    logger.debug('[SMS] Twilio not configured — skipping SMS delivery');
    return { success: false, provider: 'TWILIO', error: 'SMS not configured' };
  }

  // Validate and normalize phone number
  const validation = validatePhone(to);
  if (!validation.valid) {
    logger.warn('[SMS] Invalid phone number', { to, error: validation.error });
    return { success: false, provider: 'TWILIO', error: validation.error };
  }

  const client = getClient();
  if (!client) {
    return { success: false, provider: 'TWILIO', error: 'Twilio client unavailable' };
  }

  // ── Attempt 1 ────────────────────────────────────────────────
  try {
    const result = await client.messages.create({
      from: config.twilio.smsFrom,
      to: validation.normalized,
      body: message,
    });

    logger.info('[SMS] Message sent', {
      messageId: result.sid,
      to: validation.normalized,
    });

    return {
      success: true,
      messageId: result.sid,
      provider: 'TWILIO',
    };
  } catch (firstErr) {
    logger.warn('[SMS] First attempt failed, retrying...', {
      to: validation.normalized,
      error: firstErr.message,
    });

    // ── Attempt 2 (retry) ──────────────────────────────────────
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay

      const retryResult = await client.messages.create({
        from: config.twilio.smsFrom,
        to: validation.normalized,
        body: message,
      });

      logger.info('[SMS] Message sent on retry', {
        messageId: retryResult.sid,
        to: validation.normalized,
      });

      return {
        success: true,
        messageId: retryResult.sid,
        provider: 'TWILIO',
      };
    } catch (retryErr) {
      logger.error('[SMS] Both attempts failed', {
        to: validation.normalized,
        firstError: firstErr.message,
        retryError: retryErr.message,
      });

      return {
        success: false,
        provider: 'TWILIO',
        error: retryErr.message,
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE INTERPOLATION
// ═══════════════════════════════════════════════════════════════

/**
 * Interpolate template variables into a message string.
 *
 * Replaces {{variableName}} placeholders with actual values.
 *
 * @param {string} template  - Template string with {{placeholders}}.
 * @param {Object} variables - Key-value map of variable replacements.
 * @returns {string} Interpolated message.
 */
function interpolateTemplate(template, variables) {
  if (!template || !variables) return template || '';

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

/**
 * Generate the default receipt message from standard variables.
 *
 * @param {Object} variables
 * @param {string} variables.client_name
 * @param {string} variables.amount       - Already formatted (e.g., "5,000.00").
 * @param {string} variables.fee
 * @param {string} variables.net_amount
 * @param {string} variables.ref_id
 * @param {string} variables.date
 * @param {string} variables.wallet
 * @param {string} variables.business_name
 * @returns {string} Formatted receipt message.
 */
function generateReceiptMessage(variables) {
  const {
    client_name = 'Customer',
    amount = '0',
    fee = '0',
    net_amount = '0',
    ref_id = 'N/A',
    date = new Date().toLocaleDateString(),
    wallet = 'N/A',
    business_name = 'FinFlow Pro',
  } = variables || {};

  return [
    `Dear ${client_name},`,
    '',
    `Your payment of ৳${amount} has been processed successfully.`,
    '',
    `Fee: ৳${fee}`,
    `Net Amount: ৳${net_amount}`,
    `Wallet: ${wallet}`,
    `Ref: ${ref_id}`,
    `Date: ${date}`,
    '',
    `Thank you for choosing ${business_name}.`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════
// SEND PAYMENT RECEIPT
// ═══════════════════════════════════════════════════════════════

/**
 * Send a payment receipt SMS to a client.
 *
 * If a custom template is provided, interpolates variables into it.
 * Otherwise, uses the default receipt message generator.
 *
 * @param {Object} params
 * @param {string} params.clientPhone - Client phone number.
 * @param {string} [params.template]  - Custom receipt template with {{placeholders}}.
 * @param {Object} params.variables   - Template variable values.
 * @returns {Promise<{success: boolean, messageId?: string, provider: string, error?: string}>}
 */
async function sendPaymentReceipt({ clientPhone, template, variables }) {
  if (!clientPhone) {
    logger.warn('[SMS] sendPaymentReceipt() called without clientPhone — skipping');
    return { success: false, provider: 'TWILIO', error: 'Missing client phone' };
  }

  const message = template
    ? interpolateTemplate(template, variables)
    : generateReceiptMessage(variables);

  return sendSMS({ to: clientPhone, message });
}

module.exports = {
  sendSMS,
  sendPaymentReceipt,
  generateReceiptMessage,
  validatePhone,
  interpolateTemplate,
  isConfigured,
};
