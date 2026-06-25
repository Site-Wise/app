import { describe, it, expect } from 'vitest';
import { useTableSort } from '../../composables/useTableSort';

/**
 * Logic-focused tests for the generic table-sort composable.
 *
 * Covers the reactive sort STATE (toggleSort / setSort / clearSort / ariaSort)
 * that paginated views feed to a server query, and the pure client-side
 * `sortRows` sorter used by full-list views.
 */
describe('useTableSort', () => {
  describe('initial state', () => {
    it('defaults to no sort key and asc direction', () => {
      const { sortKey, sortDir } = useTableSort();
      expect(sortKey.value).toBeNull();
      expect(sortDir.value).toBe('asc');
    });

    it('honors defaultKey and defaultDir options', () => {
      const { sortKey, sortDir } = useTableSort({ defaultKey: 'name', defaultDir: 'desc' });
      expect(sortKey.value).toBe('name');
      expect(sortDir.value).toBe('desc');
    });
  });

  describe('toggleSort', () => {
    it('sets a new key to the default direction (asc)', () => {
      const { sortKey, sortDir, toggleSort } = useTableSort();
      toggleSort('name');
      expect(sortKey.value).toBe('name');
      expect(sortDir.value).toBe('asc');
    });

    it('flips direction when the same key is toggled again', () => {
      const { sortKey, sortDir, toggleSort } = useTableSort();
      toggleSort('name');
      expect(sortDir.value).toBe('asc');
      toggleSort('name');
      expect(sortDir.value).toBe('desc');
      toggleSort('name');
      expect(sortDir.value).toBe('asc');
      expect(sortKey.value).toBe('name');
    });

    it('resets to the default direction when switching to a different key', () => {
      const { sortKey, sortDir, toggleSort } = useTableSort();
      toggleSort('name');
      toggleSort('name'); // now desc
      expect(sortDir.value).toBe('desc');
      toggleSort('total'); // new key -> back to asc
      expect(sortKey.value).toBe('total');
      expect(sortDir.value).toBe('asc');
    });

    it('uses a configured defaultDir for new keys', () => {
      const { sortDir, toggleSort } = useTableSort({ defaultDir: 'desc' });
      toggleSort('date');
      expect(sortDir.value).toBe('desc');
    });
  });

  describe('setSort', () => {
    it('sets the key and direction explicitly', () => {
      const { sortKey, sortDir, setSort } = useTableSort();
      setSort('amount', 'desc');
      expect(sortKey.value).toBe('amount');
      expect(sortDir.value).toBe('desc');
    });
  });

  describe('clearSort', () => {
    it('resets to the unsorted state', () => {
      const { sortKey, sortDir, setSort, clearSort } = useTableSort();
      setSort('amount', 'desc');
      clearSort();
      expect(sortKey.value).toBeNull();
      expect(sortDir.value).toBe('asc');
    });

    it('clears back to the configured default direction', () => {
      const { sortKey, sortDir, setSort, clearSort } = useTableSort({ defaultDir: 'desc' });
      setSort('amount', 'asc');
      clearSort();
      expect(sortKey.value).toBeNull();
      expect(sortDir.value).toBe('desc');
    });
  });

  describe('ariaSort', () => {
    it('returns "none" for inactive columns', () => {
      const { ariaSort, toggleSort } = useTableSort();
      toggleSort('name');
      expect(ariaSort('other')).toBe('none');
    });

    it('returns "ascending"/"descending" for the active column', () => {
      const { ariaSort, toggleSort } = useTableSort();
      toggleSort('name');
      expect(ariaSort('name')).toBe('ascending');
      toggleSort('name');
      expect(ariaSort('name')).toBe('descending');
    });

    it('returns "none" for all columns when unsorted', () => {
      const { ariaSort } = useTableSort();
      expect(ariaSort('name')).toBe('none');
    });
  });

  describe('sortRows', () => {
    it('returns the original order unchanged when no sort key is set', () => {
      const { sortRows } = useTableSort();
      const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];
      const result = sortRows(rows);
      expect(result.map(r => r.n)).toEqual([3, 1, 2]);
    });

    it('does not mutate the input array', () => {
      const { setSort, sortRows } = useTableSort();
      setSort('n', 'asc');
      const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];
      const original = [...rows];
      const result = sortRows(rows);
      expect(rows).toEqual(original); // input untouched
      expect(result).not.toBe(rows); // new array
    });

    it('returns a new array even when unsorted', () => {
      const { sortRows } = useTableSort();
      const rows = [{ n: 1 }];
      expect(sortRows(rows)).not.toBe(rows);
    });

    describe('numbers', () => {
      it('sorts numbers ascending', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('n', 'asc');
        const rows = [{ n: 30 }, { n: 2 }, { n: 100 }, { n: -5 }];
        expect(sortRows(rows).map(r => r.n)).toEqual([-5, 2, 30, 100]);
      });

      it('sorts numbers descending', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('n', 'desc');
        const rows = [{ n: 30 }, { n: 2 }, { n: 100 }, { n: -5 }];
        expect(sortRows(rows).map(r => r.n)).toEqual([100, 30, 2, -5]);
      });
    });

    describe('strings', () => {
      it('sorts strings case-insensitively (locale-aware)', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('name', 'asc');
        const rows = [{ name: 'banana' }, { name: 'Apple' }, { name: 'cherry' }];
        expect(sortRows(rows).map(r => r.name)).toEqual(['Apple', 'banana', 'cherry']);
      });

      it('does not let uppercase letters sort before all lowercase (case-insensitive)', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('name', 'asc');
        const rows = [{ name: 'zebra' }, { name: 'Apple' }];
        // Case-sensitive ASCII would put 'Apple' first because 'A' < 'z';
        // case-insensitive also puts 'Apple' first by letter — verify 'b' beats 'Z'.
        const rows2 = [{ name: 'Zebra' }, { name: 'banana' }];
        setSort('name', 'asc');
        expect(sortRows(rows).map(r => r.name)).toEqual(['Apple', 'zebra']);
        expect(sortRows(rows2).map(r => r.name)).toEqual(['banana', 'Zebra']);
      });

      it('sorts strings descending', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('name', 'desc');
        const rows = [{ name: 'banana' }, { name: 'Apple' }, { name: 'cherry' }];
        expect(sortRows(rows).map(r => r.name)).toEqual(['cherry', 'banana', 'Apple']);
      });
    });

    describe('dates', () => {
      it('sorts ISO date strings chronologically (asc)', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('d', 'asc');
        const rows = [
          { d: '2026-03-15' },
          { d: '2025-12-01' },
          { d: '2026-01-20' },
        ];
        expect(sortRows(rows).map(r => r.d)).toEqual(['2025-12-01', '2026-01-20', '2026-03-15']);
      });

      it('sorts ISO datetime strings chronologically (desc)', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('d', 'desc');
        const rows = [
          { d: '2026-03-15T10:00:00Z' },
          { d: '2026-03-15T08:30:00Z' },
          { d: '2026-03-15T12:00:00Z' },
        ];
        expect(sortRows(rows).map(r => r.d)).toEqual([
          '2026-03-15T12:00:00Z',
          '2026-03-15T10:00:00Z',
          '2026-03-15T08:30:00Z',
        ]);
      });

      it('sorts Date objects', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('d', 'asc');
        const rows = [
          { d: new Date('2026-03-15') },
          { d: new Date('2025-12-01') },
        ];
        expect(sortRows(rows).map(r => r.d.toISOString())).toEqual([
          new Date('2025-12-01').toISOString(),
          new Date('2026-03-15').toISOString(),
        ]);
      });
    });

    describe('null/undefined handling', () => {
      it('sorts null/undefined last in ascending order', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('n', 'asc');
        const rows = [{ n: 5 }, { n: null }, { n: 1 }, { n: undefined }, { n: 3 }];
        const result = sortRows(rows).map(r => r.n);
        expect(result.slice(0, 3)).toEqual([1, 3, 5]);
        expect(result.slice(3)).toEqual([null, undefined]);
      });

      it('sorts null/undefined last in descending order too', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('n', 'desc');
        const rows = [{ n: 5 }, { n: null }, { n: 1 }, { n: undefined }, { n: 3 }];
        const result = sortRows(rows).map(r => r.n);
        expect(result.slice(0, 3)).toEqual([5, 3, 1]);
        expect(result.slice(3)).toEqual([null, undefined]);
      });

      it('keeps original order among equal nil values (stable)', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('n', 'asc');
        const a = { id: 'a', n: null };
        const b = { id: 'b', n: undefined };
        const c = { id: 'c', n: null };
        const result = sortRows([a, b, c]);
        expect(result.map(r => r.id)).toEqual(['a', 'b', 'c']);
      });
    });

    describe('stability', () => {
      it('keeps original order for equal keys', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('group', 'asc');
        const rows = [
          { id: 1, group: 'b' },
          { id: 2, group: 'a' },
          { id: 3, group: 'b' },
          { id: 4, group: 'a' },
          { id: 5, group: 'b' },
        ];
        const result = sortRows(rows).map(r => r.id);
        // a's keep original relative order (2,4), then b's (1,3,5).
        expect(result).toEqual([2, 4, 1, 3, 5]);
      });

      it('preserves original order on descending ties as well', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('group', 'desc');
        const rows = [
          { id: 1, group: 'a' },
          { id: 2, group: 'b' },
          { id: 3, group: 'a' },
        ];
        const result = sortRows(rows).map(r => r.id);
        // desc: b first (2), then a's keep original order (1,3).
        expect(result).toEqual([2, 1, 3]);
      });
    });

    describe('custom accessor', () => {
      it('sorts by a nested/derived value via the accessor', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('vendor', 'asc');
        const rows = [
          { id: 1, expand: { vendor: { contact_person: 'Charlie' } } },
          { id: 2, expand: { vendor: { contact_person: 'alice' } } },
          { id: 3, expand: { vendor: { contact_person: 'Bob' } } },
        ];
        const result = sortRows(rows, (row) => row.expand?.vendor?.contact_person);
        expect(result.map(r => r.id)).toEqual([2, 3, 1]);
      });

      it('sorts by a computed/derived numeric total via the accessor', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('total', 'desc');
        const rows = [
          { id: 1, qty: 2, price: 10 }, // 20
          { id: 2, qty: 5, price: 10 }, // 50
          { id: 3, qty: 1, price: 10 }, // 10
        ];
        const result = sortRows(rows, (row) => row.qty * row.price);
        expect(result.map(r => r.id)).toEqual([2, 1, 3]);
      });

      it('treats a missing nested value as nil and sorts it last', () => {
        const { setSort, sortRows } = useTableSort();
        setSort('vendor', 'asc');
        const rows = [
          { id: 1, expand: { vendor: { contact_person: 'Zed' } } },
          { id: 2, expand: undefined as { vendor?: { contact_person: string } } | undefined },
          { id: 3, expand: { vendor: { contact_person: 'Amy' } } },
        ];
        const result = sortRows(rows, (row) => row.expand?.vendor?.contact_person);
        expect(result.map(r => r.id)).toEqual([3, 1, 2]);
      });
    });
  });
});
