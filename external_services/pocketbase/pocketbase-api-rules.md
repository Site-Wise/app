# PocketBase API Rules Configuration

This document outlines the API rules that should be configured for each collection in PocketBase to ensure proper security, data isolation, and role-based access control for the SiteWise application.

**Last Updated**: Current with latest schema including subscription management and enhanced role-based permissions.

## General Principles

1. **Site-based isolation**: All data must be isolated per site
2. **Role-based permissions**: Access controlled by user roles (owner/supervisor/accountant)
3. **Authenticated access**: Most operations require authentication
4. **Subscription limits**: Create operations should check subscription limits

## Collection API Rules

### Core Collections

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

### Financial Collections

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

### Operational Collections

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
// Only admins can create plans
@request.auth.id != "" && @request.auth.email ?= "admin@sitewise.in"
```

**Update Rules:**
```javascript
// Only admins can update plans
@request.auth.id != "" && @request.auth.email ?= "admin@sitewise.in"
```

**Delete Rules:**
```javascript
// Only admins can delete plans
@request.auth.id != "" && @request.auth.email ?= "admin@sitewise.in"
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
- **Site administration**: Can modify site settings and delete sites
- **Financial control**: Full access to all financial data and operations

### Supervisor Role
- **Operational access**: Can create, read, and update most resources
- **Limited deletion**: Cannot delete core items, vendors, services, or users
- **No user management**: Cannot manage site users or roles
- **Financial access**: Can view and create payments and accounts
- **Data export**: Can export operational reports
- **Service management**: Can book and manage services

### Accountant Role
- **Read-only access**: Can view all resources but cannot create or modify operational data
- **Financial focus**: Primary access to payments, accounts, and financial reports
- **Export capabilities**: Can export data for accounting and reporting purposes
- **Limited financial operations**: Can view but not modify payment records
- **Analytics access**: Can view dashboard analytics and reports

## Security Considerations

### Authentication & Authorization
1. **Authentication Required**: All operations require valid authentication
2. **Site Isolation**: Data is strictly isolated per site using site-based filters
3. **Role Verification**: User roles are verified through `site_users` collection
4. **Active Status**: Only active site users can access resources
5. **Multi-Site Support**: Users can have different roles across multiple sites

### Subscription & Usage
6. **Subscription Limits**: Create operations should validate against subscription limits
7. **Usage Tracking**: All create operations should increment usage counters
8. **Plan Enforcement**: Free plan limits strictly enforced
9. **Grace Period**: Past due accounts have limited access

### Data Protection
10. **Audit Trail**: All operations are logged with timestamps and user information
11. **File Security**: Photo uploads limited by size and type
12. **API Rate Limiting**: Prevent abuse through rate limiting
13. **Data Export Controls**: Export capabilities limited by role

### Financial Security
14. **Payment Isolation**: Payment data access strictly controlled
15. **Account Balance Protection**: Balance updates only through authorized operations
16. **Transaction Integrity**: Payment allocations are atomic operations
17. **Vendor Payment Tracking**: Payment status automatically maintained

## Implementation Notes

### Performance Optimization
1. **Filter Complexity**: Some rules may need optimization for performance
2. **Index Requirements**: Ensure proper indexing on frequently filtered fields:
   - `site` field on all site-specific collections
   - `user` field on site_users collection
   - `is_active` field for active status filtering
   - `payment_status` field for financial filtering
   - `status` fields for subscription and invitation tracking

### Subscription Integration
3. **Subscription Hooks**: Use PocketBase hooks for:
   - Automatic site_subscription creation on site creation
   - Usage tracking on resource creation
   - Limit enforcement before operations
   - Account balance updates on payments

### Development & Deployment
4. **Backup Rules**: Test all rules thoroughly before deploying to production
5. **Rule Validation**: Use PocketBase's rule testing tools
6. **Admin Override**: Consider having an admin override mechanism for support purposes
7. **Migration Support**: Plan for rule updates during schema migrations

### Monitoring & Maintenance
8. **Performance Monitoring**: Monitor query performance on complex rules
9. **Usage Analytics**: Track subscription usage patterns
10. **Error Handling**: Implement proper error responses for rule violations
11. **Documentation Updates**: Keep rules documentation current with implementation

## Testing Checklist

### Security Testing
For each collection, verify:
- ✅ Users can only access data for their assigned sites
- ✅ Role-based permissions are enforced correctly
- ✅ Cross-site data leakage is prevented
- ✅ Inactive users cannot access resources
- ✅ Authentication is required for all operations
- ✅ File upload permissions work correctly
- ✅ Admin-only operations are properly restricted

### Subscription Testing
- ✅ Subscription limits are respected
- ✅ Usage counting works correctly
- ✅ Plan upgrades take effect immediately
- ✅ Payment processing updates subscription status
- ✅ Free plan restrictions are enforced
- ✅ Grace period handling works properly

### Functional Testing
- ✅ Site creation includes proper subscription setup
- ✅ User invitations work correctly
- ✅ Payment allocation updates item/service status
- ✅ Account balance calculations are accurate
- ✅ Photo upload and retrieval work
- ✅ Search and filtering respect permissions

### Integration Testing
- ✅ Frontend permission checks match backend rules
- ✅ Mobile app respects same restrictions
- ✅ API responses include proper error messages
- ✅ Webhook integrations work with rule enforcement
- ✅ Backup/restore preserves rule integrity

### Performance Testing
- ✅ Complex rules don't cause timeouts
- ✅ Large datasets with rules perform acceptably
- ✅ Index usage is optimized for rule filters
- ✅ Subscription limit checks are efficient