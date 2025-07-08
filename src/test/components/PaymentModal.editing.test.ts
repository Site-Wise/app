import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PaymentModal from '../../components/PaymentModal.vue';
import { nextTick } from 'vue';

// Mock composables and services
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../composables/useToast', () => ({
  useToast: () => ({
    error: vi.fn(),
  }),
}));

import { vendorCreditNoteService } from '../../services/pocketbase';

vi.mock('../../services/pocketbase', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    vendorCreditNoteService: {
      getByVendor: vi.fn(() => Promise.resolve([])),
    },
  };
});

describe('PaymentModal - Editing Functionality', () => {
  const mockVendors = [
    { id: 'vendor1', name: 'Vendor A' },
    { id: 'vendor2', name: 'Vendor B' },
  ];
  const mockAccounts = [
    { id: 'account1', name: 'Cash Account', type: 'cash', current_balance: 1000, is_active: true },
    { id: 'account2', name: 'Bank Account', type: 'bank', current_balance: 5000, is_active: true },
  ];
  const mockDeliveries = [
    { id: 'delivery1', vendor: 'vendor1', total_amount: 200, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-01' },
    { id: 'delivery2', vendor: 'vendor1', total_amount: 150, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-02' },
  ];
  const mockServiceBookings = [
    { id: 'booking1', vendor: 'vendor1', total_amount: 100, paid_amount: 0, payment_status: 'outstanding', start_date: '2024-07-05', expand: { service: { name: 'Service X' } } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays payment information correctly in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 300,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
        credit_notes: [
          { id: 'cn1', reference: 'CN-001', balance: 50, reason: 'Return' }
        ]
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 200, expand: { delivery: { delivery_date: '2024-07-01' } } },
    ];

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Should display payment information as read-only
    expect(wrapper.find('h3').text()).toBe('payments.editPayment');
    expect(wrapper.html()).toContain('Vendor A');
    expect(wrapper.html()).toContain('Cash Account');
    expect(wrapper.html()).toContain('₹300.00');
    expect(wrapper.html()).toContain('REF123');
    
    // Should not show credit note selection in EDIT mode
    expect(wrapper.html()).not.toContain('payments.availableCreditNotes');
    expect(wrapper.find('input[type="checkbox"][id*="credit-note"]').exists()).toBe(false);
    
    // Should show current allocation
    expect(wrapper.html()).toContain('payments.currentAllocations');
    expect(wrapper.html()).toContain('₹200.00');
    
    // Should show allocation progress
    expect(wrapper.html()).toContain('payments.allocated');
    expect(wrapper.html()).toContain('₹200.00'); // allocated amount
    expect(wrapper.html()).toContain('₹100.00'); // unallocated amount
  });

  it('allows editing payment allocations in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 300,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 200, expand: { delivery: { delivery_date: '2024-07-01' } } },
    ];

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Should show selectable deliveries (excluding already allocated ones)
    expect(wrapper.html()).toContain('payments.selectItemsToPay');
    expect(wrapper.html()).toContain('₹150.00'); // delivery2 amount
    expect(wrapper.html()).toContain('₹100.00'); // booking1 amount
    
    // Should not show delivery1 as it's already allocated
    expect(wrapper.html()).not.toContain('₹200.00'); // delivery1 amount should not be in selectable items
    
    // Should show max allocation amount
    expect(wrapper.html()).toContain('Max: ₹100.00'); // unallocated amount
  });

  it('prevents over-allocation in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 250,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 200, expand: { delivery: { delivery_date: '2024-07-01' } } },
    ];

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Try to select delivery2 (150) and booking1 (100) when only 50 is available
    await wrapper.find('input[type="checkbox"][value="delivery2"]').setValue(true);
    await wrapper.find('input[type="checkbox"][value="booking1"]').setValue(true);
    await nextTick();

    // Should prevent over-allocation
    // The total selected would be 250 (150 + 100) but only 50 is available
    const selectedAmount = (wrapper.vm as any).allocatedAmount;
    expect(selectedAmount).toBeLessThanOrEqual(50);
  });

  it('calculates unallocated amount correctly in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 300,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 200, expand: { delivery: { delivery_date: '2024-07-01' } } },
    ];

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Should calculate unallocated amount correctly
    expect((wrapper.vm as any).allocatedAmount).toBe(200);
    expect((wrapper.vm as any).unallocatedAmount).toBe(100); // 300 - 200
    expect((wrapper.vm as any).allocationPercentage).toBe(67); // 200/300 * 100
  });

  it('shows fully allocated message when payment is fully allocated', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 300,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 200, expand: { delivery: { delivery_date: '2024-07-01' } } },
      { id: 'alloc2', payment: 'payment1', delivery: 'delivery2', allocated_amount: 100, expand: { delivery: { delivery_date: '2024-07-02' } } },
    ];

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Should show fully allocated message
    expect(wrapper.html()).toContain('payments.fullyAllocated');
    expect(wrapper.html()).toContain('fully allocated to deliveries');
    expect(wrapper.find('.bg-green-50').exists()).toBe(true);
    
    // Should not show delivery selection
    expect(wrapper.html()).not.toContain('payments.selectItemsToPay');
    
    // Unallocated amount should be 0
    expect((wrapper.vm as any).unallocatedAmount).toBe(0);
  });

  it('validates form correctly in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 300,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 200, expand: { delivery: { delivery_date: '2024-07-01' } } },
    ];

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Initially should be valid (can have unallocated amount)
    expect((wrapper.vm as any).isFormValid).toBe(true);
    
    // Select some deliveries
    await wrapper.find('input[type="checkbox"][value="delivery2"]').setValue(true);
    await nextTick();
    
    // Should still be valid
    expect((wrapper.vm as any).isFormValid).toBe(true);
    
    // Unselect all deliveries
    await wrapper.find('input[type="checkbox"][value="delivery2"]').setValue(false);
    await nextTick();
    
    // Should still be valid (unallocated amount is allowed)
    expect((wrapper.vm as any).isFormValid).toBe(true);
  });

  it('handles payment with credit notes correctly in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 300,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
        credit_notes: [
          { id: 'cn1', reference: 'CN-001', balance: 50, reason: 'Return', credit_amount: 100 },
          { id: 'cn2', reference: 'CN-002', balance: 25, reason: 'Refund', credit_amount: 50 }
        ]
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 200, expand: { delivery: { delivery_date: '2024-07-01' } } },
    ];

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Should not show credit note selection (read-only in EDIT mode)
    expect(wrapper.html()).not.toContain('payments.availableCreditNotes');
    expect(wrapper.find('input[type="checkbox"][id*="credit-note"]').exists()).toBe(false);
    
    // Should show payment information correctly
    expect(wrapper.html()).toContain('₹300.00');
    expect(wrapper.html()).toContain('Vendor A');
    expect(wrapper.html()).toContain('Cash Account');
    
    // Credit notes should not be editable
    expect(wrapper.html()).not.toContain('CN-001');
    expect(wrapper.html()).not.toContain('CN-002');
  });

  it('submits correct data in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 300,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 200, expand: { delivery: { delivery_date: '2024-07-01' } } },
    ];

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Select additional deliveries
    await wrapper.find('input[type="checkbox"][value="delivery2"]').setValue(true);
    await wrapper.find('input[type="checkbox"][value="booking1"]').setValue(true);
    await nextTick();

    // Submit the form
    await wrapper.find('form').trigger('submit');

    // Should emit submit event with correct data
    expect(wrapper.emitted().submit).toBeTruthy();
    const submitData = wrapper.emitted().submit[0][0];
    expect(submitData.mode).toBe('EDIT');
    expect(submitData.payment).toEqual(mockPayment);
    expect(submitData.form.deliveries).toContain('delivery2');
    expect(submitData.form.service_bookings).toContain('booking1');
  });

  it('does not validate credit note logic in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 300,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
      },
    };
    const mockAllocations = [];

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Should not show any credit note validation errors
    expect((wrapper.vm as any).validationError).toBeNull();
    expect(wrapper.find('.bg-red-50').exists()).toBe(false);
    expect(wrapper.find('.bg-yellow-50').exists()).toBe(false);
    
    // Form should be valid
    expect((wrapper.vm as any).isFormValid).toBe(true);
  });
});