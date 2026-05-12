// Step 1 of the OAuth flow. Generate PKCE + state, stash them in the
// session cookie, redirect to Auth0's /authorize endpoint.

import { redirect } from 'next/navigation';
import { buildAuthorizeUrl } from '@/lib/oauth';
import { generatePkcePair, generateState } from '@/lib/pkce';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();

  const { verifier, challenge } = generatePkcePair();
  const state = generateState();

  session.pkceVerifier = verifier;
  session.oauthState = state;
  await session.save();

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
