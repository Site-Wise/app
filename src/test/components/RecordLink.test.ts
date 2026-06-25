import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import { ref } from 'vue';
import RecordLink from '../../components/RecordLink.vue';

// Mutable permission refs so each test can toggle them.
const canRead = ref(true);
const canViewFinancials = ref(true);

vi.mock('../../composables/usePermissions', () => ({
  usePermissions: () => ({ canRead, canViewFinancials }),
}));

function mountLink(props: Record<string, unknown>) {
  return mount(RecordLink, {
    props,
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe('RecordLink', () => {
  beforeEach(() => {
    canRead.value = true;
    canViewFinancials.value = true;
  });

  it('detail mode builds the entity detail route', () => {
    const wrapper = mountLink({ type: 'vendor', id: 'v1', label: 'Acme', mode: 'detail' });
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.exists()).toBe(true);
    expect(link.props('to')).toEqual({ path: '/vendors/v1' });
    expect(wrapper.text()).toBe('Acme');
  });

  it('maps each detail-capable type to its base path', () => {
    const cases: Array<[string, string]> = [
      ['vendor', '/vendors/x'],
      ['item', '/items/x'],
      ['service', '/services/x'],
      ['account', '/accounts/x'],
    ];
    for (const [type, path] of cases) {
      const wrapper = mountLink({ type, id: 'x', label: 'L', mode: 'detail' });
      expect(wrapper.findComponent(RouterLinkStub).props('to')).toEqual({ path });
    }
  });

  it('filter mode builds { path, query } with default filter key from type', () => {
    const wrapper = mountLink({
      type: 'vendor',
      id: 'v1',
      label: 'Acme',
      mode: 'filter',
      target: '/deliveries',
    });
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toEqual({
      path: '/deliveries',
      query: { vendor: 'v1' },
    });
  });

  it('filter mode honors an explicit filterKey', () => {
    const wrapper = mountLink({
      type: 'item',
      id: 'i1',
      label: 'Cement',
      mode: 'filter',
      target: '/deliveries',
      filterKey: 'item_id',
    });
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toEqual({
      path: '/deliveries',
      query: { item_id: 'i1' },
    });
  });

  it('falls back to filter mode for types without a detail route', () => {
    const wrapper = mountLink({
      type: 'delivery',
      id: 'd1',
      label: 'Delivery',
      mode: 'detail',
      target: '/deliveries',
    });
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toEqual({
      path: '/deliveries',
      query: { delivery: 'd1' },
    });
  });

  it('renders plain text (no link) when canRead is denied', () => {
    canRead.value = false;
    const wrapper = mountLink({ type: 'vendor', id: 'v1', label: 'Acme', mode: 'detail' });
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
    expect(wrapper.find('span').exists()).toBe(true);
    expect(wrapper.text()).toBe('Acme');
  });

  it('financial types require canViewFinancials', () => {
    canViewFinancials.value = false;
    const wrapper = mountLink({ type: 'account', id: 'a1', label: 'Cash', mode: 'detail' });
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
    expect(wrapper.text()).toBe('Cash');
  });

  it('renders plain text when filter mode is missing a target', () => {
    const wrapper = mountLink({ type: 'vendor', id: 'v1', label: 'Acme', mode: 'filter' });
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
    expect(wrapper.text()).toBe('Acme');
  });

  it('stops click propagation so it does not trigger outer handlers', async () => {
    const outer = vi.fn();
    const wrapper = mount(
      {
        components: { RecordLink },
        template: `<div @click="outer"><RecordLink type="vendor" id="v1" label="Acme" mode="detail" /></div>`,
        methods: { outer },
      },
      {
        global: { stubs: { RouterLink: RouterLinkStub } },
      }
    );
    await wrapper.findComponent(RouterLinkStub).trigger('click');
    expect(outer).not.toHaveBeenCalled();
  });

  it('stops click propagation on the plain-text fallback too', async () => {
    canRead.value = false;
    const outer = vi.fn();
    const wrapper = mount(
      {
        components: { RecordLink },
        template: `<div @click="outer"><RecordLink type="vendor" id="v1" label="Acme" mode="detail" /></div>`,
        methods: { outer },
      },
      {
        global: { stubs: { RouterLink: RouterLinkStub } },
      }
    );
    await wrapper.find('span').trigger('click');
    expect(outer).not.toHaveBeenCalled();
  });
});
