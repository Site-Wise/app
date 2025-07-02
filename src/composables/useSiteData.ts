import { ref, watch, Ref, unref } from 'vue';
import { useSiteStore } from '../stores/site';
import { pb } from '../services/pocketbase';

/**
 * Composable for managing data that depends on the current site.
 * Automatically reloads data when the site changes.
 * 
 * @param loadDataFn - Function to load data for the current site
 * @returns Object containing data ref, loading state, error state, and reload function
 * 
 * @example
 * ```typescript
 * const { data: items, loading, error, reload } = useSiteData(async (siteId) => {
 *   return await itemService.getBySite(siteId);
 * });
 * ```
 */
export function useSiteData<T>(
  loadDataFn: (siteId: string) => Promise<T>
): {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reload: () => Promise<void>;
} {
  const siteStore = useSiteStore();
  const data = ref(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<Error | null>(null);
  let currentLoadId = 0;

  const loadData = async () => {
    const currentSiteId = unref(siteStore.currentSiteId);
    if (!currentSiteId || !pb.authStore.isValid) {
      data.value = null;
      return;
    }

    loading.value = true;
    error.value = null;
    
    // Generate unique ID for this load operation to handle race conditions
    const loadId = ++currentLoadId;

    try {
      const result = await loadDataFn(currentSiteId);
      
      // Only update data if this is still the current load operation
      if (loadId === currentLoadId) {
        data.value = result;
      }
    } catch (err) {
      // Only update error if this is still the current load operation
      if (loadId === currentLoadId) {
        error.value = err as Error;
        console.error('Error loading site data:', err);
      }
    } finally {
      // Only update loading if this is still the current load operation
      if (loadId === currentLoadId) {
        loading.value = false;
      }
    }
  };

  // Watch for site changes and reload data
  watch(
    () => siteStore.currentSiteId,
    (newSiteId, oldSiteId) => {
      // Only reload if site actually changed and is not null
      if (newSiteId && newSiteId !== oldSiteId) {
        loadData();
      } else if (!newSiteId) {
        // Clear data when no site selected
        data.value = null;
      }
    },
    { immediate: true }
  );

  return {
    data,
    loading,
    error,
    reload: loadData
  };
}

/**
 * Composable for managing paginated data that depends on the current site.
 * Automatically reloads data when the site changes.
 * 
 * @param loadDataFn - Function to load paginated data for the current site
 * @param options - Pagination options
 * @returns Object containing items, pagination state, and control functions
 * 
 * @example
 * ```typescript
 * const { 
 *   items, 
 *   loading, 
 *   error, 
 *   currentPage, 
 *   totalPages, 
 *   nextPage, 
 *   prevPage, 
 *   reload 
 * } = useSitePaginatedData(
 *   async (siteId, page, perPage) => {
 *     return await deliveryService.getBySite(siteId, page, perPage);
 *   },
 *   { perPage: 20 }
 * );
 * ```
 */
export function useSitePaginatedData<T>(
  loadDataFn: (siteId: string, page: number, perPage: number) => Promise<{ items: T[]; totalItems: number; totalPages: number }>,
  options: { perPage?: number } = {}
): {
  items: Ref<T[]>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  currentPage: Ref<number>;
  totalPages: Ref<number>;
  totalItems: Ref<number>;
  perPage: Ref<number>;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  reload: () => Promise<void>;
} {
  const siteStore = useSiteStore();
  const items = ref([]) as Ref<T[]>;
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const currentPage = ref(1);
  const totalPages = ref(1);
  const totalItems = ref(0);
  const perPage = ref(options.perPage || 10);

  const loadData = async () => {
    const currentSiteId = siteStore.currentSiteId;
    if (!currentSiteId || !pb.authStore.isValid) {
      items.value = [];
      totalPages.value = 1;
      totalItems.value = 0;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await loadDataFn(currentSiteId, currentPage.value, perPage.value);
      items.value = result.items;
      totalPages.value = result.totalPages;
      totalItems.value = result.totalItems;
    } catch (err) {
      error.value = err as Error;
      console.error('Error loading paginated site data:', err);
    } finally {
      loading.value = false;
    }
  };

  // Watch for site changes and reload data
  watch(
    () => siteStore.currentSiteId,
    (newSiteId, oldSiteId) => {
      if (newSiteId && newSiteId !== oldSiteId) {
        // Reset to first page when site changes
        currentPage.value = 1;
        loadData();
      } else if (!newSiteId) {
        // Clear data when no site selected
        items.value = [];
        totalPages.value = 1;
        totalItems.value = 0;
      }
    },
    { immediate: true }
  );

  // Watch for page changes
  watch(currentPage, () => {
    loadData();
  });

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
    }
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  };

  return {
    items,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    perPage,
    nextPage,
    prevPage,
    goToPage,
    reload: loadData
  };
}