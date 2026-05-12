// AES-256-GCM at-rest encryption for the workspace API key.
//
// The key arrives once on install (inside the install-token JWT) and is
// never re-deliverable. We encrypt it with a symmetric server-held key
// before storing in KV — defense in depth on top of KV's logical privacy.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function loadKey(): Buffer {
  const raw = process.env.API_KEY_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'API_KEY_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32`.',
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error(
      `API_KEY_ENCRYPTION_KEY must decode to 32 bytes (256 bits); got ${buf.length}.`,
    );
  }
  return buf;
}

export function encrypt(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(12); // GCM standard nonce length
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: iv (12) || tag (16) || ciphertext
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(payload: string): string {
  const key = loadKey();
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < 28) {
    throw new Error('Encrypted payload is too short to be valid');
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
