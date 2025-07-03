# PocketBase Schema

This document outlines the database schema for the SiteWise application, managed by PocketBase.

## Table of Contents

- [Core Collections](#core-collections)
  - [users](#users)
  - [sites](#sites)
  - [site_users](#site_users)
- [Subscription & Usage](#subscription--usage)
  - [subscription_plans](#subscription_plans)
  - [site_subscriptions](#site_subscriptions)
  - [subscription_usage](#subscription_usage)
- [Invitation System](#invitation-system)
  - [site_invitations](#site_invitations)
- [Site Data Collections](#site-data-collections)
  - [items](#items)
  - [accounts](#accounts)
  - [vendors](#vendors)
  - [deliveries](#deliveries)
  - [services](#services)
  - [service_bookings](#service_bookings)
  - [payments](#payments)
  - [quotations](#quotations)
- [System Collections](#system-collections)
  - [usage_recalculation_requests](#usage_recalculation_requests)

---

## Core Collections

### `users`

Stores user account information. This is a standard PocketBase collection.

| Field      | Type     | Description                                      |
|------------|----------|--------------------------------------------------|
| `id`       | `string` | Unique identifier for the user.                  |
| `email`    | `string` | User's email address, used for login.            |
| `name`     | `string` | User's full name.                                |
| `avatar`   | `file`   | User's profile picture.                          |
| `password` | `string` | Hashed password for the user.                    |

### `sites`

Represents a workspace or project site that a user can create and manage.

| Field        | Type       | Description                                       |
|--------------|------------|---------------------------------------------------|
| `id`         | `string`   | Unique identifier for the site.                   |
| `name`       | `string`   | Name of the site.                                 |
| `admin_user` | `relation` | The user who created the site (`users.id`).       |
| `is_active`  | `bool`     | Whether the site is currently active.             |

### `site_users`

Manages user roles and permissions for each site.

| Field         | Type       | Description                                                |
|---------------|------------|------------------------------------------------------------|
| `id`          | `string`   | Unique identifier for the site-user relationship.          |
| `site`        | `relation` | The site the user has access to (`sites.id`).              |
| `user`        | `relation` | The user with access (`users.id`).                         |
| `role`        | `string`   | User's role (e.g., `owner`, `admin`, `editor`, `viewer`).  |
| `assigned_by` | `relation` | The user who assigned the role (`users.id`).               |
| `is_active`   | `bool`     | Whether the user's access to the site is currently active. |

---

## Subscription & Usage

### `subscription_plans`

Defines the available subscription tiers and their corresponding limits.

| Field                       | Type      | Description                                                              |
|-----------------------------|-----------|--------------------------------------------------------------------------|
| `id`                        | `string`  | Unique identifier for the plan.                                          |
| `name`                      | `string`  | Name of the plan (e.g., "Free", "Pro", "Business").                      |
| `is_active`                 | `bool`    | Whether the plan is available for new subscriptions.                     |
| `is_default`                | `bool`    | If `true`, this plan is assigned to new sites by default.                |
| `items_count`               | `number`  | Maximum number of items allowed (`-1` for unlimited).                    |
| `vendors_count`             | `number`  | Maximum number of vendors allowed (`-1` for unlimited).                  |
| `deliveries_count`          | `number`  | Maximum number of deliveries allowed (`-1` for unlimited).               |
| `service_bookings_count`    | `number`  | Maximum number of service bookings allowed (`-1` for unlimited).         |
| `payments_count`            | `number`  | Maximum number of payments allowed (`-1` for unlimited).                 |

### `site_subscriptions`

Tracks the subscription status for each site.

| Field                  | Type       | Description                                                   |
|------------------------|------------|---------------------------------------------------------------|
| `id`                   | `string`   | Unique identifier for the subscription.                       |
| `site`                 | `relation` | The subscribed site (`sites.id`).                             |
| `subscription_plan`    | `relation` | The current subscription plan (`subscription_plans.id`).      |
| `status`               | `string`   | Subscription status (e.g., `active`, `past_due`, `canceled`). |
| `current_period_start` | `datetime` | Start of the current billing period.                          |
| `current_period_end`   | `datetime` | End of the current billing period.                            |
| `cancel_at_period_end` | `bool`     | If `true`, the subscription will be canceled at the period end. |

### `subscription_usage`

Tracks resource usage for each site within a billing period.

| Field                       | Type       | Description                                                   |
|-----------------------------|------------|---------------------------------------------------------------|
| `id`                        | `string`   | Unique identifier for the usage record.                       |
| `site`                      | `relation` | The site being tracked (`sites.id`).                          |
| `period_start`              | `datetime` | Start of the billing period for this usage record.            |
| `period_end`                | `datetime` | End of the billing period for this usage record.              |
| `items_count`               | `number`   | Current count of items for the site.                          |
| `vendors_count`             | `number`   | Current count of vendors for the site.                        |
| `incoming_deliveries_count` | `number`   | Current count of deliveries for the site.                     |
| `service_bookings_count`    | `number`   | Current count of service bookings for the site.               |
| `payments_count`            | `number`   | Current count of payments for the site.                       |

---

## Invitation System

### `site_invitations`

Stores invitations for users to join a site.

| Field         | Type       | Description                                                     |
|---------------|------------|-----------------------------------------------------------------|
| `id`          | `string`   | Unique identifier for the invitation.                           |
| `site`        | `relation` | The site the user is invited to (`sites.id`).                   |
| `email`       | `string`   | The email address of the invited user.                          |
| `role`        | `string`   | The role to be assigned upon acceptance.                        |
| `invited_by`  | `relation` | The user who sent the invitation (`users.id`).                  |
| `status`      | `string`   | Invitation status (`pending`, `accepted`, `rejected`, `expired`). |
| `accepted_at` | `datetime` | Timestamp when the invitation was accepted.                     |

---

## Site Data Collections

These collections store the primary data for each site. Every record in these collections is linked to a `site`.

### `items`

Materials and goods used in the construction project.

| Field         | Type       | Description                               |
|---------------|------------|-------------------------------------------|
| `id`          | `string`   | Unique identifier for the item.           |
| `site`        | `relation` | The site this item belongs to (`sites.id`). |
| `name`        | `string`   | Name of the item (e.g., "Cement").        |
| `unit`        | `string`   | Unit of measurement (e.g., "bag", "kg").  |
| `description` | `string`   | Optional description of the item.         |

### `accounts`

Financial accounts for managing transactions.

| Field             | Type       | Description                                                   |
|-------------------|------------|---------------------------------------------------------------|
| `id`              | `string`   | Unique identifier for the account.                            |
| `site`            | `relation` | The site this account belongs to (`sites.id`).                |
| `name`            | `string`   | Name of the account (e.g., "Cash", "Bank Account").           |
| `type`            | `string`   | Type of account (e.g., `cash`, `bank`).                       |
| `description`     | `string`   | Optional description.                                         |
| `is_active`       | `bool`     | Whether the account is active.                                |
| `opening_balance` | `number`   | The initial balance of the account.                           |
| `current_balance` | `number`   | The current balance, updated automatically.                   |

### `vendors`

Suppliers of materials and services.

| Field  | Type       | Description                                  |
|--------|------------|----------------------------------------------|
| `id`   | `string`   | Unique identifier for the vendor.            |
| `site` | `relation` | The site this vendor belongs to (`sites.id`).  |
| `name` | `string`   | Name of the vendor.                          |
| ...    | ...        | Other vendor details (e.g., contact info).   |

### `deliveries` (or `incoming_items`)

Records of incoming material deliveries.

| Field  | Type       | Description                                     |
|--------|------------|-------------------------------------------------|
| `id`   | `string`   | Unique identifier for the delivery.             |
| `site` | `relation` | The site this delivery belongs to (`sites.id`).   |
| ...    | ...        | Delivery details (e.g., item, quantity, date).  |

### `services`

Services that can be booked (e.g., "Electrician", "Plumber").

| Field  | Type       | Description                                   |
|--------|------------|-----------------------------------------------|
| `id`   | `string`   | Unique identifier for the service.            |
| `site` | `relation` | The site this service belongs to (`sites.id`).  |
| `name` | `string`   | Name of the service.                          |
| ...    | ...        | Other service details.                        |

### `service_bookings`

Records of booked services.

| Field  | Type       | Description                                         |
|--------|------------|-----------------------------------------------------|
| `id`   | `string`   | Unique identifier for the booking.                  |
| `site` | `relation` | The site this booking belongs to (`sites.id`).      |
| ...    | ...        | Booking details (e.g., service, date, provider).    |

### `payments`

Records of financial transactions.

| Field  | Type       | Description                                     |
|--------|------------|-------------------------------------------------|
| `id`   | `string`   | Unique identifier for the payment.              |
| `site` | `relation` | The site this payment belongs to (`sites.id`).    |
| ...    | ...        | Payment details (e.g., amount, date, account).  |

### `quotations`

Quotations received from vendors.

| Field  | Type       | Description                                       |
|--------|------------|---------------------------------------------------|
| `id`   | `string`   | Unique identifier for the quotation.              |
| `site` | `relation` | The site this quotation belongs to (`sites.id`).    |
| ...    | ...        | Quotation details (e.g., vendor, items, prices).  |

---

## System Collections

### `usage_recalculation_requests`

A utility collection to manually trigger usage recalculation for a site.

| Field    | Type       | Description                                      |
|----------|------------|--------------------------------------------------|
| `site`   | `relation` | The site to recalculate usage for (`sites.id`).  |
| `status` | `string`   | The status of the request (`pending`, `done`).   |
