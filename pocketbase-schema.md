# PocketBase Subscription Schema Design

## Collections to Add

### 1. subscription_plans
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

### 2. site_subscriptions
Fields:
- `id` (string, auto-generated)
- `site` (relation to sites, required)
- `subscription_plan` (relation to subscription_plans, required)
- `status` (select, required) - "active", "cancelled", "expired", "past_due"
- `current_period_start` (datetime, required)
- `current_period_end` (datetime, required) 
- `razorpay_subscription_id` (string, optional) - Razorpay subscription ID
- `razorpay_customer_id` (string, optional) - Razorpay customer ID
- `cancel_at_period_end` (boolean, default: false)
- `cancelled_at` (datetime, optional)
- `trial_end` (datetime, optional)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### 3. subscription_usage
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

### 4. payment_transactions
Fields:
- `id` (string, auto-generated)
- `site_subscription` (relation to site_subscriptions, required)
- `razorpay_payment_id` (string, required)
- `razorpay_order_id` (string, required)
- `amount` (number, required) - Amount in cents/paise
- `currency` (string, required)
- `status` (select, required) - "pending", "successful", "failed", "refunded"
- `payment_method` (string, optional)
- `failure_reason` (text, optional)
- `created` (datetime, auto)
- `updated` (datetime, auto)

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

1. **New Site Creation**: Automatically create a site_subscription with Free plan
2. **Usage Tracking**: Update subscription_usage on each create operation
3. **Limit Enforcement**: Check limits before allowing create operations
4. **Read-Only Mode**: When limits exceeded, allow only read operations
5. **Billing Cycle**: Monthly billing with automatic renewal
6. **Grace Period**: 3 days past due before account suspension