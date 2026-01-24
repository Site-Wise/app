# PocketBase Setup

This directory contains everything needed to set up PocketBase for the SiteWise application.

## Directory Structure

```
external_services/pocketbase/
├── README.md           # This file
├── pb_schema.json      # Collection schema (import via Admin UI)
└── pb_hooks/           # Server-side hooks (copy to PocketBase directory)
    ├── README.md       # Detailed hooks documentation
    ├── utils.js        # Shared utility functions
    ├── site-management-hooks.pb.js
    ├── process_invitations_on_acceptance.pb.js
    ├── create_user.pb.js
    ├── login.pb.js
    ├── items.json       # Standard items seed data
    └── services.json    # Standard services seed data
```

## Setup Instructions

### 1. Import the Schema

The `pb_schema.json` file contains all collection definitions (fields, rules, indexes) required by the app.

1. Open the PocketBase Admin UI (typically at `http://localhost:8090/_/`)
2. Go to **Settings** > **Import collections**
3. Upload or paste the contents of `pb_schema.json`
4. Review and confirm the import

This creates all required collections with proper access rules and indexes.

### 2. Deploy the Hooks

The `pb_hooks/` directory contains server-side JavaScript hooks that handle business logic like site creation, subscription management, and usage tracking.

1. Copy the entire contents of `pb_hooks/` into your PocketBase server's `pb_hooks` directory
2. Restart PocketBase to load the hooks

```bash
cp -r pb_hooks/* /path/to/your/pocketbase/pb_hooks/
```

PocketBase automatically loads all `.pb.js` files on startup. See `pb_hooks/README.md` for detailed documentation on each hook.

## Schema Overview

The schema defines 30 collections organized into the following domains:

### Core (Site Management)

| Collection | Description |
|---|---|
| `sites` | Construction sites managed by users |
| `site_users` | User-site membership with roles (owner, supervisor, accountant) |
| `site_invitations` | Pending invitations to join a site |

### Items & Deliveries

| Collection | Description |
|---|---|
| `items` | Materials/items tracked per site (with tags) |
| `deliveries` | Material delivery records from vendors |
| `delivery_items` | Individual line items within a delivery |
| `incoming_items` | **Deprecated** - use `deliveries` + `delivery_items` instead |
| `tags` | Tags for categorizing items |

### Vendors

| Collection | Description |
|---|---|
| `vendors` | Vendor/supplier records per site |
| `vendor_credit_notes` | Credit notes issued by vendors |
| `vendor_refunds` | Refund records from vendors |
| `vendor_returns` | Return orders sent back to vendors |
| `vendor_return_items` | Individual items within a return |
| `credit_note_usage` | Tracks usage of credit notes against payments |

### Payments & Accounts

| Collection | Description |
|---|---|
| `accounts` | Bank/cash/wallet accounts per site |
| `account_transactions` | Individual transactions on an account |
| `payments` | Payments made to vendors (linked to deliveries/services) |
| `payment_allocations` | Allocation of a payment across deliveries/service bookings |

### Services

| Collection | Description |
|---|---|
| `services` | Service definitions (labour, contracting, etc.) |
| `service_bookings` | Bookings/usage of services on a site |

### Quotations

| Collection | Description |
|---|---|
| `quotations` | Quotations received from vendors |
| `quotation_items` | Line items within a quotation |

### Subscriptions & Billing

| Collection | Description |
|---|---|
| `subscription_plans` | Available subscription tiers and their limits |
| `site_subscriptions` | Active subscription for each site |
| `subscription_usage` | Current usage metrics per site (items, vendors, etc.) |
| `user_subscriptions` | User-level subscription records |
| `payment_transactions` | Razorpay payment records for subscriptions |

### Analytics

| Collection | Description |
|---|---|
| `analytics_settings` | Saved filter configurations for analytics views |

### Authentication (WebAuthn/Passkeys)

| Collection | Description |
|---|---|
| `passkey_credentials` | Registered passkey credentials per user |
| `passkey_challenges` | Temporary challenge storage for WebAuthn flows |

## Access Control

Collections use PocketBase API rules to enforce role-based access:

- **Owner** - Full CRUD access to all site data
- **Supervisor** - Can create/update most records, cannot delete critical data
- **Accountant** - Read access to site data (write access controlled per collection)

All site-scoped collections filter access through the `site_users` collection to ensure data isolation between sites.
