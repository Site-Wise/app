/**
 * Vendor Return Service
 * Manages returns of items to vendors
 */

import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { VendorReturn } from '../types';
import { mapRecordToVendorReturn } from './mappers';
import { authService } from './auth.service';

export class VendorReturnService {
  async getAll(): Promise<VendorReturn[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_returns').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,approved_by',
      sort: '-return_date'
    });
    return records.map(record => mapRecordToVendorReturn(record));
  }

  async getById(id: string): Promise<VendorReturn | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('vendor_returns').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor,approved_by'
      });
      return mapRecordToVendorReturn(record);
    } catch (error) {
      return null;
    }
  }

  async getByVendor(vendorId: string): Promise<VendorReturn[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('vendor_returns').getFullList({
      filter: `site="${siteId}" && vendor="${vendorId}"`,
      expand: 'vendor,approved_by',
      sort: '-return_date'
    });
    return records.map(record => mapRecordToVendorReturn(record));
  }

  async create(data: Omit<VendorReturn, 'id' | 'site' | 'created' | 'updated'>): Promise<VendorReturn> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create vendor returns');
    }

    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Auto-approve returns when created
    const record = await pb.collection('vendor_returns').create({
      ...data,
      site: siteId,
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: 'Auto-approved on creation'
    });
    return mapRecordToVendorReturn(record);
  }

  async update(id: string, data: Partial<VendorReturn>): Promise<VendorReturn> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update vendor returns');
    }

    const record = await pb.collection('vendor_returns').update(id, data);
    return mapRecordToVendorReturn(record);
  }

  async approve(id: string, approvalNotes?: string): Promise<VendorReturn> {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    return this.update(id, {
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: approvalNotes
    });
  }

  async reject(id: string, rejectionNotes: string): Promise<VendorReturn> {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    return this.update(id, {
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: rejectionNotes
    });
  }

  async complete(id: string): Promise<VendorReturn> {
    const vendorReturn = await this.getById(id);
    if (!vendorReturn) throw new Error('Return not found');

    return this.update(id, {
      status: 'completed',
      completion_date: new Date().toISOString()
    });
  }

  async getReturnedQuantityForItem(deliveryItemId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const returnItems = await pb.collection('vendor_return_items').getFullList({
      filter: `delivery_item="${deliveryItemId}"`,
      expand: 'vendor_return'
    });

    return returnItems.reduce((total, item) => {
      const returnRecord = item.expand?.vendor_return;
      if (returnRecord && (returnRecord.status === 'completed' || returnRecord.status === 'approved' || returnRecord.status === 'refunded')) {
        return total + item.quantity_returned;
      }
      return total;
    }, 0);
  }

  async uploadPhoto(returnId: string, file: File): Promise<string> {
    const currentRecord = await pb.collection('vendor_returns').getOne(returnId);
    const existingPhotos = currentRecord.photos || [];

    const formData = new FormData();
    existingPhotos.forEach((photoFilename: string) => {
      formData.append('photos', photoFilename);
    });
    formData.append('photos', file);

    const record = await pb.collection('vendor_returns').update(returnId, formData);
    return record.photos[record.photos.length - 1];
  }
}

export const vendorReturnService = new VendorReturnService();
