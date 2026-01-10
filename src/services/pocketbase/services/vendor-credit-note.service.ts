/**
 * Vendor Credit Note Service
 * Manages vendor credit notes issued from returns
 */

import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { VendorCreditNote, Vendor, VendorReturn } from '../types';
import type { RecordModel } from 'pocketbase';

export class VendorCreditNoteService {
  async getAll(): Promise<VendorCreditNote[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_credit_notes').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,return',
      sort: '-created'
    });
    return records.map(record => this.mapRecordToCreditNote(record));
  }

  async getByVendor(vendorId: string): Promise<VendorCreditNote[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_credit_notes').getFullList({
      filter: `site="${siteId}" && vendor="${vendorId}" && status="active"`,
      expand: 'vendor,return',
      sort: '-created'
    });

    // Calculate actual balance for each credit note based on usage
    const creditNotes = [];
    for (const record of records) {
      const creditNote = this.mapRecordToCreditNote(record);
      const actualBalance = await this.calculateActualBalance(creditNote.id);
      if (actualBalance > 0) {
        creditNote.balance = actualBalance;
        creditNotes.push(creditNote);
      }
    }

    return creditNotes;
  }

  async getByReturn(returnId: string): Promise<VendorCreditNote[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_credit_notes').getFullList({
      filter: `site="${siteId}" && return_id="${returnId}"`,
      expand: 'vendor,return',
      sort: '-created'
    });

    return records.map(record => this.mapRecordToCreditNote(record));
  }

  async getById(id: string): Promise<VendorCreditNote | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('vendor_credit_notes').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor,return'
      });
      const creditNote = this.mapRecordToCreditNote(record);

      // Calculate actual balance based on usage records
      creditNote.balance = await this.calculateActualBalanceFromRecord(creditNote);

      return creditNote;
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<VendorCreditNote, 'id' | 'site' | 'created' | 'updated'>): Promise<VendorCreditNote> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create credit notes');
    }

    const record = await pb.collection('vendor_credit_notes').create({
      ...data,
      site: siteId
    });
    return this.mapRecordToCreditNote(record);
  }

  async update(id: string, data: Partial<VendorCreditNote>): Promise<VendorCreditNote> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update credit notes');
    }

    const record = await pb.collection('vendor_credit_notes').update(id, data);
    return this.mapRecordToCreditNote(record);
  }

  async delete(id: string): Promise<boolean> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete credit notes');
    }

    try {
      await pb.collection('vendor_credit_notes').delete(id);
      return true;
    } catch (error) {
      console.error('Error deleting credit note:', error);
      return false;
    }
  }

  async calculateActualBalance(creditNoteId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get the credit note details directly without triggering circular call
    const record = await pb.collection('vendor_credit_notes').getOne(creditNoteId, {
      filter: `site="${siteId}"`
    });

    if (!record) return 0;

    // Get all usage records for this credit note directly from PocketBase
    const usageRecords = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && credit_note="${creditNoteId}"`,
      sort: '-created'
    });

    const totalUsed = usageRecords.reduce((sum, record) => sum + record.used_amount, 0);

    const balance = record.credit_amount - totalUsed;
    if (balance < 0) {
      console.warn(`Credit note ${creditNoteId} has negative balance: ${balance}. This indicates over-usage.`);
      return 0;
    }
    return balance;
  }

  async calculateActualBalanceFromRecord(creditNote: VendorCreditNote): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get all usage records for this credit note directly from PocketBase
    const usageRecords = await pb.collection('credit_note_usage').getFullList({
      filter: `site="${siteId}" && credit_note="${creditNote.id}"`,
      sort: '-created'
    });

    const totalUsed = usageRecords.reduce((sum, record) => sum + record.used_amount, 0);

    const balance = creditNote.credit_amount - totalUsed;
    if (balance < 0) {
      console.warn(`Credit note ${creditNote.id} has negative balance: ${balance}. This indicates over-usage.`);
      return 0;
    }
    return balance;
  }

  async updateBalance(id: string, usedAmount: number): Promise<void> {
    // Since we now calculate balance dynamically from usage records,
    // we just need to update the status based on the new calculated balance
    const creditNote = await this.getById(id);
    if (!creditNote) throw new Error('Credit note not found');

    // Calculate what the new balance would be after this usage
    const newBalance = creditNote.balance - usedAmount;

    // Update status if balance becomes zero or negative
    const status = newBalance <= 0 ? 'fully_used' : creditNote.status;
    await this.update(id, { status });
  }

  mapRecordToCreditNote(record: RecordModel): VendorCreditNote {
    return {
      id: record.id,
      vendor: record.vendor,
      credit_amount: record.credit_amount,
      balance: record.balance,
      issue_date: record.issue_date,
      expiry_date: record.expiry_date,
      reference: record.reference,
      reason: record.reason,
      return_id: record.return_id,
      status: record.status,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        return: record.expand.return ? this.mapRecordToVendorReturn(record.expand.return) : undefined
      } : undefined
    };
  }

  private mapRecordToVendor(record: RecordModel): Vendor {
    return {
      id: record.id,
      name: record.name,
      contact_person: record.contact_person,
      email: record.email,
      phone: record.phone,
      address: record.address,
      payment_details: record.payment_details,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  private mapRecordToVendorReturn(record: RecordModel): VendorReturn {
    return {
      id: record.id,
      vendor: record.vendor,
      return_date: record.return_date,
      reason: record.reason,
      status: record.status,
      notes: record.notes,
      photos: record.photos,
      approval_notes: record.approval_notes,
      approved_by: record.approved_by,
      approved_at: record.approved_at,
      total_return_amount: record.total_return_amount,
      actual_refund_amount: record.actual_refund_amount,
      completion_date: record.completion_date,
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export const vendorCreditNoteService = new VendorCreditNoteService();
