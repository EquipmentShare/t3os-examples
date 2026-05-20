// Hand-rolled OAuth 2.0 Authorization Code + PKCE client against Auth0.
//
// Two things happen here:
//
// 1. `buildAuthorizeUrl` constructs the URL the user gets bounced to for the
//    consent screen. The browser navigates there directly via a 302.
//
// 2. `exchangeCodeForTokens` and `refreshTokens` POST to /oauth/token.
//    Confidential client — we send `client_secret` from server-side env vars,
//    so the secret never reaches the browser.
//
// `decodeJwt` from jose is a *parser*, not a verifier. We use it for display
// (read user-facing claims from id_token, read workspace_id from access
// token). Tokens are issued by Auth0 against an audience we control, so for
// THIS hello-world we trust them by virtue of having just received them from
// Auth0 over TLS. Production apps that pass tokens between services should
// verify signatures with Auth0's JWKS — see `apps/oidc-hello-world/src/lib/
// verify.ts` for a JWKS-backed id_token verifier (iss + aud + azp + nonce
// pinning), or `apps/workspace-hello-world` for the install-JWT equivalent.

import { decodeJwt } from 'jose';
import { env } from './env';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number; // seconds
  scope?: string;
}

export function buildAuthorizeUrl(args: {
  state: string;
  codeChallenge: string;
  scopes: string[];
}): string {
  const params = new URLSearchParams({
    client_id: env.auth0ClientId(),
    response_type: 'code',
    redirect_uri: env.redirectUri(),
    // `openid` is required to receive an id_token (used here to display
    // user name/email). `offline_access` is required to receive a
    // refresh_token. Everything else is a T3OS-defined scope.
    scope: ['openid', 'offline_access', ...args.scopes].join(' '),
    audience: env.auth0Audience(),
    state: args.state,
    code_challenge: args.codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://${env.auth0Domain()}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(args: {
  code: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.auth0ClientId(),
    client_secret: env.auth0ClientSecret(),
    code: args.code,
    code_verifier: args.codeVerifier,
    redirect_uri: env.redirectUri(),
  });
  const res = await fetch(`https://${env.auth0Domain()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`Auth0 /oauth/token returned ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.auth0ClientId(),
    client_secret: env.auth0ClientSecret(),
    refresh_token: refreshToken,
  });
  const res = await fetch(`https://${env.auth0Domain()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    // Common case: the user revoked the grant from the T3OS web app. Caller
    // should treat this as session-dead and bounce to /sign-in.
    throw new Error(`Auth0 /oauth/token refresh returned ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export function extractWorkspaceId(accessToken: string): string {
  // Custom claim set by T3OS's Auth0 post-login Action based on the
  // workspace the user picked on the /oauth/consent screen.
  const claims = decodeJwt(accessToken) as Record<string, unknown>;
  const id = claims['https://es-erp/workspace_id'];
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(
      `Access token is missing the "https://es-erp/workspace_id" claim. ` +
        `Was the audience set to ${env.auth0Audience()}?`,
    );
  }
  return id;
}
