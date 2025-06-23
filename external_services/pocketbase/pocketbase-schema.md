# PocketBase Schema Design

This document outlines the complete database schema for SiteWise, including all collections, relationships, and subscription management.

## Core Collections

### 1. users
Built-in PocketBase collection with custom fields:
- `id` (string, auto-generated)
- `email` (string, required)
- `name` (string, required)
- `phone` (string, optional)
- `avatar` (file, optional)
- `sites` (json array, optional) - Array of site IDs for quick access
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 2. sites
Fields:
- `id` (string, auto-generated)
- `name` (string, required)
- `description` (text, optional)
- `total_units` (number, required) - Number of apartments, offices, etc.
- `total_planned_area` (number, required) - Total area in square feet
- `admin_user` (relation to users, required) - **@deprecated** Use site_users with role='owner'
- `users` (json array, optional) - **@deprecated** Use site_users table
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 3. site_users
User-site role assignments:
- `id` (string, auto-generated)
- `site` (relation to sites, required)
- `user` (relation to users, required)
- `role` (select, required) - "owner", "supervisor", "accountant"
- `assigned_by` (relation to users, required) - Who assigned this role
- `assigned_at` (datetime, required) - When role was assigned
- `is_active` (boolean, required) - Can be deactivated without deletion
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 4. site_invitations
Manages user invitations to sites:
- `id` (string, auto-generated)
- `site` (relation to sites, required)
- `email` (string, required) - Email address of invitee
- `role` (select, required) - "owner", "supervisor", "accountant"
- `invited_by` (relation to users, required)
- `invited_at` (datetime, required)
- `status` (select, required) - "pending", "accepted", "expired"
- `expires_at` (datetime, required)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 5. accounts
Payment accounts and financial tracking:
- `id` (string, auto-generated)
- `name` (string, required)
- `type` (select, required) - "bank", "credit_card", "cash", "digital_wallet", "other"
- `account_number` (string, optional)
- `bank_name` (string, optional)
- `description` (text, optional)
- `is_active` (boolean, required)
- `opening_balance` (number, required)
- `current_balance` (number, required) - Updated automatically
- `site` (relation to sites, required)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 6. items
Construction materials and supplies:
- `id` (string, auto-generated)
- `name` (string, required)
- `description` (text, optional)
- `unit` (string, required) - kg, pcs, m², etc.
- `quantity` (number, required) - **@deprecated** Use delivery history for tracking
- `category` (string, optional) - **@deprecated** Use unified tag system
- `site` (relation to sites, required)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 7. services
Construction services (labor, equipment, professional):
- `id` (string, auto-generated)
- `name` (string, required)
- `description` (text, optional)
- `category` (select, required) - "labor", "equipment", "professional", "transport", "other"
- `service_type` (string, required) - e.g., "Plumber", "Electrician", "Tractor"
- `unit` (string, required) - "hour", "day", "job", "sqft"
- `standard_rate` (number, optional) - Standard rate per unit
- `is_active` (boolean, required)
- `tags` (json array, optional) - **@deprecated** Use unified tag system
- `site` (relation to sites, required)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 8. vendors
Suppliers and contractors:
- `id` (string, auto-generated)
- `name` (string, required)
- `contact_person` (string, optional)
- `email` (string, optional)
- `phone` (string, optional)
- `address` (text, optional)
- `tags` (json array, optional) - **@deprecated** Use unified tag system
- `site` (relation to sites, required)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 9. quotations
Price quotes from vendors:
- `id` (string, auto-generated)
- `vendor` (relation to vendors, required)
- `item` (relation to items, optional)
- `service` (relation to services, optional)
- `quotation_type` (select, required) - "item", "service"
- `unit_price` (number, required)
- `minimum_quantity` (number, optional)
- `valid_until` (date, optional)
- `notes` (text, optional)
- `status` (select, required) - "pending", "approved", "rejected", "expired"
- `site` (relation to sites, required)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 10. incoming_items
Delivery records:
- `id` (string, auto-generated)
- `item` (relation to items, required)
- `vendor` (relation to vendors, required)
- `quantity` (number, required)
- `unit_price` (number, required)
- `total_amount` (number, required)
- `delivery_date` (date, required)
- `photos` (file array, optional)
- `notes` (text, optional)
- `payment_status` (select, required) - "pending", "partial", "paid"
- `paid_amount` (number, required, default: 0)
- `site` (relation to sites, required)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 11. service_bookings
Service scheduling and execution:
- `id` (string, auto-generated)
- `service` (relation to services, required)
- `vendor` (relation to vendors, required)
- `start_date` (datetime, required)
- `end_date` (datetime, optional)
- `duration` (number, required) - In hours or days based on service unit
- `unit_rate` (number, required)
- `total_amount` (number, required)
- `status` (select, required) - "scheduled", "in_progress", "completed", "cancelled"
- `completion_photos` (file array, optional)
- `notes` (text, optional)
- `payment_status` (select, required) - "pending", "partial", "paid"
- `paid_amount` (number, required, default: 0)
- `site` (relation to sites, required)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 12. payments
Payment records to vendors:
- `id` (string, auto-generated)
- `vendor` (relation to vendors, required)
- `account` (relation to accounts, required)
- `amount` (number, required)
- `payment_date` (date, required)
- `reference` (string, optional) - Check number, transfer ID, etc.
- `notes` (text, optional)
- `incoming_items` (json array, optional) - IDs of items paid for
- `service_bookings` (json array, optional) - IDs of services paid for
- `site` (relation to sites, required)
- `created` (datetime, auto)
- `updated` (datetime, auto)

