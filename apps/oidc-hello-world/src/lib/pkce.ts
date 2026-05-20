// PKCE (Proof Key for Code Exchange — RFC 7636) helper.
//
// Identical in spirit to the helper in oauth-hello-world. PKCE is required
// even though this is a confidential client because Auth0 enforces it
// uniformly on the /authorize → /oauth/token round-trip.

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

export function generateNonce(): string {
  // Echoed back inside the id_token's `nonce` claim — defends against id_token
  // replay. We mint it here, the verifier checks it (see lib/verify.ts).
  return base64UrlEncode(randomBytes(16));
}
