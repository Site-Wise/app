import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Item } from '../types';
import { mapRecordToItem } from './mappers';

export class ItemService {
  async getAll(): Promise<Item[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('items').getFullList({
      filter: `site="${siteId}"`
    });
    return records.map(record => mapRecordToItem(record));
  }

  async getById(id: string): Promise<Item | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('items').getOne(id, {
        filter: `site="${siteId}"`
      });
      return mapRecordToItem(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<Item, 'id' | 'site'>): Promise<Item> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create items');
    }

    const record = await pb.collection('items').create({
      ...data,
      site: siteId
    });
    return mapRecordToItem(record);
  }

  async update(id: string, data: Partial<Item>): Promise<Item> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update items');
    }

    const record = await pb.collection('items').update(id, data);
    return mapRecordToItem(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete items');
    }

    await pb.collection('items').delete(id);
    return true;
  }
}

export const itemService = new ItemService();
