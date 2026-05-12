# T3OS Examples

Reference apps demonstrating the two T3OS developer auth flows. Each app is a self-contained Next.js project you can read top-to-bottom or clone and adapt.

**Start here:**

| App                       | Auth flow                                                | Live demo                                                                              | Source                                                       |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **OAuth Hello World**     | User-delegated (OAuth 2.0 Authorization Code + PKCE)     | [t3os-oauth-hello-world.vercel.app](https://t3os-oauth-hello-world.vercel.app)         | [`apps/oauth-hello-world`](./apps/oauth-hello-world)         |
| **Workspace Hello World** | Workspace-installed (one-shot install JWT → `X-API-Key`) | [t3os-workspace-hello-world.vercel.app](https://t3os-workspace-hello-world.vercel.app) | [`apps/workspace-hello-world`](./apps/workspace-hello-world) |

Both apps point at **production T3OS** (`api.equipmentshare.com/es-erp-api/graphql`) and are registered as PUBLIC + LIVE in the T3OS marketplace.

## Which one do I want?

- **OAuth Hello World** — your app needs to act _on behalf of a specific user_. The user signs in via T3OS, you get a bearer token scoped to them, queries return data they personally have access to. Use when building integrations a user signs into (personal-productivity tools, "Connect to T3OS" buttons on other SaaS, etc.).
- **Workspace Hello World** — your app needs to act _on behalf of a workspace_, without a user in the loop. A workspace admin installs you once; you get a workspace-scoped API key; you keep working until uninstalled. Use when building syncs, exports, scheduled jobs, webhooks — anything unattended.

## What's in each app

Each Hello World does the same thing: complete the auth round-trip, read the workspace's name via one GraphQL call, display every claim from the credential, and provide a "manage / revoke" link back to the T3OS web app where the user can clean up.

Both apps are deliberately written without an OAuth SDK — the wire-level HTTP requests, PKCE challenge generation, JWT verification, and token storage are visible in the source so you can transliterate the pattern to any stack.

## Repository shape

```
t3os-examples/
├── apps/
│   ├── oauth-hello-world/          # Next.js app — user-delegated flow
│   └── workspace-hello-world/      # Next.js app — workspace-installed flow
├── scripts/
│   └── bootstrap-register-apps.ts  # One-shot script: registers both apps in prod
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
pnpm --filter oauth-hello-world dev
pnpm --filter workspace-hello-world dev

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
- **Scope discipline:** these demos request the broadest read-only scope (`all_resources_reader`) for clarity. Real integrations should request the narrowest scope that satisfies their queries (e.g., `contact_reader` if you only need contacts) — the T3OS consent UI shows users every scope you're asking for.
- **Credential rotation:** `clientSecret` (OAuth) and the install-time API key (workspace) can be rotated via the T3OS dev portal. Production apps should plan for this.

## License

MIT. See [LICENSE](./LICENSE). Copy, adapt, ship — no attribution required (though appreciated).

## Found a bug or want a different example?

[Open an issue.](https://github.com/EquipmentShare/t3os-examples/issues)
