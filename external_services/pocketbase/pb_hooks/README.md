# PocketBase Hooks

Server-side hooks that handle business logic for the SiteWise application. Copy these files into your PocketBase server's `pb_hooks` directory.

## File Structure

```
pb_hooks/
├── utils.js                                    # Shared utility functions
├── site-management-hooks.pb.js                 # Site creation & deletion lifecycle
├── create_user.pb.js                           # Turnstile verification on signup
├── login.pb.js                                 # Turnstile verification on login
├── process_invitations_on_acceptance.pb.js     # Grants access on invitation accept
├── health.pb.js                                # GET /up readiness endpoint
├── items.json                                  # Seed data: standard construction items
└── services.json                               # Seed data: standard construction services
```

## Installation

1. Copy all files to your PocketBase `pb_hooks` directory
2. Set the `TURNSTILE_SECRET_KEY` environment variable (required for auth hooks)
3. Restart PocketBase — it automatically loads all `.pb.js` files on startup

## Hook Descriptions

### utils.js — Shared Functions

Utility functions used by other hooks via `require(`${__hooks}/utils.js`)`:

| Function | Description |
|---|---|
| `verifyTurnstile(token, remoteIP)` | Verifies a Cloudflare Turnstile token (web clients). Throws on failure |
| `verifyAppToken(token, purpose)` | Verifies a native app-attestation HMAC token (Tauri clients). Returns boolean |
| `verifyAuthChallenge(turnstileToken, appToken, remoteIP, purpose)` | Unified gate: accepts a valid Turnstile **or** app token. Throws if neither passes |
| `createDefaultTierSubscription(siteId)` | Creates a free-tier subscription for a new site |
| `createStandardItems(siteId)` | Seeds the site with standard construction items from `items.json` |
| `createDefaultAccount(siteId)` | Creates a default Cash account with zero balance |
| `initializeUsageTracking(siteId, periodStart, periodEnd)` | Creates a `subscription_usage` record with all counters at zero |

### site-management-hooks.pb.js — Site Lifecycle

**`onRecordAfterCreateSuccess` on `sites`:**
- Assigns the site creator as owner (via `site_users`)
- Creates a free-tier subscription
- Seeds standard items and services
- Creates a default Cash account

**`onRecordAfterDeleteSuccess` on `sites`:**
- Cleans up all related records: `site_users`, `site_subscriptions`, `subscription_usage`, `site_invitations`
- Removes site data from: `items`, `vendors`, `incoming_items`, `service_bookings`, `payments`, `accounts`, `services`, `quotations`

### create_user.pb.js — Signup Verification

**`onRecordCreateRequest` on `users`:**
- Accepts **either** a Cloudflare Turnstile token (`turnstileToken`, web) **or** a
  native app-attestation token (`appToken`, Tauri) from the request body
- Blocks user creation if neither is present/valid
- Requires `TURNSTILE_SECRET_KEY` (web) and `APP_ATTEST_SECRET` (native)

### login.pb.js — Login Verification

**`onRecordAuthWithPasswordRequest` on `users`:**
- Accepts **either** a Cloudflare Turnstile token (`turnstileToken`, web) **or** a
  native app-attestation token (`appToken`, Tauri) from the query params
- Blocks login if neither is present/valid
- Requires `TURNSTILE_SECRET_KEY` (web) and `APP_ATTEST_SECRET` (native)

#### Native app attestation (Tauri)

Cloudflare Turnstile cannot render inside a native webview, so native builds
prove they are a genuine SiteWise app by signing each auth request:

- Token format: `v1.<purpose>.<timestampMs>.<hexHmacSha256>` where the signed
  message is `<purpose>.<timestampMs>` (HMAC-SHA256, hex).
- `purpose` is `login` or `register` (prevents cross-endpoint reuse).
- The server recomputes the HMAC with `APP_ATTEST_SECRET` and rejects tokens
  older than 120s, which blocks naive API scripting and replay.
- The **same secret** must be set as `VITE_APP_ATTEST_SECRET` at native build
  time (frontend) and `APP_ATTEST_SECRET` on the PocketBase server.

> **Note:** a baked client secret raises the bar against automated abuse but can
> be extracted from a distributed binary. Pair it with PocketBase's built-in
> rate limiting (Settings → Rate limits, or `auth`/`*` rules) for per-IP /
> per-endpoint throttling, and consider Play Integrity / App Attest for
> store-distributed builds that need device-level attestation.

### health.pb.js — Readiness Endpoint

**`GET /up`:**
- Unauthenticated route that returns `200 OK` (plain text)
- Complements PocketBase's built-in `GET /api/health`
- Matches the readiness-probe convention used by the [ONCE](https://once.com/)
  app server and other orchestrators

### process_invitations_on_acceptance.pb.js — Invitation Handling

**`onRecordAfterUpdateSuccess` on `site_invitations`:**
- Triggers when invitation status changes from `pending` to `accepted`
- Looks up the invited user by email
- Creates a `site_users` record granting the invited role
- Skips if user already has access to the site

## Seed Data

### items.json
Contains standard construction materials (cement, sand, aggregate, bricks, pipes, electrical wires, CPVC fittings, sanitary fixtures, etc.) with appropriate units. Created automatically for every new site.

### services.json
Contains standard construction services (engineer visits, JCB rental, electrical, plumbing, masonry, HVAC, scaffolding, security, waste disposal, etc.) with categories and billing units. Created automatically for every new site.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Yes (web) | Cloudflare Turnstile secret key for bot protection on signup/login from the web |
| `APP_ATTEST_SECRET` | Yes (native) | Shared HMAC secret for native (Tauri) app attestation. Must match the app's build-time `VITE_APP_ATTEST_SECRET` |

## Logging

All hooks use PocketBase's built-in logger:
- In hooks: `e.app.logger().info()` / `.warn()` / `.error()`
- In utils (standalone): `$app.logger().info()` / `.warn()` / `.error()`
