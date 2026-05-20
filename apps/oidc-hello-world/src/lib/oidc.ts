// Hand-rolled OpenID Connect client against Auth0 — sign-in only, no API
// access. Mirrors the wire-level behaviour the dev-portal `/docs/oidc` page
// documents.
//
// Three functions:
//
//   1. buildAuthorizeUrl  — constructs the URL the browser gets bounced to.
//   2. exchangeCodeForTokens — POST /oauth/token, confidential client.
//   3. revokeRefreshToken — POST /oauth/revoke, optional on sign-out.
//
// Verification of the id_token lives in lib/verify.ts. We deliberately do
// NOT use any Auth0 SDK — the wire shape is the point of this example.

import { env } from './env';

export interface TokenResponse {
  access_token: string; // ignored — identity claims are deliberately suppressed
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export function buildAuthorizeUrl(args: {
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: env.auth0ClientId(),
    response_type: 'code',
    redirect_uri: env.redirectUri(),
    // Scopes:
    //   - `openid` is mandatory to get an id_token.
    //   - `profile email` request name/picture/email claims onto the id_token.
    //   - `offline_access` gets us a refresh_token — solely so /sign-out can
    //     call /oauth/revoke on it. Drop this scope if you don't need that.
    //
    // Crucially: no T3OS-defined scope (no `all_resources_reader` etc.). The
    // resulting access_token will have its identity claims suppressed by the
    // T3OS Auth0 Action and is unusable against the ERP API.
    //
    // GOTCHA (registration-time, not visible here): T3OS's consent gate
    // cross-checks every scope on this URL against the app's registered
    // `requestedScopes`. `openid` + `offline_access` are implicit, but
    // `profile` and `email` are NOT — they must be in `requestedScopes`
    // when the app is registered or the consent screen rejects with
    // "Permission mismatch". See scripts/bootstrap-register-apps.ts.
    scope: 'openid profile email offline_access',
    // GOTCHA 1: `audience` is required even though we never call an API.
    // Auth0 won't issue tokens at the /oauth/token step without it —
    // /oauth/callback would receive `error=grant_required`. Setting it to
    // the T3OS delegated audience is the documented incantation for
    // sign-in-only apps.
    audience: env.auth0Audience(),
    state: args.state,
    nonce: args.nonce,
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

// Optional: hits Auth0 /oauth/revoke to invalidate the refresh token at
// sign-out. The local session cookie is destroyed regardless — this is
// belt-and-braces for the case where a stolen refresh token might otherwise
// outlive the user's sign-out click. The id_token can't be revoked (JWTs
// are stateless) but it's short-lived.
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const body = new URLSearchParams({
    client_id: env.auth0ClientId(),
    client_secret: env.auth0ClientSecret(),
    token: refreshToken,
  });
  const res = await fetch(`https://${env.auth0Domain()}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    // Auth0 returns 200 even for already-revoked tokens, so a non-2xx is
    // genuinely surprising. We don't fail the sign-out for it though —
    // best-effort.
    throw new Error(`Auth0 /oauth/revoke returned ${res.status}: ${await res.text()}`);
  }
}
