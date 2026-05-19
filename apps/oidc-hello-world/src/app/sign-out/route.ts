// Clear the local session cookie and (best-effort) revoke the refresh token
// with Auth0. We do NOT redirect to /v2/logout — that kills the SSO session
// for ALL apps in the tenant, which is usually too aggressive for a third-
// party app. The user can clear the SSO session via the T3OS connected-apps
// page if they want.

import { redirect } from 'next/navigation';
import { revokeRefreshToken } from '@/lib/oidc';
import { getSession } from '@/lib/session';

async function signOut() {
  const session = await getSession();
  const refreshToken = session.refreshToken;
  await session.destroy();

  if (refreshToken) {
    try {
      await revokeRefreshToken(refreshToken);
    } catch {
      // Best-effort — the local session is already gone. The refresh token
      // will still expire on Auth0's own timeline.
    }
  }

  redirect('/');
}

export async function POST() {
  await signOut();
}

// Also accept GET so a bare link / direct browser nav works.
export async function GET() {
  await signOut();
}
