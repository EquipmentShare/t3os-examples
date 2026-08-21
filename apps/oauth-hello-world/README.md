# OAuth Hello World

User-delegated OAuth flow against T3OS, hand-rolled with no auth SDK. It exposes every wire-level step so the pattern can be adapted to another stack.

**Live demo:** [t3os-oauth-hello-world.vercel.app](https://t3os-oauth-hello-world.vercel.app)

## The flow in one diagram

```
 user           browser            this app           Auth0           T3OS
  │                                   │                 │              │
  │ launcher ?workspace=...           │                 │              │
  ├──────────────►/sign-in            │                 │              │
  │              ├─generate PKCE+state+nonce            │              │
  │              ├─forward ext-workspace-id             │              │
  │              ├─save in cookie     │                 │              │
  │              └─302 → /authorize ──┼────────────────►│              │
  │                                   │                 │              │
  │ sign in; consent only for missing/changed grant     │              │
  │                                   │                 ├─grant check ─►│
  │              ┌────────────────────┼─302 ────────────┤              │
  │              ▼ /callback?code=... │                 │              │
  │              ├─verify state       │                 │              │
  │              ├─POST /oauth/token ─┼────────────────►│              │
  │              ├─◄─{access, refresh, id}              │              │
  │              ├─VERIFY both JWTs + nonce              │              │
  │              ├─validate targeted workspace_id       │              │
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
│   ├── sign-in/route.ts        # Step 1: PKCE/state/nonce + workspace-targeted /authorize
│   ├── callback/route.ts       # Step 2: exchange, verify tokens/target, remember workspace
│   ├── dashboard/page.tsx      # Step 3: display claims + run one GraphQL call
│   ├── refresh/route.ts        # Persists access + rotated refresh token in a writable context
│   ├── workspaces/page.tsx     # Recent-workspace switcher + explicit new choice
│   ├── sign-out/route.ts       # Clears credentials; preserves workspace preference
│   ├── privacy/page.tsx        # Required by T3OS marketplace registration
│   ├── terms/page.tsx          # Required by T3OS marketplace registration
│   └── globals.css
└── lib/
    ├── env.ts                  # Type-safe env-var reads
    ├── session.ts              # iron-session config + helper
    ├── pkce.ts                 # PKCE verifier/challenge + CSRF state generation
    ├── oauth.ts                # /authorize URL builder, token exchange, refresh
    ├── verify.ts               # Verifies issuer/audience/azp/signature/nonce/workspace claims
    ├── auth.ts                 # getValidAccessToken — route-handler refresh
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

## Workspace-aware consent UX

- T3OS app-launcher links should open your app with `?workspace=<id>`.
- The landing and `/sign-in` routes preserve that target and send it to `/authorize` as `ext-workspace-id`.
- The callback rejects a token for any workspace other than the one requested.
- Signing out clears this app's credentials but remembers the preferred workspace. Signing in again can reuse the exact active grant without showing consent.
- `Choose another workspace` deliberately omits the target so T3OS can disambiguate. The example remembers five recent workspace ids in its encrypted cookie; production apps should persist user/workspace connections server-side.
- Consent correctly returns when scopes change, a grant is revoked, the user loses access, or no exact grant exists.

## Things this hello-world deliberately doesn't do

- **No multi-device sessions.** Cookie-only — bring the browser, bring the session. Production apps should store credentials and all connected workspaces server-side and keep only an opaque session id in the cookie.
- **No `/v2/logout` round-trip on app sign-out.** "Sign out" removes this app's credentials while preserving its preferred-workspace hint; your T3OS SSO session and grant remain active. Offer a separate "Sign out of T3OS everywhere" action if your product needs the Auth0 logout round-trip.
- **No revoke button.** The dashboard links to T3OS's connected-apps settings where you can revoke. Revoking is an account-management action, not an app-level action — the app shouldn't reimplement the UI for it.
- **Refresh 30 seconds before expiry.** It happens in `/refresh`, a Route Handler, so a rotated refresh token is atomically written back to the cookie. Production code may instead refresh after a 401.
- **No tests.** The smoke-test script in the T3OS API repo (`oauth-smoke-test.ts`) is the integration test for the wire-level flow. This app is its UI counterpart.

## License

MIT.
