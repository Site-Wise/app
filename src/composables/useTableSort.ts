import { ref, type Ref } from 'vue';

export type SortDirection = 'asc' | 'desc';

export interface UseTableSortOptions {
  /** Column key to sort by initially. Defaults to null (no sort, original order). */
  defaultKey?: string | null;
  /** Initial sort direction when a defaultKey is provided. Defaults to 'asc'. */
  defaultDir?: SortDirection;
}

/** Accessor maps a row + column key to the comparable value for that column. */
export type SortAccessor<R> = (row: R, key: string) => unknown;

export interface UseTableSort<T> {
  /** Currently active sort column, or null when unsorted. */
  sortKey: Ref<string | null>;
  /** Currently active sort direction. */
  sortDir: Ref<SortDirection>;
  /**
   * Handle a column header click. If `key` is already the active sort column the
   * direction flips; otherwise the column becomes active in the default direction.
   */
  toggleSort: (key: string) => void;
  /** Explicitly set the active sort column and direction. */
  setSort: (key: string, dir: SortDirection) => void;
  /** Reset to the unsorted (original order) state. */
  clearSort: () => void;
  /** aria-sort value for a column header (for accessible `<th aria-sort>`). */
  ariaSort: (key: string) => 'ascending' | 'descending' | 'none';
  /**
   * Pure, stable client-side sorter. Returns a NEW array; never mutates `rows`.
   * When `sortKey` is null the input order is returned unchanged. null/undefined
   * values always sort last regardless of direction.
   */
  sortRows: <R extends T>(rows: R[], accessor?: SortAccessor<R>) => R[];
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Default accessor: reads `row[key]` shallowly. */
function defaultAccessor(row: unknown, key: string): unknown {
  if (row == null || typeof row !== 'object') return undefined;
  return (row as Record<string, unknown>)[key];
}

function isNil(v: unknown): boolean {
  return v === null || v === undefined;
}

/**
 * Compare two non-nil values. Returns a negative/zero/positive number for
 * ascending order. Handles numbers, ISO-date strings / Date objects, and falls
 * back to a locale-aware, case-insensitive string comparison.
 */
function compareValues(a: unknown, b: unknown): number {
  // Numbers (and numeric-like) — compare numerically.
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return a - b;
  }

  // Booleans — false < true.
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return (a === b) ? 0 : (a ? 1 : -1);
  }

  // Dates: Date instances or ISO-date strings.
  const aTime = toDateTime(a);
  const bTime = toDateTime(b);
  if (aTime !== null && bTime !== null) {
    return aTime - bTime;
  }

  // Fallback: locale-aware, case-insensitive string comparison.
  const aStr = String(a);
  const bStr = String(b);
  return aStr.localeCompare(bStr, undefined, { sensitivity: 'base', numeric: true });
}

/** Returns epoch ms for a Date or ISO-date string, else null. */
function toDateTime(v: unknown): number | null {
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v === 'string' && ISO_DATE_RE.test(v.trim())) {
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export function useTableSort<T = unknown>(opts: UseTableSortOptions = {}): UseTableSort<T> {
  const sortKey = ref<string | null>(opts.defaultKey ?? null);
  const sortDir = ref<SortDirection>(opts.defaultDir ?? 'asc');

  function toggleSort(key: string): void {
    if (sortKey.value === key) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey.value = key;
      sortDir.value = opts.defaultDir ?? 'asc';
    }
  }

  function setSort(key: string, dir: SortDirection): void {
    sortKey.value = key;
    sortDir.value = dir;
  }

  function clearSort(): void {
    sortKey.value = null;
    sortDir.value = opts.defaultDir ?? 'asc';
  }

  function ariaSort(key: string): 'ascending' | 'descending' | 'none' {
    if (sortKey.value !== key) return 'none';
    return sortDir.value === 'asc' ? 'ascending' : 'descending';
  }

  function sortRows<R extends T>(rows: R[], accessor?: SortAccessor<R>): R[] {
    const key = sortKey.value;
    // No active sort -> original order, but still a NEW array (no mutation).
    if (key == null) return rows.slice();

    const get = accessor ?? (defaultAccessor as SortAccessor<R>);
    const dir = sortDir.value === 'asc' ? 1 : -1;

    // Decorate with original index for a stable sort.
    return rows
      .map((row, index) => ({ row, index, value: get(row, key) }))
      .sort((a, b) => {
        const aNil = isNil(a.value);
        const bNil = isNil(b.value);
        // null/undefined always sort last, regardless of direction.
        if (aNil && bNil) return a.index - b.index;
        if (aNil) return 1;
        if (bNil) return -1;

        const cmp = compareValues(a.value, b.value);
        if (cmp !== 0) return cmp * dir;
        // Stable: equal keys keep original order.
        return a.index - b.index;
      })
      .map(entry => entry.row);
  }

  return {
    sortKey,
    sortDir,
    toggleSort,
    setSort,
    clearSort,
    ariaSort,
    sortRows,
  };
}
