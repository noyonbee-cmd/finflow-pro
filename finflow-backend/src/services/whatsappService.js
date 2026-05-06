'use strict';

const logger = require('../utils/logger');
const config = require('../config/env');
const smsService = require('./smsService');

/**
 * @module whatsappService
 * @description
 * WhatsApp Business integration service for FinFlow Pro via Twilio.
 *
 * Uses the Twilio WhatsApp Business API which requires prepending
 * 'whatsapp:' to the phone numbers (both from and to).
 *
 * Provides:
 *  - WhatsApp message sending
 *  - Payment receipt delivery via WhatsApp
 *  - Configuration check
 *
 * Non-critical service: never throws on delivery failure.
 * All errors are logged and a failure result is returned.
 *
 * Env vars required:
 *  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 */

// ─── Lazy-loaded Twilio client ────────────────────────────────
let twilioClient = null;

/**
 * Get or create the Twilio client singleton.
 * @returns {import('twilio').Twilio|null}
 */
function getClient() {
  if (twilioClient) return twilioClient;

  const { accountSid, authToken } = config.twilio;
  if (!accountSid || !authToken) {
    logger.debug('[WhatsApp] Twilio not configured — missing credentials');
    return null;
  }

  try {
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    logger.info('[WhatsApp] Twilio client initialized');
    return twilioClient;
  } catch (err) {
    logger.error('[WhatsApp] Failed to initialize Twilio client', { error: err.message });
    return null;
  }
}

/**
 * Check if WhatsApp service is configured and ready.
 *
 * Verifies that all required Twilio env vars are set:
 *  - TWILIO_ACCOUNT_SID
 *  - TWILIO_AUTH_TOKEN
 *  - TWILIO_WHATSAPP_FROM
 *
 * @returns {boolean}
 */
function isConfigured() {
  return Boolean(
    config.twilio.accountSid &&
    config.twilio.authToken &&
    config.twilio.whatsappFrom
  );
}

/**
 * Prepend 'whatsapp:' prefix to a phone number if not already present.
 *
 * Twilio WhatsApp API requires this format for both sender and recipient.
 *
 * @param {string} phone - Phone number (E.164 format recommended).
 * @returns {string} Phone with 'whatsapp:' prefix.
 */
function toWhatsAppNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.trim();
  if (cleaned.startsWith('whatsapp:')) return cleaned;
  return `whatsapp:${cleaned}`;
}

// ═══════════════════════════════════════════════════════════════
// SEND WHATSAPP MESSAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Send a WhatsApp message via Twilio.
 *
 * Handles:
 *  - Auto-prepend 'whatsapp:' to from/to numbers
 *  - Graceful degradation if not configured
 *  - Error logging without throwing
 *
 * @param {Object} params
 * @param {string} params.to      - Recipient phone number (E.164 or local).
 * @param {string} params.message - Message body text.
 * @returns {Promise<{success: boolean, messageId?: string, provider: string, error?: string}>}
 */
async function sendWhatsApp({ to, message }) {
  if (!to || !message) {
    logger.warn('[WhatsApp] sendWhatsApp() called with missing params — skipping');
    return { success: false, provider: 'TWILIO_WHATSAPP', error: 'Missing to or message' };
  }

  if (!isConfigured()) {
    logger.debug('[WhatsApp] Service not configured — skipping delivery');
    return { success: false, provider: 'TWILIO_WHATSAPP', error: 'WhatsApp not configured' };
  }

  // Validate phone number using SMS service validator
  const validation = smsService.validatePhone(to);
  if (!validation.valid) {
    logger.warn('[WhatsApp] Invalid phone number', { to, error: validation.error });
    return { success: false, provider: 'TWILIO_WHATSAPP', error: validation.error };
  }

  const client = getClient();
  if (!client) {
    return { success: false, provider: 'TWILIO_WHATSAPP', error: 'Twilio client unavailable' };
  }

  try {
    const result = await client.messages.create({
      from: toWhatsAppNumber(config.twilio.whatsappFrom),
      to: toWhatsAppNumber(validation.normalized),
      body: message,
    });

    logger.info('[WhatsApp] Message sent', {
      messageId: result.sid,
      to: validation.normalized,
    });

    return {
      success: true,
      messageId: result.sid,
      provider: 'TWILIO_WHATSAPP',
    };
  } catch (err) {
    logger.error('[WhatsApp] Failed to send message', {
      to: validation.normalized,
      error: err.message,
      code: err.code,
    });

    return {
      success: false,
      provider: 'TWILIO_WHATSAPP',
      error: err.message,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SEND PAYMENT RECEIPT
// ═══════════════════════════════════════════════════════════════

/**
 * Send a payment receipt via WhatsApp.
 *
 * Uses template interpolation from smsService if a custom template
 * is provided, otherwise uses the default receipt message generator.
 *
 * @param {Object} params
 * @param {string} params.clientPhone - Client phone number.
 * @param {string} [params.template]  - Custom receipt template with {{placeholders}}.
 * @param {Object} params.variables   - Template variable values.
 * @returns {Promise<{success: boolean, messageId?: string, provider: string, error?: string}>}
 */
async function sendPaymentReceipt({ clientPhone, template, variables }) {
  if (!clientPhone) {
    logger.warn('[WhatsApp] sendPaymentReceipt() called without clientPhone — skipping');
    return { success: false, provider: 'TWILIO_WHATSAPP', error: 'Missing client phone' };
  }

  const message = template
    ? smsService.interpolateTemplate(template, variables)
    : smsService.generateReceiptMessage(variables);

  return sendWhatsApp({ to: clientPhone, message });
}

module.exports = {
  sendWhatsApp,
  sendPaymentReceipt,
  isConfigured,
  toWhatsAppNumber,
};
