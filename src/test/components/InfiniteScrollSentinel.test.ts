import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import InfiniteScrollSentinel from '../../components/InfiniteScrollSentinel.vue';

// Mock useI18n: `t` echoes the key, and folds params into the string so we can
// assert the announcement payload (this suite's key-returning convention).
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

// Capture the IntersectionObserver callback + options so we can drive it
// deterministically (happy-dom has no real IntersectionObserver).
let observerCallback:
  | ((entries: Array<{ isIntersecting: boolean }>) => void)
  | null = null;
let observerOptions: any = null;

vi.mock('@vueuse/core', () => ({
  useIntersectionObserver: vi.fn((_target, cb, options) => {
    observerCallback = cb;
    observerOptions = options;
    return { stop: vi.fn(), isActive: { value: true } };
  }),
}));

const fireIntersection = (isIntersecting: boolean) => {
  observerCallback?.([{ isIntersecting }]);
};

const mountSentinel = (props: Record<string, unknown> = {}) =>
  mount(InfiniteScrollSentinel, {
    props: {
      hasMore: true,
      loadingMore: false,
      ...props,
    },
  });

describe('InfiniteScrollSentinel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
    observerOptions = null;
  });

  describe('conditional rendering', () => {
    it('renders nothing when hasMore is false', () => {
      const wrapper = mountSentinel({ hasMore: false });
      expect(wrapper.find('.w-full').exists()).toBe(false);
      expect(wrapper.find('button').exists()).toBe(false);
      wrapper.unmount();
    });

    it('renders the container when hasMore is true', () => {
      const wrapper = mountSentinel({ hasMore: true });
      expect(wrapper.find('.w-full').exists()).toBe(true);
      wrapper.unmount();
    });
  });

  describe('load more button vs loading slot', () => {
    it('shows the Load more button when not loadingMore', () => {
      const wrapper = mountSentinel({ loadingMore: false });
      const button = wrapper.find('button');
      expect(button.exists()).toBe(true);
      expect(button.text()).toBe('common.loadMore');
      wrapper.unmount();
    });

    it('emits loadMore when the button is clicked', async () => {
      const wrapper = mountSentinel({ loadingMore: false });
      await wrapper.find('button').trigger('click');
      expect(wrapper.emitted('loadMore')).toHaveLength(1);
      wrapper.unmount();
    });

    it('shows the loading slot and hides the button when loadingMore', () => {
      const wrapper = mountSentinel({ loadingMore: true });
      expect(wrapper.find('button').exists()).toBe(false);
      // Default skeleton content renders the loadingMore key.
      expect(wrapper.text()).toContain('common.loadingMore');
      wrapper.unmount();
    });

    it('renders a custom skeleton slot when loadingMore', () => {
      const wrapper = mount(InfiniteScrollSentinel, {
        props: { hasMore: true, loadingMore: true },
        slots: { skeleton: '<div class="custom-skeleton">Custom</div>' },
      });
      expect(wrapper.find('.custom-skeleton').exists()).toBe(true);
      expect(wrapper.find('button').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe('intersection observer behavior', () => {
    it('emits loadMore on intersection when hasMore && !loadingMore', () => {
      const wrapper = mountSentinel({ hasMore: true, loadingMore: false });
      fireIntersection(true);
      expect(wrapper.emitted('loadMore')).toHaveLength(1);
      wrapper.unmount();
    });

    it('does NOT emit loadMore when entry is not intersecting', () => {
      const wrapper = mountSentinel({ hasMore: true, loadingMore: false });
      fireIntersection(false);
      expect(wrapper.emitted('loadMore')).toBeUndefined();
      wrapper.unmount();
    });

    it('does NOT emit loadMore on intersection when loadingMore', () => {
      const wrapper = mountSentinel({ hasMore: true, loadingMore: true });
      fireIntersection(true);
      expect(wrapper.emitted('loadMore')).toBeUndefined();
      wrapper.unmount();
    });

    it('does NOT emit loadMore on intersection when !hasMore', () => {
      const wrapper = mountSentinel({ hasMore: false, loadingMore: false });
      fireIntersection(true);
      expect(wrapper.emitted('loadMore')).toBeUndefined();
      wrapper.unmount();
    });

    it('uses a 300px rootMargin for prefetch', () => {
      const wrapper = mountSentinel();
      expect(observerOptions?.rootMargin).toBe('300px');
      wrapper.unmount();
    });

    it('forwards the root prop to the observer (resolves to null by default)', () => {
      const wrapper = mountSentinel();
      // `root` is provided as a getter; default resolves to null.
      expect(typeof observerOptions?.root).toBe('function');
      expect(observerOptions.root()).toBeNull();
      wrapper.unmount();
    });

    it('forwards a provided root element to the observer getter', () => {
      const rootEl = document.createElement('div');
      const wrapper = mountSentinel({ root: rootEl });
      expect(observerOptions.root()).toBe(rootEl);
      wrapper.unmount();
    });
  });

  describe('aria-live announcement', () => {
    const statusText = (wrapper: any) =>
      wrapper.find('[role="status"]').text();

    it('announces "loaded N more" when loadingMore goes true->false with loadedCount > 0', async () => {
      const wrapper = mountSentinel({ loadingMore: true, loadedCount: 5 });
      await wrapper.setProps({ loadingMore: false });
      expect(statusText(wrapper)).toContain('common.loadedMore');
      expect(statusText(wrapper)).toContain('"count":5');
      wrapper.unmount();
    });

    it('does NOT announce when loadedCount is 0', async () => {
      const wrapper = mountSentinel({ loadingMore: true, loadedCount: 0 });
      await wrapper.setProps({ loadingMore: false });
      expect(statusText(wrapper)).toBe('');
      wrapper.unmount();
    });

    it('does NOT announce when loadedCount is undefined', async () => {
      const wrapper = mountSentinel({ loadingMore: true });
      await wrapper.setProps({ loadingMore: false });
      expect(statusText(wrapper)).toBe('');
      wrapper.unmount();
    });

    it('does NOT announce when loadingMore goes false->true (cycle not completed)', async () => {
      const wrapper = mountSentinel({ loadingMore: false, loadedCount: 5 });
      await wrapper.setProps({ loadingMore: true });
      expect(statusText(wrapper)).toBe('');
      wrapper.unmount();
    });

    it('renders the polite aria-live status region', () => {
      const wrapper = mountSentinel();
      const status = wrapper.find('[role="status"]');
      expect(status.exists()).toBe(true);
      expect(status.attributes('aria-live')).toBe('polite');
      wrapper.unmount();
    });
  });
});
