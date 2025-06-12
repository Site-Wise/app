# PocketBase API Rules Configuration

This document outlines the API rules that should be configured for each collection in PocketBase to ensure proper security, data isolation, and role-based access control for the Construction Tracker application.

## General Principles

1. **Site-based isolation**: All data must be isolated per site
2. **Role-based permissions**: Access controlled by user roles (owner/supervisor/accountant)
3. **Authenticated access**: Most operations require authentication
4. **Subscription limits**: Create operations should check subscription limits

## Collection API Rules

### 1. `users` Collection

**List/Search Rules:**
```javascript
// Only authenticated users can list users
@request.auth.id != ""
```

**View Rules:**
```javascript
// Users can view their own profile or profiles of users in same sites
@request.auth.id = id || 
(@request.auth.id != "" && sites.length > 0 && @request.auth.sites:each ?= sites)
```

**Create Rules:**
```javascript
// Public registration allowed
@request.data.email != "" && @request.data.password != ""
```

**Update Rules:**
```javascript
// Users can only update their own profile
@request.auth.id = id
```

**Delete Rules:**
```javascript
// Users can delete their own account
@request.auth.id = id
```

---

### 2. `sites` Collection

**List/Search Rules:**
```javascript
// Users can only see sites they have access to
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = id && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Users can view sites they have access to
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = id && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// Authenticated users can create sites
@request.auth.id != "" && @request.data.admin_user = @request.auth.id
```

**Update Rules:**
```javascript
// Only site owners can update site details
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = id && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

**Delete Rules:**
```javascript
// Only site owners can delete sites
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = id && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 3. `site_users` Collection

**List/Search Rules:**
```javascript
// Users can list site_users for sites they have access to
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Users can view site_users for sites they have access to
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// Only site owners can assign roles
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

**Update Rules:**
```javascript
// Only site owners can update roles
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

**Delete Rules:**
```javascript
// Only site owners can delete role assignments
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 4. `site_invitations` Collection

**List/Search Rules:**
```javascript
// Users can list invitations for sites they own or invitations sent to them
@request.auth.id != "" && 
((@collection.site_users.user ?= @request.auth.id && 
  @collection.site_users.site = site && 
  @collection.site_users.role = "owner" && 
  @collection.site_users.is_active = true) || 
 email = @request.auth.email)
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
((@collection.site_users.user ?= @request.auth.id && 
  @collection.site_users.site = site && 
  @collection.site_users.role = "owner" && 
  @collection.site_users.is_active = true) || 
 email = @request.auth.email)
```

**Create Rules:**
```javascript
// Only site owners can create invitations
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

**Update Rules:**
```javascript
// Site owners can update invitations, or invited users can accept
@request.auth.id != "" && 
((@collection.site_users.user ?= @request.auth.id && 
  @collection.site_users.site = site && 
  @collection.site_users.role = "owner" && 
  @collection.site_users.is_active = true) || 
 (email = @request.auth.email && @request.data.status = "accepted"))
```

**Delete Rules:**
```javascript
// Only site owners can delete invitations
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 5. `accounts` Collection

**List/Search Rules:**
```javascript
// Users with financial access can view accounts
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor" || 
 @collection.site_users.role = "accountant")
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor" || 
 @collection.site_users.role = "accountant")
```

**Create Rules:**
```javascript
// Only owners and supervisors can create accounts
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Update Rules:**
```javascript
// Only owners and supervisors can update accounts
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Delete Rules:**
```javascript
// Only owners can delete accounts
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 6. `items` Collection

**List/Search Rules:**
```javascript
// All site users can view items
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// Only owners and supervisors can create items
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Update Rules:**
```javascript
// Only owners and supervisors can update items
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Delete Rules:**
```javascript
// Only owners can delete items
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 7. `vendors` Collection

**List/Search Rules:**
```javascript
// All site users can view vendors
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// Only owners and supervisors can create vendors
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Update Rules:**
```javascript
// Only owners and supervisors can update vendors
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Delete Rules:**
```javascript
// Only owners can delete vendors
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 8. `services` Collection

**List/Search Rules:**
```javascript
// All site users can view services
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// Only owners and supervisors can create services
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Update Rules:**
```javascript
// Only owners and supervisors can update services
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Delete Rules:**
```javascript
// Only owners can delete services
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 9. `quotations` Collection

**List/Search Rules:**
```javascript
// All site users can view quotations
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// Only owners and supervisors can create quotations
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Update Rules:**
```javascript
// Only owners and supervisors can update quotations
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Delete Rules:**
```javascript
// Only owners can delete quotations
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 10. `incoming_items` Collection

