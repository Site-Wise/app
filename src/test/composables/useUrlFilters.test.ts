import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive, nextTick } from 'vue';
import { useUrlFilters } from '../../composables/useUrlFilters';

// Mutable mock route query so we can simulate navigation.
const mockRoute = reactive<{ query: Record<string, unknown> }>({ query: {} });
const replace = vi.fn();
const push = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ replace, push }),
}));

describe('useUrlFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.query = {};
  });

  it('reads declared keys from route.query into filters', () => {
    mockRoute.query = { vendor: 'v1', account: 'a1', ignored: 'x' };
    const { filters } = useUrlFilters(['vendor', 'account']);
    expect(filters.vendor).toBe('v1');
    expect(filters.account).toBe('a1');
    // Non-declared keys are not exposed.
    expect((filters as Record<string, string>).ignored).toBeUndefined();
  });

  it('normalizes array query values to the first usable string', () => {
    mockRoute.query = { vendor: ['v9', 'v10'] };
    const { filters } = useUrlFilters(['vendor']);
    expect(filters.vendor).toBe('v9');
  });

  it('is safe when keys are absent', () => {
    mockRoute.query = {};
    const { filters, hasActiveFilter } = useUrlFilters(['vendor']);
    expect(filters.vendor).toBeUndefined();
    expect(hasActiveFilter.value).toBe(false);
  });

  it('setFilter merges into query and uses router.replace', () => {
    mockRoute.query = { existing: 'keep' };
    const { setFilter } = useUrlFilters(['vendor']);
    setFilter('vendor', 'v1');
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith({ query: { existing: 'keep', vendor: 'v1' } });
    expect(push).not.toHaveBeenCalled();
  });

  it('setFilter with empty value removes the key', () => {
    mockRoute.query = { vendor: 'v1', other: 'o' };
    const { setFilter } = useUrlFilters(['vendor']);
    setFilter('vendor', '');
    expect(replace).toHaveBeenCalledWith({ query: { other: 'o' } });
  });

  it('clearFilter(key) strips a single key via replace', () => {
    mockRoute.query = { vendor: 'v1', account: 'a1' };
    const { clearFilter } = useUrlFilters(['vendor', 'account']);
    clearFilter('vendor');
    expect(replace).toHaveBeenCalledWith({ query: { account: 'a1' } });
  });

  it('clearFilter() strips all declared keys but preserves others', () => {
    mockRoute.query = { vendor: 'v1', account: 'a1', page: '2' };
    const { clearFilter } = useUrlFilters(['vendor', 'account']);
    clearFilter();
    expect(replace).toHaveBeenCalledWith({ query: { page: '2' } });
  });

  it('hasActiveFilter and activeFilterEntries reflect current state', () => {
    mockRoute.query = { vendor: 'v1' };
    const { hasActiveFilter, activeFilterEntries } = useUrlFilters(['vendor', 'account']);
    expect(hasActiveFilter.value).toBe(true);
    expect(activeFilterEntries.value).toEqual([{ key: 'vendor', value: 'v1' }]);
  });

  it('reacts to external query changes (back/forward/other links)', async () => {
    mockRoute.query = {};
    const { filters, hasActiveFilter } = useUrlFilters(['vendor']);
    expect(hasActiveFilter.value).toBe(false);

    mockRoute.query = { vendor: 'v42' };
    await nextTick();
    expect(filters.vendor).toBe('v42');
    expect(hasActiveFilter.value).toBe(true);

    mockRoute.query = {};
    await nextTick();
    expect(filters.vendor).toBeUndefined();
    expect(hasActiveFilter.value).toBe(false);
  });

  it('openRecord pushes path with ?id= (push, not replace)', () => {
    const { openRecord } = useUrlFilters([]);
    openRecord('/vendors', 'v1');
    expect(push).toHaveBeenCalledWith({ path: '/vendors', query: { id: 'v1' } });
    expect(replace).not.toHaveBeenCalled();
  });
});
