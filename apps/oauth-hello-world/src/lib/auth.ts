// Returns a valid access token for the current session, refreshing it if
// expired. Returns null when the session is dead and the caller should
// redirect to /sign-in.

import { refreshTokens } from './oauth';
import { getSession } from './session';

// Refresh if the token expires within this many ms. Buffer protects against
// clock skew + request latency.
const REFRESH_BUFFER_MS = 30_000;

export async function getValidAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session.accessToken || !session.refreshToken || !session.expiresAt) {
    return null;
  }

  const now = Date.now();
  if (session.expiresAt - now > REFRESH_BUFFER_MS) {
    return session.accessToken;
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
