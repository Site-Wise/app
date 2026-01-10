# PocketBase API Rules & Configuration

This document outlines the API access rules, custom endpoints, and hooks for the SiteWise application using PocketBase v0.23+.

## Table of Contents
- [Guiding Principles](#guiding-principles)
- [Helper Rule Snippets](#helper-rule-snippets)
- [Core Collections](#core-collections)
- [Site Data Collections](#site-data-collections)
- [Financial Collections](#financial-collections)
- [Vendor Returns System](#vendor-returns-system)
- [Subscription System](#subscription-system)
- [WebAuthn/Passkey System](#webauthnpasskey-system)
- [Custom API Endpoints](#custom-api-endpoints)
- [Hooks](#hooks)
- [Environment Variables](#environment-variables)

---

## Guiding Principles

1. **Least Privilege**: Users have the minimum permissions necessary for their roles.
2. **Strict Scoping**: All data access is scoped to the specific site a user is a member of.
3. **Role-Based Access Control (RBAC)**: Permissions are granularly controlled by a user's role (`owner`, `supervisor`, `accountant`).
4. **Efficiency**: Rules are written to be as performant as possible, avoiding unnecessary subqueries where feasible.

---

## Helper Rule Snippets

Reusable rule patterns for PocketBase API rules:

| Snippet | Rule | Description |
|---------|------|-------------|
| `isUser` | `id = @request.auth.id` | Checks if the request is from a specific user |
| `isSiteMember` | `site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id` | Checks if user is a member of the site |
| `isSiteOwnerOrSupervisor` | `@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' \|\| @collection.site_users.role = 'supervisor')` | Checks for owner or supervisor role |
| `isSiteOwner` | `@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'` | Checks for owner role only |

---

## Core Collections

### `users`

User accounts with Turnstile CAPTCHA protection on registration and login.

| Action | Rule | Notes |
|--------|------|-------|
| List/View | `id = @request.auth.id` | Users can only read their own profile |
| Create | `""` (public) | Requires Turnstile token validation via hook |
| Update | `id = @request.auth.id` | Users can only update their own profile |
| Delete | `@request.auth.id != ''` | Authenticated users can delete their own account |

```json
{
  "listRule": "id = @request.auth.id",
  "viewRule": "id = @request.auth.id",
  "createRule": "",
  "updateRule": "id = @request.auth.id",
  "deleteRule": "@request.auth.id != ''"
}
```

### `sites`

Construction sites/projects.

| Action | Rule | Notes |
|--------|------|-------|
| List/View | Site membership | Only site members can view |
| Create | `@request.auth.id != ''` | Any authenticated user can create a site |
| Update | Owner or Supervisor | Can modify site settings |
| Delete | Owner only | Triggers cleanup hooks |

```json
{
  "listRule": "id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `site_users`

Manages user roles and permissions within sites.

**Roles:**
- `owner`: Full access, can delete site, manage all users
- `supervisor`: Can create/update data, manage users except owners
- `accountant`: Read-only access to financial data

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')"
}
```

### `site_invitations`

In-app invitation system for adding users to sites.

| Action | Rule | Notes |
|--------|------|-------|
| List/View | Invitee or Site Admin | Invitee sees their invitations, admins see all for their site |
| Create | Owner or Supervisor | Can invite new users |
| Update | Invitee only | To accept/decline invitation |
| Delete | Owner or Supervisor | Can cancel pending invitations |

```json
{
  "listRule": "email = @request.auth.email || (@collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))",
  "viewRule": "email = @request.auth.email || (@collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor'))",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "email = @request.auth.email && @request.auth.id != ''",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')"
}
```

---

## Site Data Collections

All site-scoped collections follow a standard access pattern with role-based permissions.

### Standard Site-Scoped Rules Template

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `items`

Construction materials and supplies.

**Rules:** Standard site-scoped (see template above)

```typescript
{
  name: string;          // Required
  description?: string;
  unit: string;          // e.g., 'kg', 'bag', 'piece'
  tags?: string[];       // Relation to tags collection
  site: string;          // Relation to sites
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `vendors`

Suppliers and service providers.

**Rules:** Standard site-scoped

```typescript
{
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_details?: string;
  tags?: string[];       // Relation to tags collection
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `services`

Service types (labor, equipment, professional).

**Rules:** Standard site-scoped

```typescript
{
  name: string;
  description?: string;
  category: 'labor' | 'equipment' | 'professional' | 'transport' | 'other';
  service_type: string;  // e.g., 'Plumber', 'Electrician'
  unit: string;          // e.g., 'hour', 'day', 'job'
  standard_rate?: number;
  is_active: boolean;
  tags?: string[];
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `tags`

Unified tag system for categorization.

**Rules:** Standard site-scoped

```typescript
{
  name: string;
  color: string;         // Hex color code
  type: 'service_category' | 'specialty' | 'item_category' | 'custom';
  usage_count: number;   // For popularity-based autocomplete
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `quotations`

Price quotes from vendors.

**Rules:** Standard site-scoped

```typescript
{
  vendor: string;
  item?: string;
  service?: string;
  quotation_type: 'item' | 'service';
  unit_price: number;
  minimum_quantity?: number;
  valid_until?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `analytics_settings`

Saved analytics filter configurations.

**Rules:** Standard site-scoped

```typescript
{
  site: string;
  name: string;           // User-defined name for this saved filter
  tag_ids?: string[];     // Array of tag IDs to filter by
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

---

## Financial Collections

### `accounts`

Bank accounts, cash, and payment methods.

**Rules:** Standard site-scoped

```typescript
{
  name: string;
  type: 'bank' | 'credit_card' | 'cash' | 'digital_wallet' | 'other';
  account_number?: string;
  bank_name?: string;
  description?: string;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `account_transactions`

Account transaction log for balance tracking.

**Rules:** Standard site-scoped

```typescript
{
  account: string;
  type: 'credit' | 'debit';
  amount: number;
  transaction_date: string;
  description: string;
  reference?: string;
  notes?: string;
  vendor?: string;
  payment?: string;
  vendor_refund?: string;
  transaction_category?: 'payment' | 'refund' | 'credit_adjustment' | 'manual';
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `deliveries`

Multi-item delivery records from vendors.

**Rules:** Standard site-scoped

```typescript
{
  vendor: string;
  delivery_date: string;
  delivery_reference?: string;  // Invoice/delivery note number
  photos?: string[];
  notes?: string;
  total_amount: number;         // Sum of items + rounded_off_with
  rounded_off_with?: number;    // Round-off amount
  payment_status?: 'pending' | 'partial' | 'paid';  // Deprecated - calculated from allocations
  paid_amount?: number;         // Deprecated
  delivery_items?: string[];
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `delivery_items`

Individual items within a delivery.

**Rules:** Standard site-scoped

```typescript
{
  delivery: string;
  item: string;
  quantity: number;
  unit_price: number;
  total_amount: number;  // quantity * unit_price
  notes?: string;
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `service_bookings`

Service provider bookings.

**Rules:** Standard site-scoped

```typescript
{
  service: string;
  vendor: string;
  start_date: string;
  end_date?: string;
  duration: number;
  unit_rate: number;
  total_amount: number;
  percent_completed: number;  // 0-100
  payment_status?: 'pending' | 'partial' | 'paid' | 'currently_paid_up';  // Deprecated
  paid_amount?: number;  // Deprecated
  completion_photos?: string[];
  notes?: string;
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `payments`

Payment records with allocation support.

**Rules:** Standard site-scoped

```typescript
{
  vendor: string;
  account: string;
  amount: number;
  payment_date: string;
  reference?: string;
  notes?: string;
  deliveries: string[];         // Multi-item deliveries
  service_bookings: string[];   // Service payments
  credit_notes?: string[];      // Credit notes used
  payment_allocations?: string[];
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `payment_allocations`

Allocation of payments to deliveries and bookings.

**Rules:** Standard site-scoped

```typescript
{
  payment: string;
  delivery?: string;
  service_booking?: string;
  allocated_amount: number;
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

---

## Vendor Returns System

### `vendor_returns`

Return requests for delivered items.

**Rules:** Standard site-scoped

```typescript
{
  vendor: string;
  return_date: string;
  reason: 'damaged' | 'wrong_item' | 'excess_delivery' | 'quality_issue' | 'specification_mismatch' | 'other';
  status: 'initiated' | 'approved' | 'rejected' | 'completed' | 'refunded';
  processing_option?: 'credit_note' | 'refund';
  notes?: string;
  photos?: string[];
  approval_notes?: string;
  approved_by?: string;
  approved_at?: string;
  total_return_amount: number;
  actual_refund_amount?: number;
  completion_date?: string;
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `vendor_return_items`

Items being returned.

**Rules:** Standard site-scoped

```typescript
{
  vendor_return: string;
  delivery_item: string;
  quantity_returned: number;
  return_rate: number;
  return_amount: number;
  condition: 'unopened' | 'opened' | 'damaged' | 'used';
  item_notes?: string;
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `vendor_refunds`

Refund processing for returns.

**Rules:** Standard site-scoped

```typescript
{
  vendor_return: string;
  vendor: string;
  account: string;
  refund_amount: number;
  refund_date: string;
  refund_method: 'cash' | 'bank_transfer' | 'cheque' | 'adjustment' | 'other';
  reference?: string;
  notes?: string;
  processed_by?: string;
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `vendor_credit_notes`

Credit notes issued for returns.

**Rules:** Standard site-scoped

```typescript
{
  vendor: string;
  credit_amount: number;
  balance: number;
  issue_date: string;
  expiry_date?: string;
  reference?: string;
  reason: string;
  return_id?: string;
  status: 'active' | 'fully_used' | 'expired' | 'cancelled';
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

### `credit_note_usage`

Usage tracking for credit notes.

**Rules:** Standard site-scoped

```typescript
{
  credit_note: string;
  used_amount: number;
  used_date: string;
  payment: string;
  vendor: string;
  description?: string;
  site: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "updateRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && (@collection.site_users.role = 'owner' || @collection.site_users.role = 'supervisor')",
  "deleteRule": "@request.auth.id != '' && @collection.site_users.site ?= site.id && @collection.site_users.user ?= @request.auth.id && @collection.site_users.role = 'owner'"
}
```

---

## Subscription System

These collections are primarily managed by backend hooks and administrators.

### `subscription_plans`

Admin-managed subscription tiers. Public read access for displaying plan options.

```typescript
{
  name: string;
  display_name: string;
  price: number;
  billing_period: 'monthly' | 'yearly';
  max_items: number;      // -1 for unlimited
  max_vendors: number;
  max_deliveries: number;
  max_service_bookings: number;
  max_payments: number;
  features: string[];     // List of feature descriptions
  is_active: boolean;
  is_default: boolean;    // Default plan for new sites
}
```

```json
{
  "listRule": "",
  "viewRule": "",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != ''",
  "deleteRule": "@request.auth.id != ''"
}
```

### `site_subscriptions`

Site subscription records. Site members can view their subscription.

```typescript
{
  site: string;
  subscription_plan: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  payment_provider?: string;
  external_subscription_id?: string;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != ''",
  "deleteRule": "@request.auth.id != ''"
}
```

### `subscription_usage`

Usage tracking per subscription period.

```typescript
{
  site: string;
  period_start: string;
  period_end: string;
  items_count: number;
  vendors_count: number;
  incoming_deliveries_count: number;
  service_bookings_count: number;
  payments_count: number;
}
```

```json
{
  "listRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "viewRule": "site.id ?~ @collection.site_users.site && @collection.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != ''",
  "deleteRule": "@request.auth.id != ''"
}
```

---

## WebAuthn/Passkey System

### `passkey_credentials`

Stores registered passkey credentials. Admin-only access (managed via custom routes).

```typescript
{
  user: string;           // User ID
  credential_id: string;  // WebAuthn credential ID
  public_key: string;     // Public key for verification
  counter: number;        // Signature counter for replay protection
  device_name: string;    // Friendly device name
  device_type: 'platform' | 'cross-platform';
  transports: string[];   // ['internal', 'usb', 'ble', 'nfc']
  backed_up: boolean;     // Whether credential is backed up
  aaguid: string;         // Authenticator AAGUID
  last_used: string;      // Last authentication timestamp
  flagged: boolean;       // Security flag for counter anomalies
}
```

```json
{
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}
```

**Note:** All access is via custom API routes with proper authentication.

### `passkey_challenges`

Temporary challenge storage for WebAuthn ceremonies. Admin-only access (managed via hooks).

```typescript
{
  challenge_hash: string;   // SHA256 hash for lookup
  challenge: string;        // Encrypted challenge
  type: 'registration' | 'authentication';
  user_id: string;          // User ID (for registration)
  ip_address: string;       // Client IP for rate limiting
  expires_at: string;       // TTL (5 minutes)
}
```

```json
{
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}
```

**Note:** All access is via hooks. Expired challenges are cleaned up automatically.

---

## Custom API Endpoints

### WebAuthn/Passkey Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/passkey/register/start` | Required | Start passkey registration |
| POST | `/api/passkey/register/finish` | Required | Complete passkey registration |
| POST | `/api/passkey/authenticate/start` | Guest | Start passkey authentication |
| POST | `/api/passkey/authenticate/finish` | Guest | Complete passkey authentication |
| GET | `/api/passkey/list` | Required | List user's registered passkeys |
| DELETE | `/api/passkey/{id}` | Required | Delete a passkey |
| PATCH | `/api/passkey/{id}` | Required | Update passkey (rename) |

#### Registration Flow

```javascript
// 1. Start registration (requires auth)
POST /api/passkey/register/start
Response: { success: true, options: PublicKeyCredentialCreationOptions }

// 2. Client creates credential with navigator.credentials.create()

// 3. Complete registration
POST /api/passkey/register/finish
Body: { response: RegistrationResponseJSON, deviceName?: string }
Response: { success: true, credential: { id, deviceName, createdAt } }
```

#### Authentication Flow

```javascript
// 1. Start authentication (no auth required)
POST /api/passkey/authenticate/start
Body: { email?: string }  // Optional for user-specific flow
Response: { success: true, options: PublicKeyCredentialRequestOptions }

// 2. Client gets credential with navigator.credentials.get()

// 3. Complete authentication
POST /api/passkey/authenticate/finish
Body: { response: AuthenticationResponseJSON }
Response: {
  success: true,
  token: string,  // PocketBase auth token
  record: { id, collectionId, collectionName, email, name, avatar, sites, created, updated }
}
```

#### Rate Limiting

- Registration: 10 attempts per 5 minutes per IP
- Authentication: 20 attempts per 5 minutes per IP

---

## Hooks

### User Lifecycle Hooks

#### `create_user.pb.js`
- **Trigger:** `onRecordCreateRequest` for `users`
- **Action:** Validates Cloudflare Turnstile token before allowing registration

#### `login.pb.js`
- **Trigger:** `onRecordAuthWithPasswordRequest` for `users`
- **Action:** Validates Cloudflare Turnstile token before allowing login

### Site Management Hooks

#### `site-management-hooks.pb.js`

**Site Creation (`onRecordAfterCreateSuccess`):**
1. Assigns creator as site owner in `site_users`
2. Creates free tier subscription via `utils.createDefaultTierSubscription()`
3. Creates standard construction items via `utils.createStandardItems()`
4. Creates standard services via `utils.createStandardServices()`
5. Creates default Cash account via `utils.createDefaultAccount()`

**Site Deletion (`onRecordAfterDeleteSuccess`):**
Cleans up all related records:
- `site_users`
- `site_subscriptions`
- `subscription_usage`
- `site_invitations`
- `items`, `vendors`, `deliveries`, `service_bookings`
- `payments`, `accounts`, `services`, `quotations`

### Invitation Hooks

#### `process_invitations_on_acceptance.pb.js`
- **Trigger:** `onRecordAfterUpdateSuccess` for `site_invitations`
- **Action:** When status changes from `pending` to `accepted`:
  1. Finds user by invitation email
  2. Checks if user already has site access
  3. Creates `site_user` record with invited role

### WebAuthn Hooks

#### `webauthn-hooks.pb.js`
- **Bootstrap:** Cleans up expired challenges on server start
- **Custom Routes:** All passkey endpoints (see Custom API Endpoints section)

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key | `0x4AAA...` |

### WebAuthn Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBAUTHN_VERIFIER_URL` | External verifier service URL | `https://sitewise-webauthn-verifier.workers.dev` |
| `WEBAUTHN_VERIFIER_API_KEY` | API key for verifier service | (empty) |
| `WEBAUTHN_RP_ID` | Relying Party ID (domain) | `sitewise.com` |
| `WEBAUTHN_RP_NAME` | Relying Party display name | `Site-Wise` |
| `WEBAUTHN_ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://app.sitewise.com,https://sitewise.com` |
| `WEBAUTHN_ENCRYPTION_KEY` | 32-char key for challenge encryption | (derived from default) |

---

## Security Considerations

### Cross-Site Data Isolation

All site-specific services filter data by `getCurrentSiteId()`. The `getById()` methods include site validation to prevent cross-site access.

### Replay Attack Prevention

WebAuthn credentials track a `counter` value. If a counter anomaly is detected (counter not incrementing), the credential is flagged for security review.

### Session Management

- Auth tokens are JWT-based with configurable expiration
- Passkey authentication returns standard PocketBase auth tokens
- Users can have multiple valid sessions

### Rate Limiting

- Turnstile CAPTCHA on registration and login
- IP-based rate limiting on WebAuthn endpoints
- PocketBase auto-cancellation prevents duplicate requests

---

## Collection Summary

| Collection | Rules Type | Description |
|------------|------------|-------------|
| `users` | Custom | User accounts |
| `sites` | Custom | Construction sites |
| `site_users` | Custom | Site membership & roles |
| `site_invitations` | Custom | User invitations |
| `items` | Standard site-scoped | Materials & supplies |
| `vendors` | Standard site-scoped | Suppliers |
| `services` | Standard site-scoped | Service types |
| `tags` | Standard site-scoped | Categorization tags |
| `quotations` | Standard site-scoped | Price quotes |
| `analytics_settings` | Standard site-scoped | Saved analytics filters |
| `accounts` | Standard site-scoped | Payment accounts |
| `account_transactions` | Standard site-scoped | Transaction log |
| `deliveries` | Standard site-scoped | Delivery records |
| `delivery_items` | Standard site-scoped | Delivery line items |
| `service_bookings` | Standard site-scoped | Service bookings |
| `payments` | Standard site-scoped | Payment records |
| `payment_allocations` | Standard site-scoped | Payment allocations |
| `vendor_returns` | Standard site-scoped | Return requests |
| `vendor_return_items` | Standard site-scoped | Return line items |
| `vendor_refunds` | Standard site-scoped | Refund records |
| `vendor_credit_notes` | Standard site-scoped | Credit notes |
| `credit_note_usage` | Standard site-scoped | Credit note usage |
| `subscription_plans` | Public read, Admin write | Subscription tiers |
| `site_subscriptions` | Site-scoped read, Admin write | Site subscriptions |
| `subscription_usage` | Site-scoped read, Admin write | Usage tracking |
| `passkey_credentials` | Admin only (via routes) | WebAuthn credentials |
| `passkey_challenges` | Admin only (via hooks) | WebAuthn challenges |

---

## Migration Notes

### Deprecated Fields

- `incoming_items` collection - Use `deliveries` and `delivery_items` instead
- `Payment.incoming_items` - Use `Payment.deliveries` instead
- `ServiceBooking.payment_status` and `paid_amount` - Calculated from allocations
- `Delivery.payment_status` and `paid_amount` - Calculated from allocations
