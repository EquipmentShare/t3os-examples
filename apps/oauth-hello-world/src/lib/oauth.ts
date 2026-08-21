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
  nonce: string;
  codeChallenge: string;
  scopes: string[];
  workspaceId?: string;
}): string {
  const params = new URLSearchParams({
    client_id: env.auth0ClientId(),
    response_type: 'code',
    redirect_uri: env.redirectUri(),
    // `openid` is required to receive an id_token (used here to display
    // user name/email). `offline_access` is required to receive a
    // refresh_token. Everything else is a T3OS-defined scope.
    scope: ['openid', 'profile', 'email', 'offline_access', ...args.scopes].join(' '),
    audience: env.auth0Audience(),
    state: args.state,
    nonce: args.nonce,
    code_challenge: args.codeChallenge,
    code_challenge_method: 'S256',
  });
  if (args.workspaceId) {
    // T3OS app-launcher URLs carry `?workspace=...`. Forwarding that target
    // makes the authorization unambiguous and lets an existing exact grant
    // skip the consent screen safely.
    params.set('ext-workspace-id', args.workspaceId);
  }
  return `https://${env.auth0Domain()}/authorize?${params.toString()}`;
}

export function normalizeWorkspaceTarget(value: string | null | undefined): string | undefined {
  if (!value || value.length > 256 || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) {
    return undefined;
  }
  return value;
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