## Subscription Management Collections

### 13. subscription_plans
Fields:
- `id` (string, auto-generated)
- `name` (string, required) - "Free", "Basic", "Pro"
- `price` (number, required) - Monthly price in cents/paise
- `currency` (string, required) - "INR", "USD"
- `features` (json, required) - Feature limits object
- `is_active` (boolean, required) - Plan availability
- `is_default` (boolean, default: false) - Default plan for new users
- `created` (datetime, auto)
- `updated` (datetime, auto)

Example features JSON:
```json
{
  "max_items": 1,
  "max_vendors": 1, 
  "max_incoming_deliveries": 5,
  "max_service_bookings": 5,
  "max_payments": 5,
  "max_sites": 1
}
```

### 14. site_subscriptions
Fields:
- `id` (string, auto-generated)
- `site` (relation to sites, required)
- `subscription_plan` (relation to subscription_plans, required)
- `status` (select, required) - "active", "cancelled", "expired", "past_due", "pending_payment"
- `current_period_start` (datetime, required)
- `current_period_end` (datetime, required) 
- `razorpay_subscription_id` (string, optional) - Razorpay subscription ID
- `razorpay_customer_id` (string, optional) - Razorpay customer ID
- `cancel_at_period_end` (boolean, default: false)
- `cancelled_at` (datetime, optional)
- `reactivated_at` (datetime, optional)
- `trial_end` (datetime, optional)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 15. subscription_usage
Fields:
- `id` (string, auto-generated)
- `site` (relation to sites, required)
- `period_start` (datetime, required)
- `period_end` (datetime, required)
- `items_count` (number, default: 0)
- `vendors_count` (number, default: 0)
- `incoming_deliveries_count` (number, default: 0)
- `service_bookings_count` (number, default: 0)
- `payments_count` (number, default: 0)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 16. payment_transactions
Fields:
- `id` (string, auto-generated)
- `site_subscription` (relation to site_subscriptions, required)
- `razorpay_payment_id` (string, optional)
- `razorpay_order_id` (string, required)
- `amount` (number, required) - Amount in cents/paise
- `currency` (string, required)
- `status` (select, required) - "pending", "successful", "failed", "refunded"
- `payment_method` (string, optional)
- `failure_reason` (text, optional)
- `created` (datetime, auto)
- `updated` (datetime, auto)

