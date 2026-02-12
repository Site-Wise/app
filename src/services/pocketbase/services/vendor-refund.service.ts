import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { VendorRefund, VendorReturn, AccountTransaction } from '../types';
import { mapRecordToVendorRefund } from './mappers';

// Forward references to avoid circular dependencies
let accountTransactionServiceRef: { create: (data: Omit<AccountTransaction, 'id' | 'site' | 'created' | 'updated'>) => Promise<AccountTransaction> } | null = null;
let vendorReturnServiceRef: { update: (id: string, data: Partial<VendorReturn>) => Promise<VendorReturn> } | null = null;
let authServiceRef: { currentUser: any } | null = null;

export function setVendorRefundServiceDependencies(deps: {
  accountTransactionService: { create: (data: Omit<AccountTransaction, 'id' | 'site' | 'created' | 'updated'>) => Promise<AccountTransaction> };
  vendorReturnService: { update: (id: string, data: Partial<VendorReturn>) => Promise<VendorReturn> };
  authService: { currentUser: any };
}) {
  accountTransactionServiceRef = deps.accountTransactionService;
  vendorReturnServiceRef = deps.vendorReturnService;
  authServiceRef = deps.authService;
}

export class VendorRefundService {
  async getAll(): Promise<VendorRefund[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_refunds').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor_return,vendor,account,processed_by',
      sort: '-refund_date'
    });
    return records.map(record => mapRecordToVendorRefund(record));
  }

  async getById(id: string): Promise<VendorRefund | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('vendor_refunds').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor_return,vendor,account,processed_by'
      });
      return mapRecordToVendorRefund(record);
    } catch (error) {
      return null;
    }
  }

  async getByReturn(vendorReturnId: string): Promise<VendorRefund[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_refunds').getFullList({
      filter: `site="${siteId}" && vendor_return="${vendorReturnId}"`,
      expand: 'vendor,account,processed_by'
    });
    return records.map(record => mapRecordToVendorRefund(record));
  }

  async create(data: Omit<VendorRefund, 'id' | 'site' | 'created' | 'updated'>): Promise<VendorRefund> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create refunds');
    }

    if (!accountTransactionServiceRef || !vendorReturnServiceRef || !authServiceRef) {
      throw new Error('VendorRefundService dependencies not initialized. Call setVendorRefundServiceDependencies first.');
    }

    const user = authServiceRef.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Create the refund record
    const record = await pb.collection('vendor_refunds').create({
      ...data,
      processed_by: user.id,
      site: siteId
    });

    // Create corresponding credit transaction
    const vendorName = await this.getVendorName(data.vendor);
    await accountTransactionServiceRef.create({
      account: data.account,
      type: 'credit',
      amount: data.refund_amount,
      transaction_date: data.refund_date,
      description: `Refund from ${vendorName}`,
      reference: data.reference,
      notes: data.notes,
      vendor: data.vendor,
      vendor_refund: record.id,
      transaction_category: 'refund'
    });

    // Update the vendor return status
    await vendorReturnServiceRef.update(data.vendor_return, {
      status: 'refunded',
      actual_refund_amount: data.refund_amount
    });

    return mapRecordToVendorRefund(record);
  }

  private async getVendorName(vendorId: string): Promise<string> {
    try {
      const vendor = await pb.collection('vendors').getOne(vendorId);
      return vendor.contact_person || 'Unknown Vendor';
    } catch (error) {
      return 'Unknown Vendor';
    }
  }
}

export const vendorRefundService = new VendorRefundService();
