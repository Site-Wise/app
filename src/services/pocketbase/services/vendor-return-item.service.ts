import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { VendorReturnItem, DeliveryItem } from '../types';
import { mapRecordToVendorReturnItem } from './mappers';
import type { RecordModel } from 'pocketbase';

// Forward reference to deliveryItemService to avoid circular dependency
let deliveryItemServiceRef: { mapRecordToDeliveryItem: (record: RecordModel) => DeliveryItem } | null = null;

export function setVendorReturnItemServiceDependencies(deps: {
  deliveryItemService: { mapRecordToDeliveryItem: (record: RecordModel) => DeliveryItem };
}) {
  deliveryItemServiceRef = deps.deliveryItemService;
}

export class VendorReturnItemService {
  async getByReturn(vendorReturnId: string): Promise<VendorReturnItem[]> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const records = await pb.collection('vendor_return_items').getFullList({
      filter: `vendor_return="${vendorReturnId}" && site="${currentSite}"`,
      expand: 'delivery_item,delivery_item.item,delivery_item.delivery,delivery_item.delivery.vendor'
    });
    return records.map(record => this.mapRecordToVendorReturnItem(record));
  }

  async getById(id: string): Promise<VendorReturnItem> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const record = await pb.collection('vendor_return_items').getOne(id, {
      expand: 'vendor_return,delivery_item'
    });

    // Validate site access
    if (record.site !== currentSite) {
      throw new Error('Access denied: VendorReturnItem not found in current site');
    }

    return this.mapRecordToVendorReturnItem(record);
  }

  async create(data: Omit<VendorReturnItem, 'id' | 'created' | 'updated'>): Promise<VendorReturnItem> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create return items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // Ensure site is set in the data
    const dataWithSite = { ...data, site: currentSite };

    const record = await pb.collection('vendor_return_items').create(dataWithSite);
    return this.mapRecordToVendorReturnItem(record);
  }

  async update(id: string, data: Partial<VendorReturnItem>): Promise<VendorReturnItem> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update return items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // First, get the existing record to validate site access
    const existingRecord = await pb.collection('vendor_return_items').getOne(id);
    if (existingRecord.site !== currentSite) {
      throw new Error('Access denied: Cannot update return item from different site');
    }

    // Ensure site cannot be changed
    const { site, ...updateData } = data;
    if (site && site !== currentSite) {
      throw new Error('Access denied: Cannot move return item to different site');
    }

    const record = await pb.collection('vendor_return_items').update(id, updateData);
    return this.mapRecordToVendorReturnItem(record);
  }

  async delete(id: string): Promise<boolean> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete return items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // First, get the existing record to validate site access
    const existingRecord = await pb.collection('vendor_return_items').getOne(id);
    if (existingRecord.site !== currentSite) {
      throw new Error('Access denied: Cannot delete return item from different site');
    }

    await pb.collection('vendor_return_items').delete(id);
    return true;
  }

  mapRecordToDeliveryItem(record: RecordModel): DeliveryItem {
    if (!deliveryItemServiceRef) {
      throw new Error('VendorReturnItemService dependencies not initialized. Call setVendorReturnItemServiceDependencies first.');
    }
    return deliveryItemServiceRef.mapRecordToDeliveryItem(record);
  }

  private mapRecordToVendorReturnItem(record: RecordModel): VendorReturnItem {
    const baseItem = mapRecordToVendorReturnItem(record);

    // If delivery_item is expanded and we have the service, map it
    if (record.expand?.delivery_item && deliveryItemServiceRef) {
      return {
        ...baseItem,
        expand: {
          ...baseItem.expand,
          delivery_item: deliveryItemServiceRef.mapRecordToDeliveryItem(record.expand.delivery_item)
        }
      };
    }

    return baseItem;
  }
}

export const vendorReturnItemService = new VendorReturnItemService();
