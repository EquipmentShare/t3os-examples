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
  // nothing we can do — caller (a Server Component or Route Handler)
  // should redirect to /sign-out to clear the cookie.
  //
  // We deliberately do NOT call session.destroy() here because this helper
  // can be invoked from Server Components, and Next.js 15 disallows cookie
  // modification outside Route Handlers / Server Actions. session.destroy()
  // would throw with "Cookies can only be modified in a Server Action or
  // Route Handler."
  if (!session.refreshToken) {
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
    // session.save() also writes to the cookie — same restriction. So this
    // path only works when getValidAccessToken is called from a Route Handler
    // or Server Action. From a Server Component, the save throws and we fall
    // through to the catch — the caller still gets the new (in-memory)
    // accessToken in that single request, but the rotated cookie isn't
    // persisted. Acceptable for this hello-world; production code paths
    // would either refresh via a server action or proxy through an API
    // route.
    try {
      await session.save();
    } catch {
      // ignore — read-only context (Server Component)
    }
    return session.accessToken;
  } catch {
    // Refresh failed — most often because the grant was revoked, or the
    // refresh token itself expired. Caller should redirect to /sign-out.
    return null;
  }
}
