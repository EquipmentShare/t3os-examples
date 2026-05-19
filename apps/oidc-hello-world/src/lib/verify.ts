// id_token verification — the part the dev-portal page calls out as the
// most-commonly-skipped step in OIDC integrations.
//
// We pin THREE claims (not just two):
//
//   - iss === https://<auth0Domain>/
//   - aud === client_id
//   - azp === client_id      ← GOTCHA 2
//
// Why `azp` matters: in an Auth0 tenant where multiple applications share an
// API audience, the same /authorize → /oauth/token flow could mint a token
// whose `aud` is the shared audience and whose `azp` (Authorized Party) is
// some OTHER application. Checking `aud` alone lets you accept id_tokens
// minted for siblings; checking `azp` pins the token to *this* client.
//
// The id_token also carries an `https://es-erp/uid` claim populated by the
// T3OS Auth0 post-login Action — that's the canonical T3OS user id. We
// surface it on the signed-in page.
//
// We use jose's createRemoteJWKSet (JWKS cache built in) + jwtVerify. Same
// library the dev-portal snippet uses.

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from './env';

interface IdClaims extends JWTPayload {
  email?: string;
  name?: string;
  picture?: string;
  nonce?: string;
  azp?: string;
  'https://es-erp/uid'?: string;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${env.auth0Domain()}/.well-known/jwks.json`));
  }
  return jwks;
}

export async function verifyIdToken(idToken: string, expectedNonce: string): Promise<IdClaims> {
  const clientId = env.auth0ClientId();
  const issuer = `https://${env.auth0Domain()}/`;

  // jwtVerify checks signature, iss, aud, and time-based claims. azp + nonce
  // are not standard OIDC pins, so we check them manually below.
  const { payload } = await jwtVerify<IdClaims>(idToken, getJwks(), {
    issuer,
    audience: clientId,
    algorithms: ['RS256'],
  });

  if (payload.azp !== clientId) {
    // See top-of-file comment — sharing an API audience between Auth0 apps
    // means a sibling app's id_token would pass an `aud` check. `azp`
    // closes that hole.
    throw new Error(
      `id_token azp mismatch: got ${payload.azp ?? '(missing)'}, expected ${clientId}`,
    );
  }

  if (payload.nonce !== expectedNonce) {
    throw new Error('id_token nonce mismatch — possible replay or session corruption');
  }

  return payload;
}
