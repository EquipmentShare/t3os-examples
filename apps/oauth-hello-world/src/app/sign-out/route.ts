// Clear the session cookie. Leaves the OAuth grant on the T3OS side intact —
// signing in again will skip the consent screen because the grant is still
// active. To actually delete the grant, the user has to use the
// "Manage / revoke" link from the dashboard, which leads to T3OS's
// connected-apps settings page.

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

async function signOut() {
  const session = await getSession();
  await session.destroy();
  redirect('/');
}

export async function POST() {
  await signOut();
}

// Also accept GET so a bare link / direct browser nav works.
export async function GET() {
  await signOut();
}
