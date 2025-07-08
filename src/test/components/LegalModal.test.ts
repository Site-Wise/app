
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LegalModal from '../../components/LegalModal.vue';

describe('LegalModal.vue', () => {
  it('renders the terms and conditions', async () => {
    const wrapper = mount(LegalModal, {
      props: {
        isVisible: true,
        type: 'terms',
      },
    });

    expect(wrapper.find('h3').text()).toBe('Terms and Conditions');
    expect(wrapper.html()).toContain('Terms and Conditions');
  });

  it('renders the privacy policy', async () => {
    const wrapper = mount(LegalModal, {
      props: {
        isVisible: true,
        type: 'privacy',
      },
    });

    expect(wrapper.find('h3').text()).toBe('Privacy Policy');
    expect(wrapper.html()).toContain('Privacy Policy');
  });

  it('emits a close event when the close button is clicked', async () => {
    const wrapper = mount(LegalModal, {
      props: {
        isVisible: true,
        type: 'terms',
      },
    });

    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits a close event when the backdrop is clicked', async () => {
    const wrapper = mount(LegalModal, {
      props: {
        isVisible: true,
        type: 'terms',
      },
    });

    await wrapper.find('.fixed').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits a close event when the escape key is pressed', async () => {
    const wrapper = mount(LegalModal, {
      props: {
        isVisible: true,
        type: 'terms',
      },
    });

    await wrapper.trigger('keydown.esc');
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
