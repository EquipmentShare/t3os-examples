// Step 1 of the OAuth flow. Generate PKCE + state, stash them in the
// session cookie, redirect to Auth0's /authorize endpoint.

import { NextResponse, type NextRequest } from 'next/server';
import { buildAuthorizeUrl, normalizeWorkspaceTarget } from '@/lib/oauth';
import { generateNonce, generatePkcePair, generateState } from '@/lib/pkce';
import { clearAuthentication, getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const rawWorkspaceId = request.nextUrl.searchParams.get('workspace');
  const requestedWorkspaceId = normalizeWorkspaceTarget(rawWorkspaceId);
  if (rawWorkspaceId !== null && !requestedWorkspaceId) {
    return new Response('Invalid workspace', { status: 400 });
  }
  const chooseWorkspace = request.nextUrl.searchParams.get('choose') === '1';
  const workspaceId =
    requestedWorkspaceId ?? (chooseWorkspace ? undefined : session.preferredWorkspaceId);

  // Clear credentials and one-shot state while preserving the small UX
  // preferences that make logout/login and workspace switching predictable.
  clearAuthentication(session);

  const { verifier, challenge } = generatePkcePair();
  const state = generateState();
  const nonce = generateNonce();

  session.pkceVerifier = verifier;
  session.oauthState = state;
  session.oidcNonce = nonce;
  session.oauthWorkspaceId = workspaceId;
  await session.save();

  return NextResponse.redirect(
    buildAuthorizeUrl({
      state,
      nonce,
      codeChallenge: challenge,
      // The single broad-read scope this hello-world requests. See README
      // for why we chose `all_resources_reader` over a narrower scope.
      scopes: ['all_resources_reader'],
      workspaceId,
    }),
  );
}
