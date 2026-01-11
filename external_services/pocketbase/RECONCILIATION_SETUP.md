# Payment-Account Reconciliation Setup

## Overview

The payment reconciliation system ensures that when a payment's account is changed, the related account transaction is automatically updated to match. This prevents data inconsistencies between payments and account transactions.

## How It Works

### The Problem
When a payment is created:
1. A `payment` record is created with an `account` field
2. An `account_transaction` record is created with the same `account` and a reference to the `payment`

If the payment's account is later changed (via admin panel or API), the transaction's account becomes out of sync.

### The Solution
The reconciliation script:
1. Checks all payments and their related transactions
2. Detects mismatches between `payment.account` and `transaction.account`
3. Updates the transaction to match the payment
4. Recalculates account balances for affected accounts

## Installation

### 1. Copy the Hook File

Copy `payment-reconciliation.pb.js` to your PocketBase `pb_hooks` directory:

```bash
cp external_services/pocketbase/payment-reconciliation.pb.js /path/to/pocketbase/pb_hooks/
```

### 2. Create Required Collections

#### Collection: `payment_reconciliation_requests`

**Purpose:** Trigger manual reconciliation runs

**Schema:**
```javascript
{
  "name": "payment_reconciliation_requests",
  "type": "base",
  "schema": [
    {
      "name": "status",
      "type": "select",
      "required": true,
      "options": {
        "values": ["pending", "completed", "failed"]
      }
    },
    {
      "name": "checked_count",
      "type": "number",
      "required": false
    },
    {
      "name": "fixed_count",
      "type": "number",
      "required": false
    },
    {
      "name": "error_count",
      "type": "number",
      "required": false
    },
    {
      "name": "accounts_recalculated",
      "type": "number",
      "required": false
    },
    {
      "name": "completed_at",
      "type": "date",
      "required": false
    },
    {
      "name": "error_message",
      "type": "text",
      "required": false
    },
    {
      "name": "details",
      "type": "json",
      "required": false
    }
  ]
}
```

#### Collection: `payment_reconciliation_logs`

**Purpose:** Log scheduled reconciliation runs (optional, for auditing)

**Schema:**
```javascript
{
  "name": "payment_reconciliation_logs",
  "type": "base",
  "schema": [
    {
      "name": "run_type",
      "type": "select",
      "required": true,
      "options": {
        "values": ["scheduled_hourly", "manual"]
      }
    },
    {
      "name": "run_at",
      "type": "date",
      "required": true
    },
    {
      "name": "checked_count",
      "type": "number",
      "required": false
    },
    {
      "name": "fixed_count",
      "type": "number",
      "required": false
    },
    {
      "name": "error_count",
      "type": "number",
      "required": false
    },
    {
      "name": "accounts_recalculated",
      "type": "number",
      "required": false
    },
    {
      "name": "details",
      "type": "json",
      "required": false
    }
  ]
}
```

### 3. Restart PocketBase

```bash
# Restart your PocketBase instance
systemctl restart pocketbase
# OR
./pocketbase serve
```

The hook will automatically load and the hourly cron job will start running.

## Usage

### Automatic (Scheduled)

The reconciliation runs **automatically every hour** (at minute 0).

You can change the schedule in `payment-reconciliation.pb.js`:

```javascript
// Current: Every hour
cronAdd('payment-reconciliation-hourly', '0 * * * *', () => { ... });

// Every 30 minutes
cronAdd('payment-reconciliation-halfhourly', '*/30 * * * *', () => { ... });

// Every 6 hours
cronAdd('payment-reconciliation-6hourly', '0 */6 * * *', () => { ... });

// Daily at 2 AM
cronAdd('payment-reconciliation-daily', '0 2 * * *', () => { ... });
```

### Manual Trigger

To run reconciliation manually, create a record in `payment_reconciliation_requests`:

**Via PocketBase Admin UI:**
1. Go to Collections > payment_reconciliation_requests
2. Click "New Record"
3. Set `status` to "pending"
4. Save

The reconciliation runs immediately and updates the record with results.

**Via API:**
```javascript
await pb.collection('payment_reconciliation_requests').create({
  status: 'pending'
});
```

