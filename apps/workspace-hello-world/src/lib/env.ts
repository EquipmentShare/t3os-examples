function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}. See .env.example for the full list.`);
  }
  return v;
}

export const env = {
  graphqlUrl: () => required('T3OS_GRAPHQL_URL'),
  jwksUrl: () => required('T3OS_JWKS_URL'),
  installTokenIssuer: () => required('T3OS_INSTALL_TOKEN_ISSUER'),
  // Base URL of the T3OS web app — used for the install screen
  // (`/oauth/install`) and the workspace-scoped installed-apps settings
  // page (`/app/<workspaceId>/settings/installed-apps`).
  webUrlBase: () => required('T3OS_WEB_URL_BASE'),
  appId: () => required('T3OS_APP_ID'),
  installCallbackUrl: () => required('INSTALL_CALLBACK_URL'),
};
