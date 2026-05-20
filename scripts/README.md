# scripts/

One-shot bootstrap utilities for this repo.

## `bootstrap-register-apps.ts`

Registers the three hello-world apps against T3OS (prod by default) and prints the credentials you need to paste into each Vercel project's env vars.

You generally only run this **once per environment**, when the repo is first wired up. After that, re-running creates duplicate registrations — call `updateApp` or `rotateAppSecret` from your dev portal session instead.

### Pre-requisites

- A T3OS user token with an `APPROVED` Developer record. If your token's user doesn't have a Developer row yet, the script will auto-apply via `applyForDeveloperAccess`; a platform admin then needs to call `approveDeveloperApplication` before re-running.
- A workspace id you can register apps against (any workspace you have `developer` on).
- The Vercel deployments must already exist for any app you're registering — the host URL is baked into the registration as `redirectUris` plus the marketplace `iconUrl`, `privacyPolicyUrl`, and `termsOfServiceUrl`. If a Vercel project doesn't exist yet, either skip that app for now (`--skip-*`) or override its host (`*_HOST` env var) so the registration points at whatever preview/staging URL you've got.

### Usage

```bash
# from the repo root
pnpm add -D tsx jose                # if not already installed

ERP_USER_TOKEN="ey..." \
ERP_WORKSPACE_ID="ws_..." \
  pnpm tsx scripts/bootstrap-register-apps.ts

# Register just one of the three
pnpm tsx scripts/bootstrap-register-apps.ts --skip-workspace --skip-oidc
pnpm tsx scripts/bootstrap-register-apps.ts --skip-oauth --skip-oidc
pnpm tsx scripts/bootstrap-register-apps.ts --skip-oauth --skip-workspace

# Register + submit for marketplace review in one shot
pnpm tsx scripts/bootstrap-register-apps.ts --submit-for-review
```

### What it does

1. Verifies the user token's Developer record is APPROVED (auto-applies if missing).
2. Calls `registerApp(kind: USER_DELEGATED, ...)` with the OAuth hello-world's redirect URI and `requestedScopes: ['all_resources_reader']`.
3. Calls `registerApp(kind: WORKSPACE_INSTALLED, ...)` with the workspace hello-world's install callback URL and `requestedScopes: ['all_resources_reader']`.
4. Calls `registerApp(kind: USER_DELEGATED, ...)` with the OIDC hello-world's `/oauth/callback` redirect URI and `requestedScopes: []` — the sign-in-only variant. No T3OS API access; identity is read off the id_token only.
5. Optionally calls `submitAppForReview(appId)` for each (transitions PRIVATE+LIVE → PENDING_REVIEW; awaiting a marketplace reviewer to call `approveMarketplaceSubmission`).
6. Prints all the env-var values you need to paste into Vercel.

The `clientSecret` is printed to stdout once — capture it from your terminal scrollback before closing the window. It cannot be re-retrieved, only rotated.

### Host overrides

Each app's host root flows into the redirect URI **and** every marketplace URL (icon, privacy, terms), so a single override is enough to retarget the registration end-to-end:

- `OAUTH_HOST` (default `t3os-oauth-hello-world.vercel.app`)
- `WORKSPACE_HOST` (default `t3os-workspace-hello-world.vercel.app`)
- `OIDC_HOST` (default `t3os-oidc-hello-world.vercel.app`)

Pass the bare hostname — no scheme, no trailing slash. The script prepends `https://`.

### Staging instead of prod

```bash
ENV=stage \
  ERP_USER_TOKEN="..." \
  ERP_WORKSPACE_ID="..." \
  OAUTH_HOST="oauth-staging.example.com" \
  WORKSPACE_HOST="workspace-staging.example.com" \
  OIDC_HOST="oidc-staging.example.com" \
  pnpm tsx scripts/bootstrap-register-apps.ts
```
