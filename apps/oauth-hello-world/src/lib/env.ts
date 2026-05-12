// Centralised env-var reads so we fail loudly at startup rather than at the
// first request that needs a missing value.

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}. See .env.example for the full list.`);
  }
  return v;
}

export const env = {
  auth0Domain: () => required('AUTH0_DOMAIN'),
  auth0Audience: () => required('AUTH0_AUDIENCE'),
  auth0ClientId: () => required('AUTH0_CLIENT_ID'),
  auth0ClientSecret: () => required('AUTH0_CLIENT_SECRET'),
  graphqlUrl: () => required('T3OS_GRAPHQL_URL'),
  redirectUri: () => required('OAUTH_REDIRECT_URI'),
  revokeUrl: () => required('T3OS_REVOKE_URL'),
};
