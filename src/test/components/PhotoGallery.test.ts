
import { nextTick } from 'vue';
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PhotoGallery from '../../components/PhotoGallery.vue';

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

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
    expect(wrapper.find('.max-w-7xl img').attributes('src')).toContain('photo1.jpg');

    await wrapper.find('[aria-label="photos.nextPhoto"]').trigger('click');
    expect(wrapper.find('.max-w-7xl img').attributes('src')).toContain('photo2.jpg');

    await wrapper.find('[aria-label="photos.previousPhoto"]').trigger('click');
    expect(wrapper.find('.max-w-7xl img').attributes('src')).toContain('photo1.jpg');
  });

  it('toggles zoom on the photo', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg'],
      },
    });

    await wrapper.find('.grid > div').trigger('click');
    await wrapper.find('[title="photos.zoomIn"]').trigger('click');
    expect(wrapper.find('.max-w-7xl img').classes()).toContain('cursor-zoom-out');

    await wrapper.find('[title="photos.zoomOut"]').trigger('click');
    expect(wrapper.find('.max-w-7xl img').classes()).toContain('cursor-zoom-in');
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
    expect(wrapper.find('.max-w-7xl img').attributes('src')).toContain('photo2.jpg');

    (wrapper.vm as any).previousPhoto();
    await nextTick();
    expect(wrapper.find('.max-w-7xl img').attributes('src')).toContain('photo1.jpg');
  });

  it('navigates with thumbnail clicks', async () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
      },
      attachTo: document.body,
    });

    await wrapper.find('.grid > div').trigger('click');
    await wrapper.findAll('.absolute.bottom-20 .flex-shrink-0')[2].trigger('click');
    expect(wrapper.find('.max-w-7xl img').attributes('src')).toContain('photo3.jpg');
  });

  it('shows the photo count indicator', () => {
    const wrapper = mount(PhotoGallery, {
      props: {
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
      },
    });

    expect(wrapper.find('.bg-black.bg-opacity-70').text()).toBe('+2');
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
    expect(wrapper.find('.bg-black.bg-opacity-50.rounded-lg').exists()).toBe(true);
  });
});
