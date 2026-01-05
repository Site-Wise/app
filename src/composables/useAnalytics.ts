import { ref, computed, watch } from 'vue';
import { analyticsSettingService, type AnalyticsSetting, type AnalyticsResult } from '../services/pocketbase';
import { useToast } from './useToast';
import { useSite } from './useSite';

export interface AnalyticsFilters {
  tagIds: string[];
  dateFrom: string;
  dateTo: string;
  amountMin: number | null;
  amountMax: number | null;
}

export function useAnalytics() {
  const { success, error } = useToast();
  const { currentSite } = useSite();

  // Filters state
  const filters = ref<AnalyticsFilters>({
    tagIds: [],
    dateFrom: '',
    dateTo: '',
    amountMin: null,
    amountMax: null
  });

  // Analytics results
  const analyticsData = ref<AnalyticsResult | null>(null);
  const loading = ref(false);

  // Saved settings
  const savedSettings = ref<AnalyticsSetting[]>([]);
  const loadingSettings = ref(false);

  /**
   * Load all saved analytics settings for current site
   */
  const loadSavedSettings = async () => {
    try {
      loadingSettings.value = true;
      savedSettings.value = await analyticsSettingService.getAll();
    } catch (err) {
      console.error('Failed to load saved analytics settings:', err);
      error('Failed to load saved settings');
    } finally {
      loadingSettings.value = false;
    }
  };

  /**
   * Calculate analytics based on current filters
   */
  const calculateAnalytics = async () => {
    try {
      loading.value = true;

      const filterParams: any = {};

      if (filters.value.tagIds.length > 0) {
        filterParams.tagIds = filters.value.tagIds;
      }

      if (filters.value.dateFrom) {
        filterParams.dateFrom = filters.value.dateFrom;
      }

      if (filters.value.dateTo) {
        filterParams.dateTo = filters.value.dateTo;
      }

      if (filters.value.amountMin !== null) {
        filterParams.amountMin = filters.value.amountMin;
      }

      if (filters.value.amountMax !== null) {
        filterParams.amountMax = filters.value.amountMax;
      }

      analyticsData.value = await analyticsSettingService.calculateAnalytics(filterParams);
    } catch (err) {
      console.error('Failed to calculate analytics:', err);
      error('Failed to calculate analytics');
      analyticsData.value = null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Save current filters as a named setting
   */
  const saveSetting = async (name: string): Promise<boolean> => {
    try {
      const setting: Omit<AnalyticsSetting, 'id' | 'site' | 'created' | 'updated'> = {
        name,
        tag_ids: filters.value.tagIds.length > 0 ? filters.value.tagIds : undefined,
        date_from: filters.value.dateFrom || undefined,
        date_to: filters.value.dateTo || undefined,
        amount_min: filters.value.amountMin !== null ? filters.value.amountMin : undefined,
        amount_max: filters.value.amountMax !== null ? filters.value.amountMax : undefined
      };

      await analyticsSettingService.create(setting);
      success('Analytics setting saved');
      await loadSavedSettings(); // Refresh the list
      return true;
    } catch (err) {
      console.error('Failed to save analytics setting:', err);
      error('Failed to save setting');
      return false;
    }
  };

  /**
   * Load a saved setting and apply its filters
   */
  const loadSetting = async (settingId: string) => {
    try {
      const setting = await analyticsSettingService.getById(settingId);
      if (!setting) {
        error('Setting not found');
        return;
      }

      filters.value = {
        tagIds: setting.tag_ids || [],
        dateFrom: setting.date_from || '',
        dateTo: setting.date_to || '',
        amountMin: setting.amount_min ?? null,
        amountMax: setting.amount_max ?? null
      };

      // Automatically calculate analytics when loading a setting
      await calculateAnalytics();
    } catch (err) {
      console.error('Failed to load analytics setting:', err);
      error('Failed to load setting');
    }
  };

  /**
   * Delete a saved setting
   */
  const deleteSetting = async (settingId: string): Promise<boolean> => {
    try {
      await analyticsSettingService.delete(settingId);
      success('Setting deleted');
      await loadSavedSettings(); // Refresh the list
      return true;
    } catch (err) {
      console.error('Failed to delete analytics setting:', err);
      error('Failed to delete setting');
      return false;
    }
  };

  /**
   * Update an existing saved setting
   */
  const updateSetting = async (settingId: string, name?: string): Promise<boolean> => {
    try {
      const updates: Partial<AnalyticsSetting> = {
        tag_ids: filters.value.tagIds.length > 0 ? filters.value.tagIds : undefined,
        date_from: filters.value.dateFrom || undefined,
        date_to: filters.value.dateTo || undefined,
        amount_min: filters.value.amountMin !== null ? filters.value.amountMin : undefined,
        amount_max: filters.value.amountMax !== null ? filters.value.amountMax : undefined
      };

      if (name) {
        updates.name = name;
      }

      await analyticsSettingService.update(settingId, updates);
      success('Setting updated');
      await loadSavedSettings(); // Refresh the list
      return true;
    } catch (err) {
      console.error('Failed to update analytics setting:', err);
      error('Failed to update setting');
      return false;
    }
  };

  /**
   * Reset all filters to default values
   */
  const resetFilters = () => {
    filters.value = {
      tagIds: [],
      dateFrom: '',
      dateTo: '',
      amountMin: null,
      amountMax: null
    };
    analyticsData.value = null;
  };

  /**
   * Check if any filters are currently applied
   */
  const hasActiveFilters = computed(() => {
    return (
      filters.value.tagIds.length > 0 ||
      filters.value.dateFrom !== '' ||
      filters.value.dateTo !== '' ||
      filters.value.amountMin !== null ||
      filters.value.amountMax !== null
    );
  });

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  /**
   * Format compact amount (like 1.5L, 2.3Cr)
   */
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

  // Watch for site changes and clear data
  watch(currentSite, () => {
    resetFilters();
    savedSettings.value = [];
  });

  return {
    // State
    filters,
    analyticsData,
    loading,
    savedSettings,
    loadingSettings,
    hasActiveFilters,

    // Methods
    calculateAnalytics,
    loadSavedSettings,
    saveSetting,
    loadSetting,
    deleteSetting,
    updateSetting,
    resetFilters,
    formatCurrency,
    formatCompactAmount
  };
}
