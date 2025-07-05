# PocketBase API Rules

This document outlines the API access rules for the SiteWise application, enforced by PocketBase. These rules define who can create, read, update, and delete records in each collection.

## Guiding Principles

1.  **Least Privilege**: Users should only have the minimum necessary permissions to perform their tasks.
2.  **Ownership**: Users can only manage data within the sites they have access to.
3.  **Role-Based Access Control (RBAC)**: Permissions are determined by a user's role within a site (`owner`, `supervisor`, `accountant`).

---

## Core Collections

### `users`

-   **Create**: Anyone can create a user account (public).
-   **Read**: Users can only read their own data.
-   **Update**: Users can only update their own data.
-   **Delete**: Not allowed through the API.

```json
{
  "create": "",
  "read": "@request.auth.id = id",
  "update": "@request.auth.id = id",
  "delete": ""
}
```

### `sites`

-   **Create**: Any authenticated user can create a site.
-   **Read**: Users can read data for sites they are a member of.
-   **Update**: Only `owner` or `supervisor` roles can update a site.
-   **Delete**: Only the `owner` of the site can delete it.

```json
{
  "create": "@request.auth.id != null",
  "read": "@request.auth.id && @collection.site_users.user.id ?= @request.auth.id",
  "update": "@request.auth.id && (@collection.site_users.role = \"owner\" || @collection.site_users.role = \"supervisor\")",
  "delete": "@request.auth.id && @collection.site_users.role = \"owner\""
}
```

### `site_users`

-   **Create**: Only `owner` or `supervisor` of a site can add users.
-   **Read**: Users can see other members of the sites they belong to.
-   **Update**: `owner` or `supervisor` can update user roles.
-   **Delete**: `owner` or `supervisor` can remove users from a site.

```json
{
  "create": "@request.auth.id && (@collection.sites.admin_user = @request.auth.id || @collection.site_users.role = \"supervisor\")",
  "read": "@request.auth.id && @collection.site_users.user.id ?= @request.auth.id",
  "update": "@request.auth.id && (@collection.site_users.role = \"owner\" || @collection.site_users.role = \"supervisor\")",
  "delete": "@request.auth.id && (@collection.site_users.role = \"owner\" || @collection.site_users.role = \"supervisor\")"
}
```

---

## Subscription & Usage

### `subscription_plans`

-   **All Actions**: Admin only. These are managed through the PocketBase admin UI.

```json
{
  "create": "@request.admin.id != null",
  "read": "@request.admin.id != null",
  "update": "@request.admin.id != null",
  "delete": "@request.admin.id != null"
}
```

### `site_subscriptions`

-   **Create**: Admin only (subscriptions are created automatically by hooks).
-   **Read**: Users can view the subscription of sites they are members of.
-   **Update**: Admin only (updates are handled by hooks or payment provider integrations).
-   **Delete**: Admin only.

```json
{
  "create": "@request.admin.id != null",
  "read": "@request.auth.id && @collection.site_users.user.id ?= @request.auth.id",
  "update": "@request.admin.id != null",
  "delete": "@request.admin.id != null"
}
```

### `subscription_usage`

-   **Create**: Admin only (created by hooks).
-   **Read**: Users can view the usage of sites they are members of.
-   **Update**: Admin only (updated by hooks).
-   **Delete**: Admin only.

```json
{
  "create": "@request.admin.id != null",
  "read": "@request.auth.id && @collection.site_users.user.id ?= @request.auth.id",
  "update": "@request.admin.id != null",
  "delete": "@request.admin.id != null"
}
```

---

## Invitation System

### `site_invitations`

-   **Create**: `owner` or `supervisor` of a site can create invitations.
-   **Read**: Invited users can see their own invitations. `owner` and `supervisor` can see all invitations for their site.
-   **Update**: The invited user can update the status (to `accepted` or `rejected`).
-   **Delete**: `owner` or `supervisor` can delete pending invitations.

```json
{
  "create": "@request.auth.id && (@collection.sites.admin_user = @request.auth.id || @collection.site_users.role = \"supervisor\")",
  "read": "@request.auth.id && (@request.auth.email = email || @collection.site_users.role = \"owner\" || @collection.site_users.role = \"supervisor\")",
  "update": "@request.auth.id && @request.auth.email = email",
  "delete": "@request.auth.id && (@collection.site_users.role = \"owner\" || @collection.site_users.role = \"supervisor\")"
}
```

---

## Site Data Collections

For all site data collections (`items`, `accounts`, `vendors`, etc.), the rules are generally consistent:

-   **Create**: `owner` or `supervisor` can create records. `accountant` has read-only access.
-   **Read**: Any member of the site can read the data.
-   **Update**: `owner` or `supervisor` can update records.
-   **Delete**: Only `owner` can delete records.

Here is a template for these collections. Replace `collection_name` with the actual collection name.

```json
{
  "create": "@request.auth.id && (@collection.site_users.role = \"owner\" || @collection.site_users.role = \"supervisor\")",
  "read": "@request.auth.id && @collection.site_users.user.id ?= @request.auth.id",
  "update": "@request.auth.id && (@collection.site_users.role = \"owner\" || @collection.site_users.role = \"supervisor\")",
  "delete": "@request.auth.id && @collection.site_users.role = \"owner\""
}
```

This template applies to:

-   `items`
-   `accounts`
-   `vendors`
-   `deliveries` (or `incoming_items`)
-   `services`
-   `service_bookings`
-   `payments`
-   `quotations`

## Notes

1. The `accountant` role has read-only access to all site data collections.
2. Only the `owner` role can delete records in site data collections, providing an additional layer of protection.
3. The `supervisor` role can create and update records but cannot delete them.
4. All rules require authentication (`@request.auth.id`) and verify site membership through the `site_users` collection.