import type { RecordModel } from 'pocketbase';
import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { DeliveryItem, Delivery, Item } from '../types';
import { batchCreate } from '../../pocketbaseBatch';

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
    return records.map(record => this.mapRecordToDeliveryItem(record));
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
    return records.map(record => this.mapRecordToDeliveryItem(record));
  }

  async getById(id: string): Promise<DeliveryItem> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    const record = await pb.collection('delivery_items').getOne(id, {
      expand: 'delivery,item'
    });

    // Validate site access
    if (record.site !== currentSite) {
      throw new Error('Access denied: DeliveryItem not found in current site');
    }

    return this.mapRecordToDeliveryItem(record);
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

    // Ensure site is set in the data
    const dataWithSite = { ...data, site: currentSite };

    const record = await pb.collection('delivery_items').create(dataWithSite);

    // Update the parent delivery with the new item ID
    try {
      const delivery = await pb.collection('deliveries').getOne(data.delivery);
      // Validate that the delivery belongs to the current site
      if (delivery.site !== currentSite) {
        throw new Error('Access denied: Cannot create delivery item for delivery in different site');
      }
      const existingItemIds = delivery.delivery_items || [];
      await pb.collection('deliveries').update(data.delivery, {
        delivery_items: [...existingItemIds, record.id]
      });
    } catch (err) {
      console.error('Failed to update delivery with item ID:', err);
    }

    return this.mapRecordToDeliveryItem(record);
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

    // First, get the existing record to validate site access
    const existingRecord = await pb.collection('delivery_items').getOne(id);
    if (existingRecord.site !== currentSite) {
      throw new Error('Access denied: Cannot update delivery item from different site');
    }

    // Ensure site cannot be changed
    const { site, ...updateData } = data;
    if (site && site !== currentSite) {
      throw new Error('Access denied: Cannot move delivery item to different site');
    }

    const record = await pb.collection('delivery_items').update(id, updateData);
    return this.mapRecordToDeliveryItem(record);
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

    // Get the item to find its parent delivery and validate site access
    try {
      const item = await pb.collection('delivery_items').getOne(id);

      // Validate site access
      if (item.site !== currentSite) {
        throw new Error('Access denied: Cannot delete delivery item from different site');
      }

      // Delete the item
      await pb.collection('delivery_items').delete(id);

      // Update the parent delivery to remove this item ID
      if (item.delivery) {
        const delivery = await pb.collection('deliveries').getOne(item.delivery);
        // Validate that the delivery belongs to the current site
        if (delivery.site !== currentSite) {
          console.warn('Delivery site mismatch during item deletion');
        }
        const updatedItemIds = (delivery.delivery_items || []).filter((itemId: string) => itemId !== id);
        await pb.collection('deliveries').update(item.delivery, {
          delivery_items: updatedItemIds
        });
      }
    } catch (err) {
      console.error('Error deleting delivery item:', err);
      // If the item was already deleted, just return true
      if (err instanceof Error && err.message.includes('not found')) {
        return true;
      }
      throw err;
    }

    return true;
  }

  async getLastPriceForItem(itemId: string): Promise<number | null> {
    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    try {
      // Get the most recent delivery item for this item in the current site
      const records = await pb.collection('delivery_items').getList(1, 1, {
        filter: `item="${itemId}" && site="${currentSite}"`,
        sort: '-created',
      });

      if (records.items.length > 0) {
        return records.items[0].unit_price;
      }
      return null;
    } catch (err) {
      console.error('Error fetching last price for item:', err);
      return null;
    }
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  async updateMultiple(items: Array<{ id: string } & Partial<DeliveryItem>>): Promise<DeliveryItem[]> {
    const updatedItems: DeliveryItem[] = [];
    for (const item of items) {
      const { id, ...data } = item;
      const updated = await this.update(id, data);
      updatedItems.push(updated);
    }
    return updatedItems;
  }

  async createMultiple(deliveryId: string, items: Array<{
    item: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>): Promise<DeliveryItem[]> {
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create delivery items');
    }

    const currentSite = getCurrentSiteId();
    if (!currentSite) {
      throw new Error('No site selected');
    }

    // Validate that the delivery belongs to the current site
    const delivery = await pb.collection('deliveries').getOne(deliveryId);
    if (delivery.site !== currentSite) {
      throw new Error('Access denied: Cannot create delivery items for delivery in different site');
    }

    // Prepare batch data
    const batchData = items.map(itemData => ({
      delivery: deliveryId,
      item: itemData.item,
      quantity: itemData.quantity,
      unit_price: itemData.unit_price,
      total_amount: itemData.quantity * itemData.unit_price,
      notes: itemData.notes,
      site: currentSite
    }));

    // Use batch API to create all items at once
    const createdRecords = await batchCreate<any>('delivery_items', batchData);
    const createdItems = createdRecords.map(record => this.mapRecordToDeliveryItem(record as RecordModel));
    const createdItemIds = createdItems.map(item => item.id!);

    // Update the parent delivery with the new item IDs
    try {
      const existingItemIds = delivery.delivery_items || [];
      await pb.collection('deliveries').update(deliveryId, {
        delivery_items: [...existingItemIds, ...createdItemIds]
      });
    } catch (err) {
      console.error('Failed to update delivery with item IDs:', err);
      // Throw the error so the caller knows the operation failed
      throw new Error(`Failed to associate delivery items with delivery: ${err}`);
    }

    return createdItems;
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

  mapRecordToDelivery(record: RecordModel): Delivery {
    return {
      id: record.id,
      vendor: record.vendor,
      delivery_date: record.delivery_date,
      delivery_reference: record.delivery_reference,
      photos: record.photos || [],
      notes: record.notes,
      total_amount: record.total_amount,
      payment_status: record.payment_status,
      paid_amount: record.paid_amount || 0,
      site: record.site,
      created: record.created,
      updated: record.updated
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

export const deliveryItemService = new DeliveryItemService();
