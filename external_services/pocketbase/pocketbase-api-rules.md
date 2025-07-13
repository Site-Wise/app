# PocketBase API Rules (Comprehensive Update)

This document outlines the API access rules for the SiteWise application, enforced by PocketBase. These rules are designed to be secure and efficient, ensuring that users can only access data for sites they are authorized to view and manage.

## Guiding Principles

1.  **Least Privilege**: Users have the minimum permissions necessary for their roles.
2.  **Strict Scoping**: All data access is scoped to the specific site a user is a member of.
3.  **Role-Based Access Control (RBAC)**: Permissions are granularly controlled by a user's role (`owner`, `supervisor`, `accountant`).
4.  **Efficiency**: Rules are written to be as performant as possible, avoiding unnecessary subqueries where feasible.

---

## Helper Rule Snippets

To improve readability and maintainability, we define a few reusable rule snippets.

-   **`isUser`**: Checks if the request is from a specific user.
    -   `id = @request.auth.id`
-   **`isSiteMember(siteId)`**: Checks if the authenticated user is a member of the specified site.
    -   `@collection.site_users.site ?= siteId && @collection.site_users.user ?= @request.auth.id`
-   **`isSiteRole(siteId, role)`**: Checks if the user has a specific role in a site.
    -   `@collection.site_users.site = siteId && @collection.site_users.user = @request.auth.id && @collection.site_users.role = role`

---

## Core Collections

### `users`

-   **Create**: Public. Anyone can sign up.
-   **Read**: A user can only read their own profile.
-   **Update**: A user can only update their own profile.
-   **Delete**: Admin only.

```json
{
  "create": "",
  "read": "id = @request.auth.id",
  "update": "id = @request.auth.id",
  "delete": "@request.admin.id != null"
}
```

### `sites`

-   **Create**: Any authenticated user can create a new site.
-   **Read**: A user can read data for sites they are a member of.
-   **Update**: Only users with the `owner` or `supervisor` role for that specific site can update it.
-   **Delete**: Only the `owner` of the site can delete it.

```json
{
  "create": "@request.auth.id != ''",
  "read": "id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "update": "(@collection.site_users.site = id && @collection.site_users.user = @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))",
  "delete": "(@collection.site_users.site = id && @collection.site_users.user = @request.auth.id && @collection.site_users.role = 'owner')"
}
```

### `site_users`

Manages user roles within a site.

-   **Create**: Only an `owner` or `supervisor` of a site can add new users to it.
-   **Read**: Members of a site can see who else is in the site.
-   **Update**: Only an `owner` or `supervisor` can change a user's role.
-   **Delete**: Only an `owner` or `supervisor` can remove a user from a site.

```json
{
  "create": "(@collection.site_users.site = site && @collection.site_users.user = @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))",
  "read": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "update": "(@collection.site_users.site = site && @collection.site_users.user = @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))",
  "delete": "(@collection.site_users.site = site && @collection.site_users.user = @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))"
}
```

---

## Invitation System

### `site_invitations`

-   **Create**: `owner` or `supervisor` of a site can create invitations for that site.
-   **Read**: The invited user (by email) can see their own invitation. The `owner` and `supervisor` can see all invitations for their site.
-   **Update**: Only the invited user can update the status (e.g., to `accepted`).
-   **Delete**: `owner` or `supervisor` can delete a pending invitation for their site.

```json
{
  "create": "(@collection.site_users.site = site && @collection.site_users.user = @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))",
  "read": "email = @request.auth.email || (@collection.site_users.site = site && @collection.site_users.user = @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))",
  "update": "email = @request.auth.email && @request.auth.id != ''",
  "delete": "(@collection.site_users.site = site && @collection.site_users.user = @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))"
}
```

---

## Subscription & Usage (Admin & Hooks)

These collections are primarily managed by backend hooks and administrators.

### `subscription_plans`

-   **All Actions**: Admin only.

```json
{
  "create": "@request.admin.id != ''",
  "read": "@request.admin.id != ''",
  "update": "@request.admin.id != ''",
  "delete": "@request.admin.id != ''"
}
```

### `site_subscriptions` & `subscription_usage`

-   **Create, Update, Delete**: Admin only (managed by hooks).
-   **Read**: Any member of the site can view its subscription and usage details.

```json
{
  "create": "@request.admin.id != ''",
  "read": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "update": "@request.admin.id != ''",
  "delete": "@request.admin.id != ''"
}
```

---

## Site Data Collections

This is a generic template for all collections that store site-specific data.

-   **Create**: `owner` or `supervisor` of the site can create records.
-   **Read**: Any member of the site can read data. The `accountant` role has read-only access.
-   **Update**: `owner` or `supervisor` can update records.
-   **Delete**: Only the `owner` of the site can delete records.

This template applies to: `items`, `accounts`, `vendors`, `deliveries`, `services`, `service_bookings`, `payments`, `quotations`.

```json
{
  "create": "(@collection.site_users.site = site && @collection.site_users.user = @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))",
  "read": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "update": "(@collection.site_users.site = site && @collection.site_users.user = @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))",
  "delete": "(@collection.site_users.site = site && @collection.site_users.user = @request.auth.id && @collection.site_users.role = 'owner')"
}
```
