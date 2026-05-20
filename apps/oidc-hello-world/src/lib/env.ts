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
  // Required by Auth0 for token issuance even though THIS app never calls a
  // T3OS API. Omitting it produces `error=grant_required` at the callback —
  // see README "Gotcha 1".
  auth0Audience: () => required('AUTH0_AUDIENCE'),
  auth0ClientId: () => required('AUTH0_CLIENT_ID'),
  auth0ClientSecret: () => required('AUTH0_CLIENT_SECRET'),
  redirectUri: () => required('OAUTH_REDIRECT_URI'),
  webUrlBase: () => required('T3OS_WEB_URL_BASE'),
};
