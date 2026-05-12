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
  installUrlBase: () => required('T3OS_INSTALL_URL_BASE'),
  workspaceSettingsUrlBase: () => required('T3OS_WORKSPACE_SETTINGS_URL_BASE'),
  appId: () => required('T3OS_APP_ID'),
  installCallbackUrl: () => required('INSTALL_CALLBACK_URL'),
};
