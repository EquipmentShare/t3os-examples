// A browser-scoped cookie that remembers which workspace this browser most
// recently installed for. The cookie does NOT contain the API key — that
// lives in KV. The cookie just routes /dashboard requests to the right
// workspace record.
//
// Re-installing from the same browser into a different workspace overwrites
// the cookie; both KV entries remain (the example app supports multi-tenant
// installs — only this browser's "current view" is single-tenant).

import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  workspaceId?: string;
};

const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD ?? '',
  cookieName: 't3os-workspace-hello-world',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getSession() {
  if (!process.env.IRON_SESSION_PASSWORD) {
    throw new Error(
      'IRON_SESSION_PASSWORD is not set. Generate one with `openssl rand -base64 48`.',
    );
  }
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
