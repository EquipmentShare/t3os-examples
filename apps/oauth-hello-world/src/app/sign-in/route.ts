// Step 1 of the OAuth flow. Generate PKCE + state, stash them in the
// session cookie, redirect to Auth0's /authorize endpoint.

import { redirect } from 'next/navigation';
import { buildAuthorizeUrl } from '@/lib/oauth';
import { generatePkcePair, generateState } from '@/lib/pkce';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();

  // Destroy any stale session data (e.g. tokens from a previous flow, or
  // a partial session from an older version of the code) so we start
  // fresh. We're in a Route Handler so cookie modification is allowed.
  await session.destroy();
  // After destroy() the session object is empty — reassign via getSession()
  // so the new pkce/state writes are sealed into a fresh cookie.
  const fresh = await getSession();

  const { verifier, challenge } = generatePkcePair();
  const state = generateState();

  fresh.pkceVerifier = verifier;
  fresh.oauthState = state;
  await fresh.save();

  redirect(
    buildAuthorizeUrl({
      state,
      codeChallenge: challenge,
      // The single broad-read scope this hello-world requests. See README
      // for why we chose `all_resources_reader` over a narrower scope.
      scopes: ['all_resources_reader'],
    }),
  );
}
