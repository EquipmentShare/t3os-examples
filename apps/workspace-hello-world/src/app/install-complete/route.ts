// Receives the post-install redirect from T3OS. The query param
// `install_token` is a one-shot RS256 JWT containing the plaintext API key
// in the payload. We:
//
//   1. Verify the JWT against T3OS's JWKS (signature, iss, aud, exp).
//   2. Pull api_key + workspace_id + app_id + principal_id + scopes from claims.
//   3. AES-256-GCM-encrypt the API key with our server-held key.
//   4. Store the encrypted record in KV keyed by workspace_id.
//   5. Set a session cookie remembering which workspace this browser just
//      installed for, so /dashboard knows which KV record to load.
//
// The plaintext API key is never logged anywhere, never stored unencrypted,
// and never crosses back to the browser. This callback is the ONLY moment
// the plaintext key is in process memory.

import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { verifyInstallToken } from '@/lib/install-token';
import { getSession } from '@/lib/session';
import { saveInstall } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const installToken = url.searchParams.get('install_token');
  if (!installToken) {
    redirect('/?error=missing_install_token');
  }

  let claims;
  try {
    claims = await verifyInstallToken(installToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'jwt_verify_failed';
    redirect(`/?error=${encodeURIComponent(msg)}`);
  }

  try {
    await saveInstall({
      workspaceId: claims.workspace_id,
      apiKey: claims.api_key,
      appId: claims.app_id,
      principalId: claims.principal_id,
      scopes: claims.scopes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'persist_failed';
    redirect(`/?error=${encodeURIComponent(msg)}`);
  }

  const session = await getSession();
  session.workspaceId = claims.workspace_id;
  await session.save();

  redirect('/dashboard');
}
