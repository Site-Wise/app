import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { AccountTransaction } from '../types';
import { mapRecordToAccountTransaction } from './mappers';

export class AccountTransactionService {
  async getAll(): Promise<AccountTransaction[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('account_transactions').getFullList({
      filter: `site="${siteId}"`,
      expand: 'account,vendor,payment,vendor_refund',
      sort: '-transaction_date'
    });
    return records.map(record => mapRecordToAccountTransaction(record));
  }

  async getById(id: string): Promise<AccountTransaction | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('account_transactions').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'account,vendor,payment,vendor_refund,credit_note'
      });
      return mapRecordToAccountTransaction(record);
    } catch (error) {
      return null;
    }
  }

  async getByAccount(accountId: string): Promise<AccountTransaction[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('account_transactions').getFullList({
      filter: `site="${siteId}" && account="${accountId}"`,
      expand: 'account,vendor,payment,vendor_refund',
      sort: '-transaction_date'
    });
    return records.map(record => mapRecordToAccountTransaction(record));
  }

  async create(data: Omit<AccountTransaction, 'id' | 'site' | 'created' | 'updated'>): Promise<AccountTransaction> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create transactions');
    }

    const record = await pb.collection('account_transactions').create({
      ...data,
      site: siteId
    });

    // Update account balance after creating transaction
    await this.updateAccountBalance(data.account);

    return mapRecordToAccountTransaction(record);
  }

  async update(id: string, data: Partial<AccountTransaction>): Promise<AccountTransaction> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update transactions');
    }

    const record = await pb.collection('account_transactions').update(id, data);

    // Update account balance after updating transaction
    if (record.account) {
      await this.updateAccountBalance(record.account);
    }

    return mapRecordToAccountTransaction(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete transactions');
    }

    // Get the transaction to know which account to update
    const transaction = await pb.collection('account_transactions').getOne(id);

    await pb.collection('account_transactions').delete(id);

    // Update account balance after deleting transaction
    if (transaction.account) {
      await this.updateAccountBalance(transaction.account);
    }

    return true;
  }

  async deleteByPayment(paymentId: string): Promise<void> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const transactions = await pb.collection('account_transactions').getFullList({
      filter: `site="${siteId}" && payment="${paymentId}"`
    });

    const accountsToUpdate = new Set<string>();

    for (const transaction of transactions) {
      await pb.collection('account_transactions').delete(transaction.id);
      if (transaction.account) {
        accountsToUpdate.add(transaction.account);
      }
    }

    // Update account balances for all affected accounts
    for (const accountId of accountsToUpdate) {
      await this.updateAccountBalance(accountId);
    }
  }

  async calculateAccountBalance(accountId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get the account to get opening balance
    const account = await pb.collection('accounts').getOne(accountId);

    // Get all transactions for this account
    const transactions = await pb.collection('account_transactions').getFullList({
      filter: `account="${accountId}" && site="${siteId}"`
    });

    // Calculate balance: opening balance + credits - debits
    let balance = account.opening_balance || 0;

    for (const transaction of transactions) {
      if (transaction.type === 'credit') {
        balance += transaction.amount;
      } else {
        balance -= transaction.amount;
      }
    }

    return balance;
  }

  private async updateAccountBalance(accountId: string): Promise<void> {
    const newBalance = await this.calculateAccountBalance(accountId);

    await pb.collection('accounts').update(accountId, {
      current_balance: newBalance
    });
  }
}

export const accountTransactionService = new AccountTransactionService();
