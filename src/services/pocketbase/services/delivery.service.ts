import type { RecordModel } from 'pocketbase';
import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Delivery, DeliveryItem, Vendor, Item, PaymentAllocation } from '../types';

// Forward references for circular dependencies
let paymentAllocationServiceRef: {
  getByDelivery: (deliveryId: string) => Promise<PaymentAllocation[]>;
} | null = null;

export function setDeliveryServiceDependencies(deps: {
  deliveryItemService: { getByDelivery: (deliveryId: string) => Promise<DeliveryItem[]> };
  paymentAllocationService: { getByDelivery: (deliveryId: string) => Promise<PaymentAllocation[]> };
}) {
  // deliveryItemService passed for interface compatibility but items are fetched via expand
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
    return records.map(record => this.mapRecordToDelivery(record));
  }

  async getById(id: string): Promise<Delivery> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const record = await pb.collection('deliveries').getOne(id, {
      filter: `site="${siteId}"`,
      expand: 'vendor,delivery_items,delivery_items.item'
    });

    // Fallback for backward compatibility - remove after migration
    if (!record.expand?.delivery_items && !record.delivery_items) {
      try {
        const directItems = await pb.collection('delivery_items').getFullList({
          filter: `delivery="${id}"`,
          expand: 'item'
        });
        // Add the items to the expand if found
        if (directItems.length > 0) {
          record.expand = record.expand || {};
          record.expand.delivery_items = directItems;
        }
      } catch (directErr) {
        console.error('Failed direct query for delivery_items:', directErr);
      }
    }

    return this.mapRecordToDelivery(record);
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
    return this.mapRecordToDelivery(record);
  }

  async update(id: string, data: Partial<Delivery>): Promise<Delivery> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update deliveries');
    }

    const record = await pb.collection('deliveries').update(id, data);
    return this.mapRecordToDelivery(record);
  }

  async reconnectDeliveryItems(deliveryId: string): Promise<Delivery> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update deliveries');
    }

    // Find all delivery_items that point to this delivery
    const deliveryItems = await pb.collection('delivery_items').getFullList({
      filter: `delivery="${deliveryId}" && site="${siteId}"`
    });

    if (deliveryItems.length === 0) {
      throw new Error('No delivery items found to reconnect');
    }

    // Get the item IDs
    const itemIds = deliveryItems.map(item => item.id);

    // Update the delivery's delivery_items array field
    const updatedDelivery = await pb.collection('deliveries').update(deliveryId, {
      delivery_items: itemIds
    }, {
      expand: 'vendor,delivery_items,delivery_items.item'
    });

    return this.mapRecordToDelivery(updatedDelivery);
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

      // Delete each delivery item
      for (const item of deliveryItems) {
        try {
          await pb.collection('delivery_items').delete(item.id);
        } catch (itemErr) {
          console.error('Error deleting delivery item:', itemErr);
          throw new Error('DELIVERY_ITEMS_DELETE_FAILED');
        }
      }

      // Then delete the delivery itself
      try {
        await pb.collection('deliveries').delete(id);
        return true;
      } catch (deliveryErr) {
        console.error('Error deleting delivery:', deliveryErr);
        throw new Error('DELIVERY_DELETE_FAILED');
      }
    } catch (err) {
      console.error('Error deleting delivery:', err);

      // Re-throw the error so UI can handle it appropriately
      throw err;
    }
  }

  async uploadPhoto(deliveryId: string, file: File): Promise<string> {
    // First, fetch the current delivery to get existing photos
    const currentRecord = await pb.collection('deliveries').getOne(deliveryId);
    const existingPhotos = currentRecord.photos || [];

    const formData = new FormData();

    // Include existing photo filenames to preserve them
    existingPhotos.forEach((photoFilename: string) => {
      formData.append('photos', photoFilename);
    });

    // Append new file
    formData.append('photos', file);

    const record = await pb.collection('deliveries').update(deliveryId, formData);
    return record.photos[record.photos.length - 1];
  }

  async uploadPhotos(deliveryId: string, files: File[], existingPhotos: string[] = []): Promise<string[]> {
    if (files.length === 0) return [];

    const formData = new FormData();

    // Include existing photos to tell PocketBase to keep them
    existingPhotos.forEach(photo => {
      formData.append('photos', photo);
    });

    // Append new files
    files.forEach(file => {
      formData.append('photos', file);
    });

    const record = await pb.collection('deliveries').update(deliveryId, formData);
    // Return the newly added photos (last N photos where N = files.length)
    return record.photos.slice(-files.length);
  }

  async calculatePaidAmount(deliveryId: string): Promise<number> {
    if (!paymentAllocationServiceRef) {
      throw new Error('PaymentAllocationService dependency not set');
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

  mapRecordToDelivery(record: RecordModel): Delivery {
    return {
      id: record.id,
      vendor: record.vendor,
      delivery_date: record.delivery_date,
      delivery_reference: record.delivery_reference,
      photos: record.photos || [],
      notes: record.notes,
      total_amount: record.total_amount,
      payment_status: 'pending' as const, // Will be calculated when needed
      paid_amount: 0, // Will be calculated when needed
      delivery_items: record.delivery_items || [],
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? this.mapRecordToVendor(record.expand.vendor) : undefined,
        delivery_items: record.expand.delivery_items ?
          record.expand.delivery_items.map((item: RecordModel) => this.mapRecordToDeliveryItem(item)) : undefined
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
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }

  mapRecordToDeliveryItem(record: RecordModel): DeliveryItem {
    return {
      id: record.id,
      delivery: record.delivery,
      item: record.item,
      quantity: record.quantity,
      unit_price: record.unit_price,
      total_amount: record.total_amount,
      notes: record.notes,
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        delivery: record.expand.delivery ? this.mapRecordToDelivery(record.expand.delivery) : undefined,
        item: record.expand.item ? this.mapRecordToItem(record.expand.item) : undefined
      } : undefined
    };
  }

  private mapRecordToItem(record: RecordModel): Item {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      unit: record.unit,
      tags: record.tags || [],
      site: record.site,
      created: record.created,
      updated: record.updated
    };
  }
}

export const deliveryService = new DeliveryService();
