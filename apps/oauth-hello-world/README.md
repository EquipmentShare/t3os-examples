# OAuth Hello World

User-delegated OAuth flow against T3OS, hand-rolled with no auth SDK. Mirrors the wire-level operations of [`oauth-smoke-test.ts`](https://gitlab.internal.equipmentshare.com/fleet/es-erp-api/-/blob/main/services/monolith/src/services/iam/scripts/oauth-smoke-test.ts) in the T3OS API repo.

**Live demo:** [t3os-oauth-hello-world.vercel.app](https://t3os-oauth-hello-world.vercel.app)

## The flow in one diagram

```
 user           browser            this app           Auth0           T3OS
  │                                   │                 │              │
  │ click "Sign in"                   │                 │              │
  ├──────────────►/sign-in            │                 │              │
  │              ├─generate PKCE+state│                 │              │
  │              ├─save in cookie     │                 │              │
  │              └─302 → /authorize ──┼────────────────►│              │
  │                                   │                 │              │
  │ sign in + approve consent screen  │                 │              │
  │                                   │                 ├─consent UI ─►│
  │              ┌────────────────────┼─302 ────────────┤              │
  │              ▼ /callback?code=... │                 │              │
  │              ├─verify state       │                 │              │
  │              ├─POST /oauth/token ─┼────────────────►│              │
  │              ├─◄─{access, refresh, id}              │              │
  │              ├─decode workspace_id claim            │              │
  │              ├─save in cookie     │                 │              │
  │              └─302 → /dashboard   │                 │              │
  │                                   │                 │              │
  │ view data    ├─POST /graphql ─────┼─────────────────┼─────────────►│
  │              └─◄─{ getWorkspaceById }               │              │
```

## File map

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing — "Sign in with T3OS" button
│   ├── sign-in/route.ts        # Step 1: generate PKCE, redirect to /authorize
│   ├── callback/route.ts       # Step 2: receive code, exchange for tokens, redirect to /dashboard
│   ├── dashboard/page.tsx      # Step 3: display claims + run one GraphQL call
│   ├── sign-out/route.ts       # Destroys the session cookie
│   ├── privacy/page.tsx        # Required by T3OS marketplace registration
│   ├── terms/page.tsx          # Required by T3OS marketplace registration
│   └── globals.css
└── lib/
    ├── env.ts                  # Type-safe env-var reads
    ├── session.ts              # iron-session config + helper
    ├── pkce.ts                 # PKCE verifier/challenge + CSRF state generation
    ├── oauth.ts                # /authorize URL builder, token exchange, refresh
    ├── auth.ts                 # getValidAccessToken — refreshes on demand
    └── graphql.ts              # Minimal GraphQL POST helper with Bearer auth
```

## Running locally

1. Register the app against the T3OS API (or use staging values from your dev portal). See `scripts/bootstrap-register-apps.ts` in the repo root for an automated registration flow.

2. Copy `.env.example` to `.env.local` and fill in:
   - `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` — from `registerApp`
   - `IRON_SESSION_PASSWORD` — `openssl rand -base64 48`
   - `OAUTH_REDIRECT_URI=http://localhost:3000/callback`
   - Optionally point at the staging tenant instead of prod (see comments in `.env.example`)

3. **Add `http://localhost:3000/callback` to the app's `redirectUris`** via the dev portal or by re-calling `updateApp`. Auth0 requires an exact match — `localhost` won't work otherwise.

4. Run:

   ```bash
   pnpm install                            # from the repo root
   pnpm --filter oauth-hello-world dev
   ```

   Open <http://localhost:3000>.

## Things this hello-world deliberately doesn't do

- **No multi-device sessions.** Cookie-only — bring the browser, bring the session. Production apps that need a session across devices should store the tokens server-side and reference them by a session id in the cookie.
- **No `/v2/logout` round-trip on sign-out.** "Sign out" clears this app's cookie only; your Auth0 SSO session lives on. Production sign-out usually redirects to `https://{AUTH0_DOMAIN}/v2/logout?client_id=...&returnTo=...` to kill the SSO cookie too.
- **No revoke button.** The dashboard links to T3OS's connected-apps settings where you can revoke. Revoking is an account-management action, not an app-level action — the app shouldn't reimplement the UI for it.
- **Refresh on every dashboard view if the token is within 30s of expiry.** Production code might prefer to refresh on 401 instead of pre-emptively. Either is fine; this is just simpler.
- **No tests.** The smoke-test script in the T3OS API repo (`oauth-smoke-test.ts`) is the integration test for the wire-level flow. This app is its UI counterpart.

## License

MIT.
