// Minimal GraphQL client. POSTs `{ query, variables }` with the user's
// bearer token. Throws on transport or GraphQL errors.

import { env } from './env';

interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function gql<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(env.graphqlUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`T3OS GraphQL HTTP ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as GqlResponse<T>;
  if (body.errors && body.errors.length > 0) {
    throw new Error(`T3OS GraphQL: ${body.errors.map((e) => e.message).join('; ')}`);
  }
  if (!body.data) {
    throw new Error('T3OS GraphQL: response had no data');
  }
  return body.data;
}
