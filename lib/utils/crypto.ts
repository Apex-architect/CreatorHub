import crypto from 'crypto';

/**
 * Symmetric encryption utilities for protecting sensitive fields at rest.
 *
 * Safest assumptions:
 * - ENCRYPTION_KEY is a 32-byte (256-bit) base64-encoded key.
 * - AES-256-GCM is used with a 12-byte IV and 16-byte auth tag.
 * - These helpers are only used on the server; never import into client code.
 */

const ENCRYPTION_KEY_BASE64 = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_BASE64) {
  // eslint-disable-next-line no-console
  console.warn(
    'ENCRYPTION_KEY is not set; sensitive field encryption will not work as expected.',
  );
}

function getKey(): Buffer {
  if (!ENCRYPTION_KEY_BASE64) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }

  const key = Buffer.from(ENCRYPTION_KEY_BASE64, 'base64');

  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes (256 bits)');
  }

  return key;
}

export function encryptSensitive(value: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, authTag, encrypted]).toString('base64');

  return payload;
}

export function decryptSensitive(payload: string): string {
  const key = getKey();
  const buffer = Buffer.from(payload, 'base64');

  if (buffer.length < 12 + 16) {
    throw new Error('Invalid encrypted payload');
  }

  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}



// feat: recompute invoice totals on the server
// 2026-01-19T14:45:00

// feat: wire TanStack Query for server state
// 2026-02-19T09:20:00

// feat: add request validation for all write endpoints
// 2026-03-22T14:55:00

// feat: test unsigned webhook rejection
// 2026-04-21T09:30:00

// feat: exclude non-taxable income from SE base
// 2026-05-22T14:05:00

// feat: fix route group vs dashboard path mismatch
// 2026-06-22T09:40:00

// feat: document Stripe local webhook setup
// 2026-07-22T14:15:00

// feat: add edge cases for zero and negative amounts
// 2026-08-22T09:50:00

// feat: improve Vercel deployment configuration
// 2026-09-22T14:25:00
