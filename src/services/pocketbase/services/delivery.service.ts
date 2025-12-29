/**
 * Delivery Service
 * Manages item deliveries from vendors
 */

import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Delivery, DeliveryItem, PaymentAllocation } from '../types';
import { mapRecordToDelivery, mapRecordToDeliveryItem } from './mappers';

// Forward reference for circular dependency
let paymentAllocationServiceRef: {
  getByDelivery: (id: string) => Promise<PaymentAllocation[]>;
} | null = null;

export function setDeliveryServiceDependencies(deps: {
  paymentAllocationService: { getByDelivery: (id: string) => Promise<PaymentAllocation[]> };
}) {
  paymentAllocationServiceRef = deps.paymentAllocationService;
}

export class DeliveryService {
  async getAll(): Promise<Delivery[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('deliveries').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,delivery_items,delivery_items.item',
      sort: '-delivery_date'
    });
    return records.map(record => mapRecordToDelivery(record));
  }

  async getById(id: string): Promise<Delivery> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const record = await pb.collection('deliveries').getOne(id, {
      filter: `site="${siteId}"`,
      expand: 'vendor,delivery_items,delivery_items.item'
    });

    // Fallback for backward compatibility
    if (!record.expand?.delivery_items && !record.delivery_items) {
      try {
        const directItems = await pb.collection('delivery_items').getFullList({
          filter: `delivery="${id}"`,
          expand: 'item'
        });
        if (directItems.length > 0) {
          record.expand = record.expand || {};
          record.expand.delivery_items = directItems;
        }
      } catch (directErr) {
        console.error('Failed direct query for delivery_items:', directErr);
      }
    }

    return mapRecordToDelivery(record);
  }

  async create(data: Omit<Delivery, 'id' | 'site' | 'created' | 'updated'>): Promise<Delivery> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create deliveries');
    }

    const record = await pb.collection('deliveries').create({
      ...data,
      site: siteId
    });
    return mapRecordToDelivery(record);
  }

  async update(id: string, data: Partial<Delivery>): Promise<Delivery> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update deliveries');
    }

    const record = await pb.collection('deliveries').update(id, data);
    return mapRecordToDelivery(record);
  }

  async delete(id: string): Promise<boolean> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete deliveries');
    }

    try {
      // First, delete all associated delivery_items
      const deliveryItems = await pb.collection('delivery_items').getFullList({
        filter: `delivery="${id}"`
      });

      for (const item of deliveryItems) {
        try {
          await pb.collection('delivery_items').delete(item.id);
        } catch (itemErr) {
          console.error('Error deleting delivery item:', itemErr);
          throw new Error('DELIVERY_ITEMS_DELETE_FAILED');
        }
      }

      await pb.collection('deliveries').delete(id);
      return true;
    } catch (err) {
      console.error('Error deleting delivery:', err);
      throw err;
    }
  }

  async uploadPhoto(deliveryId: string, file: File): Promise<string> {
    const currentRecord = await pb.collection('deliveries').getOne(deliveryId);
    const existingPhotos = currentRecord.photos || [];

    const formData = new FormData();
    existingPhotos.forEach((photoFilename: string) => {
      formData.append('photos', photoFilename);
    });
    formData.append('photos', file);

    const record = await pb.collection('deliveries').update(deliveryId, formData);
    return record.photos[record.photos.length - 1];
  }

  async uploadPhotos(deliveryId: string, files: File[]): Promise<string[]> {
    if (files.length === 0) return [];

    const currentRecord = await pb.collection('deliveries').getOne(deliveryId);
    const existingPhotos = currentRecord.photos || [];

    const formData = new FormData();
    existingPhotos.forEach((photoFilename: string) => {
      formData.append('photos', photoFilename);
    });
    files.forEach(file => {
      formData.append('photos', file);
    });

    const record = await pb.collection('deliveries').update(deliveryId, formData);
    return record.photos.slice(-files.length);
  }

  async calculatePaidAmount(deliveryId: string): Promise<number> {
    if (!paymentAllocationServiceRef) {
      throw new Error('DeliveryService dependencies not initialized');
    }
    const allocations = await paymentAllocationServiceRef.getByDelivery(deliveryId);
    return allocations.reduce((total, allocation) => total + allocation.allocated_amount, 0);
  }

  async calculatePaymentStatus(deliveryId: string, totalAmount: number): Promise<'pending' | 'partial' | 'paid'> {
    const paidAmount = await this.calculatePaidAmount(deliveryId);
    if (paidAmount === 0) return 'pending';
    if (paidAmount >= totalAmount) return 'paid';
    return 'partial';
  }
}

export const deliveryService = new DeliveryService();
