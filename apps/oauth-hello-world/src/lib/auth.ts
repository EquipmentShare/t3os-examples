// Returns a valid access token for the current session, refreshing it if
// it's about to expire. Returns null when the session is dead and the
// caller should redirect to /sign-in.
//
// Refresh-token support depends on the T3OS Auth0 application allowing
// the refresh_token grant + the API allowing offline access. If neither
// is configured, Auth0 returns no refresh_token at code exchange — we
// still return the fresh access token and just let the session expire
// when the token does. The caller redirects to /sign-in on expiry; the
// user re-completes the consent flow.

import { refreshTokens } from './oauth';
import { getSession } from './session';

// Refresh if the token expires within this many ms. Buffer protects against
// clock skew + request latency.
const REFRESH_BUFFER_MS = 30_000;

export async function getValidAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session.accessToken || !session.expiresAt) {
    return null;
  }

  const now = Date.now();
  const isFresh = session.expiresAt - now > REFRESH_BUFFER_MS;

  // Fresh token — use it as-is, even if we don't have a refresh token.
  if (isFresh) {
    return session.accessToken;
  }

  // Token is expired or about to expire. Without a refresh token there's
  // nothing we can do but kill the session.
  if (!session.refreshToken) {
    await session.destroy();
    return null;
  }

  try {
    const tokens = await refreshTokens(session.refreshToken);
    session.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      // Auth0 rotates refresh tokens when refresh-token rotation is enabled.
      // The old one is now invalid — swap it in.
      session.refreshToken = tokens.refresh_token;
    }
    session.expiresAt = Date.now() + tokens.expires_in * 1000;
    await session.save();
    return session.accessToken;
  } catch {
    // Refresh failed — most often because the grant was revoked. Clear the
    // session so the next request bounces to /sign-in.
    await session.destroy();
    return null;
  }
}