**List/Search Rules:**
```javascript
// All site users can view incoming items
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// Only owners and supervisors can create incoming items
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Update Rules:**
```javascript
// Only owners and supervisors can update incoming items
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Delete Rules:**
```javascript
// Only owners can delete incoming items
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 11. `service_bookings` Collection

**List/Search Rules:**
```javascript
// All site users can view service bookings
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// Only owners and supervisors can create service bookings
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Update Rules:**
```javascript
// Only owners and supervisors can update service bookings
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Delete Rules:**
```javascript
// Only owners can delete service bookings
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 12. `payments` Collection

**List/Search Rules:**
```javascript
// Users with financial access can view payments
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor" || 
 @collection.site_users.role = "accountant")
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor" || 
 @collection.site_users.role = "accountant")
```

**Create Rules:**
```javascript
// Only owners and supervisors can create payments
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Update Rules:**
```javascript
// Only owners and supervisors can update payments
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true &&
(@collection.site_users.role = "owner" || 
 @collection.site_users.role = "supervisor")
```

**Delete Rules:**
```javascript
// Only owners can delete payments
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

## Subscription Management Collections

### 13. `subscription_plans` Collection

**List/Search Rules:**
```javascript
// Public read access for plan information
@request.auth.id != ""
```

**View Rules:**
```javascript
// Public read access for plan information
@request.auth.id != ""
```

**Create Rules:**
```javascript
// Only admins can create plans (set this to admin email or specific condition)
@request.auth.email = "admin@example.com"
```

**Update Rules:**
```javascript
// Only admins can update plans
@request.auth.email = "admin@example.com"
```

**Delete Rules:**
```javascript
// Only admins can delete plans
@request.auth.email = "admin@example.com"
```

---

### 14. `site_subscriptions` Collection

**List/Search Rules:**
```javascript
// Users can view subscriptions for sites they have access to
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// System creates subscriptions, or site owners can upgrade
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @request.data.site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

**Update Rules:**
```javascript
// Only site owners can update subscriptions
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

**Delete Rules:**
```javascript
// Only site owners can delete subscriptions
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.role = "owner" && 
@collection.site_users.is_active = true
```

---

### 15. `subscription_usage` Collection

**List/Search Rules:**
```javascript
// Users can view usage for sites they have access to
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = site && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// System creates usage records automatically
@request.auth.id != ""
```

**Update Rules:**
```javascript
// System updates usage records automatically
@request.auth.id != ""
```

**Delete Rules:**
```javascript
// No deletion allowed for usage records
""
```

---

### 16. `payment_transactions` Collection

**List/Search Rules:**
```javascript
// Users can view payment transactions for their site subscriptions
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @collection.site_subscriptions.site && 
@collection.site_subscriptions.id = site_subscription && 
@collection.site_users.is_active = true
```

**View Rules:**
```javascript
// Same as list rules
@request.auth.id != "" && 
@collection.site_users.user ?= @request.auth.id && 
@collection.site_users.site = @collection.site_subscriptions.site && 
@collection.site_subscriptions.id = site_subscription && 
@collection.site_users.is_active = true
```

**Create Rules:**
```javascript
// System creates payment transactions automatically
@request.auth.id != ""
```

**Update Rules:**
```javascript
// System updates payment transactions automatically
@request.auth.id != ""
```

**Delete Rules:**
```javascript
// No deletion allowed for payment transactions
""
```

---

## Role-Based Access Summary

### Owner Role
- **Full access**: Can create, read, update, and delete all resources
- **User management**: Can invite users, assign roles, and manage site access
- **Subscription management**: Can upgrade/downgrade plans and manage billing

### Supervisor Role
- **Operational access**: Can create, read, and update most resources
- **No deletion**: Cannot delete items, vendors, services, or other core data
- **No user management**: Cannot manage site users or roles
- **Financial access**: Can view and create payments and accounts

### Accountant Role
- **Read-only access**: Can view all resources but cannot create or modify
- **Financial focus**: Primary access to payments, accounts, and financial reports
- **Export capabilities**: Can export data for reporting purposes

## Security Considerations

1. **Authentication Required**: All operations require valid authentication
2. **Site Isolation**: Data is strictly isolated per site using site-based filters
3. **Role Verification**: User roles are verified through `site_users` collection
4. **Active Status**: Only active site users can access resources
5. **Subscription Limits**: Create operations should validate against subscription limits
6. **Audit Trail**: All operations are logged with timestamps and user information

## Implementation Notes

1. **Filter Complexity**: Some rules may need optimization for performance
2. **Index Requirements**: Ensure proper indexing on frequently filtered fields (site, user, is_active)
3. **Subscription Hooks**: Consider using PocketBase hooks for subscription limit enforcement
4. **Backup Rules**: Test all rules thoroughly before deploying to production
5. **Admin Override**: Consider having an admin override mechanism for support purposes

## Testing Checklist

For each collection, verify:
- ✅ Users can only access data for their assigned sites
- ✅ Role-based permissions are enforced correctly
- ✅ Cross-site data leakage is prevented
- ✅ Inactive users cannot access resources
- ✅ Subscription limits are respected
- ✅ Authentication is required for all operations