// Encrypted cookie session for the OIDC sign-in-only hello-world.
//
// Unlike the OAuth example, this app never calls a T3OS API — so it doesn't
// hold an access_token. It holds the verified identity claims read off the
// id_token, and (optionally) a refresh_token so sign-out can revoke it.

import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  // Set during /sign-in, read + cleared during /oauth/callback
  pkceVerifier?: string;
  oauthState?: string;
  nonce?: string;

  // Set during /oauth/callback after a successful id_token verification.
  //
  // We don't store the raw id_token — only the few claims the signed-in
  // page renders. The iron-session cookie is ~4KB max and a full id_token
  // plus refresh_token plus iron overhead can blow that.
  user?: {
    sub: string;
    uid?: string; // from the "https://es-erp/uid" custom claim
    email?: string;
    name?: string;
    picture?: string;
  };
  // Auth0 issues this when `offline_access` is in the requested scopes.
  // We keep it solely so sign-out can call /oauth/revoke to invalidate it.
  refreshToken?: string;
  // For display only.
  signedInAt?: number;
};

const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD ?? '',
  cookieName: 't3os-oidc-hello-world',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
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
