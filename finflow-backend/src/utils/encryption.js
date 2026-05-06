'use strict';

const crypto = require('crypto');

/**
 * @module encryption
 * @description
 * AES-256-GCM encryption / decryption for sensitive fields
 * (Telegram bot tokens, API keys, PII data).
 *
 * The key is derived from the ENCRYPTION_KEY env variable using
 * SHA-256 to ensure a consistent 32-byte key regardless of input length.
 *
 * Output format: base64(iv):base64(authTag):base64(encrypted)
 * This is a compact, URL-safe string suitable for database storage.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Derive a 32-byte key from the ENCRYPTION_KEY env variable.
 * @returns {Buffer} 32-byte encryption key.
 * @throws {Error} If ENCRYPTION_KEY is not set.
 */
function getKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param {string} text - The plaintext to encrypt.
 * @returns {string} Encrypted payload as `base64(iv):base64(authTag):base64(ciphertext)`.
 * @throws {Error} If text is falsy or encryption key is missing.
 */
function encrypt(text) {
  if (!text) {
    throw new Error('encrypt() requires a non-empty string');
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypt an AES-256-GCM encrypted payload.
 *
 * @param {string} data - Encrypted string in format `base64(iv):base64(authTag):base64(ciphertext)`.
 * @returns {string} The original plaintext.
 * @throws {Error} If data format is invalid, key is wrong, or tampered.
 */
function decrypt(data) {
  if (!data || typeof data !== 'string') {
    throw new Error('decrypt() requires a non-empty encrypted string');
  }

  const parts = data.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format — expected iv:authTag:ciphertext');
  }

  const key = getKey();
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
