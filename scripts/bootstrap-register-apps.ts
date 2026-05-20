#!/usr/bin/env -S npx tsx
/**
 * Bootstrap script: registers all three hello-world apps against T3OS prod
 * (or staging) and prints the credentials you need to wire into each Vercel
 * project's env vars.
 *
 * The script is a stripped-down sibling of the smoke-test scripts in the
 * T3OS API repo. It performs the registerApp flow only — no install/grant
 * round-trip, no end-to-end assertions, no cleanup. The intent is "register
 * the apps once, capture the secrets, never run again."
 *
 * Usage:
 *
 *   ERP_USER_TOKEN="ey..." \
 *   ERP_WORKSPACE_ID="ws_..." \
 *     pnpm tsx scripts/bootstrap-register-apps.ts
 *
 * Optional env overrides:
 *
 *   ENV                              — `prod` (default) or `stage`
 *   ERP_BASE_URL                     — override the API base URL
 *
 * Optional flags:
 *
 *   --skip-oauth                     — don't register the OAuth app
 *   --skip-workspace                 — don't register the workspace app
 *   --skip-oidc                      — don't register the OIDC app
 *   --submit-for-review              — also call submitAppForReview after
 *                                      registering, transitioning each app
 *                                      from PRIVATE+LIVE → PENDING_REVIEW
 *
 * After this script runs, you still need to:
 *
 *   1. Copy the printed credentials into the corresponding Vercel project's
 *      env vars (T3OS_APP_ID, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET).
 *   2. Trigger a redeploy on each Vercel project so the new env vars take
 *      effect.
 *   3. Once approved as PUBLIC by a marketplace reviewer
 *      (approveMarketplaceSubmission), the live demo is reachable by any
 *      T3OS user.
 *
 * The `clientSecret` is printed to stdout ONCE — capture it immediately.
 * It cannot be re-retrieved (rotation via rotateAppSecret is possible but
 * issues a new value).
 */

import { decodeJwt } from 'jose';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type Env = 'stage' | 'prod';

interface Config {
  env: Env;
  graphqlUrl: string;
  userToken: string;
  workspaceId: string;
  // App host roots (e.g. "https://t3os-oauth-hello-world.vercel.app"). All
  // marketplace URLs and redirect/callback URIs are derived from these,
  // so overriding *_HOST is enough to retarget a staging/preview deploy
  // without editing this file.
  oauthHostUrl: string;
  oauthAppName: string;
  oauthAppSlugPrefix: string;
  workspaceHostUrl: string;
  workspaceAppName: string;
  workspaceAppSlugPrefix: string;
  oidcHostUrl: string;
  oidcAppName: string;
  oidcAppSlugPrefix: string;
  submitForReview: boolean;
  skipOauth: boolean;
  skipWorkspace: boolean;
  skipOidc: boolean;
}

const ENV_DEFAULTS: Record<Env, { graphqlUrl: string }> = {
  prod: { graphqlUrl: 'https://api.equipmentshare.com/es-erp-api/graphql' },
  stage: { graphqlUrl: 'https://staging-api.equipmentshare.com/es-erp-api/graphql' },
};

function loadConfig(): Config {
  const env = (process.env.ENV ?? 'prod') as Env;
  if (env !== 'prod' && env !== 'stage') {
    fatal(`ENV must be 'prod' or 'stage', got '${env}'`);
  }
  const userToken = process.env.ERP_USER_TOKEN;
  const workspaceId = process.env.ERP_WORKSPACE_ID;
  if (!userToken) fatal('ERP_USER_TOKEN env var is required');
  if (!workspaceId) fatal('ERP_WORKSPACE_ID env var is required');

  // For prod we register against the canonical Vercel URLs. Override via
  // *_HOST env vars when targeting a staging or preview deploy — the host
  // flows into the redirect URI AND every marketplace URL (icon, privacy,
  // terms, support), so a single override is enough to retarget the
  // registration end-to-end.
  const oauthHostUrl = `https://${process.env.OAUTH_HOST ?? 't3os-oauth-hello-world.vercel.app'}`;
  const workspaceHostUrl = `https://${process.env.WORKSPACE_HOST ?? 't3os-workspace-hello-world.vercel.app'}`;
  const oidcHostUrl = `https://${process.env.OIDC_HOST ?? 't3os-oidc-hello-world.vercel.app'}`;

  return {
    env,
    graphqlUrl: process.env.ERP_GRAPHQL_URL ?? ENV_DEFAULTS[env].graphqlUrl,
    userToken,
    workspaceId,
    oauthHostUrl,
    oauthAppName: 'T3OS OAuth Hello World',
    oauthAppSlugPrefix: 't3os-oauth-hello-world',
    workspaceHostUrl,
    workspaceAppName: 'T3OS Workspace Hello World',
    workspaceAppSlugPrefix: 't3os-workspace-hello-world',
    oidcHostUrl,
    oidcAppName: 'T3OS OIDC Hello World',
    oidcAppSlugPrefix: 't3os-oidc-hello-world',
    submitForReview: process.argv.includes('--submit-for-review'),
    skipOauth: process.argv.includes('--skip-oauth'),
    skipWorkspace: process.argv.includes('--skip-workspace'),
    skipOidc: process.argv.includes('--skip-oidc'),
  };
}

