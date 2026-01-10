import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Quotation } from '../types';
import { mapRecordToQuotation } from './mappers';

export class QuotationService {
  async getAll(): Promise<Quotation[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('quotations').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,item,service'
    });
    return records.map(record => mapRecordToQuotation(record));
  }

  async getById(id: string): Promise<Quotation | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('quotations').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor,item,service'
      });
      return mapRecordToQuotation(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<Quotation, 'id' | 'site'>): Promise<Quotation> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create quotations');
    }

    const record = await pb.collection('quotations').create({
      ...data,
      site: siteId
    });
    return mapRecordToQuotation(record);
  }

  async update(id: string, data: Partial<Quotation>): Promise<Quotation> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update quotations');
    }

    const record = await pb.collection('quotations').update(id, data);
    return mapRecordToQuotation(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete quotations');
    }

    await pb.collection('quotations').delete(id);
    return true;
  }
}

export const quotationService = new QuotationService();
