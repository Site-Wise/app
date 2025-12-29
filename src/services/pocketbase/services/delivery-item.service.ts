/**
 * Delivery Item Service
 * Manages individual items within deliveries
 */

import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { DeliveryItem } from '../types';
import { mapRecordToDeliveryItem } from './mappers';

export class DeliveryItemService {
  async getByDelivery(deliveryId: string): Promise<DeliveryItem[]> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const records = await pb.collection('delivery_items').getFullList({
      filter: `delivery="${deliveryId}" && site="${currentSite}"`,
      expand: 'delivery,item'
    });
    return records.map(record => mapRecordToDeliveryItem(record));
  }

  async getAll(vendorFilter?: string): Promise<DeliveryItem[]> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    let filter = `site="${currentSite}"`;
    if (vendorFilter) {
      filter += ` && delivery.vendor="${vendorFilter}"`;
    }

    const records = await pb.collection('delivery_items').getFullList({
      filter,
      expand: 'delivery,delivery.vendor,item',
      sort: '-created'
    });
    return records.map(record => mapRecordToDeliveryItem(record));
  }

  async getById(id: string): Promise<DeliveryItem> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const record = await pb.collection('delivery_items').getOne(id, {
      expand: 'delivery,item'
    });

    if (record.site !== currentSite) {
      throw new Error('Access denied: DeliveryItem not found in current site');
    }

    return mapRecordToDeliveryItem(record);
  }

  async create(data: Omit<DeliveryItem, 'id' | 'created' | 'updated'>): Promise<DeliveryItem> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const dataWithSite = { ...data, site: currentSite };
    const record = await pb.collection('delivery_items').create(dataWithSite);
    return mapRecordToDeliveryItem(record);
  }

  async update(id: string, data: Partial<DeliveryItem>): Promise<DeliveryItem> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const existingRecord = await pb.collection('delivery_items').getOne(id);
    if (existingRecord.site !== currentSite) {
      throw new Error('Access denied: Cannot update delivery item from different site');
    }

    const { site, ...updateData } = data;
    if (site && site !== currentSite) {
      throw new Error('Access denied: Cannot move delivery item to different site');
    }

    const record = await pb.collection('delivery_items').update(id, updateData);
    return mapRecordToDeliveryItem(record);
  }

  async delete(id: string): Promise<boolean> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const existingRecord = await pb.collection('delivery_items').getOne(id);
    if (existingRecord.site !== currentSite) {
      throw new Error('Access denied: Cannot delete delivery item from different site');
    }

    await pb.collection('delivery_items').delete(id);
    return true;
  }
}

export const deliveryItemService = new DeliveryItemService();
