// Clears the browser session cookie. Does NOT delete the KV record or
// uninstall the app on T3OS's side — the workspace is still installed,
// other browsers in that workspace can still see /dashboard if they have
// their own cookie. To actually uninstall, the user goes to T3OS's
// workspace-settings page via the "Manage / uninstall" link.

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

export async function GET() {
  await signOut();
}
