/**
 * Credit Note Usage Service
 * Manages usage/application of vendor credit notes to payments
 */

import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { CreditNoteUsage, VendorCreditNote, Payment } from '../types';
import type { RecordModel } from 'pocketbase';

// Forward references to avoid circular dependencies
let vendorCreditNoteServiceRef: { mapRecordToCreditNote: (record: any) => VendorCreditNote } | null = null;
let paymentServiceRef: { mapRecordToPayment: (record: any) => Payment } | null = null;

export function setCreditNoteUsageServiceDependencies(deps: {
  vendorCreditNoteService: { mapRecordToCreditNote: (record: any) => VendorCreditNote };
  paymentService: { mapRecordToPayment: (record: any) => Payment };
}) {
  vendorCreditNoteServiceRef = deps.vendorCreditNoteService;
  paymentServiceRef = deps.paymentService;
}

export class CreditNoteUsageService {
  async getAll(): Promise<CreditNoteUsage[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}"`,
      expand: 'credit_note,payment',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToUsage(record));
  }

  async getByCreditNote(creditNoteId: string): Promise<CreditNoteUsage[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && credit_note="${creditNoteId}"`,
      expand: 'credit_note,payment',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToUsage(record));
  }

  async getByPayment(paymentId: string): Promise<CreditNoteUsage[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && payment="${paymentId}"`,
      expand: 'credit_note,payment',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToUsage(record));
  }

  async getByVendor(vendorId: string): Promise<CreditNoteUsage[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && vendor="${vendorId}"`,
      expand: 'credit_note,payment',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToUsage(record));
  }

  async create(data: Omit<CreditNoteUsage, 'id' | 'site' | 'created' | 'updated'>): Promise<CreditNoteUsage> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create credit note usage');
    }

    // Note: Credit note balance is updated by the calling service (PaymentService)
    // to ensure proper transaction handling and avoid double updates

    const record = await pb.collection('credit_note_usage').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToUsage(record);
  }

  async delete(id: string): Promise<boolean> {
    await pb.collection('credit_note_usage').delete(id);
    return true;
  }

  async deleteByPayment(paymentId: string): Promise<void> {
    const usageRecords = await this.getByPayment(paymentId);
    for (const usage of usageRecords) {
      if (usage.id) {
        await pb.collection('credit_note_usage').delete(usage.id);
      }
    }
  }

  private mapRecordToUsage(record: RecordModel): CreditNoteUsage {
    return {
      id: record.id,
      credit_note: record.credit_note,
      used_amount: record.used_amount,
      used_date: record.used_date,
      payment: record.payment,
      vendor: record.vendor,
      description: record.description,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        credit_note: record.expand.credit_note && vendorCreditNoteServiceRef
          ? vendorCreditNoteServiceRef.mapRecordToCreditNote(record.expand.credit_note)
          : undefined,
        payment: record.expand.payment && paymentServiceRef
          ? paymentServiceRef.mapRecordToPayment(record.expand.payment)
          : undefined
      } : undefined
    };
  }
}

export const creditNoteUsageService = new CreditNoteUsageService();