## Future Enhancement Collections

### 17. tags (Planned)
Unified tagging system to replace JSON arrays:
- `id` (string, auto-generated)
- `name` (string, required)
- `description` (text, optional)
- `color` (string, optional) - For UI categorization
- `type` (select, required) - "service_category", "specialty", "item_category", "custom"
- `site` (relation to sites, required)
- `usage_count` (number, default: 0) - For popularity-based autocomplete
- `created` (datetime, auto)
- `updated` (datetime, auto)

### Enhanced Interfaces with Tags
Future interfaces will replace JSON tag arrays with proper relations:
- `service_tags` - Many-to-many relation between services and tags
- `vendor_tags` - Many-to-many relation between vendors and tags
- `item_tags` - Many-to-many relation between items and tags

## Default Data

### Free Plan
```json
{
  "name": "Free",
  "price": 0,
  "currency": "INR",
  "features": {
    "max_items": 1,
    "max_vendors": 1,
    "max_incoming_deliveries": 5,
    "max_service_bookings": 5,
    "max_payments": 5,
    "max_sites": 1
  },
  "is_active": true,
  "is_default": true
}
```

### Basic Plan (₹299/month)
```json
{
  "name": "Basic", 
  "price": 29900,
  "currency": "INR",
  "features": {
    "max_items": -1,
    "max_vendors": -1,
    "max_incoming_deliveries": -1,
    "max_service_bookings": -1,
    "max_payments": -1,
    "max_sites": 3
  },
  "is_active": true,
  "is_default": false
}
```

## Business Logic

### Site Management
1. **New Site Creation**: 
   - Automatically create site_subscription with Free plan
   - Create site_user record for owner
   - Initialize subscription_usage record
2. **User Role Management**:
   - Site owners can invite users and assign roles
   - Roles determine permissions (owner/supervisor/accountant)
   - Users can be deactivated without deletion

### Financial Tracking
1. **Payment Processing**:
   - Payments automatically allocated to oldest outstanding items/services
   - Account balances updated in real-time
   - Payment status automatically calculated
2. **Account Management**:
   - Multiple payment methods supported
   - Opening and current balances tracked
   - Balance recalculation available

### Subscription Management
1. **Usage Tracking**: Update subscription_usage on each create operation
2. **Limit Enforcement**: Check limits before allowing create operations
3. **Read-Only Mode**: When limits exceeded, allow only read operations
4. **Billing Cycle**: Monthly billing with automatic renewal
5. **Grace Period**: 3 days past due before account suspension
6. **Plan Upgrades**: Immediate effect with prorated billing

### Data Integrity
1. **Site Isolation**: All data strictly isolated per site
2. **Role-Based Access**: Permissions enforced at API level
3. **Audit Trail**: All operations logged with timestamps
4. **Soft Deletion**: Important records deactivated, not deleted

### Photo Management
1. **File Storage**: Photos stored in PocketBase file system
2. **Multiple Photos**: Support for multiple photos per delivery/completion
3. **File Size Limits**: Configurable limits per collection

## Migration Notes

### Deprecated Fields
1. **Site.admin_user**: Use site_users table with role='owner'
2. **Site.users**: Use site_users table for all user associations
3. **Item.quantity**: Use incoming_items delivery history for tracking
4. **Item.category**: Plan to migrate to unified tag system
5. **Service.tags**: Plan to migrate to unified tag system
6. **Vendor.tags**: Plan to migrate to unified tag system

### Planned Improvements
1. **Unified Tagging**: Replace JSON arrays with proper relational tags
2. **Enhanced Search**: Full-text search across collections
3. **Advanced Reporting**: Built-in analytics and reporting
4. **API Versioning**: Support for multiple API versions
5. **Webhooks**: External system integration capabilities