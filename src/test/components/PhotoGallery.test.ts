
import { nextTick } from 'vue';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, enableAutoUnmount } from '@vue/test-utils';
import PhotoGallery from '../../components/PhotoGallery.vue';

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

// Auto-unmount every mounted wrapper after each test so PhotoGallery's
// onUnmounted detaches its document-level keydown/mouse/wheel listeners.
// Without this, stale listeners (e.g. a Delete-key handler) leak between tests.
enableAutoUnmount(afterEach);

// Mount with attachTo body and open the gallery at a given index. Returns wrapper.
const openGallery = async (photos: string[], index = 0, extraProps: Record<string, unknown> = {}) => {
  const wrapper = mount(PhotoGallery, {
    props: { photos, ...extraProps },
    attachTo: document.body,
  });
  await wrapper.findAll('.grid > div')[index].trigger('click');
  await nextTick();
  return wrapper;
};

describe('PhotoGallery.vue', () => {
  it('renders the empty state when there are no photos', () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: [],
      },
    });

    expect(wrapper.find('.text-center').exists()).toBe(true);
    expect(wrapper.find('h3').text()).toBe('delivery.noPhotos');
  });

  it('renders the photo grid when there are photos', () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg', 'photo2.jpg'],
      },
    });

    expect(wrapper.find('.grid').exists()).toBe(true);
    expect(wrapper.findAll('.grid > div').length).toBe(2);
  });

  it('opens the gallery when a photo is clicked', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg', 'photo2.jpg'],
      },
    });

    await wrapper.find('.grid > div').trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });

  it('closes the gallery when the close button is clicked', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg', 'photo2.jpg'],
      },
    });

    await wrapper.find('.grid > div').trigger('click');
    await wrapper.find('[aria-label="photos.closeGallery"]').trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('navigates to the next and previous photos', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
      },
    });

    await wrapper.find('.grid > div').trigger('click');
    // Main gallery image is the only <img> with the full-screen object-contain class.
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo1.jpg');

    await wrapper.find('[aria-label="photos.nextPhoto"]').trigger('click');
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo2.jpg');

    await wrapper.find('[aria-label="photos.previousPhoto"]').trigger('click');
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo1.jpg');
  });

  it('toggles zoom on the photo', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg'],
      },
    });

    await wrapper.find('.grid > div').trigger('click');
    await wrapper.find('[title="photos.zoomIn"]').trigger('click');
    expect(wrapper.find('img.max-h-screen').classes()).toContain('cursor-zoom-out');

    await wrapper.find('[title="photos.zoomOut"]').trigger('click');
    expect(wrapper.find('img.max-h-screen').classes()).toContain('cursor-zoom-in');
  });

  it('downloads the photo', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg'],
      },
      attachTo: document.body,
    });

    await wrapper.find('.grid > div').trigger('click');

    // Spy on createElement AFTER mounting to avoid capturing component elements
    const createElementSpy = vi.spyOn(document, 'createElement');

    await wrapper.find('[title="files.download"]').trigger('click');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    createElementSpy.mockRestore();
  });

  it('deletes the photo', async () => {
    global.confirm = vi.fn(() => true);

    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg'],
        showDeleteButton: true,
      },
      attachTo: document.body,
    });

    await wrapper.find('.grid > div').trigger('click');
    await wrapper.find('[title="files.delete"]').trigger('click');

    expect(global.confirm).toHaveBeenCalled();
    expect(wrapper.emitted('photoDeleted')).toBeTruthy();
  });

  it('navigates with keyboard arrows', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg', 'photo2.jpg'],
      },
      attachTo: document.body,
    });

    await wrapper.find('.grid > div').trigger('click');
    (wrapper.vm as any).nextPhoto();
    await nextTick();
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo2.jpg');

    (wrapper.vm as any).previousPhoto();
    await nextTick();
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo1.jpg');
  });

  it('navigates with thumbnail clicks', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
      },
      attachTo: document.body,
    });

    await wrapper.find('.grid > div').trigger('click');
    // Thumbnail strip lives in the bottom chrome; each thumb is a flex-shrink-0 button.
    await wrapper.findAll('.bottom-0 .flex-shrink-0')[2].trigger('click');
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo3.jpg');
  });

  it('shows the photo count indicator', () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
      },
    });

    expect(wrapper.find('.bg-ink\\/70').text()).toBe('+2');
  });

  it('shows the loading spinner', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg'],
      },
      attachTo: document.body,
    });

    await wrapper.find('.grid > div').trigger('click');
    (wrapper.vm as any).photoLoading = true;
    await nextTick();
    // Loading spinner container uses the rounded-2xl backdrop pill in the gallery.
    expect(wrapper.find('.rounded-2xl.backdrop-blur-sm').exists()).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Added coverage: navigation bounds, zoom/pan, thumbnails, keyboard, loading,
  // overlay-info, single vs multi photo UI, and download path.
  // ---------------------------------------------------------------------------

  afterEach(() => {
    // enableAutoUnmount already unmounted wrappers; just scrub leftover DOM + mocks.
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('opens the gallery at the clicked photo index, not always the first', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg', 'photo3.jpg'], 2);
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo3.jpg');
    // Counter overlay reflects the active index per photo (3 / 3).
    expect(wrapper.find('.font-mono.sw-tabular').text()).toBe('3 / 3');
  });

  it('does not navigate before the first photo (lower bound)', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg']);
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo1.jpg');

    // previousPhoto at index 0 is a no-op.
    (wrapper.vm as any).previousPhoto();
    await nextTick();
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo1.jpg');
    expect((wrapper.vm as any).currentPhotoIndex).toBe(0);
  });

  it('does not navigate past the last photo (upper bound)', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg'], 1);
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo2.jpg');

    // nextPhoto at the last index is a no-op.
    (wrapper.vm as any).nextPhoto();
    await nextTick();
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo2.jpg');
    expect((wrapper.vm as any).currentPhotoIndex).toBe(1);
  });

  it('disables the prev button on the first photo and next on the last', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg']);

    const prevBtn = wrapper.find('[aria-label="photos.previousPhoto"]');
    const nextBtn = wrapper.find('[aria-label="photos.nextPhoto"]');
    expect(prevBtn.attributes('disabled')).toBeDefined();
    expect(prevBtn.classes()).toContain('cursor-not-allowed');
    expect(nextBtn.attributes('disabled')).toBeUndefined();

    await nextBtn.trigger('click');
    expect(wrapper.find('[aria-label="photos.previousPhoto"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[aria-label="photos.nextPhoto"]').attributes('disabled')).toBeDefined();
  });

  it('resets zoom when navigating to another photo', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg']);
    (wrapper.vm as any).toggleZoom();
    await nextTick();
    expect((wrapper.vm as any).isZoomed).toBe(true);

    (wrapper.vm as any).nextPhoto();
    await nextTick();
    expect((wrapper.vm as any).isZoomed).toBe(false);
    expect((wrapper.vm as any).zoomLevel).toBe(1);
  });

  it('applies a scale transform to the image when zoomed and clears it when reset', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    await wrapper.find('[title="photos.zoomIn"]').trigger('click');
    // happy-dom getAttribute('style') is unreliable after re-render; read html().
    expect(wrapper.html()).toContain('scale(2)');

    await wrapper.find('[title="photos.zoomOut"]').trigger('click');
    expect(wrapper.html()).not.toContain('scale(2)');
    expect((wrapper.vm as any).zoomX).toBe(0);
    expect((wrapper.vm as any).zoomY).toBe(0);
  });

  it('syncs the active index when a thumbnail is selected', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg', 'photo3.jpg']);
    const thumbs = wrapper.findAll('.bottom-0 .flex-shrink-0');

    await thumbs[1].trigger('click');
    expect((wrapper.vm as any).currentPhotoIndex).toBe(1);
    // Active thumbnail gets the clay border highlight.
    expect(wrapper.findAll('.bottom-0 .flex-shrink-0')[1].classes()).toContain('border-clay-500');
    expect(wrapper.find('.font-mono.sw-tabular').text()).toBe('2 / 3');
  });

  it('handles ArrowRight / ArrowLeft / Escape keyboard navigation', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg']);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await nextTick();
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo2.jpg');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await nextTick();
    expect(wrapper.find('img.max-h-screen').attributes('src')).toContain('photo1.jpg');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('toggles zoom with the Space key', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    expect((wrapper.vm as any).isZoomed).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await nextTick();
    expect((wrapper.vm as any).isZoomed).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await nextTick();
    expect((wrapper.vm as any).isZoomed).toBe(false);
  });

  it('ignores keyboard events when the gallery is closed', async () => {
    const wrapper = mount(PhotoGallery, {
      props: { photos: ['photo1.jpg', 'photo2.jpg'] },
      attachTo: document.body,
    });
    // Gallery not open: keydown must not change index or open anything.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await nextTick();
    expect((wrapper.vm as any).currentPhotoIndex).toBe(0);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('triggers delete via the Delete key only when showDeleteButton is set', async () => {
    global.confirm = vi.fn(() => true);
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg'], 0, { showDeleteButton: true });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    await nextTick();
    expect(global.confirm).toHaveBeenCalled();
    expect(wrapper.emitted('photoDeleted')).toBeTruthy();
  });

  it('does not delete via the Delete key when showDeleteButton is false', async () => {
    global.confirm = vi.fn(() => true);
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg']);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    await nextTick();
    expect(global.confirm).not.toHaveBeenCalled();
    expect(wrapper.emitted('photoDeleted')).toBeFalsy();
  });

  it('hides the loading spinner once the photo load event fires', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    (wrapper.vm as any).photoLoading = true;
    await nextTick();
    expect(wrapper.find('.rounded-2xl.backdrop-blur-sm').exists()).toBe(true);

    await wrapper.find('img.max-h-screen').trigger('load');
    expect((wrapper.vm as any).photoLoading).toBe(false);
    expect(wrapper.find('.rounded-2xl.backdrop-blur-sm').exists()).toBe(false);
  });

  it('renders the overlay counter info for the current photo', async () => {
    const wrapper = await openGallery(['a.jpg', 'b.jpg', 'c.jpg'], 1);
    expect(wrapper.find('.font-mono.sw-tabular').text()).toBe('2 / 3');
  });

  it('shows navigation chrome and thumbnails only for multiple photos', async () => {
    const single = await openGallery(['only.jpg']);
    // Single photo: no nav arrows, no thumbnail strip.
    expect(single.find('[aria-label="photos.nextPhoto"]').exists()).toBe(false);
    expect(single.find('[aria-label="photos.previousPhoto"]').exists()).toBe(false);
    expect(single.findAll('.bottom-0 .flex-shrink-0').length).toBe(0);
    expect(single.find('.font-mono.sw-tabular').text()).toBe('1 / 1');
    single.unmount();

    const multi = await openGallery(['1.jpg', '2.jpg']);
    expect(multi.find('[aria-label="photos.nextPhoto"]').exists()).toBe(true);
    expect(multi.findAll('.bottom-0 .flex-shrink-0').length).toBe(2);
  });

  it('does not render the +N indicator for a single photo', async () => {
    const wrapper = mount(PhotoGallery, { props: { photos: ['only.jpg'] } });
    expect(wrapper.find('.bg-ink\\/70').exists()).toBe(false);
  });

  it('downloads the current photo with the right href and filename', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg'], 1, { itemId: 'item-42' });

    // Capture the anchor created for the download and stub its click (no real nav).
    const realCreate = document.createElement.bind(document);
    let anchor: HTMLAnchorElement | null = null;
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === 'a') {
        anchor = el as HTMLAnchorElement;
        anchor.click = vi.fn();
      }
      return el;
    });

    await wrapper.find('[title="files.download"]').trigger('click');

    expect(createSpy).toHaveBeenCalledWith('a');
    expect(anchor).not.toBeNull();
    expect(anchor!.href).toContain('item-42');
    expect(anchor!.href).toContain('photo2.jpg');
    expect(anchor!.download).toBe('photo-2.jpg');
    expect(anchor!.target).toBe('_blank');
    expect(anchor!.click).toHaveBeenCalled();
    // Anchor is cleaned up from the DOM after clicking.
    expect(document.body.contains(anchor)).toBe(false);
  });

  it('builds a plain filename URL when no itemId is provided', async () => {
    const wrapper = await openGallery(['plain.jpg']);
    // getPhotoUrl returns the raw filename without the PocketBase prefix.
    expect((wrapper.vm as any).getPhotoUrl('plain.jpg')).toBe('plain.jpg');
  });

  // ---------------------------------------------------------------------------
  // Gesture handlers: surface click, swipe-to-navigate, pan when zoomed,
  // wheel zoom, mouse-drag pan, and tap-to-toggle-chrome.
  // ---------------------------------------------------------------------------

  // Minimal single-touch event shaped like the handlers expect.
  const touch = (x: number, y: number) =>
    ({ touches: [{ clientX: x, clientY: y }], preventDefault: () => {} }) as unknown as TouchEvent;
  const emptyTouchEnd = () => ({ preventDefault: () => {} }) as unknown as TouchEvent;

  it('toggles zoom when the image surface is clicked (desktop)', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    const vm = wrapper.vm as any;
    expect(vm.isZoomed).toBe(false);

    // Click on the IMG element zooms in.
    vm.onSurfaceClick({ target: { tagName: 'IMG' } } as unknown as MouseEvent);
    await nextTick();
    expect(vm.isZoomed).toBe(true);
  });

  it('closes the gallery when the dark surround (non-image) is clicked', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    const vm = wrapper.vm as any;

    vm.onSurfaceClick({ target: { tagName: 'DIV' } } as unknown as MouseEvent);
    await nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('ignores a synthetic surface click that follows a touch', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    const vm = wrapper.vm as any;

    // A touchend updates lastTouchEndAt; a click within 500ms is ignored.
    vm.handleTouchEnd(emptyTouchEnd());
    vm.onSurfaceClick({ target: { tagName: 'IMG' } } as unknown as MouseEvent);
    await nextTick();
    expect(vm.isZoomed).toBe(false);
  });

  it('navigates to the next photo on a left swipe', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg', 'photo3.jpg']);
    const vm = wrapper.vm as any;

    vm.handleTouchStart(touch(300, 200));
    vm.handleTouchMove(touch(280, 198)); // lock horizontal
    vm.handleTouchMove(touch(120, 198)); // drag far left
    vm.handleTouchEnd(emptyTouchEnd());
    await nextTick();

    expect(vm.currentPhotoIndex).toBe(1);
    expect(vm.isSwiping).toBe(false);
    expect(vm.swipeOffset).toBe(0);
  });

  it('navigates to the previous photo on a right swipe', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg', 'photo3.jpg'], 2);
    const vm = wrapper.vm as any;

    vm.handleTouchStart(touch(120, 200));
    vm.handleTouchMove(touch(140, 202));
    vm.handleTouchMove(touch(320, 202)); // drag far right
    vm.handleTouchEnd(emptyTouchEnd());
    await nextTick();

    expect(vm.currentPhotoIndex).toBe(1);
  });

  it('applies edge resistance and does not navigate past the first photo on swipe', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg']);
    const vm = wrapper.vm as any;

    // Swipe right at the first photo: bounded by resistance, no navigation.
    vm.handleTouchStart(touch(100, 200));
    vm.handleTouchMove(touch(120, 200));
    vm.handleTouchMove(touch(220, 200));
    expect(vm.swipeOffset).toBeGreaterThan(0);
    // Resistance applied (0.35x) — offset is less than the raw 120px drag.
    expect(vm.swipeOffset).toBeLessThan(120);

    vm.handleTouchEnd(emptyTouchEnd());
    await nextTick();
    expect(vm.currentPhotoIndex).toBe(0);
  });

  it('treats a non-swipe touch as a single tap that toggles chrome', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    const vm = wrapper.vm as any;
    expect(vm.chromeVisible).toBe(true);

    // No movement => tap. First tap hides chrome.
    vm.handleTouchStart(touch(150, 150));
    vm.handleTouchEnd(emptyTouchEnd());
    await nextTick();
    expect(vm.chromeVisible).toBe(false);
  });

  it('treats a quick double tap as a zoom toggle', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    const vm = wrapper.vm as any;

    // First tap registers lastTapAt; second tap within 300ms zooms.
    vm.handleTouchStart(touch(150, 150));
    vm.handleTouchEnd(emptyTouchEnd());
    vm.handleTouchStart(touch(150, 150));
    vm.handleTouchEnd(emptyTouchEnd());
    await nextTick();
    expect(vm.isZoomed).toBe(true);
  });

  it('pans the zoomed image on touch move instead of swiping', async () => {
    const wrapper = await openGallery(['photo1.jpg', 'photo2.jpg']);
    const vm = wrapper.vm as any;
    vm.toggleZoom();
    await nextTick();
    expect(vm.isZoomed).toBe(true);

    vm.handleTouchStart(touch(200, 200));
    vm.handleTouchMove(touch(240, 230)); // pan right/down
    await nextTick();
    expect(vm.zoomX).not.toBe(0);
    expect(vm.zoomY).not.toBe(0);
    // Index unchanged while zoomed (no swipe navigation).
    expect(vm.currentPhotoIndex).toBe(0);

    vm.handleTouchEnd(emptyTouchEnd());
  });

  it('zooms in and out with the mouse wheel', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    const vm = wrapper.vm as any;

    // Wheel up (deltaY < 0) increases zoom past 1 -> isZoomed.
    document.dispatchEvent(
      Object.assign(new Event('wheel', { cancelable: true }), { deltaY: -100 })
    );
    await nextTick();
    expect(vm.zoomLevel).toBeGreaterThan(1);
    expect(vm.isZoomed).toBe(true);

    // Wheel down repeatedly brings it back to <=1 -> not zoomed, pan reset.
    for (let i = 0; i < 20; i++) {
      document.dispatchEvent(
        Object.assign(new Event('wheel', { cancelable: true }), { deltaY: 100 })
      );
    }
    await nextTick();
    expect(vm.isZoomed).toBe(false);
    expect(vm.zoomX).toBe(0);
    expect(vm.zoomY).toBe(0);
  });

  it('ignores wheel events when the gallery is closed', async () => {
    const wrapper = mount(PhotoGallery, {
      props: { photos: ['photo1.jpg'] },
      attachTo: document.body,
    });
    const vm = wrapper.vm as any;
    document.dispatchEvent(
      Object.assign(new Event('wheel', { cancelable: true }), { deltaY: -100 })
    );
    await nextTick();
    expect(vm.zoomLevel).toBe(1);
  });

  it('pans the zoomed image with mouse drag and stops on mouse up', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    const vm = wrapper.vm as any;
    vm.toggleZoom();
    await nextTick();

    document.dispatchEvent(
      Object.assign(new MouseEvent('mousedown', { cancelable: true }), { clientX: 100, clientY: 100 })
    );
    document.dispatchEvent(
      Object.assign(new MouseEvent('mousemove', { cancelable: true }), { clientX: 160, clientY: 140 })
    );
    await nextTick();
    expect(vm.zoomX).not.toBe(0);
    expect(vm.zoomY).not.toBe(0);

    const xAfterUp = vm.zoomX;
    document.dispatchEvent(new MouseEvent('mouseup'));
    // After mouseup, further moves do not pan.
    document.dispatchEvent(
      Object.assign(new MouseEvent('mousemove', { cancelable: true }), { clientX: 300, clientY: 300 })
    );
    await nextTick();
    expect(vm.zoomX).toBe(xAfterUp);
  });

  it('does not pan with the mouse when not zoomed', async () => {
    const wrapper = await openGallery(['photo1.jpg']);
    const vm = wrapper.vm as any;

    document.dispatchEvent(
      Object.assign(new MouseEvent('mousedown', { cancelable: true }), { clientX: 100, clientY: 100 })
    );
    document.dispatchEvent(
      Object.assign(new MouseEvent('mousemove', { cancelable: true }), { clientX: 200, clientY: 200 })
    );
    await nextTick();
    expect(vm.zoomX).toBe(0);
    expect(vm.zoomY).toBe(0);
  });
});
