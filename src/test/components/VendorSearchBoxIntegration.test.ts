import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import VendorSearchBox from '../../components/VendorSearchBox.vue';
import { nextTick } from 'vue';

// Mock useI18n
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.amountDue': 'Amount Due',
        'common.extraAdvance': 'Extra Advance'
      };
      return translations[key] || key;
    }
  })
}));

// Mock VendorService
vi.mock('../../services/pocketbase', async () => {
  const actual = await vi.importActual('../../services/pocketbase');
  return {
    ...actual,
    VendorService: {
      calculateOutstandingFromData: vi.fn().mockImplementation((vendorId, deliveries, serviceBookings, payments) => {
        let outstanding = 0;
        
        // Calculate delivery outstanding
        const vendorDeliveries = deliveries.filter((d: any) => d.vendor === vendorId);
        vendorDeliveries.forEach((delivery: any) => {
          outstanding += (delivery.total_amount - delivery.paid_amount);
        });
        
        // Calculate service booking outstanding  
        const vendorBookings = serviceBookings.filter((b: any) => b.vendor === vendorId);
        vendorBookings.forEach((booking: any) => {
          outstanding += (booking.total_amount - booking.paid_amount);
        });
        
        return outstanding;
      })
    }
  };
});

describe('VendorSearchBox Integration', () => {
  const mockVendors = [
    { id: 'vendor1', name: 'Vendor A', contact_person: 'John Doe', phone: '1234567890' },
    { id: 'vendor2', name: 'Vendor B', contact_person: 'Jane Smith', phone: '0987654321' },
  ];

  const mockDeliveries = [
    { 
      id: 'delivery1', 
      vendor: 'vendor1', 
      total_amount: 1000, 
      paid_amount: 300, 
      payment_status: 'partial',
      delivery_date: '2024-01-15',
      delivery_reference: 'DEL-001',
      notes: ''
    },
    { 
      id: 'delivery2', 
      vendor: 'vendor1', 
      total_amount: 500, 
      paid_amount: 0, 
      payment_status: 'pending',
      delivery_date: '2024-01-16',
      delivery_reference: 'DEL-002',
      notes: ''
    },
  ];

  const mockServiceBookings = [
    { 
      id: 'booking1', 
      vendor: 'vendor1', 
      total_amount: 800, 
      paid_amount: 200, 
      payment_status: 'partial',
      service: 'service1',
      start_date: '2024-01-20',
      end_date: '2024-01-25',
      notes: ''
    },
  ];

  it('shows vendor name in input when vendor is selected', async () => {
    const wrapper = mount(VendorSearchBox, {
      props: {
        modelValue: 'vendor1',
        vendors: mockVendors,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: [],
        outstandingAmount: 1200,
        pendingItemsCount: 3,
      },
    });

    await nextTick();

    // Should show vendor contact_person in input (component uses contact_person, not name)
    expect(wrapper.find('input').element.value).toBe('John Doe');
  });

  it('shows outstanding amount when vendor is selected', async () => {
    const wrapper = mount(VendorSearchBox, {
      props: {
        modelValue: 'vendor1',
        vendors: mockVendors,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: [],
        outstandingAmount: 1200,
        pendingItemsCount: 3,
      },
    });

    await nextTick();

    // Should show outstanding amount calculated from deliveries and service bookings
    // delivery1: 1000-300=700, delivery2: 500-0=500, booking1: 800-200=600 = 1800 total
    expect(wrapper.html()).toContain('₹1800.00');
  });

  it('clears input when vendor is deselected', async () => {
    const wrapper = mount(VendorSearchBox, {
      props: {
        modelValue: 'vendor1',
        vendors: mockVendors,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: [],
        outstandingAmount: 1200,
        pendingItemsCount: 3,
      },
    });

    await nextTick();
    expect(wrapper.find('input').element.value).toBe('John Doe');

    // Clear selection
    await wrapper.setProps({ modelValue: '' });
    await nextTick();

    expect(wrapper.find('input').element.value).toBe('');
  });

  it('allows user to search and select a vendor', async () => {
    const wrapper = mount(VendorSearchBox, {
      props: {
        modelValue: '',
        vendors: mockVendors,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: [],
        outstandingAmount: 0,
        pendingItemsCount: 0,
      },
    });

    const input = wrapper.find('input');
    
    // Type to search for contact_person (component searches by contact_person)
    await input.setValue('John Doe');
    await input.trigger('input');
    await nextTick();

    // Should show search results
    expect(wrapper.vm.filteredVendors).toHaveLength(1);
    expect(wrapper.vm.filteredVendors[0].contact_person).toBe('John Doe');

    // Select vendor
    await wrapper.vm.selectVendor(mockVendors[0]);

    // Should emit events
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['vendor1']);
    expect(wrapper.emitted('vendorSelected')).toBeTruthy();
  });

  it('clears selection when user starts typing on selected vendor', async () => {
    const wrapper = mount(VendorSearchBox, {
      props: {
        modelValue: 'vendor1',
        vendors: mockVendors,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: [],
        outstandingAmount: 1200,
        pendingItemsCount: 3,
      },
    });

    await nextTick();
    expect(wrapper.find('input').element.value).toBe('John Doe');

    const input = wrapper.find('input');
    
    // Start typing
    await input.setValue('Jane Smith');
    await input.trigger('input');
    await nextTick();

    // Should emit update to clear selection
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['']);
  });

  it('displays outstanding amounts correctly in dropdown', async () => {
    const wrapper = mount(VendorSearchBox, {
      props: {
        modelValue: '',
        vendors: mockVendors,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: [],
        outstandingAmount: 0,
        pendingItemsCount: 0,
      },
    });

    // Set search query to show dropdown for vendor1 (search by contact_person)
    await wrapper.find('input').setValue('John Doe');
    await wrapper.vm.$nextTick();
    
    // delivery1: 1000 - 300 = 700
    // delivery2: 500 - 0 = 500  
    // booking1: 800 - 200 = 600
    // Total: 1800
    expect(wrapper.html()).toContain('₹1800.00');
    expect(wrapper.html()).toContain('3 pending'); // 2 deliveries + 1 booking (all non-paid)
  });
});