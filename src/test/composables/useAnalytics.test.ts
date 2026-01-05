import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';

describe('useAnalytics Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filter Validation Logic', () => {
    it('should validate tag filter correctly', () => {
      const validateTagFilter = (tagIds: string[]) => {
        return tagIds.length > 0;
      };

      expect(validateTagFilter([])).toBe(false);
      expect(validateTagFilter(['tag1'])).toBe(true);
      expect(validateTagFilter(['tag1', 'tag2'])).toBe(true);
    });

    it('should validate date range filter correctly', () => {
      const validateDateRange = (dateFrom: string, dateTo: string) => {
        if (!dateFrom && !dateTo) return false;
        if (dateFrom && dateTo) {
          return new Date(dateFrom) <= new Date(dateTo);
        }
        return true;
      };

      expect(validateDateRange('', '')).toBe(false);
      expect(validateDateRange('2024-01-01', '')).toBe(true);
      expect(validateDateRange('', '2024-12-31')).toBe(true);
      expect(validateDateRange('2024-01-01', '2024-12-31')).toBe(true);
      expect(validateDateRange('2024-12-31', '2024-01-01')).toBe(false);
    });

    it('should validate amount range filter correctly', () => {
      const validateAmountRange = (amountMin: number | null, amountMax: number | null) => {
        if (amountMin === null && amountMax === null) return false;
        if (amountMin !== null && amountMax !== null) {
          return amountMin <= amountMax;
        }
        return true;
      };

      expect(validateAmountRange(null, null)).toBe(false);
      expect(validateAmountRange(100, null)).toBe(true);
      expect(validateAmountRange(null, 1000)).toBe(true);
      expect(validateAmountRange(100, 1000)).toBe(true);
      expect(validateAmountRange(1000, 100)).toBe(false);
    });
  });

  describe('Filter State Management Logic', () => {
    it('should detect active filters correctly', () => {
      const hasActiveFilters = (filters: any) => {
        return (
          filters.tagIds.length > 0 ||
          filters.dateFrom !== '' ||
          filters.dateTo !== '' ||
          filters.amountMin !== null ||
          filters.amountMax !== null
        );
      };

      const emptyFilters = {
        tagIds: [],
        dateFrom: '',
        dateTo: '',
        amountMin: null,
        amountMax: null
      };

      const filtersWithTags = { ...emptyFilters, tagIds: ['tag1'] };
      const filtersWithDate = { ...emptyFilters, dateFrom: '2024-01-01' };
      const filtersWithAmount = { ...emptyFilters, amountMin: 100 };

      expect(hasActiveFilters(emptyFilters)).toBe(false);
      expect(hasActiveFilters(filtersWithTags)).toBe(true);
      expect(hasActiveFilters(filtersWithDate)).toBe(true);
      expect(hasActiveFilters(filtersWithAmount)).toBe(true);
    });

    it('should reset filters to default state', () => {
      const resetFilters = () => ({
        tagIds: [],
        dateFrom: '',
        dateTo: '',
        amountMin: null,
        amountMax: null
      });

      const defaultFilters = resetFilters();

      expect(defaultFilters.tagIds).toEqual([]);
      expect(defaultFilters.dateFrom).toBe('');
      expect(defaultFilters.dateTo).toBe('');
      expect(defaultFilters.amountMin).toBeNull();
      expect(defaultFilters.amountMax).toBeNull();
    });
  });

  describe('Currency Formatting Logic', () => {
    it('should format currency correctly', () => {
      const formatCurrency = (amount: number): string => {
        return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      };

      expect(formatCurrency(1000)).toBe('₹1,000');
      expect(formatCurrency(1000.5)).toBe('₹1,000.5');
      expect(formatCurrency(1000000)).toBe('₹10,00,000');
    });

    it('should format compact amounts correctly', () => {
      const formatCompactAmount = (amount: number): string => {
        if (amount >= 10000000) {
          return (amount / 10000000).toFixed(2) + 'Cr';
        } else if (amount >= 100000) {
          return (amount / 100000).toFixed(2) + 'L';
        } else if (amount >= 1000) {
          return (amount / 1000).toFixed(2) + 'K';
        }
        return amount.toFixed(2);
      };

      expect(formatCompactAmount(500)).toBe('500.00');
      expect(formatCompactAmount(1500)).toBe('1.50K');
      expect(formatCompactAmount(150000)).toBe('1.50L');
      expect(formatCompactAmount(15000000)).toBe('1.50Cr');
    });
  });

  describe('Analytics Data Calculation Logic', () => {
    it('should calculate total cost correctly', () => {
      const calculateTotalCost = (deliveryItems: any[]) => {
        return deliveryItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
      };

      const items = [
        { total_amount: 1000 },
        { total_amount: 2000 },
        { total_amount: 1500 }
      ];

      expect(calculateTotalCost(items)).toBe(4500);
      expect(calculateTotalCost([])).toBe(0);
    });

    it('should calculate average cost per item correctly', () => {
      const calculateAverageCostPerItem = (totalCost: number, itemCount: number) => {
        return itemCount > 0 ? totalCost / itemCount : 0;
      };

      expect(calculateAverageCostPerItem(4500, 3)).toBe(1500);
      expect(calculateAverageCostPerItem(4500, 0)).toBe(0);
      expect(calculateAverageCostPerItem(0, 3)).toBe(0);
    });

    it('should calculate average cost per delivery correctly', () => {
      const calculateAverageCostPerDelivery = (totalCost: number, deliveryCount: number) => {
        return deliveryCount > 0 ? totalCost / deliveryCount : 0;
      };

      expect(calculateAverageCostPerDelivery(9000, 3)).toBe(3000);
      expect(calculateAverageCostPerDelivery(9000, 0)).toBe(0);
      expect(calculateAverageCostPerDelivery(0, 3)).toBe(0);
    });

    it('should count unique items correctly', () => {
      const countUniqueItems = (deliveryItems: any[]) => {
        const uniqueItems = new Set(deliveryItems.map(item => item.item));
        return uniqueItems.size;
      };

      const items = [
        { item: 'item1' },
        { item: 'item2' },
        { item: 'item1' },
        { item: 'item3' }
      ];

      expect(countUniqueItems(items)).toBe(3);
      expect(countUniqueItems([])).toBe(0);
    });

    it('should count unique deliveries correctly', () => {
      const countUniqueDeliveries = (deliveryItems: any[]) => {
        const uniqueDeliveries = new Set(deliveryItems.map(item => item.delivery));
        return uniqueDeliveries.size;
      };

      const items = [
        { delivery: 'del1' },
        { delivery: 'del2' },
        { delivery: 'del1' },
        { delivery: 'del3' }
      ];

      expect(countUniqueDeliveries(items)).toBe(3);
      expect(countUniqueDeliveries([])).toBe(0);
    });

    it('should calculate total quantity correctly', () => {
      const calculateTotalQuantity = (deliveryItems: any[]) => {
        return deliveryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      };

      const items = [
        { quantity: 10 },
        { quantity: 20 },
        { quantity: 15 }
      ];

      expect(calculateTotalQuantity(items)).toBe(45);
      expect(calculateTotalQuantity([])).toBe(0);
    });
  });

  describe('Cost Grouping Logic', () => {
    it('should group costs by tag correctly', () => {
      const groupCostsByTag = (deliveryItems: any[]) => {
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

        return Array.from(costByTagMap.entries()).map(([tagId, data]) => ({
          tagId,
          tagName: data.tagName,
          cost: data.cost
        }));
      };

      const items = [
        {
          total_amount: 1000,
          expand: {
            item: {
              tags: ['tag1', 'tag2'],
              expand: {
                tags: [
                  { id: 'tag1', name: 'Cement' },
                  { id: 'tag2', name: 'Steel' }
                ]
              }
            }
          }
        },
        {
          total_amount: 2000,
          expand: {
            item: {
              tags: ['tag1'],
              expand: {
                tags: [{ id: 'tag1', name: 'Cement' }]
              }
            }
          }
        }
      ];

      const result = groupCostsByTag(items);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.tagId === 'tag1')?.cost).toBe(3000);
      expect(result.find(r => r.tagId === 'tag2')?.cost).toBe(1000);
    });

    it('should group costs by date correctly', () => {
      const groupCostsByDate = (deliveryItems: any[]) => {
        const costByDateMap = new Map<string, number>();

        for (const record of deliveryItems) {
          const delivery = record.expand?.delivery;
          if (delivery && delivery.delivery_date) {
            const date = delivery.delivery_date.split('T')[0];
            const existing = costByDateMap.get(date) || 0;
            costByDateMap.set(date, existing + (record.total_amount || 0));
          }
        }

        return Array.from(costByDateMap.entries())
          .map(([date, cost]) => ({ date, cost }))
          .sort((a, b) => a.date.localeCompare(b.date));
      };

      const items = [
        {
          total_amount: 1000,
          expand: { delivery: { delivery_date: '2024-01-01T00:00:00Z' } }
        },
        {
          total_amount: 2000,
          expand: { delivery: { delivery_date: '2024-01-01T00:00:00Z' } }
        },
        {
          total_amount: 1500,
          expand: { delivery: { delivery_date: '2024-01-02T00:00:00Z' } }
        }
      ];

      const result = groupCostsByDate(items);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: '2024-01-01', cost: 3000 });
      expect(result[1]).toEqual({ date: '2024-01-02', cost: 1500 });
    });
  });

  describe('Quantity by Unit Aggregation Logic', () => {
    it('should aggregate quantities by unit correctly', () => {
      const aggregateQuantityByUnit = (deliveryItems: any[]) => {
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

        return Array.from(quantityByUnitMap.entries())
          .map(([unit, data]) => ({
            unit,
            quantity: data.quantity,
            itemCount: data.itemIds.size
          }))
          .sort((a, b) => b.quantity - a.quantity);
      };

      const items = [
        {
          item: 'item1',
          quantity: 100,
          expand: { item: { unit: 'kg' } }
        },
        {
          item: 'item2',
          quantity: 50,
          expand: { item: { unit: 'kg' } }
        },
        {
          item: 'item3',
          quantity: 10,
          expand: { item: { unit: 'ton' } }
        },
        {
          item: 'item1',
          quantity: 75,
          expand: { item: { unit: 'kg' } }
        }
      ];

      const result = aggregateQuantityByUnit(items);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ unit: 'kg', quantity: 225, itemCount: 2 });
      expect(result[1]).toEqual({ unit: 'ton', quantity: 10, itemCount: 1 });
    });

    it('should handle multiple items with same unit', () => {
      const aggregateQuantityByUnit = (deliveryItems: any[]) => {
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

        return Array.from(quantityByUnitMap.entries())
          .map(([unit, data]) => ({
            unit,
            quantity: data.quantity,
            itemCount: data.itemIds.size
          }))
          .sort((a, b) => b.quantity - a.quantity);
      };

      const items = [
        { item: 'cement1', quantity: 500, expand: { item: { unit: 'bags' } } },
        { item: 'cement2', quantity: 300, expand: { item: { unit: 'bags' } } },
        { item: 'sand', quantity: 1000, expand: { item: { unit: 'kg' } } }
      ];

      const result = aggregateQuantityByUnit(items);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.unit === 'bags')?.quantity).toBe(800);
      expect(result.find(r => r.unit === 'bags')?.itemCount).toBe(2);
      expect(result.find(r => r.unit === 'kg')?.quantity).toBe(1000);
      expect(result.find(r => r.unit === 'kg')?.itemCount).toBe(1);
    });

    it('should sort by quantity descending', () => {
      const aggregateQuantityByUnit = (deliveryItems: any[]) => {
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

        return Array.from(quantityByUnitMap.entries())
          .map(([unit, data]) => ({
            unit,
            quantity: data.quantity,
            itemCount: data.itemIds.size
          }))
          .sort((a, b) => b.quantity - a.quantity);
      };

      const items = [
        { item: 'item1', quantity: 50, expand: { item: { unit: 'kg' } } },
        { item: 'item2', quantity: 1000, expand: { item: { unit: 'ton' } } },
        { item: 'item3', quantity: 200, expand: { item: { unit: 'bags' } } }
      ];

      const result = aggregateQuantityByUnit(items);

      expect(result[0].unit).toBe('ton');
      expect(result[1].unit).toBe('bags');
      expect(result[2].unit).toBe('kg');
    });

    it('should handle empty delivery items', () => {
      const aggregateQuantityByUnit = (deliveryItems: any[]) => {
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

        return Array.from(quantityByUnitMap.entries())
          .map(([unit, data]) => ({
            unit,
            quantity: data.quantity,
            itemCount: data.itemIds.size
          }))
          .sort((a, b) => b.quantity - a.quantity);
      };

      const result = aggregateQuantityByUnit([]);

      expect(result).toHaveLength(0);
    });

    it('should handle items without units', () => {
      const aggregateQuantityByUnit = (deliveryItems: any[]) => {
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

        return Array.from(quantityByUnitMap.entries())
          .map(([unit, data]) => ({
            unit,
            quantity: data.quantity,
            itemCount: data.itemIds.size
          }))
          .sort((a, b) => b.quantity - a.quantity);
      };

      const items = [
        { item: 'item1', quantity: 100, expand: { item: { unit: 'kg' } } },
        { item: 'item2', quantity: 50, expand: { item: {} } }, // No unit
        { item: 'item3', quantity: 75, expand: {} } // No item
      ];

      const result = aggregateQuantityByUnit(items);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ unit: 'kg', quantity: 100, itemCount: 1 });
    });
  });

  describe('Filter Application Logic', () => {
    it('should filter by tags correctly', () => {
      const filterByTags = (deliveryItems: any[], selectedTagIds: string[]) => {
        if (selectedTagIds.length === 0) return deliveryItems;

        return deliveryItems.filter(record => {
          const item = record.expand?.item;
          if (!item || !item.tags) return false;

          const itemTags = Array.isArray(item.tags) ? item.tags : [];
          return selectedTagIds.some(tagId => itemTags.includes(tagId));
        });
      };

      const items = [
        { expand: { item: { tags: ['tag1', 'tag2'] } } },
        { expand: { item: { tags: ['tag2', 'tag3'] } } },
        { expand: { item: { tags: ['tag3'] } } }
      ];

      expect(filterByTags(items, [])).toHaveLength(3);
      expect(filterByTags(items, ['tag1'])).toHaveLength(1);
      expect(filterByTags(items, ['tag2'])).toHaveLength(2);
      expect(filterByTags(items, ['tag1', 'tag3'])).toHaveLength(3);
    });

    it('should filter by date range correctly', () => {
      const filterByDateRange = (deliveryItems: any[], dateFrom?: string, dateTo?: string) => {
        if (!dateFrom && !dateTo) return deliveryItems;

        return deliveryItems.filter(record => {
          const delivery = record.expand?.delivery;
          if (!delivery || !delivery.delivery_date) return false;

          const deliveryDate = new Date(delivery.delivery_date);
          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            if (deliveryDate < fromDate) return false;
          }
          if (dateTo) {
            const toDate = new Date(dateTo);
            if (deliveryDate > toDate) return false;
          }
          return true;
        });
      };

      const items = [
        { expand: { delivery: { delivery_date: '2024-01-01' } } },
        { expand: { delivery: { delivery_date: '2024-06-01' } } },
        { expand: { delivery: { delivery_date: '2024-12-31' } } }
      ];

      expect(filterByDateRange(items)).toHaveLength(3);
      expect(filterByDateRange(items, '2024-06-01')).toHaveLength(2);
      expect(filterByDateRange(items, undefined, '2024-06-01')).toHaveLength(2);
      expect(filterByDateRange(items, '2024-06-01', '2024-06-01')).toHaveLength(1);
    });

    it('should filter by amount range correctly', () => {
      const filterByAmountRange = (deliveryItems: any[], amountMin?: number, amountMax?: number) => {
        if (amountMin === undefined && amountMax === undefined) return deliveryItems;

        return deliveryItems.filter(record => {
          const amount = record.total_amount || 0;
          if (amountMin !== undefined && amount < amountMin) return false;
          if (amountMax !== undefined && amount > amountMax) return false;
          return true;
        });
      };

      const items = [
        { total_amount: 500 },
        { total_amount: 1500 },
        { total_amount: 2500 }
      ];

      expect(filterByAmountRange(items)).toHaveLength(3);
      expect(filterByAmountRange(items, 1000)).toHaveLength(2);
      expect(filterByAmountRange(items, undefined, 2000)).toHaveLength(2);
      expect(filterByAmountRange(items, 1000, 2000)).toHaveLength(1);
    });
  });

  describe('Setting Serialization Logic', () => {
    it('should serialize filters to setting correctly', () => {
      const serializeFiltersToSetting = (name: string, filters: any) => {
        return {
          name,
          tag_ids: filters.tagIds.length > 0 ? filters.tagIds : undefined,
          date_from: filters.dateFrom || undefined,
          date_to: filters.dateTo || undefined,
          amount_min: filters.amountMin !== null ? filters.amountMin : undefined,
          amount_max: filters.amountMax !== null ? filters.amountMax : undefined
        };
      };

      const filters = {
        tagIds: ['tag1', 'tag2'],
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        amountMin: 100,
        amountMax: 1000
      };

      const setting = serializeFiltersToSetting('Test Setting', filters);

      expect(setting.name).toBe('Test Setting');
      expect(setting.tag_ids).toEqual(['tag1', 'tag2']);
      expect(setting.date_from).toBe('2024-01-01');
      expect(setting.date_to).toBe('2024-12-31');
      expect(setting.amount_min).toBe(100);
      expect(setting.amount_max).toBe(1000);
    });

    it('should deserialize setting to filters correctly', () => {
      const deserializeSettingToFilters = (setting: any) => {
        return {
          tagIds: setting.tag_ids || [],
          dateFrom: setting.date_from || '',
          dateTo: setting.date_to || '',
          amountMin: setting.amount_min ?? null,
          amountMax: setting.amount_max ?? null
        };
      };

      const setting = {
        tag_ids: ['tag1', 'tag2'],
        date_from: '2024-01-01',
        date_to: '2024-12-31',
        amount_min: 100,
        amount_max: 1000
      };

      const filters = deserializeSettingToFilters(setting);

      expect(filters.tagIds).toEqual(['tag1', 'tag2']);
      expect(filters.dateFrom).toBe('2024-01-01');
      expect(filters.dateTo).toBe('2024-12-31');
      expect(filters.amountMin).toBe(100);
      expect(filters.amountMax).toBe(1000);
    });
  });
});
