/**
 * Field-level AES-256-GCM encryption for PII at rest.
 *
 * Uses ENCRYPTION_KEY env var (32-byte hex string). If not set,
 * generates a random key per-process (data won't persist across restarts
 * — set the env var in production).
 *
 * Encrypted values are stored as: iv:authTag:ciphertext (all hex-encoded).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from env or generate a fallback.
 * In production, always set ENCRYPTION_KEY (64-char hex = 32 bytes).
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    const buf = Buffer.from(envKey, 'hex');
    if (buf.length !== 32) {
      throw new Error(
        `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got ${buf.length} bytes.`,
      );
    }
    return buf;
  }

  // Fallback: generate per-process key (not persistent — for dev only)
  if (!globalFallbackKey) {
    console.warn(
      '[encryption] ENCRYPTION_KEY not set — using random key. Data encrypted in this session cannot be decrypted later.',
    );
    globalFallbackKey = randomBytes(32);
  }
  return globalFallbackKey;
}

let globalFallbackKey: Buffer | null = null;

/**
 * Whether encryption is properly configured with a persistent key.
 */
export function isEncryptionConfigured(): boolean {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) return false;
  try {
    const buf = Buffer.from(envKey, 'hex');
    return buf.length === 32;
  } catch {
    return false;
  }
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (hex-encoded).
 * Returns null if value is null/undefined.
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null;

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a field encrypted with encryptField().
 * Returns null if value is null/undefined or decryption fails.
 */
export function decryptField(encryptedValue: string | null | undefined): string | null {
  if (encryptedValue == null || encryptedValue === '') return null;

  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) return null; // Not encrypted or invalid format

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('[decryptField] Decryption failed:', err);
    return null;
  }
}

/**
 * Check if a value appears to be encrypted (matches iv:authTag:ciphertext format).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  // Check that each part is valid hex
  return parts.every((p) => /^[0-9a-f]+$/i.test(p));
}

/**
 * Mask an encrypted field for display — shows "[encrypted]" or last 4 chars.
 */
export function maskEncryptedField(
  encryptedValue: string | null | undefined,
  showLast4: boolean = false,
): string {
  if (!encryptedValue) return '';
  if (!isEncrypted(encryptedValue)) return encryptedValue; // Not encrypted, return as-is

  if (showLast4) {
    const decrypted = decryptField(encryptedValue);
    if (decrypted && decrypted.length >= 4) {
      return `***${decrypted.slice(-4)}`;
    }
  }
  return '[encrypted]';
}
