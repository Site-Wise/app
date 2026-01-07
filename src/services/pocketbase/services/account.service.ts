/**
 * Account Service
 * Manages financial accounts (bank accounts, cash accounts, etc.)
 */

import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Account } from '../types';
import { mapRecordToAccount } from './mappers';

// Forward reference for accountTransactionService to avoid circular dependency
let accountTransactionServiceRef: {
  calculateAccountBalance: (accountId: string) => Promise<number>;
} | null = null;

export function setAccountTransactionServiceRef(service: typeof accountTransactionServiceRef) {
  accountTransactionServiceRef = service;
}

export class AccountService {
  async getAll(): Promise<Account[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('accounts').getFullList({
      filter: `site="${siteId}"`
    });
    return records.map(record => mapRecordToAccount(record));
  }

  async getById(id: string): Promise<Account | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('accounts').getOne(id, {
        filter: `site="${siteId}"`
      });
      return mapRecordToAccount(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<Account, 'id' | 'site' | 'current_balance'>): Promise<Account> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create accounts');
    }

    const record = await pb.collection('accounts').create({
      ...data,
      current_balance: data.opening_balance, // Initialize current balance with opening balance
      site: siteId
    });
    return mapRecordToAccount(record);
  }

  async update(id: string, data: Partial<Account>): Promise<Account> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update accounts');
    }

    const record = await pb.collection('accounts').update(id, data);
    return mapRecordToAccount(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete accounts');
    }

    await pb.collection('accounts').delete(id);
    return true;
  }

  async updateBalance(id: string, _amount: number, _operation: 'add' | 'subtract'): Promise<Account> {
    // Deprecated: Use AccountTransactionService instead
    // This method is kept for backward compatibility but calculates balance from transactions
    if (!accountTransactionServiceRef) {
      throw new Error('AccountTransactionService not initialized');
    }
    const newBalance = await accountTransactionServiceRef.calculateAccountBalance(id);
    return this.update(id, { current_balance: newBalance });
  }

  async recalculateBalance(id: string): Promise<Account> {
    const account = await this.getById(id);
    if (!account) throw new Error('Account not found');

    // Calculate balance from account transactions instead of payments
    if (!accountTransactionServiceRef) {
      throw new Error('AccountTransactionService not initialized');
    }
    const newBalance = await accountTransactionServiceRef.calculateAccountBalance(id);

    return this.update(id, { current_balance: newBalance });
  }
}

export const accountService = new AccountService();
