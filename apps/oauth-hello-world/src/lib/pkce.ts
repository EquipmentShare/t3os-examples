// PKCE (Proof Key for Code Exchange — RFC 7636) helper.
//
// The OAuth spec requires the authorize request to send `code_challenge` (a
// hash of a one-time secret) and the token exchange to send `code_verifier`
// (the secret itself). The hashed form goes on the wire; the secret stays in
// the client session. Together they prove the same client started and
// completed the flow, defending against a stolen authorization code.

import { createHash, randomBytes } from 'node:crypto';

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  // 48 random bytes → 64 base64url chars. Spec allows 43–128 chars; this fits.
  const verifier = base64UrlEncode(randomBytes(48));
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  // CSRF token tied to the authorize → callback round-trip. Stored in
  // session, echoed back as `?state=...`, must match exactly.
  return base64UrlEncode(randomBytes(16));
}
