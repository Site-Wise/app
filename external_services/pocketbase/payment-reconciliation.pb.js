// pb_hooks/payment-reconciliation.pb.js
// Reconciliation script to sync payment account changes to account transactions
// Can be run manually or scheduled via PocketBase cron

/**
 * Reconciles payment account changes with their related account transactions
 *
 * Process:
 * 1. Fetches all payments with their account field
 * 2. Finds related account_transaction records (where payment = payment.id)
 * 3. If transaction.account != payment.account, updates the transaction
 * 4. Recalculates balances for affected accounts
 *
 * @param {Object} app - PocketBase app instance (e.g., e.app or $app)
 * @returns {Object} - Statistics about reconciliation (fixed, errors, checked)
 */
function reconcilePaymentAccounts(app) {
  const stats = {
    checked: 0,
    fixed: 0,
    errors: 0,
    accountsRecalculated: new Set(),
    details: []
  };

  try {
    app.logger().info('Starting payment-account reconciliation...');

    // Get all payments across all sites
    const paymentsCollection = app.findCollectionByNameOrId('payments');
    const payments = app.findRecordsByFilter(
      'payments',
      '', // No filter - check all payments
      '-created', // Sort by created descending
      500, // Limit to prevent memory issues
      0
    );

    app.logger().info(`Found ${payments.length} payments to check`);

    payments.forEach((payment) => {
      try {
        stats.checked++;

        const paymentId = payment.getString('id');
        const paymentAccount = payment.getString('account');

        if (!paymentAccount) {
          // Payment has no account (fully covered by credit notes) - skip
          return;
        }

        // Find related account transaction(s)
        const transactions = app.findRecordsByFilter(
          'account_transactions',
          `payment="${paymentId}" && type="debit"`,
          '-created',
          10,
          0
        );

        if (transactions.length === 0) {
          // No transaction found - this might be a credit-note-only payment
          app.logger().warn(`Payment ${paymentId.substring(0, 8)} has no related transaction`);
          stats.details.push({
            paymentId: paymentId.substring(0, 8),
            issue: 'missing_transaction',
            action: 'skipped'
          });
          return;
        }

        // Check each transaction (usually just one)
        transactions.forEach((transaction) => {
          const transactionId = transaction.getString('id');
          const transactionAccount = transaction.getString('account');

          if (transactionAccount !== paymentAccount) {
            // Mismatch found! Fix it.
            app.logger().warn(
              `MISMATCH: Payment ${paymentId.substring(0, 8)} ` +
              `account=${paymentAccount.substring(0, 8)}, ` +
              `transaction ${transactionId.substring(0, 8)} ` +
              `account=${transactionAccount.substring(0, 8)}`
            );

            try {
              // Update the transaction to match payment
              transaction.set('account', paymentAccount);
              app.save(transaction);

              // Track both accounts for balance recalculation
              stats.accountsRecalculated.add(transactionAccount); // Old account
              stats.accountsRecalculated.add(paymentAccount);     // New account

              stats.fixed++;
              stats.details.push({
                paymentId: paymentId.substring(0, 8),
                transactionId: transactionId.substring(0, 8),
                oldAccount: transactionAccount.substring(0, 8),
                newAccount: paymentAccount.substring(0, 8),
                action: 'fixed'
              });

              app.logger().info(
                `FIXED: Updated transaction ${transactionId.substring(0, 8)} ` +
                `to match payment account ${paymentAccount.substring(0, 8)}`
              );
            } catch (updateError) {
              stats.errors++;
              stats.details.push({
                paymentId: paymentId.substring(0, 8),
                transactionId: transactionId.substring(0, 8),
                action: 'error',
                error: updateError.message
              });
              app.logger().error(
                `Error updating transaction ${transactionId.substring(0, 8)}: ${updateError.message}`
              );
            }
          }
        });
      } catch (error) {
        stats.errors++;
        app.logger().error(`Error processing payment: ${error.message}`);
      }
    });

    // Recalculate balances for all affected accounts
    if (stats.accountsRecalculated.size > 0) {
      app.logger().info(`Recalculating balances for ${stats.accountsRecalculated.size} affected accounts...`);

      stats.accountsRecalculated.forEach((accountId) => {
        try {
          recalculateAccountBalance(accountId, app);
          app.logger().info(`Recalculated balance for account ${accountId.substring(0, 8)}`);
        } catch (error) {
          app.logger().error(`Error recalculating balance for account ${accountId.substring(0, 8)}: ${error.message}`);
        }
      });
    }

    app.logger().info(
      `Reconciliation complete: Checked=${stats.checked}, ` +
      `Fixed=${stats.fixed}, Errors=${stats.errors}, ` +
      `Accounts Recalculated=${stats.accountsRecalculated.size}`
    );

  } catch (error) {
    app.logger().error(`Fatal error during reconciliation: ${error.message}`);
    stats.errors++;
  }

  return stats;
}

