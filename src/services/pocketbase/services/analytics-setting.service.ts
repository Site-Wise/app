import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { AnalyticsSetting, AnalyticsResult } from '../types';
import { mapRecordToAnalyticsSetting } from './mappers';

export class AnalyticsSettingService {
  async getAll(): Promise<AnalyticsSetting[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('analytics_settings').getFullList({
      filter: `site="${siteId}"`,
      sort: '-updated'
    });
    return records.map(record => mapRecordToAnalyticsSetting(record));
  }

  async getById(id: string): Promise<AnalyticsSetting | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('analytics_settings').getOne(id, {
        filter: `site="${siteId}"`
      });
      return mapRecordToAnalyticsSetting(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: Omit<AnalyticsSetting, 'id' | 'site' | 'created' | 'updated'>): Promise<AnalyticsSetting> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create analytics settings');
    }

    const record = await pb.collection('analytics_settings').create({
      ...data,
      site: siteId,
      // Ensure tag_ids is properly serialized as JSON
      tag_ids: data.tag_ids || []
    });
    return mapRecordToAnalyticsSetting(record);
  }

  async update(id: string, data: Partial<AnalyticsSetting>): Promise<AnalyticsSetting> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canUpdate) {
      throw new Error('Permission denied: Cannot update analytics settings');
    }

    // Verify ownership before update
    const existing = await this.getById(id);
    if (!existing || existing.site !== siteId) {
      throw new Error('Access denied: Cannot update analytics setting from different site');
    }

    const record = await pb.collection('analytics_settings').update(id, {
      ...data,
      // Ensure tag_ids is properly serialized if provided
      tag_ids: data.tag_ids !== undefined ? data.tag_ids : undefined
    });
    return mapRecordToAnalyticsSetting(record);
  }

  async delete(id: string): Promise<boolean> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete analytics settings');
    }

    // Verify ownership before delete
    const existing = await this.getById(id);
    if (!existing || existing.site !== siteId) {
      throw new Error('Access denied: Cannot delete analytics setting from different site');
    }

    await pb.collection('analytics_settings').delete(id);
    return true;
  }

  /**
   * Calculate analytics based on filter criteria
   */
  async calculateAnalytics(filters: {
    tagIds?: string[];
    dateFrom?: string;
    dateTo?: string;
    amountMin?: number;
    amountMax?: number;
  }): Promise<AnalyticsResult> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Build filter conditions
    const filterConditions: string[] = [`site="${siteId}"`];

    // Get all delivery items with expanded relations
    let deliveryItems = await pb.collection('delivery_items').getFullList({
      filter: filterConditions.join(' && '),
      expand: 'item,delivery,item.tags',
      sort: '-created'
    });

    // Filter by tags if specified
    if (filters.tagIds && filters.tagIds.length > 0) {
      deliveryItems = deliveryItems.filter(record => {
        const item = record.expand?.item;
        if (!item || !item.tags) return false;

        const itemTags = Array.isArray(item.tags) ? item.tags : [];
        return filters.tagIds!.some(tagId => itemTags.includes(tagId));
      });
    }

    // Filter by date range if specified
    if (filters.dateFrom || filters.dateTo) {
      deliveryItems = deliveryItems.filter(record => {
        const delivery = record.expand?.delivery;
        if (!delivery || !delivery.delivery_date) return false;

        const deliveryDate = new Date(delivery.delivery_date);
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          if (deliveryDate < fromDate) return false;
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          if (deliveryDate > toDate) return false;
        }
        return true;
      });
    }

    // Filter by amount range if specified
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      deliveryItems = deliveryItems.filter(record => {
        const amount = record.total_amount || 0;
        if (filters.amountMin !== undefined && amount < filters.amountMin) return false;
        if (filters.amountMax !== undefined && amount > filters.amountMax) return false;
        return true;
      });
    }

    // Calculate metrics
    const totalCost = deliveryItems.reduce((sum, record) => sum + (record.total_amount || 0), 0);
    const totalQuantity = deliveryItems.reduce((sum, record) => sum + (record.quantity || 0), 0);

    const uniqueItems = new Set(deliveryItems.map(record => record.item));
    const uniqueDeliveries = new Set(deliveryItems.map(record => record.delivery));

    const itemCount = uniqueItems.size;
    const deliveryCount = uniqueDeliveries.size;

    const averageCostPerItem = itemCount > 0 ? totalCost / itemCount : 0;
    const averageCostPerDelivery = deliveryCount > 0 ? totalCost / deliveryCount : 0;

    // Calculate cost by tag
    const costByTagMap = new Map<string, { tagName: string; cost: number }>();

    for (const record of deliveryItems) {
      const item = record.expand?.item;
      if (item && item.tags) {
        const itemTags = Array.isArray(item.tags) ? item.tags : [];
        const expandedTags = item.expand?.tags || [];

        for (const tagId of itemTags) {
          const tag = expandedTags.find((t: any) => t.id === tagId);
          const tagName = tag?.name || 'Unknown';

          const existing = costByTagMap.get(tagId) || { tagName, cost: 0 };
          existing.cost += record.total_amount || 0;
          costByTagMap.set(tagId, existing);
        }
      }
    }

    const costByTag = Array.from(costByTagMap.entries()).map(([tagId, data]) => ({
      tagId,
      tagName: data.tagName,
      cost: data.cost
    }));

    // Calculate cost over time (grouped by date)
    const costByDateMap = new Map<string, number>();

    for (const record of deliveryItems) {
      const delivery = record.expand?.delivery;
      if (delivery && delivery.delivery_date) {
        const date = delivery.delivery_date.split('T')[0]; // Get date part only
        const existing = costByDateMap.get(date) || 0;
        costByDateMap.set(date, existing + (record.total_amount || 0));
      }
    }

    const costOverTime = Array.from(costByDateMap.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate cost over time by tag (for multi-tag trajectory analysis)
    const costByDateByTagMap = new Map<string, { tagName: string; dateMap: Map<string, number> }>();

    for (const record of deliveryItems) {
      const delivery = record.expand?.delivery;
      const item = record.expand?.item;

      if (delivery && delivery.delivery_date && item && item.tags) {
        const date = delivery.delivery_date.split('T')[0]; // Get date part only
        const itemTags = Array.isArray(item.tags) ? item.tags : [];
        const expandedTags = item.expand?.tags || [];
        const amount = record.total_amount || 0;

        for (const tagId of itemTags) {
          const tag = expandedTags.find((t: any) => t.id === tagId);
          const tagName = tag?.name || 'Unknown';

          if (!costByDateByTagMap.has(tagId)) {
            costByDateByTagMap.set(tagId, { tagName, dateMap: new Map<string, number>() });
          }

          const tagData = costByDateByTagMap.get(tagId)!;
          const existingCost = tagData.dateMap.get(date) || 0;
          tagData.dateMap.set(date, existingCost + amount);
        }
      }
    }

    const costOverTimeByTag = Array.from(costByDateByTagMap.entries())
      .map(([tagId, tagData]) => ({
        tagId,
        tagName: tagData.tagName,
        data: Array.from(tagData.dateMap.entries())
          .map(([date, cost]) => ({ date, cost }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }))
      .sort((a, b) => a.tagName.localeCompare(b.tagName));

    // Calculate quantity by unit (aggregated by item unit)
    const quantityByUnitMap = new Map<string, { quantity: number; itemIds: Set<string> }>();

    for (const record of deliveryItems) {
      const item = record.expand?.item;
      if (item && item.unit) {
        const unit = item.unit;
        const quantity = record.quantity || 0;
        const itemId = record.item;

        const existing = quantityByUnitMap.get(unit) || { quantity: 0, itemIds: new Set<string>() };
        existing.quantity += quantity;
        existing.itemIds.add(itemId);
        quantityByUnitMap.set(unit, existing);
      }
    }

    const quantityByUnit = Array.from(quantityByUnitMap.entries())
      .map(([unit, data]) => ({
        unit,
        quantity: data.quantity,
        itemCount: data.itemIds.size
      }))
      .sort((a, b) => b.quantity - a.quantity); // Sort by quantity descending

    return {
      totalCost,
      averageCostPerItem,
      averageCostPerDelivery,
      itemCount,
      deliveryCount,
      totalQuantity,
      quantityByUnit,
      costByTag,
      costOverTime,
      costOverTimeByTag
    };
  }
}

export const analyticsSettingService = new AnalyticsSettingService();
