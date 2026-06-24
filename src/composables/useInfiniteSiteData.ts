import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { useSiteStore } from '../stores/site';
import { pb } from '../services/pocketbase';

/**
 * Composable for incrementally loading (infinite-scroll) data that depends on
 * the current site. Mirrors `useSiteData` ergonomics so views can adopt it with
 * minimal changes, but accumulates pages append-only (deduped by id) instead of
 * replacing the whole dataset on every load.
 *
 * Key guarantees:
 * - Append-only: `items` only grows as pages load, so the rendered list never
 *   reorders/replaces underneath the user (no scroll jump).
 * - Deduped: an id `Set` drops already-seen rows when merging, insurance against
 *   offset drift if rows are inserted/removed server-side between page fetches.
 * - Site-reactive: changing the site resets to page 1 (clears items + the id
 *   Set), a null site clears everything.
 * - Race-guarded: a `currentLoadId` counter ignores stale in-flight loads.
 *
 * @param loadPage - Loads a single page for the current site.
 * @param options  - `perPage` (default 50) and `getId` (default `item.id`).
 */
export function useInfiniteSiteData<T>(
  loadPage: (
    siteId: string,
    page: number,
    perPage: number
  ) => Promise<{ items: T[]; totalItems: number }>,
  options: { perPage?: number; getId?: (item: T) => string } = {}
): {
  items: Ref<T[]>;
  loading: Ref<boolean>;
  loadingMore: Ref<boolean>;
  error: Ref<Error | null>;
  hasMore: ComputedRef<boolean>;
  totalItems: Ref<number>;
  currentPage: Ref<number>;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
  reset: () => void;
  patchItem: (id: string, partial: Partial<T>) => void;
  removeItem: (id: string) => void;
  prependItem: (item: T) => void;
} {
  const siteStore = useSiteStore();
  const perPage = options.perPage ?? 50;
  const getId = options.getId ?? ((item: T) => (item as unknown as { id: string }).id);

  const items = ref([]) as Ref<T[]>;
  const loading = ref(false); // initial (page 1) load
  const loadingMore = ref(false); // subsequent page loads
  const error = ref<Error | null>(null);
  const totalItems = ref(0);
  const currentPage = ref(0); // 0 = nothing loaded yet

  // Track seen ids for dedupe on merge.
  let seenIds = new Set<string>();
  // Race guard: only the latest load may mutate state.
  let currentLoadId = 0;

  const hasMore = computed(() => items.value.length < totalItems.value);

  /** Clear all accumulated state without triggering a load. */
  function reset() {
    items.value = [];
    seenIds = new Set<string>();
    totalItems.value = 0;
    currentPage.value = 0;
    error.value = null;
  }

  /**
   * Merge a freshly fetched page into the accumulated list, dropping any ids we
   * have already seen.
   */
  function mergePage(pageItems: T[]) {
    const fresh: T[] = [];
    for (const item of pageItems) {
      const id = getId(item);
      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);
      fresh.push(item);
    }
    if (fresh.length > 0) {
      items.value = [...items.value, ...fresh];
    }
  }

  async function loadPageInternal(page: number, isInitial: boolean) {
    const currentSiteId = siteStore.currentSiteId;
    if (!currentSiteId || !pb.authStore.isValid) {
      reset();
      return;
    }

    if (isInitial) {
      loading.value = true;
    } else {
      loadingMore.value = true;
    }
    error.value = null;

    const loadId = ++currentLoadId;

    try {
      const result = await loadPage(currentSiteId, page, perPage);

      // Ignore stale loads (site changed / a newer load started).
      if (loadId !== currentLoadId) return;

      totalItems.value = result.totalItems;
      mergePage(result.items);
      currentPage.value = page;
    } catch (err) {
      if (loadId !== currentLoadId) return;
      error.value = err as Error;
      console.error('Error loading infinite site data:', err);
    } finally {
      if (loadId === currentLoadId) {
        loading.value = false;
        loadingMore.value = false;
      }
    }
  }

  /** Load the next page. No-op while a page is in flight or nothing is left. */
  async function loadMore() {
    if (loadingMore.value || loading.value || !hasMore.value) return;
    await loadPageInternal(currentPage.value + 1, false);
  }

  /** Reset to page 1 and reload from the top. */
  async function reload() {
    reset();
    await loadPageInternal(1, true);
  }

  // ----- In-place mutation helpers (avoid full reload-from-top) -----

  function patchItem(id: string, partial: Partial<T>) {
    const idx = items.value.findIndex(item => getId(item) === id);
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], ...partial };
    }
  }

  function removeItem(id: string) {
    const idx = items.value.findIndex(item => getId(item) === id);
    if (idx !== -1) {
      items.value.splice(idx, 1);
      seenIds.delete(id);
      if (totalItems.value > 0) totalItems.value -= 1;
    }
  }

  function prependItem(item: T) {
    const id = getId(item);
    if (id && seenIds.has(id)) {
      // Already present: update in place instead of duplicating.
      patchItem(id, item as Partial<T>);
      return;
    }
    if (id) seenIds.add(id);
    items.value = [item, ...items.value];
    totalItems.value += 1;
  }

  // Reset + reload page 1 on site change; clear on null site.
  watch(
    () => siteStore.currentSiteId,
    (newSiteId, oldSiteId) => {
      if (newSiteId && newSiteId !== oldSiteId) {
        reload();
      } else if (!newSiteId) {
        // Bump the race guard so any in-flight load is discarded, then clear.
        currentLoadId++;
        reset();
      }
    },
    { immediate: true }
  );

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    totalItems,
    currentPage,
    loadMore,
    reload,
    reset,
    patchItem,
    removeItem,
    prependItem
  };
}
