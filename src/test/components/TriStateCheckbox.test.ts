import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TriStateCheckbox from '../../components/TriStateCheckbox.vue';

describe('TriStateCheckbox', () => {
  let wrapper: any;

  const defaultProps = {
    id: 'test-checkbox',
    label: 'Test Checkbox',
    state: 'unchecked' as const,
    totalAmount: 100,
    allocatedAmount: 0
  };

  beforeEach(() => {
    wrapper = mount(TriStateCheckbox, {
      props: defaultProps
    });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('rendering', () => {
    it('should render checkbox with label', () => {
      expect(wrapper.find('button[role="checkbox"]').exists()).toBe(true);
      expect(wrapper.find('label').text()).toBe('Test Checkbox');
    });

    it('should display total amount when unchecked', () => {
      expect(wrapper.text()).toContain('₹100.00');
    });

    it('should display allocated amount when checked', async () => {
      await wrapper.setProps({
        state: 'checked',
        allocatedAmount: 100
      });
      
      expect(wrapper.text()).toContain('₹100.00');
      expect(wrapper.find('.text-green-600').exists()).toBe(true);
    });

    it('should display partial amount when partial', async () => {
      await wrapper.setProps({
        state: 'partial',
        allocatedAmount: 50
      });
      
      expect(wrapper.text()).toContain('₹50.00 / ₹100.00');
      expect(wrapper.find('.text-blue-600').exists()).toBe(true);
    });

    it('should show secondary text when provided', async () => {
      await wrapper.setProps({
        secondaryText: 'Additional info'
      });
      
      expect(wrapper.text()).toContain('Additional info');
    });
  });

  describe('state visual indicators', () => {
    it('should show correct classes for unchecked state', () => {
      const checkbox = wrapper.find('button[role="checkbox"]');
      expect(checkbox.classes()).toContain('bg-white');
      expect(checkbox.classes()).toContain('border-gray-300');
    });

    it('should show correct classes for checked state', async () => {
      await wrapper.setProps({ state: 'checked' });
      
      const checkbox = wrapper.find('button[role="checkbox"]');
      expect(checkbox.classes()).toContain('bg-green-500');
      expect(checkbox.classes()).toContain('border-green-500');
      expect(wrapper.find('svg').exists()).toBe(true); // Check icon
    });

    it('should show correct classes for partial state', async () => {
      await wrapper.setProps({ state: 'partial' });
      
      const checkbox = wrapper.find('button[role="checkbox"]');
      expect(checkbox.classes()).toContain('bg-blue-500');
      expect(checkbox.classes()).toContain('border-blue-500');
      expect(wrapper.find('.bg-white.rounded-sm').exists()).toBe(true); // Partial indicator
    });
  });

  describe('state changes', () => {
    it('should cycle through states on click', async () => {
      const checkbox = wrapper.find('button[role="checkbox"]');
      
      // Start unchecked, click to check
      await checkbox.trigger('click');
      expect(wrapper.emitted('update:state')).toBeTruthy();
      expect(wrapper.emitted('update:state')[0]).toEqual(['checked']);
      expect(wrapper.emitted('update:allocatedAmount')[0]).toEqual([100]);
      
      // Update props to checked, click for partial
      await wrapper.setProps({ state: 'checked', allowPartialEdit: true });
      await checkbox.trigger('click');
      expect(wrapper.emitted('update:state')[1]).toEqual(['partial']);
      expect(wrapper.emitted('update:allocatedAmount')[1]).toEqual([50]);
      
      // Update props to partial, click for unchecked
      await wrapper.setProps({ state: 'partial' });
      await checkbox.trigger('click');
      expect(wrapper.emitted('update:state')[2]).toEqual(['unchecked']);
      expect(wrapper.emitted('update:allocatedAmount')[2]).toEqual([0]);
    });

    it('should skip partial state when allowPartialEdit is false', async () => {
      await wrapper.setProps({ state: 'checked', allowPartialEdit: false });
      const checkbox = wrapper.find('button[role="checkbox"]');
      
      await checkbox.trigger('click');
      expect(wrapper.emitted('update:state')[0]).toEqual(['unchecked']);
      expect(wrapper.emitted('update:allocatedAmount')[0]).toEqual([0]);
    });

    it('should emit change event with state and amount data', async () => {
      const checkbox = wrapper.find('button[role="checkbox"]');
      
      await checkbox.trigger('click');
      expect(wrapper.emitted('change')).toBeTruthy();
      expect(wrapper.emitted('change')[0]).toEqual([{
        state: 'checked',
        allocatedAmount: 100
      }]);
    });
  });

  describe('partial amount editing', () => {
    beforeEach(async () => {
      await wrapper.setProps({
        state: 'partial',
        allocatedAmount: 50,
        allowPartialEdit: true
      });
    });

    it('should show partial amount input when partial and allowPartialEdit is true', () => {
      expect(wrapper.find('input[type="number"]').exists()).toBe(true);
      expect(wrapper.find('input[type="number"]').element.value).toBe('50');
    });

    it('should update allocated amount when partial input changes', async () => {
      const input = wrapper.find('input[type="number"]');
      
      await input.setValue('75');
      await input.trigger('input');
      
      expect(wrapper.emitted('update:allocatedAmount')).toBeTruthy();
      expect(wrapper.emitted('change')).toBeTruthy();
    });

    it('should clamp partial amount to valid range', async () => {
      const input = wrapper.find('input[type="number"]');
      
      // Test upper bound
      await input.setValue('150');
      await input.trigger('input');
      
      expect(wrapper.vm.partialAmount).toBe(100);
      
      // Test lower bound
      await input.setValue('-10');
      await input.trigger('input');
      
      expect(wrapper.vm.partialAmount).toBe(0);
    });

    it('should change to checked state when partial amount equals total', async () => {
      const input = wrapper.find('input[type="number"]');
      
      await input.setValue('100');
      await input.trigger('blur');
      
      expect(wrapper.emitted('update:state')).toBeTruthy();
      expect(wrapper.emitted('update:state')[0]).toEqual(['checked']);
    });

    it('should change to unchecked state when partial amount is zero', async () => {
      const input = wrapper.find('input[type="number"]');
      
      await input.setValue('0');
      await input.trigger('blur');
      
      expect(wrapper.emitted('update:state')).toBeTruthy();
      expect(wrapper.emitted('update:state')[0]).toEqual(['unchecked']);
    });
  });

  describe('disabled state', () => {
    beforeEach(async () => {
      await wrapper.setProps({ disabled: true });
    });

    it('should show disabled styling', () => {
      const checkbox = wrapper.find('button[role="checkbox"]');
      expect(checkbox.classes()).toContain('opacity-50');
      expect(checkbox.classes()).toContain('cursor-not-allowed');
    });

    it('should not respond to clicks when disabled', async () => {
      const checkbox = wrapper.find('button[role="checkbox"]');
      
      await checkbox.trigger('click');
      expect(wrapper.emitted('update:state')).toBeFalsy();
    });

    it('should show disabled label styling', () => {
      const label = wrapper.find('label');
      expect(label.classes()).toContain('text-gray-400');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const checkbox = wrapper.find('button[role="checkbox"]');
      
      expect(checkbox.attributes('role')).toBe('checkbox');
      expect(checkbox.attributes('aria-checked')).toBe('false');
    });

    it('should update aria-checked for different states', async () => {
      const checkbox = wrapper.find('button[role="checkbox"]');
      
      await wrapper.setProps({ state: 'checked' });
      expect(checkbox.attributes('aria-checked')).toBe('true');
      
      await wrapper.setProps({ state: 'partial' });
      expect(checkbox.attributes('aria-checked')).toBe('mixed');
    });

    it('should use custom aria-label when provided', async () => {
      await wrapper.setProps({ ariaLabel: 'Custom label' });
      
      const checkbox = wrapper.find('button[role="checkbox"]');
      expect(checkbox.attributes('aria-label')).toBe('Custom label');
    });
  });

  describe('status indicators', () => {
    it('should show correct status indicator color for each state', async () => {
      // Unchecked
      expect(wrapper.find('.bg-gray-300').exists()).toBe(true);
      
      // Checked
      await wrapper.setProps({ state: 'checked' });
      expect(wrapper.find('.bg-green-500').exists()).toBe(true);
      
      // Partial
      await wrapper.setProps({ state: 'partial' });
      expect(wrapper.find('.bg-blue-500').exists()).toBe(true);
    });
  });

  describe('watchers', () => {
    it('should sync internal partial amount with prop changes', async () => {
      await wrapper.setProps({ 
        state: 'partial', 
        allocatedAmount: 75,
        allowPartialEdit: true
      });
      
      expect(wrapper.vm.partialAmount).toBe(75);
      
      await wrapper.setProps({ allocatedAmount: 25 });
      expect(wrapper.vm.partialAmount).toBe(25);
    });

    it('should sync partial amount with state changes', async () => {
      await wrapper.setProps({ 
        state: 'partial', 
        allocatedAmount: 50,
        allowPartialEdit: true
      });
      
      // Change to checked state
      await wrapper.setProps({ state: 'checked' });
      expect(wrapper.vm.partialAmount).toBe(100);
      
      // Change to unchecked state
      await wrapper.setProps({ state: 'unchecked' });
      expect(wrapper.vm.partialAmount).toBe(0);
    });
  });
});