// id_token verification — the part the dev-portal page calls out as the
// most-commonly-skipped step in OIDC integrations.
//
// We pin:
//
//   - iss === https://<auth0Domain>/
//   - aud === client_id
//   - azp === client_id  (CONDITIONAL — see below)
//   - nonce matches the value we minted at /sign-in
//
// Why `azp` matters: in an Auth0 tenant where multiple applications share
// an API audience, the same /authorize → /oauth/token flow could mint a
// token whose `aud` is the shared audience and whose `azp` (Authorized
// Party) is some OTHER application. Checking `aud` alone lets you accept
// id_tokens minted for siblings; checking `azp` pins the token to *this*
// client.
//
// Per OIDC Core §5, `azp` is only REQUIRED when `aud` is multi-valued.
// For single-audience id_tokens (the common case for sign-in-only apps),
// `azp` may legitimately be absent. So the check is:
//
//   - If azp is present → it MUST equal client_id.
//   - If aud is multi-valued → azp MUST be present.
//   - If aud is single-valued and azp is absent → OK (aud === client_id
//     check above is your only defense, but it suffices).
//
// The id_token also carries an `https://es-erp/uid` claim populated by the
// T3OS Auth0 post-login Action — that's the canonical T3OS user id. We
// surface it on the signed-in page.
//
// SIGNING ALGORITHM DISPATCH:
//
// Auth0 confidential clients ("Regular Web Application" template) default
// to HS256 — the id_token is HMAC-signed using the client_secret as the
// key. Modern recommendation is RS256 + JWKS, but T3OS's `registerApp` is
// currently leaving the Auth0 app on the HS256 default, so we have to
// handle both. The dispatch:
//
//   - RS*/PS*/ES*  → JWKS verification (fetch public key by `kid`)
//   - HS*          → HMAC verification with client_secret as key
//
// Both are spec-compliant. HS* requires that the verifier hold the
// client_secret, which is fine here (confidential client, secret is
// server-side only) but would be unsafe in a public client. Real-world
// OIDC integrations frequently need both because IdP configuration isn't
// always under the integrator's control — the dispatch you see here is
// production-realistic, not just a hello-world quirk.

import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose';
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

function isAsymmetricAlg(alg: string): boolean {
  return /^(RS|PS|ES)\d/.test(alg) || alg === 'EdDSA';
}

function isHmacAlg(alg: string): boolean {
  return /^HS\d/.test(alg);
}

export async function verifyIdToken(idToken: string, expectedNonce: string): Promise<IdClaims> {
  const clientId = env.auth0ClientId();
  const issuer = `https://${env.auth0Domain()}/`;

  const { alg } = decodeProtectedHeader(idToken);
  if (typeof alg !== 'string') {
    throw new Error('id_token header missing `alg` — refusing to verify');
  }

  // Dispatch the verification key by algorithm class. See top-of-file
  // comment for why both branches exist.
  let result;
  if (isAsymmetricAlg(alg)) {
    result = await jwtVerify<IdClaims>(idToken, getJwks(), {
      issuer,
      audience: clientId,
      algorithms: [alg],
    });
  } else if (isHmacAlg(alg)) {
    const secret = new TextEncoder().encode(env.auth0ClientSecret());
    result = await jwtVerify<IdClaims>(idToken, secret, {
      issuer,
      audience: clientId,
      algorithms: [alg],
    });
  } else {
    throw new Error(`id_token signed with unsupported alg: ${alg}`);
  }

  const { payload } = result;

  // azp pinning, per OIDC Core §5 (see top-of-file comment for the
  // conditional logic).
  const aud = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (aud.length > 1 && !payload.azp) {
    throw new Error('id_token has multiple audiences but no azp — refusing to verify');
  }
  if (payload.azp !== undefined && payload.azp !== clientId) {
    throw new Error(`id_token azp mismatch: got ${payload.azp}, expected ${clientId}`);
  }

  if (payload.nonce !== expectedNonce) {
    throw new Error('id_token nonce mismatch — possible replay or session corruption');
  }

  return payload;
}
