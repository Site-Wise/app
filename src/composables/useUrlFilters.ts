import { reactive, computed, watch, type ComputedRef } from 'vue';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';

/**
 * Entry describing an active relation-filter, for rendering dismissible chips.
 */
export interface ActiveFilterEntry {
  key: string;
  value: string;
}

export interface UseUrlFiltersReturn {
  /** Current values of declaredKeys present in route.query (reactive, read-only). */
  filters: Readonly<Record<string, string>>;
  /** True when at least one declared filter has a value. */
  hasActiveFilter: ComputedRef<boolean>;
  /** Active filters as {key, value} pairs (for chips). */
  activeFilterEntries: ComputedRef<ActiveFilterEntry[]>;
  /** Set/merge a single filter into the query (router.replace — no history pollution). */
  setFilter: (key: string, value: string) => void;
  /** Remove one declared key, or all declared keys when called with no argument (router.replace). */
  clearFilter: (key?: string) => void;
  /** Navigate to a record by pushing `${routePath}?id=${id}` (push so Back closes it). */
  openRecord: (routePath: string, id: string) => void;
}

/**
 * Normalize a vue-router query value (which may be string | null | (string|null)[])
 * into a single, defined string. Returns undefined when no usable value exists.
 */
function normalizeQueryValue(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) {
    const first = raw.find((v) => v !== null && v !== undefined);
    return first === undefined || first === null ? undefined : String(first);
  }
  return String(raw);
}

/**
 * Generic composable that syncs a view's relation-filter state with `route.query`.
 *
 * DATA-SOURCE-AGNOSTIC: it does not call any service or loader. The consuming view
 * reads `filters` inside its own loader and decides when to reload (gated on site
 * readiness if needed). This composable performs NO navigation/redirect of its own
 * beyond the explicit setFilter/clearFilter/openRecord calls, so it does not
 * interfere with App.vue's isReadyForRouting boot sequence.
 */
export function useUrlFilters(declaredKeys: string[]): UseUrlFiltersReturn {
  const route = useRoute();
  const router = useRouter();

  const keys = Array.isArray(declaredKeys) ? declaredKeys : [];

  // Reactive snapshot of the declared keys' current values in the query.
  const filters = reactive<Record<string, string>>({});

  const syncFromQuery = (query: LocationQuery | undefined) => {
    const q = query || {};
    for (const key of keys) {
      const value = normalizeQueryValue(q[key]);
      if (value === undefined || value === '') {
        // Remove absent/empty keys so `filters` only contains active ones.
        if (key in filters) delete filters[key];
      } else {
        filters[key] = value;
      }
    }
  };

  // Initial sync + keep in sync on back/forward/other navigations.
  syncFromQuery(route?.query);
  watch(
    () => route?.query,
    (query) => syncFromQuery(query),
    { deep: true }
  );

  const hasActiveFilter = computed(() => Object.keys(filters).length > 0);

  const activeFilterEntries = computed<ActiveFilterEntry[]>(() =>
    Object.entries(filters).map(([key, value]) => ({ key, value }))
  );

  const currentQuery = (): LocationQuery => ({ ...(route?.query || {}) });

  const setFilter = (key: string, value: string): void => {
    if (!key) return;
    const nextQuery = currentQuery();
    if (value === undefined || value === null || value === '') {
      delete nextQuery[key];
    } else {
      nextQuery[key] = value;
    }
    router.replace({ query: nextQuery });
  };

  const clearFilter = (key?: string): void => {
    const nextQuery = currentQuery();
    if (key === undefined) {
      // Clear all declared keys.
      for (const k of keys) {
        delete nextQuery[k];
      }
    } else {
      delete nextQuery[key];
    }
    router.replace({ query: nextQuery });
  };

  const openRecord = (routePath: string, id: string): void => {
    router.push({ path: routePath, query: { id } });
  };

  return {
    filters,
    hasActiveFilter,
    activeFilterEntries,
    setFilter,
    clearFilter,
    openRecord,
  };
}
