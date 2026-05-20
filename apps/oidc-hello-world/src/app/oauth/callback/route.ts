// Step 2 of the OIDC flow. Auth0 redirected the user here with a one-time
// `code` and the `state` we minted in /sign-in. We:
//
//   1. Verify state matches (CSRF defence).
//   2. POST the code + PKCE verifier + client secret to Auth0's /oauth/token.
//   3. VERIFY the id_token against Auth0's JWKS — iss, aud, azp, nonce.
//   4. Persist the displayable claims + refresh_token; clear one-shot values.
//
// On any failure we send the user back to / with an `?error=<reason>` so the
// landing page can surface a helpful message.

import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/oidc';
import { getSession } from '@/lib/session';
import { verifyIdToken } from '@/lib/verify';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const url = new URL(req.url);

  // Auth0 puts errors on the query string too (e.g. the user cancelled, or
  // Gotcha 1: the `audience` param was missing → `grant_required` lands here).
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
  if (!session.nonce) {
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

  let claims;
  try {
    claims = await verifyIdToken(tokens.id_token, session.nonce);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'id_token_verify_failed';
    redirect(`/?error=${encodeURIComponent(msg)}`);
  }

  // We deliberately do NOT save the access_token: for sign-in-only flows
  // T3OS suppresses its identity claims, and the app has no API to call
  // anyway. Storing it would just be a footgun for whoever copies this code.
  session.user = {
    sub: String(claims.sub),
    uid: claims['https://es-erp/uid'],
    email: claims.email,
    name: claims.name,
    picture: claims.picture,
  };
  if (tokens.refresh_token) {
    session.refreshToken = tokens.refresh_token;
  }
  session.signedInAt = Date.now();
  delete session.pkceVerifier;
  delete session.oauthState;
  delete session.nonce;
  await session.save();

  redirect('/signed-in');
}
