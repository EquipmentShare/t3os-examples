// Step 2 of the OAuth flow. Auth0 redirected the user here with a one-time
// `code` and the `state` we minted in /sign-in. We:
//
//   1. Verify state matches (CSRF defence).
//   2. POST the code + PKCE verifier + client secret to Auth0's /oauth/token.
//   3. Verify both JWTs (signature, iss, aud, azp, exp, nonce).
//   4. Reject a workspace claim that differs from an explicit target.
//   5. Persist tokens + workspace preference and clear one-shot state.
//
// On any failure we send the user back to / with an `?error=<reason>` so the
// landing page can surface a helpful message.

import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/oauth';
import { getSession, rememberWorkspace } from '@/lib/session';
import { verifyDelegatedAccessToken, verifyIdToken } from '@/lib/verify';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const url = new URL(req.url);

  // Auth0 puts errors on the query string too (e.g. user clicked Deny).
  const authError = url.searchParams.get('error');
  if (authError) {
    const description = url.searchParams.get('error_description') ?? authError;
    redirect(`/?error=${encodeURIComponent(description)}`);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!session.oauthState || state !== session.oauthState) {
    redirect('/?error=state_mismatch');
  }
  if (!code) {
    redirect('/?error=missing_code');
  }
  if (!session.pkceVerifier) {
    redirect('/?error=missing_verifier');
  }
  if (!session.oidcNonce) {
    redirect('/?error=missing_nonce');
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: session.pkceVerifier,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'token_exchange_failed';
    redirect(`/?error=${encodeURIComponent(msg)}`);
  }

  let workspaceId: string;
  let idClaims;
  try {
    const [verifiedIdClaims, accessClaims] = await Promise.all([
      verifyIdToken(tokens.id_token, session.oidcNonce),
      verifyDelegatedAccessToken(tokens.access_token),
    ]);
    idClaims = verifiedIdClaims;
    workspaceId = accessClaims['https://es-erp/workspace_id']!;
    if (session.oauthWorkspaceId && session.oauthWorkspaceId !== workspaceId) {
      throw new Error('T3OS authorization returned a different workspace than requested');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'token_verification_failed';
    redirect(`/?error=${encodeURIComponent(msg)}`);
  }

  // Replace one-shot values with the authenticated session payload.
  // We do NOT keep the raw id_token — only the few claims we display.
  // Keeping the full id_token blows the cookie past Chrome's 4KB limit
  // once the access token is added.
  session.accessToken = tokens.access_token;
  if (tokens.refresh_token) {
    session.refreshToken = tokens.refresh_token;
  }
  session.expiresAt = Date.now() + tokens.expires_in * 1000;
  session.workspaceId = workspaceId;
  session.user = {
    uid: idClaims['https://es-erp/uid']!,
    sub: idClaims.sub!,
    name: typeof idClaims.name === 'string' ? idClaims.name : undefined,
    email: typeof idClaims.email === 'string' ? idClaims.email : undefined,
  };
  delete session.pkceVerifier;
  delete session.oauthState;
  delete session.oidcNonce;
  delete session.oauthWorkspaceId;
  rememberWorkspace(session, workspaceId, idClaims['https://es-erp/uid']!);
  await session.save();

  redirect('/dashboard');
}
