import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { VendorReturn } from '../types';
import { mapRecordToVendorReturn } from './mappers';

// Forward reference to authService to avoid circular dependency
let authServiceRef: { currentUser: any } | null = null;

export function setVendorReturnServiceDependencies(deps: {
  authService: { currentUser: any };
}) {
  authServiceRef = deps.authService;
}

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

    if (!authServiceRef) {
      throw new Error('VendorReturnService dependencies not initialized. Call setVendorReturnServiceDependencies first.');
    }

    const user = authServiceRef.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Auto-approve returns when created (as per user requirement)
    const record = await pb.collection('vendor_returns').create({
      ...data,
      site: siteId,
      status: 'approved', // Auto-approve returns
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
    if (!authServiceRef) {
      throw new Error('VendorReturnService dependencies not initialized. Call setVendorReturnServiceDependencies first.');
    }

    const user = authServiceRef.currentUser;
    if (!user) throw new Error('User not authenticated');

    return this.update(id, {
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: approvalNotes
    });
  }

  async reject(id: string, rejectionNotes: string): Promise<VendorReturn> {
    if (!authServiceRef) {
      throw new Error('VendorReturnService dependencies not initialized. Call setVendorReturnServiceDependencies first.');
    }

    const user = authServiceRef.currentUser;
    if (!user) throw new Error('User not authenticated');

    return this.update(id, {
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: rejectionNotes
    });
  }

  async complete(id: string): Promise<VendorReturn> {
    // Get the return and its items to adjust inventory
    const vendorReturn = await this.getById(id);
    if (!vendorReturn) throw new Error('Return not found');

    // For each return item, we could implement inventory adjustments here
    // In a real system, this would update available quantities or create adjustment records
    // For now, we'll just complete the return
    // TODO: Implement inventory adjustments using vendorReturnItemService.getByReturn(id)

    return this.update(id, {
      status: 'completed',
      completion_date: new Date().toISOString()
    });
  }

  async getReturnedQuantityForItem(deliveryItemId: string): Promise<number> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get all return items for this delivery item
    const returnItems = await pb.collection('vendor_return_items').getFullList({
      filter: `delivery_item="${deliveryItemId}"`,
      expand: 'vendor_return'
    });

    // Sum up quantities for completed/approved returns
    return returnItems.reduce((total, item) => {
      const returnRecord = item.expand?.vendor_return;
      if (returnRecord && (returnRecord.status === 'completed' || returnRecord.status === 'approved' || returnRecord.status === 'refunded')) {
        return total + item.quantity_returned;
      }
      return total;
    }, 0);
  }

  async canReturnItem(deliveryItemId: string, requestedQuantity: number): Promise<{ canReturn: boolean; availableQuantity: number; message?: string }> {
    try {
      // Get the original delivery item
      const deliveryItem = await pb.collection('delivery_items').getOne(deliveryItemId);
      const originalQuantity = deliveryItem.quantity;

      // Get already returned quantity
      const returnedQuantity = await this.getReturnedQuantityForItem(deliveryItemId);
      const availableQuantity = originalQuantity - returnedQuantity;

      if (availableQuantity <= 0) {
        return {
          canReturn: false,
          availableQuantity: 0,
          message: 'This item has already been fully returned'
        };
      }

      if (requestedQuantity > availableQuantity) {
        return {
          canReturn: false,
          availableQuantity,
          message: `Only ${availableQuantity} units available for return (${returnedQuantity} already returned)`
        };
      }

      return {
        canReturn: true,
        availableQuantity
      };
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      return {
        canReturn: false,
        availableQuantity: 0,
        message: 'Error checking return eligibility'
      };
    }
  }

  async getReturnInfoForDeliveryItem(deliveryItemId: string): Promise<{
    totalReturned: number;
    availableForReturn: number;
    returns: Array<{
      id: string;
      returnDate: string;
      quantityReturned: number;
      status: string;
      reason: string;
    }>;
  }> {
    try {
      // Get the original delivery item
      const deliveryItem = await pb.collection('delivery_items').getOne(deliveryItemId);
      const originalQuantity = deliveryItem.quantity;

      // Get all return items for this delivery item
      const returnItems = await pb.collection('vendor_return_items').getFullList({
        filter: `delivery_item="${deliveryItemId}"`,
        expand: 'vendor_return',
        sort: '-created'
      });

      let totalReturned = 0;
      const returns = [];

      for (const item of returnItems) {
        const returnRecord = item.expand?.vendor_return;
        if (returnRecord) {
          // Count quantities for completed/approved returns towards total returned
          if (returnRecord.status === 'completed' || returnRecord.status === 'approved' || returnRecord.status === 'refunded') {
            totalReturned += item.quantity_returned;
          }

          returns.push({
            id: returnRecord.id,
            returnDate: returnRecord.return_date,
            quantityReturned: item.quantity_returned,
            status: returnRecord.status,
            reason: returnRecord.reason
          });
        }
      }

      return {
        totalReturned,
        availableForReturn: Math.max(0, originalQuantity - totalReturned),
        returns
      };
    } catch (error) {
      console.error('Error getting return info for delivery item:', error);
      return {
        totalReturned: 0,
        availableForReturn: 0,
        returns: []
      };
    }
  }

  async uploadPhoto(returnId: string, file: File): Promise<string> {
    // First, fetch the current return to get existing photos
    const currentRecord = await pb.collection('vendor_returns').getOne(returnId);
    const existingPhotos = currentRecord.photos || [];

    const formData = new FormData();

    // Include existing photo filenames to preserve them
    existingPhotos.forEach((photoFilename: string) => {
      formData.append('photos', photoFilename);
    });

    // Append new file
    formData.append('photos', file);

    const record = await pb.collection('vendor_returns').update(returnId, formData);
    return record.photos[record.photos.length - 1];
  }
}

export const vendorReturnService = new VendorReturnService();
