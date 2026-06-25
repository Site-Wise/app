import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SortableTh from '../../components/SortableTh.vue';

const mountTh = (props: Record<string, unknown>) =>
  mount(SortableTh, {
    props: { sortKey: 'total', activeKey: null, direction: 'asc', label: 'Total', ...props },
    // <th> must live inside a table row for a valid mount in happy-dom
    attachTo: document.createElement('div'),
  });

describe('SortableTh', () => {
  it('renders the label and is clickable', () => {
    const w = mountTh({});
    expect(w.text()).toContain('Total');
    expect(w.find('th').classes()).toContain('cursor-pointer');
  });

  it('emits "sort" with the column key on click', async () => {
    const w = mountTh({ sortKey: 'amount' });
    await w.find('th').trigger('click');
    expect(w.emitted('sort')?.[0]).toEqual(['amount']);
  });

  it('reports aria-sort none when inactive, ascending/descending when active', () => {
    expect(mountTh({ activeKey: null }).find('th').attributes('aria-sort')).toBe('none');
    expect(mountTh({ sortKey: 'total', activeKey: 'total', direction: 'asc' }).find('th').attributes('aria-sort')).toBe('ascending');
    expect(mountTh({ sortKey: 'total', activeKey: 'total', direction: 'desc' }).find('th').attributes('aria-sort')).toBe('descending');
  });

  it('shows a directional arrow only when active (neutral icon otherwise)', () => {
    // Inactive -> neutral ArrowUpDown; active asc -> ArrowUp; active desc -> ArrowDown.
    const inactive = mountTh({ activeKey: null });
    const activeAsc = mountTh({ sortKey: 'total', activeKey: 'total', direction: 'asc' });
    // The active header highlights its icon with the amber token; the inactive one does not.
    expect(activeAsc.html()).toContain('text-amber-600');
    expect(inactive.html()).not.toContain('text-amber-600');
  });

  it('applies the passed-through th classes and alignment', () => {
    const w = mountTh({ thClass: 'py-3 px-4 font-semibold', align: 'right' });
    const th = w.find('th');
    expect(th.classes()).toEqual(expect.arrayContaining(['py-3', 'px-4', 'font-semibold', 'text-right']));
  });
});