**Via cURL:**
```bash
curl -X POST 'http://localhost:8090/api/collections/payment_reconciliation_requests/records' \
  -H 'Content-Type: application/json' \
  -d '{"status": "pending"}'
```

### Check Results

After running, check the request record for:
- `status`: "completed" or "failed"
- `checked_count`: Number of payments checked
- `fixed_count`: Number of mismatches fixed
- `error_count`: Number of errors
- `accounts_recalculated`: Number of account balances recalculated
- `details`: JSON array of specific fixes/errors

## Logs

Check PocketBase logs for detailed reconciliation activity:

```bash
# View real-time logs
tail -f /path/to/pocketbase/pb_data/logs/latest.log

# Search for reconciliation logs
grep "reconciliation" /path/to/pocketbase/pb_data/logs/*.log
```

**Log Examples:**

```
INFO Starting payment-account reconciliation...
WARN MISMATCH: Payment abc12345 account=xyz789, transaction def456 account=old123
INFO FIXED: Updated transaction def456 to match payment account xyz789
INFO Recalculated balance for account xyz789
INFO Reconciliation complete: Checked=150, Fixed=3, Errors=0, Accounts Recalculated=6
```

## Monitoring

### Scheduled Run Logs

If `payment_reconciliation_logs` collection exists, the system automatically logs each scheduled run that fixes issues or encounters errors.

Query recent logs:
```javascript
const recentLogs = await pb.collection('payment_reconciliation_logs')
  .getList(1, 50, {
    sort: '-run_at',
    filter: 'fixed_count > 0 || error_count > 0'
  });
```

### Alerts

You can set up alerts when mismatches are found:

```javascript
// Add to the cron job in payment-reconciliation.pb.js
if (stats.fixed > 0) {
  // Send alert (email, webhook, etc.)
  $app.logger().warn(`ALERT: ${stats.fixed} payment-account mismatches fixed automatically`);
}
```

## Troubleshooting

### Hook Not Running

**Check hook is loaded:**
```bash
grep "payment-reconciliation" /path/to/pocketbase/pb_data/logs/latest.log
```

**Verify cron syntax:**
```bash
# Should see this in logs when PocketBase starts
INFO Registered cron job: payment-reconciliation-hourly
```

### Permissions

If you get permission errors, ensure the PocketBase service account has write access to:
- `account_transactions` collection
- `accounts` collection
- `payment_reconciliation_requests` collection
- `payment_reconciliation_logs` collection (if using)

### Performance

For large databases (>10,000 payments):
- The script processes 500 payments at a time
- Consider running less frequently (every 6-12 hours)
- Monitor server load during runs
- Add pagination if needed

## Advanced Configuration

### Custom Logic

You can extend the reconciliation to handle other scenarios:

```javascript
// In payment-reconciliation.pb.js

function reconcilePaymentAccounts(app) {
  // Add your custom logic here

  // Example: Also check payment amounts match transaction amounts
  if (payment.getFloat('amount') !== transaction.getFloat('amount')) {
    app.logger().warn(`Amount mismatch detected for payment ${paymentId}`);
    // Handle amount mismatch
  }
}
```

### Webhook Notifications

Add webhook calls when issues are detected:

```javascript
if (stats.fixed > 0) {
  // Send to Slack, Discord, etc.
  const webhookUrl = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';
  // Use fetch or external API call
}
```

## Best Practices

1. **Monitor First**: Run manually a few times and check the logs before relying on automated runs
2. **Test in Dev**: Test with your actual data in a development environment first
3. **Backup**: Always backup your database before first run
4. **Review Logs**: Regularly check reconciliation logs for patterns
5. **Adjust Frequency**: Start with hourly, adjust based on your usage patterns

## Deactivation

To temporarily disable automatic reconciliation:

```javascript
// Comment out or remove the cronAdd call in payment-reconciliation.pb.js
// cronAdd('payment-reconciliation-hourly', '0 * * * *', () => { ... });
```

Or delete/rename the hook file and restart PocketBase.

## Support

For issues or questions:
1. Check PocketBase logs first
2. Review the `details` JSON in reconciliation records
3. Run manually to reproduce the issue
4. Check PocketBase hook documentation: https://pocketbase.io/docs/js-hooks/
