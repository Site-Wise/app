import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

vi.mock('../../services/pocketbase', () => ({
  vendorCreditNoteService: {
    getByVendor: vi.fn(() => Promise.resolve([])),
  },
  creditNoteUsageService: {
    getByVendor: vi.fn(() => Promise.resolve([])),
    getByPayment: vi.fn(() => Promise.resolve([])),
  },
  VendorService: {
    calculateOutstandingFromData: vi.fn().mockReturnValue(0),
    calculateTotalPaidFromData: vi.fn().mockReturnValue(0)
  },
  ServiceBookingService: {
    calculateOutstandingAmountFromData: vi.fn().mockReturnValue(100),
    calculateProgressBasedAmount: vi.fn().mockReturnValue(500)
  }
}));

describe('PaymentModal - Editing Functionality', () => {
  let wrapper: any;

  const mockVendors = [
    { id: 'vendor1', name: 'Vendor A' },
  ];
  
  const mockAccounts = [
    { id: 'account1', name: 'Cash Account', type: 'cash', current_balance: 1000, is_active: true },
  ];
  
  const mockDeliveries = [
    { id: 'delivery1', vendor: 'vendor1', total_amount: 200, paid_amount: 50, payment_status: 'partial', delivery_date: '2024-07-01' },
    { id: 'delivery2', vendor: 'vendor1', total_amount: 150, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-02' },
  ];
  
  const mockServiceBookings = [
    { id: 'booking1', vendor: 'vendor1', total_amount: 100, paid_amount: 0, payment_status: 'outstanding', start_date: '2024-07-05', expand: { service: { name: 'Service X' } } },
  ];

  const mockPayment = {
    id: 'payment1',
    vendor: 'vendor1',
    account: 'account1',
    amount: 300,
    payment_date: '2024-07-01',
    reference: 'REF123',
    notes: 'Test payment',
    expand: {
      vendor: { name: 'Vendor A', contact_person: 'Vendor A' },
      account: { name: 'Cash Account', type: 'cash' },
    },
  };

  const mockPayments = [
    { id: 'payment-1', vendor: 'vendor1', amount: 100, payment_date: '2024-01-01' },
    { id: 'payment-2', vendor: 'vendor1', amount: 200, payment_date: '2024-01-02' }
  ];

  const mockAllocations = [
    { 
      id: 'alloc1', 
      payment: 'payment1', 
      delivery: 'delivery1', 
      allocated_amount: 50, 
      expand: { 
        delivery: { 
          delivery_date: '2024-07-01',
          total_amount: 200,
          paid_amount: 50
        } 
      } 
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('displays payment information correctly in EDIT mode', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: mockPayments,
      },
    });

    // Wait for form initialization to complete
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(wrapper.find('h3').text()).toBe('payments.editPayment');
    expect(wrapper.html()).toContain('Vendor A');
    expect(wrapper.html()).toContain('Cash Account');
    expect(wrapper.html()).toContain('₹300.00');
    
    // Check if reference input has the correct value
    const referenceInput = wrapper.find('input[placeholder="Check number, transfer ID, etc."]');
    expect(referenceInput.exists()).toBe(true);
    expect(referenceInput.element.value).toBe('REF123');
    
    // Should show current allocations table
    expect(wrapper.html()).toContain('payments.currentAllocations');
    expect(wrapper.html()).toContain('common.delivery');
    expect(wrapper.html()).toContain('₹50.00');
  });

  it('allows editing payment allocations in EDIT mode', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: mockPayments,
      },
    });

    // Wait for initialization to complete
    await nextTick();

    // Should show selectable items for additional allocation
    expect(wrapper.html()).toContain('payments.selectItemsToPay');
    expect(wrapper.html()).toContain('₹150.00'); // delivery2 amount
    expect(wrapper.html()).toContain('₹100.00'); // booking1 amount
  });

  it('validates form correctly in EDIT mode', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: mockPayments,
      },
    });

    // In EDIT mode, form should be valid if there are existing allocations
    expect(wrapper.vm.isFormValid).toBe(true);
  });

  it('does not validate credit note logic in EDIT mode', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'EDIT',
        payment: mockPayment,
        currentAllocations: mockAllocations,
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: mockPayments,
      },
    });

    // In EDIT mode, credit note validation should not apply
    expect(wrapper.vm.validationError).toBeNull();
    expect(wrapper.vm.isFormValid).toBe(true);
  });
});