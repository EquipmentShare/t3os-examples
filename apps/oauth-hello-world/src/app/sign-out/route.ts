// Clear credentials and active identity while retaining the preferred and
// recently used workspace ids. The T3OS grant stays active, so an unchanged
// exact-scope login can skip consent. Grant deletion remains an explicit
// account-management action in T3OS connected-app settings.

import { redirect } from 'next/navigation';
import { clearAuthentication, getSession } from '@/lib/session';

async function signOut() {
  const session = await getSession();
  clearAuthentication(session);
  await session.save();
  redirect('/');
}

export async function POST() {
  await signOut();
}

// Also accept GET so a bare link / direct browser nav works.
export async function GET() {
  await signOut();
}
