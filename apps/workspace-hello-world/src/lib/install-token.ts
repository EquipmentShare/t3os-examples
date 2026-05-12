// Verifies the install-token JWT that T3OS appends to the install-callback
// URL as `?install_token=...`.
//
// The token is signed by T3OS's IAM service and published via JWKS. Three
// things have to check out:
//
//   1. Signature — verified against the kid-matched key from T3OS's JWKS.
//   2. `iss` — must equal T3OS's IAM service base URL.
//   3. `aud` — must equal the host portion of OUR registered installCallbackUrl.
//      Not the full URL; just the host. See `audienceFromCallbackUrl` in the
//      T3OS API repo for the canonical form.
//
// Payload shape comes from the smoke test in the T3OS API repo:
// services/monolith/src/services/iam/scripts/workspace-install-smoke-test.ts

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from './env';

export interface InstallTokenClaims {
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
  app_id: string;
  workspace_id: string;
  principal_id: string;
  api_key: string;
  scopes: string[];
}

// Single JWKS handle at module scope. `createRemoteJWKSet` handles its own
// in-memory caching with reasonable defaults (~10 min TTL, refresh on
// kid-miss).
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function jwks() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(env.jwksUrl()));
  }
  return _jwks;
}

export async function verifyInstallToken(token: string): Promise<InstallTokenClaims> {
  const expectedAud = new URL(env.installCallbackUrl()).host;
  const { payload } = await jwtVerify(token, jwks(), {
    issuer: env.installTokenIssuer(),
    audience: expectedAud,
  });
  // jwtVerify already checked iss + aud + exp + signature. The remaining
  // claims are app-specific shape — assert presence so a malformed token is
  // rejected as a clear error rather than producing undefined fields later.
  const claims = payload as Partial<InstallTokenClaims>;
  for (const field of ['app_id', 'workspace_id', 'principal_id', 'api_key', 'scopes'] as const) {
    if (claims[field] === undefined) {
      throw new Error(`install token is missing claim "${field}"`);
    }
  }
  if (claims.app_id !== env.appId()) {
    throw new Error(
      `install token app_id (${claims.app_id}) does not match this app (${env.appId()})`,
    );
  }
  return claims as InstallTokenClaims;
}
