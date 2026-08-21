// Verify every token before reading claims. TLS protects the token exchange
// in transit; JWT verification proves the issuer, audience, client, expiry,
// signature, and OIDC nonce are all the values this app expects.

import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose';
import { env } from './env';

export interface UserClaims extends JWTPayload {
  email?: string;
  name?: string;
  picture?: string;
  nonce?: string;
  azp?: string;
  'https://es-erp/uid'?: string;
}

export interface DelegatedClaims extends JWTPayload {
  azp?: string;
  scope?: string;
  'https://es-erp/workspace_id'?: string;
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function jwks() {
  cachedJwks ??= createRemoteJWKSet(new URL(`https://${env.auth0Domain()}/.well-known/jwks.json`));
  return cachedJwks;
}

function assertAuthorizedParty(payload: JWTPayload & { azp?: string }): void {
  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (audiences.length > 1 && !payload.azp) {
    throw new Error('Token has multiple audiences without azp');
  }
  if (payload.azp !== undefined && payload.azp !== env.auth0ClientId()) {
    throw new Error('Token azp does not match this client');
  }
}

function isAsymmetricAlgorithm(algorithm: string): boolean {
  return /^(RS|PS|ES)\d/.test(algorithm) || algorithm === 'EdDSA';
}

export async function verifyIdToken(token: string, expectedNonce: string): Promise<UserClaims> {
  const { alg } = decodeProtectedHeader(token);
  if (!alg) throw new Error('ID token is missing its signing algorithm');

  const options = {
    issuer: `https://${env.auth0Domain()}/`,
    audience: env.auth0ClientId(),
    algorithms: [alg],
  };
  let payload: UserClaims;
  if (/^HS\d/.test(alg)) {
    ({ payload } = await jwtVerify<UserClaims>(
      token,
      new TextEncoder().encode(env.auth0ClientSecret()),
      options,
    ));
  } else if (isAsymmetricAlgorithm(alg)) {
    ({ payload } = await jwtVerify<UserClaims>(token, jwks(), options));
  } else {
    throw new Error(`ID token uses unsupported signing algorithm: ${alg}`);
  }
  assertAuthorizedParty(payload);
  if (payload.nonce !== expectedNonce) throw new Error('ID token nonce mismatch');
  if (!payload.sub) throw new Error('ID token subject is missing');
  if (!payload['https://es-erp/uid']) throw new Error('Stable T3OS user id is missing');
  return payload;
}

export async function verifyDelegatedAccessToken(token: string): Promise<DelegatedClaims> {
  const { payload } = await jwtVerify<DelegatedClaims>(token, jwks(), {
    issuer: `https://${env.auth0Domain()}/`,
    audience: env.auth0Audience(),
  });
  assertAuthorizedParty(payload);
  if (!payload['https://es-erp/workspace_id']) {
    throw new Error('Delegated token workspace is missing');
  }
  return payload;
}