// ---------------------------------------------------------------------------
// IO + GraphQL helpers
// ---------------------------------------------------------------------------

function fatal(msg: string): never {
  process.stderr.write(`\n✗ ${msg}\n`);
  process.exit(1);
}

function ok(step: string, detail?: string): void {
  const tail = detail ? ` — ${detail}` : '';
  process.stdout.write(`✓ ${step}${tail}\n`);
}

function info(line: string): void {
  process.stdout.write(`  ${line}\n`);
}

function banner(line: string): void {
  process.stdout.write(`\n${line}\n${'─'.repeat(line.length)}\n`);
}

interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function gql<T>(cfg: Config, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(cfg.graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.userToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as GqlResponse<T>;
  if (body.errors && body.errors.length > 0) {
    throw new Error(`GraphQL errors: ${body.errors.map((e) => e.message).join('; ')}`);
  }
  if (!body.data) {
    throw new Error('GraphQL response had no data');
  }
  return body.data;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function ensureDeveloperApproved(cfg: Config): Promise<void> {
  let dev = (
    await gql<{ myDeveloperApplication: { id: string; status: string } | null }>(
      cfg,
      `query { myDeveloperApplication { id status } }`,
    )
  ).myDeveloperApplication;

  if (!dev) {
    info('no Developer row found — auto-applying via applyForDeveloperAccess');
    const claims = decodeJwt(cfg.userToken) as Record<string, unknown>;
    const email = (claims.email as string | undefined) ?? 'examples@equipmentshare.com';
    const applied = await gql<{
      applyForDeveloperAccess: { id: string; status: string };
    }>(
      cfg,
      `mutation A($input: ApplyForDeveloperAccessInput!) {
         applyForDeveloperAccess(input: $input) { id status }
       }`,
      {
        input: {
          legalName: 'T3OS Examples',
          companyName: 'EquipmentShare',
          websiteUrl: 'https://github.com/EquipmentShare/t3os-examples',
          supportEmail: email,
          contactEmail: email,
          useCase: 'Hello-world reference apps demonstrating the T3OS auth flows.',
        },
      },
    );
    dev = applied.applyForDeveloperAccess;
    info(`applied — developerId=${dev.id} status=${dev.status}`);
  }

  if (dev.status === 'PENDING') {
    fatal(
      `Developer ${dev.id} is PENDING. A platform admin must run ` +
        `approveDeveloperApplication(id: "${dev.id}") before this script can register apps.`,
    );
  }
  if (dev.status !== 'APPROVED') {
    fatal(`Developer ${dev.id} status is ${dev.status}; needs APPROVED.`);
  }
  ok(`developer record APPROVED`, `developerId=${dev.id}`);
}

// Marketplace fields are derived from each app's host root so a single
// `*_HOST` env override retargets icon / privacy / terms URLs along with
// the redirect URI. Descriptions and the shared GitHub issues URL stay
// constant across environments.
const SUPPORT_URL = 'https://github.com/EquipmentShare/t3os-examples/issues';

function marketplaceFieldsOauth(hostUrl: string) {
  return {
    description:
      "Hello-world reference app demonstrating T3OS's user-delegated OAuth flow. Read-only.",
    iconUrl: `${hostUrl}/icon`,
    privacyPolicyUrl: `${hostUrl}/privacy`,
    termsOfServiceUrl: `${hostUrl}/terms`,
    supportUrl: SUPPORT_URL,
  };
}

function marketplaceFieldsWorkspace(hostUrl: string) {
  return {
    description:
      "Hello-world reference app demonstrating T3OS's workspace-installed auth flow. Read-only.",
    iconUrl: `${hostUrl}/icon`,
    privacyPolicyUrl: `${hostUrl}/privacy`,
    termsOfServiceUrl: `${hostUrl}/terms`,
    supportUrl: SUPPORT_URL,
  };
}

function marketplaceFieldsOidc(hostUrl: string) {
  return {
    description:
      'Hello-world reference app demonstrating T3OS as a sign-in-only OpenID Connect identity provider. No workspace access.',
    iconUrl: `${hostUrl}/icon`,
    privacyPolicyUrl: `${hostUrl}/privacy`,
    termsOfServiceUrl: `${hostUrl}/terms`,
    supportUrl: SUPPORT_URL,
  };
}

interface RegistrationResult {
  appId: string;
  auth0ClientId: string;
  clientSecret: string;
  slug: string;
}

async function registerOauthApp(cfg: Config): Promise<RegistrationResult> {
  const slug = `${cfg.oauthAppSlugPrefix}-${Date.now()}`;
  const data = await gql<{
    registerApp: {
      app: { id: string; auth0ClientId: string; kind: string; publishStatus: string };
      clientSecret: string;
    };
  }>(
    cfg,
    `mutation R($input: RegisterAppInput!) {
       registerApp(input: $input) {
         app { id auth0ClientId kind publishStatus }
         clientSecret
       }
     }`,
    {
      input: {
        kind: 'USER_DELEGATED',
        ownerWorkspaceId: cfg.workspaceId,
        name: cfg.oauthAppName,
        slug,
        redirectUris: [`${cfg.oauthHostUrl}/callback`],
        requestedScopes: ['all_resources_reader'],
        ...marketplaceFieldsOauth(cfg.oauthHostUrl),
      },
    },
  );
  return {
    appId: data.registerApp.app.id,
    auth0ClientId: data.registerApp.app.auth0ClientId,
    clientSecret: data.registerApp.clientSecret,
    slug,
  };
}

async function registerOidcApp(cfg: Config): Promise<RegistrationResult> {
  // Sign-in-only USER_DELEGATED app. Same `kind` as the OAuth example
  // but with NO T3OS data scopes (no `all_resources_reader` etc.) — the
  // resulting Auth0 client can't be used against the ERP API (its
  // access_token has identity claims suppressed by the T3OS post-login
  // Action). The point is to act as a pure OIDC identity provider for
  // third-party "Sign in with T3OS" buttons.
  //
  // `requestedScopes` MUST include `profile` and `email`. T3OS's consent
  // gate cross-checks every scope on the /authorize URL against this
  // list and rejects with "Permission mismatch" if anything is missing.
  // `openid` and `offline_access` are implicit (the OAuth hello-world
  // doesn't list them either and consent works fine), but `profile` and
  // `email` are NOT — they have to be registered explicitly even though
  // they're standard OIDC scopes.
  const slug = `${cfg.oidcAppSlugPrefix}-${Date.now()}`;
  const data = await gql<{
    registerApp: {
      app: { id: string; auth0ClientId: string; kind: string; publishStatus: string };
      clientSecret: string;
    };
  }>(
    cfg,
    `mutation R($input: RegisterAppInput!) {
       registerApp(input: $input) {
         app { id auth0ClientId kind publishStatus }
         clientSecret
       }
     }`,
    {
      input: {
        kind: 'USER_DELEGATED',
        ownerWorkspaceId: cfg.workspaceId,
        name: cfg.oidcAppName,
        slug,
        redirectUris: [`${cfg.oidcHostUrl}/oauth/callback`],
        requestedScopes: ['profile', 'email'],
        ...marketplaceFieldsOidc(cfg.oidcHostUrl),
      },
    },
  );
  return {
    appId: data.registerApp.app.id,
    auth0ClientId: data.registerApp.app.auth0ClientId,
    clientSecret: data.registerApp.clientSecret,
    slug,
  };
}

async function registerWorkspaceApp(cfg: Config): Promise<RegistrationResult> {
  const slug = `${cfg.workspaceAppSlugPrefix}-${Date.now()}`;
  const data = await gql<{
    registerApp: {
      app: { id: string; auth0ClientId: string; kind: string; publishStatus: string };
      clientSecret: string;
    };
  }>(
    cfg,
    `mutation R($input: RegisterAppInput!) {
       registerApp(input: $input) {
         app { id auth0ClientId kind publishStatus installCallbackUrl }
         clientSecret
       }
     }`,
    {
      input: {
        kind: 'WORKSPACE_INSTALLED',
        ownerWorkspaceId: cfg.workspaceId,
        name: cfg.workspaceAppName,
        slug,
        installCallbackUrl: `${cfg.workspaceHostUrl}/install-complete`,
        redirectUris: [],
        requestedScopes: ['all_resources_reader'],
        ...marketplaceFieldsWorkspace(cfg.workspaceHostUrl),
      },
    },
  );
  return {
    appId: data.registerApp.app.id,
    auth0ClientId: data.registerApp.app.auth0ClientId,
    clientSecret: data.registerApp.clientSecret,
    slug,
  };
}

async function submitForReview(cfg: Config, appId: string): Promise<void> {
  await gql(
    cfg,
    `mutation S($id: String!) { submitAppForReview(appId: $id) { id publishStatus } }`,
    { id: appId },
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cfg = loadConfig();
  banner(`T3OS hello-world app bootstrap (${cfg.env})`);
  info(`graphql:    ${cfg.graphqlUrl}`);
  info(`workspace:  ${cfg.workspaceId}`);
  info(`oauth url:  ${cfg.oauthHostUrl}/callback`);
  info(`install:    ${cfg.workspaceHostUrl}/install-complete`);
  info(`oidc url:   ${cfg.oidcHostUrl}/oauth/callback`);
  info(`submit:     ${cfg.submitForReview ? 'yes (PENDING_REVIEW after register)' : 'no'}`);

  banner('Pre-flight');
  await ensureDeveloperApproved(cfg);

  let oauth: RegistrationResult | null = null;
  let workspace: RegistrationResult | null = null;
  let oidc: RegistrationResult | null = null;

  if (!cfg.skipOauth) {
    banner('Register OAuth Hello World');
    oauth = await registerOauthApp(cfg);
    ok('registered USER_DELEGATED', `appId=${oauth.appId}`);
    if (cfg.submitForReview) {
      await submitForReview(cfg, oauth.appId);
      ok('submitted for marketplace review');
    }
  }

  if (!cfg.skipWorkspace) {
    banner('Register Workspace Hello World');
    workspace = await registerWorkspaceApp(cfg);
    ok('registered WORKSPACE_INSTALLED', `appId=${workspace.appId}`);
    if (cfg.submitForReview) {
      await submitForReview(cfg, workspace.appId);
      ok('submitted for marketplace review');
    }
  }

  if (!cfg.skipOidc) {
    banner('Register OIDC Hello World');
    oidc = await registerOidcApp(cfg);
    ok('registered USER_DELEGATED (sign-in-only)', `appId=${oidc.appId}`);
    if (cfg.submitForReview) {
      await submitForReview(cfg, oidc.appId);
      ok('submitted for marketplace review');
    }
  }

  // Print credentials for copy-paste. ALL secrets land in stdout — keep your
  // terminal scrollback safe.
  banner('Vercel env vars — copy into each project');

  if (oauth) {
    process.stdout.write(`
# t3os-oauth-hello-world (Vercel project)
T3OS_APP_ID=${oauth.appId}
AUTH0_CLIENT_ID=${oauth.auth0ClientId}
AUTH0_CLIENT_SECRET=${oauth.clientSecret}

`);
  }

  if (workspace) {
    process.stdout.write(`# t3os-workspace-hello-world (Vercel project)
T3OS_APP_ID=${workspace.appId}
# Workspace-installed apps don't use the Auth0 client at runtime, but the
# clientSecret is still issued — store it in case you ever need to rotate
# or migrate this app to a hybrid flow.
AUTH0_CLIENT_ID=${workspace.auth0ClientId}
AUTH0_CLIENT_SECRET=${workspace.clientSecret}

`);
  }

  if (oidc) {
    process.stdout.write(`# t3os-oidc-hello-world (Vercel project)
T3OS_APP_ID=${oidc.appId}
AUTH0_CLIENT_ID=${oidc.auth0ClientId}
AUTH0_CLIENT_SECRET=${oidc.clientSecret}

`);
  }

  banner('Next steps');
  info('1. Paste the above env vars into each Vercel project.');
  info('2. Trigger a redeploy on each project so the new env takes effect.');
  if (!cfg.submitForReview) {
    info(`3. When you're ready to go PUBLIC, re-run with --submit-for-review.`);
    info(`   A platform admin then runs approveMarketplaceSubmission(appId: ...) per app.`);
  } else {
    info('3. A platform admin runs approveMarketplaceSubmission(appId: ...) per app.');
  }
  process.stdout.write('\n');
}

main().catch((err) => {
  process.stderr.write(`\nfatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