/**
 * Recalculates account balance from all its transactions
 *
 * @param {string} accountId - Account ID to recalculate
 * @param {Object} app - PocketBase app instance
 */
function recalculateAccountBalance(accountId, app) {
  try {
    // Get the account
    const account = app.findRecordById('accounts', accountId);
    if (!account) {
      app.logger().error(`Account ${accountId} not found`);
      return;
    }

    const openingBalance = account.getFloat('opening_balance') || 0;

    // Get all transactions for this account
    const transactions = app.findRecordsByFilter(
      'account_transactions',
      `account="${accountId}"`,
      'transaction_date,created', // Sort by date
      1000, // Should be enough for most accounts
      0
    );

    // Calculate balance: opening + credits - debits
    let balance = openingBalance;
    transactions.forEach((transaction) => {
      const type = transaction.getString('type');
      const amount = transaction.getFloat('amount') || 0;

      if (type === 'credit') {
        balance += amount;
      } else if (type === 'debit') {
        balance -= amount;
      }
    });

    // Update account balance
    account.set('current_balance', balance);
    app.save(account);

    app.logger().info(
      `Account ${accountId.substring(0, 8)} balance recalculated: ` +
      `Opening=${openingBalance}, Final=${balance}, Transactions=${transactions.length}`
    );
  } catch (error) {
    app.logger().error(`Error in recalculateAccountBalance: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Manual Trigger: Create a record in 'payment_reconciliation_requests' to run
// ============================================================================

onRecordAfterCreateRequest((e) => {
  const collection = e.record.collection().name;

  if (collection === 'payment_reconciliation_requests') {
    e.app.logger().info('Payment reconciliation requested manually');

    try {
      const stats = reconcilePaymentAccounts(e.app);

      // Update the request record with results
      e.record.set('status', 'completed');
      e.record.set('checked_count', stats.checked);
      e.record.set('fixed_count', stats.fixed);
      e.record.set('error_count', stats.errors);
      e.record.set('accounts_recalculated', stats.accountsRecalculated.size);
      e.record.set('completed_at', new Date().toISOString());

      // Store details as JSON if you want
      if (stats.details.length > 0) {
        e.record.set('details', JSON.stringify(stats.details));
      }

      e.app.logger().info('Payment reconciliation completed successfully');
    } catch (error) {
      e.record.set('status', 'failed');
      e.record.set('error_message', error.message);
      e.app.logger().error(`Payment reconciliation failed: ${error.message}`);
    }
  }
}, 'payment_reconciliation_requests');

// ============================================================================
// Cron Job: Runs automatically every hour
// ============================================================================

// PocketBase cron syntax: https://pkg.go.dev/github.com/robfig/cron
// "0 * * * *" = Every hour at minute 0
// "*/30 * * * *" = Every 30 minutes
// "0 */1 * * *" = Every 1 hour

cronAdd('payment-reconciliation-hourly', '0 * * * *', () => {
  $app.logger().info('Running scheduled payment-account reconciliation (hourly)');

  try {
    const stats = reconcilePaymentAccounts($app);

    // Log summary
    $app.logger().info(
      `Hourly reconciliation summary: ` +
      `Checked=${stats.checked}, Fixed=${stats.fixed}, Errors=${stats.errors}`
    );

    // Optionally, create a log record for auditing
    if (stats.fixed > 0 || stats.errors > 0) {
      try {
        const logsCollection = $app.findCollectionByNameOrId('payment_reconciliation_logs');
        const log = new Record(logsCollection);
        log.set('run_type', 'scheduled_hourly');
        log.set('checked_count', stats.checked);
        log.set('fixed_count', stats.fixed);
        log.set('error_count', stats.errors);
        log.set('accounts_recalculated', stats.accountsRecalculated.size);
        log.set('run_at', new Date().toISOString());

        if (stats.details.length > 0) {
          log.set('details', JSON.stringify(stats.details));
        }

        $app.save(log);
      } catch (logError) {
        $app.logger().error(`Failed to create reconciliation log: ${logError.message}`);
      }
    }
  } catch (error) {
    $app.logger().error(`Scheduled reconciliation failed: ${error.message}`);
  }
});

// Export for testing or manual use
module.exports = {
  reconcilePaymentAccounts,
  recalculateAccountBalance
};
