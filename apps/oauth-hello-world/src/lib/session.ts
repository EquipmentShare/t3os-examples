// Encrypted cookie session for the OAuth hello-world app.
//
// Why iron-session: the session blob (access token, refresh token, etc.) is
// sealed with a server-only key and stored in an httpOnly cookie. The browser
// holds the ciphertext; only the server can decrypt. Zero infra — no KV, no
// database — but the trade-off is the cookie has to fit in ~4KB total.
//
// During the OAuth round-trip we also stash the PKCE verifier and CSRF state
// in the same session. They get cleared once the callback completes.

import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  // Set during /sign-in, read + cleared during /callback
  pkceVerifier?: string;
  oauthState?: string;

  // Set during /callback after a successful token exchange
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number; // unix ms — server clock
  workspaceId?: string; // from the access-token "https://es-erp/workspace_id" claim
};

const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD ?? '',
  cookieName: 't3os-oauth-hello-world',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    // Default path '/' so all routes see the cookie.
  },
};

export async function getSession() {
  if (!process.env.IRON_SESSION_PASSWORD) {
    throw new Error(
      'IRON_SESSION_PASSWORD is not set. Generate one with `openssl rand -base64 48` ' +
        'and add it to .env.local (or the Vercel project env vars).',
    );
  }
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
