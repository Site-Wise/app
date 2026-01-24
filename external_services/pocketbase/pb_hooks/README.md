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
- Validates Cloudflare Turnstile token from request body (`turnstileToken`)
- Blocks user creation if token is missing or invalid
- Requires `TURNSTILE_SECRET_KEY` environment variable

### login.pb.js — Login Verification

**`onRecordAuthWithPasswordRequest` on `users`:**
- Validates Cloudflare Turnstile token from query params (`turnstileToken`)
- Blocks login if token is missing or invalid
- Requires `TURNSTILE_SECRET_KEY` environment variable

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
| `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile secret key for bot protection on signup/login |

## Logging

All hooks use PocketBase's built-in logger:
- In hooks: `e.app.logger().info()` / `.warn()` / `.error()`
- In utils (standalone): `$app.logger().info()` / `.warn()` / `.error()`
