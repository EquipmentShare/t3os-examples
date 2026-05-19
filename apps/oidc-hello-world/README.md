# OIDC Hello World

Sign-in-only OpenID Connect flow against T3OS, hand-rolled with no auth SDK. Companion to the dev portal's [`/docs/oidc`](https://app.t3os.ai/docs/oidc) page.

**Live demo:** _coming soon._ The Vercel project (`t3os-oidc-hello-world.vercel.app`) hasn't been provisioned yet; until it is, the only way to exercise this app is locally (see "Running locally" below). The bootstrap script reads `OIDC_HOST` if you want to register the app against a non-canonical deployment in the meantime.

## When you want this app's pattern

You're building a third-party app and you want "Sign in with T3OS" — _only_ sign in. You want the user's identity (so you know who they are in your own system), you don't want any access to their T3OS workspace data, and you don't want them to be asked to pick a workspace at consent time. T3OS is purely your OpenID Connect identity provider.

Compare to:

- **[oauth-hello-world](../oauth-hello-world)** — also user-delegated, but actually calls the T3OS API on the user's behalf. Includes a workspace picker on the consent screen.
- **[workspace-hello-world](../workspace-hello-world)** — no user in the loop; a workspace admin installs once, app gets a workspace-scoped API key.

## The flow in one diagram

```
 user           browser            this app           Auth0           T3OS
  │                                   │                 │              │
  │ click "Sign in"                   │                 │              │
  ├──────────────►/sign-in            │                 │              │
  │              ├─generate PKCE+state+nonce            │              │
  │              ├─save in cookie     │                 │              │
  │              └─302 → /authorize ──┼────────────────►│              │
  │                                   │                 │              │
  │ sign in (no workspace pick)       │                 │              │
  │              ┌────────────────────┼─302 ────────────┤              │
  │              ▼ /oauth/callback?code=...             │              │
  │              ├─verify state       │                 │              │
  │              ├─POST /oauth/token ─┼────────────────►│              │
  │              ├─◄─{access, refresh, id_token}        │              │
  │              ├─VERIFY id_token (JWKS, iss, aud, azp, nonce)        │
  │              ├─drop access_token  │                 │              │
  │              ├─save claims        │                 │              │
  │              └─302 → /signed-in   │                 │              │
```

## The three gotchas this example exists to make concrete

These are the rough edges of T3OS-as-OIDC-provider that integrators tend to trip over. The dev portal documents them; this app makes them tangible.

### 1. `audience` is required

Building the `/authorize` URL **without** an `audience` query param produces `error=grant_required` at the callback. This app sets it to `https://<env>-api.equipmentshare.com/es-erp-api/delegated` even though it never makes a single API call. See `src/lib/oidc.ts:buildAuthorizeUrl`.

### 2. `azp` pinning on verify

A standards-compliant OIDC verifier pins `iss` and `aud === client_id`. That isn't enough on a tenant where multiple Auth0 apps share an API audience — a sibling app's id_token would pass an `aud` check. This app additionally pins `azp === client_id`. See `src/lib/verify.ts:verifyIdToken`.

### 3. Identity from the id_token, not the access_token

For sign-in-only flows, T3OS's Auth0 post-login Action deliberately suppresses identity claims on the access_token. The id_token is the source of truth. This app reads `https://es-erp/uid`, `email`, `name`, `picture` from the **id_token** and drops the access_token on the floor at the callback — never even stores it. See `src/app/oauth/callback/route.ts`.

## File map

```
src/
├── app/
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Landing — "Sign in with T3OS" button + gotcha primer
│   ├── sign-in/route.ts            # Step 1: PKCE + state + nonce, redirect to /authorize
│   ├── oauth/callback/route.ts     # Step 2: exchange code, VERIFY id_token, persist claims
│   ├── signed-in/page.tsx          # Landing after callback — "Signed in as…"
│   ├── sign-out/route.ts           # Clear session + optional /oauth/revoke
│   ├── privacy/page.tsx            # Required by T3OS marketplace registration
│   ├── terms/page.tsx              # Required by T3OS marketplace registration
│   └── globals.css
└── lib/
    ├── env.ts                      # Type-safe env-var reads
    ├── session.ts                  # iron-session config (claims + refresh_token only)
    ├── pkce.ts                     # PKCE verifier/challenge + state + nonce generators
    ├── oidc.ts                     # /authorize URL builder, token exchange, /oauth/revoke
    └── verify.ts                   # JWKS-backed id_token verifier (iss, aud, azp, nonce)
```

## Running locally

1. Register the app against the T3OS API. See `scripts/bootstrap-register-apps.ts` in the repo root — pass `--skip-oauth --skip-workspace` if you only want this one.

2. Copy `.env.example` to `.env.local` and fill in:
   - `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` — from `registerApp`
   - `IRON_SESSION_PASSWORD` — `openssl rand -base64 48`
   - `OAUTH_REDIRECT_URI=http://localhost:3002/oauth/callback`

3. **Add `http://localhost:3002/oauth/callback` to the app's `redirectUris`** via the dev portal or by re-calling `updateApp`. Auth0 requires an exact match — `localhost` won't work otherwise.

4. Run:

   ```bash
   pnpm install                           # from the repo root
   pnpm --filter oidc-hello-world dev
   ```

   Open <http://localhost:3002>.

## Things this hello-world deliberately doesn't do

- **No `/v2/logout`.** "Sign out" clears the local cookie and best-effort revokes the refresh token. It does NOT redirect to Auth0's `/v2/logout` — that kills the SSO session for every app in the tenant, which is too aggressive for a third-party sign-in button. Real apps should leave SSO alone too.
- **No SDK.** Direct calls to `/authorize`, `/oauth/token`, `/oauth/revoke`, and JWKS. The point of the example is that you can read the wire and see what's actually happening.
- **No GraphQL client.** That's `oauth-hello-world`'s job.
- **No multi-device sessions.** Cookie-only. Production apps with users on multiple devices should store the session blob server-side and reference it by id.
- **No tests.** The end-to-end smoke test for the wire-level flow lives alongside the OIDC backend enablement in `es-erp-api`.

## License

MIT.
