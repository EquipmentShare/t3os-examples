# scripts/

One-shot bootstrap utilities for this repo.

## `bootstrap-register-apps.ts`

Registers the two hello-world apps against T3OS (prod by default) and prints the credentials you need to paste into each Vercel project's env vars.

You generally only run this **once per environment**, when the repo is first wired up. After that, re-running creates duplicate registrations — call `updateApp` or `rotateAppSecret` from your dev portal session instead.

### Pre-requisites

- A T3OS user token with an `APPROVED` Developer record. If your token's user doesn't have a Developer row yet, the script will auto-apply via `applyForDeveloperAccess`; a platform admin then needs to call `approveDeveloperApplication` before re-running.
- A workspace id you can register apps against (any workspace you have `developer` on).
- The Vercel deployments must already exist (URLs are baked into the registrations). If you haven't created the Vercel projects yet, do that first — the URLs become permanent after `registerApp`.

### Usage

```bash
# from the repo root
pnpm add -D tsx jose                # if not already installed

ERP_USER_TOKEN="ey..." \
ERP_WORKSPACE_ID="ws_..." \
  pnpm tsx scripts/bootstrap-register-apps.ts

# Just one of the two
pnpm tsx scripts/bootstrap-register-apps.ts --skip-workspace
pnpm tsx scripts/bootstrap-register-apps.ts --skip-oauth

# Register + submit for marketplace review in one shot
pnpm tsx scripts/bootstrap-register-apps.ts --submit-for-review
```

### What it does

1. Verifies the user token's Developer record is APPROVED (auto-applies if missing).
2. Calls `registerApp(kind: USER_DELEGATED, ...)` with the OAuth hello-world's redirect URI.
3. Calls `registerApp(kind: WORKSPACE_INSTALLED, ...)` with the workspace hello-world's install callback URL.
4. Optionally calls `submitAppForReview(appId)` for each (transitions PRIVATE+LIVE → PENDING_REVIEW; awaiting a marketplace reviewer to call `approveMarketplaceSubmission`).
5. Prints all the env-var values you need to paste into Vercel.

The `clientSecret` is printed to stdout once — capture it from your terminal scrollback before closing the window. It cannot be re-retrieved, only rotated.

### Staging instead of prod

```bash
ENV=stage ERP_USER_TOKEN="..." ERP_WORKSPACE_ID="..." \
  pnpm tsx scripts/bootstrap-register-apps.ts
```

You'll also want to override the URLs (`OAUTH_HOST` / `WORKSPACE_HOST` env vars) to whatever staging deployment you're pointing at.
