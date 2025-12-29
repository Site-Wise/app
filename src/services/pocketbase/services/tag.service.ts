/**
 * Tag Service
 * Manages tags for categorizing items, vendors, and services
 */

import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Tag } from '../types';
import { mapRecordToTag } from './mappers';

export class TagService {
  async getAll(): Promise<Tag[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('tags').getFullList({
      filter: `site="${siteId}"`,
      sort: '-usage_count'
    });
    return records.map(record => mapRecordToTag(record));
  }

  async getById(id: string): Promise<Tag | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('tags').getOne(id, {
        filter: `site="${siteId}"`
      });
      return mapRecordToTag(record);
    } catch (error) {
      return null;
    }
  }

  async getByType(type: Tag['type']): Promise<Tag[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('tags').getFullList({
      filter: `site="${siteId}" && type="${type}"`,
      sort: '-usage_count'
    });
    return records.map(record => mapRecordToTag(record));
  }

  async create(data: Omit<Tag, 'id' | 'site' | 'usage_count'>): Promise<Tag> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create tags');
    }

    const record = await pb.collection('tags').create({
      ...data,
      usage_count: 0,
      site: siteId
    });
    return mapRecordToTag(record);
  }

  async update(id: string, data: Partial<Tag>): Promise<Tag> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update tags');
    }

    const record = await pb.collection('tags').update(id, data);
    return mapRecordToTag(record);
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete tags');
    }

    await pb.collection('tags').delete(id);
    return true;
  }

  async incrementUsage(id: string): Promise<Tag> {
    const tag = await this.getById(id);
    if (!tag) throw new Error('Tag not found');

    return this.update(id, { usage_count: (tag.usage_count || 0) + 1 });
  }

  async findOrCreate(name: string, type: Tag['type'], color: string): Promise<Tag> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Try to find existing tag
    try {
      const record = await pb.collection('tags').getFirstListItem(
        `site="${siteId}" && name="${name}" && type="${type}"`
      );
      return mapRecordToTag(record);
    } catch (error) {
      // Tag not found, create new one
      return this.create({ name, type, color });
    }
  }
}

export const tagService = new TagService();
