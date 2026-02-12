import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Tag } from '../types';
import { TAG_COLOR_PALETTE } from '../types';
import { mapRecordToTag } from './mappers';

export class TagService {
  async getAll(): Promise<Tag[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('tags').getFullList({
      filter: `site="${siteId}"`,
      sort: '-usage_count,name'
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

  async getBySite(siteId: string): Promise<Tag[]> {
    const records = await pb.collection('tags').getFullList({
      filter: `site="${siteId}"`,
      sort: '-usage_count,name'
    });
    return records.map(record => mapRecordToTag(record));
  }

  async getByName(name: string, siteId?: string): Promise<Tag | null> {
    const currentSiteId = siteId || getCurrentSiteId();
    if (!currentSiteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('tags').getFirstListItem(
        `name="${name}" && site="${currentSiteId}"`
      );
      return mapRecordToTag(record);
    } catch (error) {
      return null;
    }
  }

  async create(name: string, type: Tag['type'] = 'custom'): Promise<Tag> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create tags');
    }

    // Get existing tags to choose a unique color
    const existingTags = await this.getBySite(siteId);
    const color = this.getRandomColor(existingTags);

    const record = await pb.collection('tags').create({
      name: name.trim(),
      color,
      type,
      site: siteId,
      usage_count: 0
    });

    return mapRecordToTag(record);
  }

  async findOrCreate(name: string, type: Tag['type'] = 'custom'): Promise<Tag> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Try to find existing tag first
    const existingTag = await this.getByName(name, siteId);
    if (existingTag) {
      // Increment usage count
      await this.incrementUsage(existingTag.id!);
      return { ...existingTag, usage_count: existingTag.usage_count + 1 };
    }

    // Create new tag if not found
    return await this.create(name, type);
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

  async incrementUsage(id: string): Promise<void> {
    const tag = await pb.collection('tags').getOne(id);
    await pb.collection('tags').update(id, {
      usage_count: (tag.usage_count || 0) + 1
    });
  }

  private getRandomColor(existingTags: Tag[]): string {
    const usedColors = existingTags.map(tag => tag.color);
    const availableColors = TAG_COLOR_PALETTE.filter(color => !usedColors.includes(color));

    if (availableColors.length > 0) {
      // Use an unused color
      return availableColors[Math.floor(Math.random() * availableColors.length)];
    } else {
      // All colors are used, pick a random one from the palette
      return TAG_COLOR_PALETTE[Math.floor(Math.random() * TAG_COLOR_PALETTE.length)];
    }
  }
}

export const tagService = new TagService();
