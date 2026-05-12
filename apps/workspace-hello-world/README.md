# Workspace Hello World

Workspace-installed auth flow against T3OS, hand-rolled with no auth SDK. Mirrors the wire-level operations of [`workspace-install-smoke-test.ts`](https://gitlab.internal.equipmentshare.com/fleet/es-erp-api/-/blob/main/services/monolith/src/services/iam/scripts/workspace-install-smoke-test.ts) in the T3OS API repo.

**Live demo:** [t3os-workspace-hello-world.vercel.app](https://t3os-workspace-hello-world.vercel.app)

## The flow in one diagram

```
 admin          browser          this app           T3OS IAM
   │                                │                   │
   │ click "Install in your..."     │                   │
   ├────────────────►/?────302──────┼──────────────────►│
   │                                │                   │
   │   sign in + pick workspace + click Install         │
   │                                │                   ├─ installWorkspaceApp
   │                                │                   │  · mints principal
   │                                │                   │  · creates API key
   │                                │                   │  · signs install JWT
   │                                │   ┌────302────────┤
   │                                ▼   ▼ install_token=...
   │                                /install-complete
   │                                ├─jwtVerify(JWKS, iss, aud)
   │                                ├─aes-gcm-encrypt(api_key)
   │                                ├─kv.set(workspace:{id}, ...)
   │                                ├─session.workspaceId = id
   │                                └─302 → /dashboard
   │                                │
   │  view data        ├─POST /graphql + X-API-Key ────►│
   │                   └─◄─{ getWorkspaceById }         │
```

## File map

```
src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing — "Install in your workspace" button
│   ├── install-complete/route.ts     # Receives ?install_token, verifies + persists
│   ├── dashboard/page.tsx            # Reads from KV, makes one GraphQL call
│   ├── sign-out/route.ts             # Clears session cookie (does NOT uninstall)
│   ├── privacy/page.tsx              # Required by T3OS marketplace registration
│   ├── terms/page.tsx                # Required by T3OS marketplace registration
│   └── globals.css
└── lib/
    ├── env.ts                        # Type-safe env-var reads
    ├── session.ts                    # iron-session config (just stores workspaceId)
    ├── crypto.ts                     # AES-256-GCM encrypt/decrypt for the API key
    ├── install-token.ts              # JWKS-backed JWT verification
    ├── storage.ts                    # Vercel KV layer (encrypts on write, decrypts on read)
    └── graphql.ts                    # Minimal GraphQL POST helper with X-API-Key auth
```

## Running locally

A local dev loop is awkward for workspace-installed apps because:

- The install-callback URL must exactly match the `installCallbackUrl` registered for the app, and Auth0 / T3OS won't redirect to `localhost`.
- You can't run KV locally without standing up your own Upstash Redis or similar.

Realistic local workflows:

1. **Read-only review.** Just read the source — it's <600 lines.

2. **Local with ngrok.** Run `ngrok http 3001`, register a separate test app (via `registerApp(kind: WORKSPACE_INSTALLED)` with the ngrok URL as `installCallbackUrl`), set the env vars locally, and point KV at a personal Upstash namespace.

3. **Vercel preview deploys.** The Vercel project rebuilds on push. Preview URLs won't complete the install round-trip (they don't match the registered `installCallbackUrl`), but the build + type-check still validate the code.

```bash
pnpm install                                # from the repo root
pnpm --filter workspace-hello-world dev
```

## Things this hello-world deliberately doesn't do

- **No webhook handler.** Real workspace integrations usually subscribe to T3OS workspace events. This example just polls on each dashboard view.
- **No background refresh.** API keys delivered at install time don't expire by themselves — they're only invalidated on uninstall. So no rotation is needed unless your security model demands one.
- **No uninstall button.** "Forget this browser" clears the cookie. Real uninstall goes through T3OS's workspace settings — the dashboard links there.
- **No multi-workspace switcher.** Each browser remembers the last workspace it installed into. To switch, install again from a different workspace (or clear cookies).
- **No KV record cleanup on uninstall.** When T3OS revokes the API key, the (now-dead) encrypted record stays in KV. Production apps may want to subscribe to T3OS uninstall events and `kv.del(workspace:{id})` proactively.
- **No tests.** The smoke-test script in the T3OS API repo (`workspace-install-smoke-test.ts`) is the integration test.

## License

MIT.
