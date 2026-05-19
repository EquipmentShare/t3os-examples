// Step 1 of the OIDC flow. Generate PKCE + state + nonce, stash them in the
// session cookie, redirect to Auth0's /authorize endpoint.

import { redirect } from 'next/navigation';
import { buildAuthorizeUrl } from '@/lib/oidc';
import { generateNonce, generatePkcePair, generateState } from '@/lib/pkce';
import { getSession } from '@/lib/session';

export async function GET() {
  // Start a fresh session — drop any stale tokens/state from prior sign-ins.
  const session = await getSession();
  await session.destroy();
  const fresh = await getSession();

  const { verifier, challenge } = generatePkcePair();
  const state = generateState();
  const nonce = generateNonce();

  fresh.pkceVerifier = verifier;
  fresh.oauthState = state;
  fresh.nonce = nonce;
  await fresh.save();

  redirect(buildAuthorizeUrl({ state, nonce, codeChallenge: challenge }));
}
