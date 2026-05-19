# T3OS Examples

Reference apps demonstrating the three T3OS developer auth flows. Each app is a self-contained Next.js project you can read top-to-bottom or clone and adapt.

**Start here:**

| App                       | Auth flow                                                | Live demo                                                                              | Source                                                       |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **OAuth Hello World**     | User-delegated (OAuth 2.0 Authorization Code + PKCE)     | [t3os-oauth-hello-world.vercel.app](https://t3os-oauth-hello-world.vercel.app)         | [`apps/oauth-hello-world`](./apps/oauth-hello-world)         |
| **Workspace Hello World** | Workspace-installed (one-shot install JWT → `X-API-Key`) | [t3os-workspace-hello-world.vercel.app](https://t3os-workspace-hello-world.vercel.app) | [`apps/workspace-hello-world`](./apps/workspace-hello-world) |
| **OIDC Hello World**      | Sign-in-only OpenID Connect (no workspace, no API)       | _coming soon — Vercel project not yet provisioned_                                     | [`apps/oidc-hello-world`](./apps/oidc-hello-world)           |

All three apps run against **production T3OS Auth0** and are registered as PUBLIC + LIVE in the T3OS marketplace. The OAuth and Workspace apps additionally talk to the prod ERP GraphQL endpoint (`api.equipmentshare.com/es-erp-api/graphql`); the OIDC app does not — sign-in only.

## Which one do I want?

- **OAuth Hello World** — your app needs to act _on behalf of a specific user_. The user signs in via T3OS, picks a workspace at the consent screen, you get a bearer token scoped to them, queries return data they personally have access to. Use when building integrations a user signs into (personal-productivity tools, "Connect to T3OS" buttons on other SaaS, etc.).
- **Workspace Hello World** — your app needs to act _on behalf of a workspace_, without a user in the loop. A workspace admin installs you once; you get a workspace-scoped API key; you keep working until uninstalled. Use when building syncs, exports, scheduled jobs, webhooks — anything unattended.
- **OIDC Hello World** — your app only needs to know _who_ the user is, not what they can do in T3OS. T3OS acts as your pure OpenID Connect identity provider — no workspace pick at consent time, no API access. Use for "Sign in with T3OS" buttons in third-party apps that have their own data model and just want a verified identity.

## What's in each app

Each Hello World walks one auth flow end-to-end and renders the credentials/claims it produces. The OAuth and Workspace apps additionally make one GraphQL call (`getWorkspaceById`) to prove the credential works against the live ERP API; the OIDC app deliberately doesn't — its whole point is that you can't.

All three apps are written **without an OAuth SDK**. PKCE challenge generation, the `/authorize` URL builder, the `/oauth/token` POST, JWKS-backed JWT verification, and token storage are visible in the source so you can transliterate the pattern to any stack.

## Repository shape

```
t3os-examples/
├── apps/
│   ├── oauth-hello-world/          # Next.js app — user-delegated flow
│   ├── workspace-hello-world/      # Next.js app — workspace-installed flow
│   └── oidc-hello-world/           # Next.js app — sign-in-only OIDC flow
├── scripts/
│   └── bootstrap-register-apps.ts  # One-shot script: registers all three apps in prod
├── .github/workflows/ci.yml        # Lint + typecheck + build, all apps
├── turbo.json                      # Build pipeline
└── pnpm-workspace.yaml             # Workspace definition
```

- **pnpm + turborepo** monorepo. Each app is a separate workspace.
- **Each app deploys independently** to its own Vercel project. CI does validation only — Vercel's GitHub integration handles deploys. Future apps in this repo aren't required to deploy to Vercel.

## Local development

```bash
pnpm install

# Run one app at a time (each needs its own .env.local — see apps/*/README.md)
pnpm --filter oauth-hello-world dev       # port 3000
pnpm --filter workspace-hello-world dev   # port 3001
pnpm --filter oidc-hello-world dev        # port 3002

# Or run lint/typecheck/build across all apps
pnpm lint
pnpm typecheck
pnpm build
```

Node 22+ required (see `.nvmrc`).

## Production considerations

These are deliberately minimal "hello-world" reference apps. A real production integration needs:

- **For OAuth apps:** a refresh-token rotation strategy (this example refreshes on every request; production should refresh on-demand and handle the refresh-token revocation edge case), proper sign-out via `/v2/logout` to clear the Auth0 SSO cookie, and probably a database for multi-device sessions instead of cookie-only storage.
- **For workspace-installed apps:** redundant JWKS caching (this example uses `jose`'s default in-memory cache; production may want a persistent cache to survive cold starts), retry/backoff on transient T3OS errors, and a dead-letter for permanent failures.
- **For OIDC apps:** persistent JWKS caching (cold starts re-fetch the JWKS otherwise), keying your own user table off the `https://es-erp/uid` claim rather than `sub` so user identity survives an Auth0 connection migration, and account-linking logic if the same human can sign in via multiple identity sources.
- **Scope discipline:** the OAuth demo requests the broadest read-only scope (`all_resources_reader`) for clarity. Real integrations should request the narrowest scope that satisfies their queries (e.g., `contact_reader` if you only need contacts) — the T3OS consent UI shows users every scope you're asking for. The OIDC app requests none.
- **Credential rotation:** `clientSecret` (OAuth and OIDC) and the install-time API key (workspace) can be rotated via the T3OS dev portal. Production apps should plan for this.

## License

MIT. See [LICENSE](./LICENSE). Copy, adapt, ship — no attribution required (though appreciated).

## Found a bug or want a different example?

[Open an issue.](https://github.com/EquipmentShare/t3os-examples/issues)
