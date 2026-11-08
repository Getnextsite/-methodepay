import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { env } from './env';

/**
 * AES-256-GCM for merchant secrets at rest.
 *
 * This is the direct successor to the plugin's encrypt_private_value(): API
 * secret keys, Telegram bot tokens, licence/delivery codes and buyer-submitted
 * gift-card codes are all bearer credentials. A database dump should not hand
 * an attacker a working Stripe key.
 *
 * Stored format: v1.<iv-b64>.<tag-b64>.<ciphertext-b64>
 */

const VERSION = 'v1';

function key(): Buffer {
  const raw = env.encryptionKey;
  // Accept hex or base64, and derive a 32-byte key either way.
  const buf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  if (buf.length === 32) return buf;
  // Anything else gets hashed to the right length rather than silently
  // truncated, so a short key is still a valid (if weaker) key.
  return createHash('sha256').update(raw, 'utf8').digest();
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return '';
  const parts = stored.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    // Not our format. Return empty rather than leaking a raw value that may be
    // a stale plaintext import, so callers treat it as "not configured".
    return '';
  }
  try {
    const [, ivB64, tagB64, dataB64] = parts;
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}

/** Show a secret in the UI without showing the secret: sk_live_••••4821 */
export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '•'.repeat(value.length);
  return `${value.slice(0, 4)}${'•'.repeat(6)}${value.slice(-4)}`;
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Constant-time compare for tokens and signatures. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

const REF_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O — misread aloud

/**
 * Human-quotable order reference. Buyers read these out on WhatsApp, so the
 * alphabet drops the characters people confuse when speaking or typing.
 */
export function orderRef(prefix = 'MP-', length = 6): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += REF_ALPHABET[bytes[i] % REF_ALPHABET.length];
  }
  return `${prefix}${out}`;
}
