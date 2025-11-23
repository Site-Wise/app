import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PaymentModal from '../../components/PaymentModal.vue';
import VendorSearchBox from '../../components/VendorSearchBox.vue';
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
    calculateOutstandingAmountFromData: vi.fn().mockReturnValue(150),
    calculateProgressBasedAmount: vi.fn().mockReturnValue(500)
  }
}));

describe('PaymentModal.vue', () => {
  let wrapper: any;

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
  ];
  
  const mockServiceBookings = [
    { id: 'booking1', vendor: 'vendor1', total_amount: 150, paid_amount: 0, payment_status: 'outstanding', start_date: '2024-07-05', expand: { service: { name: 'Service X' } } },
  ];

  const mockPayments = [
    { id: 'payment-1', vendor: 'vendor1', amount: 100, payment_date: '2024-01-01' },
    { id: 'payment-2', vendor: 'vendor2', amount: 200, payment_date: '2024-01-02' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders correctly in CREATE mode', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    expect(wrapper.find('h3').text()).toBe('payments.recordPayment');
    expect(wrapper.findComponent(VendorSearchBox).exists()).toBe(true);
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toBe('payments.recordPayment');

    // Ensure vendor search box is rendered with correct props
    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    expect(vendorSearchBox.props('vendors')).toEqual(mockVendors);
    expect(vendorSearchBox.props('autofocus')).toBe(true);
    expect(vendorSearchBox.props('required')).toBe(true);
  });

  it('renders correctly in PAY_NOW mode', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'PAY_NOW',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: mockPayments,
        vendorId: 'vendor1',
        outstandingAmount: 350,
      },
    });

    await nextTick();
    
    expect(wrapper.find('h3').text()).toBe('Pay Outstanding Amount');
    expect(wrapper.findComponent(VendorSearchBox).exists()).toBe(true);
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    await wrapper.vm.$nextTick();
    
    // Check button text reflects the amount
    const submitButton = wrapper.find('button[type="submit"]');
    expect(submitButton.text()).toContain('Pay ₹');
  });

  it('renders correctly in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 200,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A', contact_person: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 200, expand: { delivery: { delivery_date: '2024-07-01' } } },
    ];

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

    expect(wrapper.find('h3').text()).toBe('payments.editPayment');
    expect(wrapper.findComponent(VendorSearchBox).exists()).toBe(false); // No search box in edit mode
    expect(wrapper.find('input[type="number"]').exists()).toBe(false);
    expect(wrapper.find('button[type="submit"]').text()).toBe('payments.updatePayment');
    expect(wrapper.html()).toContain('Vendor A');
    expect(wrapper.html()).toContain('Cash Account');
    expect(wrapper.html()).toContain('₹200.00');
  });

  it('emits close event when backdrop is clicked', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    await wrapper.find('.fixed.inset-0').trigger('click');
    expect(wrapper.emitted().close).toBeTruthy();
  });

  it('emits close event when escape key is pressed', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    await wrapper.trigger('keydown.esc');
    expect(wrapper.emitted().close).toBeTruthy();
  });

  it('emits close event when cancel button is clicked', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    const buttons = wrapper.findAll('button');
    const cancelButton = buttons.find((btn: any) => btn.text().includes('cancel'));
    await cancelButton?.trigger('click');
    expect(wrapper.emitted().close).toBeTruthy();
  });

  it('updates vendor outstanding and pending items on vendor change', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        payments: mockPayments,
      },
    });

    // Simulate vendor selection through VendorSearchBox
    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();

    expect(wrapper.vm.vendorOutstanding).toBe(350); // 200 + 150
    expect(wrapper.vm.vendorPendingItems).toBe(2); // 1 delivery + 1 booking
  });

  it('validates form correctly', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    // Initially invalid
    expect(wrapper.vm.isFormValid).toBe(false);

    // Fill required fields
    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    
    // Set form values directly on the component instance
    wrapper.vm.form.account = 'account1';
    wrapper.vm.form.amount = 100;
    await nextTick();

    expect(wrapper.vm.isFormValid).toBe(true);
  });

  it('handles form submission', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    
    wrapper.vm.form.account = 'account1';
    wrapper.vm.form.amount = 100;
    await nextTick();

    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted().submit).toBeTruthy();
    expect(wrapper.emitted().submit[0][0].form.amount).toBe(100);
  });

  it('loads vendor credit notes', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 50, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 50,
        issue_date: '2024-01-01'
      },
    ];
    
    const { vendorCreditNoteService } = await import('../../services/pocketbase');
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(vendorCreditNoteService.getByVendor).toHaveBeenCalledWith('vendor1');
    expect(wrapper.vm.availableCreditNotes).toEqual(mockCreditNotes);
  });

  it('applies credit notes and updates amounts', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 50, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 50,
        issue_date: '2024-01-01'
      },
    ];
    
    const { vendorCreditNoteService } = await import('../../services/pocketbase');
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    // Select credit note
    wrapper.vm.form.credit_notes = ['cn1'];
    wrapper.vm.form.credit_note_allocations = {
      'cn1': { state: 'checked', amount: 50, manuallyDeselected: false }
    };
    wrapper.vm.form.amount = 100;
    await nextTick();

    expect(wrapper.vm.selectedCreditNoteAmount).toBe(50);
    expect(wrapper.html()).toContain('Selected credit notes: ₹50.00');
    expect(wrapper.html()).toContain('Account payment:');
    expect(wrapper.html()).toContain(' ₹50.00');
    expect(wrapper.html()).toContain('Credit notes:');
    expect(wrapper.html()).toContain('₹50.00');
    expect(wrapper.html()).toContain('Total payment:');
    expect(wrapper.html()).toContain('₹100.00');
  });

  it('shows warning when credit notes exceed payment amount', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 150, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 150,
        issue_date: '2024-01-01'
      },
    ];
    
    const { vendorCreditNoteService } = await import('../../services/pocketbase');
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    wrapper.vm.form.credit_notes = ['cn1'];
    wrapper.vm.form.credit_note_allocations = {
      'cn1': { state: 'checked', amount: 150, manuallyDeselected: false }
    };
    wrapper.vm.form.amount = 100;
    await nextTick();

    expect(wrapper.html()).toContain('Credit notes:');
    expect(wrapper.html()).toContain('₹150.00');
    expect(wrapper.html()).toContain('Total payment:');
    expect(wrapper.html()).toContain('₹100.00');
    expect(wrapper.vm.selectedCreditNoteAmount).toBe(150);
  });

  it('displays no items available message when no deliveries or bookings', async () => {
    wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
        payments: mockPayments,
      },
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    wrapper.vm.form.amount = 100;
    await nextTick();

    expect(wrapper.html()).toContain('No pending deliveries or bookings for this vendor');
  });

  it('displays no additional items available message in EDIT mode', async () => {
    const mockPayment = {
      id: 'payment1',
      vendor: 'vendor1',
      account: 'account1',
      amount: 200,
      payment_date: '2024-07-01',
      reference: 'REF123',
      notes: 'Test payment',
      expand: {
        vendor: { name: 'Vendor A', contact_person: 'Vendor A' },
        account: { name: 'Cash Account', type: 'cash' },
      },
    };
    const mockAllocations = [
      { id: 'alloc1', payment: 'payment1', delivery: 'delivery1', allocated_amount: 150, expand: { delivery: { delivery_date: '2024-07-01' } } },
      { id: 'alloc2', payment: 'payment1', service_booking: 'booking1', allocated_amount: 50, expand: { service_booking: { start_date: '2024-07-05' } } },
    ];

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

    await nextTick();

    expect(wrapper.html()).toContain('No additional items available for allocation');
  });

  describe('Account Auto-Selection', () => {
    it('auto-selects the only account when there is one active account', async () => {
      const singleAccount = [
        { id: 'account1', name: 'Cash Account', type: 'cash', current_balance: 1000, is_active: true },
      ];

      wrapper = mount(PaymentModal, {
        props: {
          isVisible: true,
          mode: 'CREATE',
          vendors: mockVendors,
          accounts: singleAccount,
          deliveries: [],
          serviceBookings: [],
          payments: [],
        },
      });

      await nextTick();

      expect(wrapper.vm.form.account).toBe('account1');
    });

    it('auto-selects the most frequently used account from payment history', async () => {
      const multipleAccounts = [
        { id: 'account1', name: 'Cash Account', type: 'cash', current_balance: 1000, is_active: true },
        { id: 'account2', name: 'Bank Account', type: 'bank', current_balance: 5000, is_active: true },
        { id: 'account3', name: 'Credit Card', type: 'credit_card', current_balance: 2000, is_active: true },
      ];

      const paymentsWithHistory = [
        { id: 'payment-1', vendor: 'vendor1', account: 'account2', amount: 100, payment_date: '2024-01-01' },
        { id: 'payment-2', vendor: 'vendor2', account: 'account2', amount: 200, payment_date: '2024-01-02' },
        { id: 'payment-3', vendor: 'vendor1', account: 'account2', amount: 150, payment_date: '2024-01-03' },
        { id: 'payment-4', vendor: 'vendor2', account: 'account1', amount: 300, payment_date: '2024-01-04' },
        { id: 'payment-5', vendor: 'vendor1', account: 'account3', amount: 250, payment_date: '2024-01-05' },
      ];

      wrapper = mount(PaymentModal, {
        props: {
          isVisible: true,
          mode: 'CREATE',
          vendors: mockVendors,
          accounts: multipleAccounts,
          deliveries: [],
          serviceBookings: [],
          payments: paymentsWithHistory,
        },
      });

      await nextTick();

      // account2 was used 3 times, should be selected
      expect(wrapper.vm.form.account).toBe('account2');
    });

    it('prefers cash account as tie-breaker when usage frequency is equal', async () => {
      const multipleAccounts = [
        { id: 'account1', name: 'Cash Account', type: 'cash', current_balance: 1000, is_active: true },
        { id: 'account2', name: 'Bank Account', type: 'bank', current_balance: 5000, is_active: true },
      ];

      const paymentsWithEqualUsage = [
        { id: 'payment-1', vendor: 'vendor1', account: 'account1', amount: 100, payment_date: '2024-01-01' },
        { id: 'payment-2', vendor: 'vendor2', account: 'account2', amount: 200, payment_date: '2024-01-02' },
      ];

      wrapper = mount(PaymentModal, {
        props: {
          isVisible: true,
          mode: 'CREATE',
          vendors: mockVendors,
          accounts: multipleAccounts,
          deliveries: [],
          serviceBookings: [],
          payments: paymentsWithEqualUsage,
        },
      });

      await nextTick();

      // Both used once, but cash account should be preferred
      expect(wrapper.vm.form.account).toBe('account1');
    });

    it('prefers higher balance as tie-breaker when usage and type are equal', async () => {
      const multipleAccounts = [
        { id: 'account1', name: 'Bank A', type: 'bank', current_balance: 1000, is_active: true },
        { id: 'account2', name: 'Bank B', type: 'bank', current_balance: 10000, is_active: true },
      ];

      const paymentsWithEqualUsage = [
        { id: 'payment-1', vendor: 'vendor1', account: 'account1', amount: 100, payment_date: '2024-01-01' },
        { id: 'payment-2', vendor: 'vendor2', account: 'account2', amount: 200, payment_date: '2024-01-02' },
      ];

      wrapper = mount(PaymentModal, {
        props: {
          isVisible: true,
          mode: 'CREATE',
          vendors: mockVendors,
          accounts: multipleAccounts,
          deliveries: [],
          serviceBookings: [],
          payments: paymentsWithEqualUsage,
        },
      });

      await nextTick();

      // Both used once, both bank, but account2 has higher balance
      expect(wrapper.vm.form.account).toBe('account2');
    });

    it('prefers shorter name as tie-breaker when all else is equal', async () => {
      const multipleAccounts = [
        { id: 'account1', name: 'Long Bank Account Name', type: 'bank', current_balance: 5000, is_active: true },
        { id: 'account2', name: 'Bank', type: 'bank', current_balance: 5000, is_active: true },
      ];

      const paymentsWithEqualUsage = [
        { id: 'payment-1', vendor: 'vendor1', account: 'account1', amount: 100, payment_date: '2024-01-01' },
        { id: 'payment-2', vendor: 'vendor2', account: 'account2', amount: 200, payment_date: '2024-01-02' },
      ];

      wrapper = mount(PaymentModal, {
        props: {
          isVisible: true,
          mode: 'CREATE',
          vendors: mockVendors,
          accounts: multipleAccounts,
          deliveries: [],
          serviceBookings: [],
          payments: paymentsWithEqualUsage,
        },
      });

      await nextTick();

      // Both used once, both bank, same balance, but account2 has shorter name
      expect(wrapper.vm.form.account).toBe('account2');
    });

    it('does not auto-select account in EDIT mode', async () => {
      const mockPayment = {
        id: 'payment1',
        vendor: 'vendor1',
        account: 'account1',
        amount: 200,
        payment_date: '2024-07-01',
        reference: 'REF123',
        notes: 'Test payment',
        expand: {
          vendor: { name: 'Vendor A', contact_person: 'Vendor A' },
          account: { name: 'Cash Account', type: 'cash' },
        },
      };

      const multipleAccounts = [
        { id: 'account1', name: 'Cash Account', type: 'cash', current_balance: 1000, is_active: true },
        { id: 'account2', name: 'Bank Account', type: 'bank', current_balance: 5000, is_active: true },
      ];

      wrapper = mount(PaymentModal, {
        props: {
          isVisible: true,
          mode: 'EDIT',
          payment: mockPayment,
          currentAllocations: [],
          vendors: mockVendors,
          accounts: multipleAccounts,
          deliveries: [],
          serviceBookings: [],
          payments: [],
        },
      });

      await nextTick();

      // In EDIT mode, account should match the payment's account, not auto-selected
      expect(wrapper.vm.form.account).toBe('account1');
    });

    it('selects most used account even when no payment history exists', async () => {
      const multipleAccounts = [
        { id: 'account1', name: 'Bank Account', type: 'bank', current_balance: 1000, is_active: true },
        { id: 'account2', name: 'Cash Account', type: 'cash', current_balance: 5000, is_active: true },
      ];

      wrapper = mount(PaymentModal, {
        props: {
          isVisible: true,
          mode: 'CREATE',
          vendors: mockVendors,
          accounts: multipleAccounts,
          deliveries: [],
          serviceBookings: [],
          payments: [], // No payment history
        },
      });

      await nextTick();

      // With no history, should fall back to cash account preference
      expect(wrapper.vm.form.account).toBe('account2');
    });

    it('ignores inactive accounts when auto-selecting', async () => {
      const mixedAccounts = [
        { id: 'account1', name: 'Inactive Bank', type: 'bank', current_balance: 10000, is_active: false },
        { id: 'account2', name: 'Active Cash', type: 'cash', current_balance: 1000, is_active: true },
      ];

      const paymentsWithInactiveAccount = [
        { id: 'payment-1', vendor: 'vendor1', account: 'account1', amount: 100, payment_date: '2024-01-01' },
        { id: 'payment-2', vendor: 'vendor1', account: 'account1', amount: 200, payment_date: '2024-01-02' },
        { id: 'payment-3', vendor: 'vendor1', account: 'account1', amount: 300, payment_date: '2024-01-03' },
      ];

      wrapper = mount(PaymentModal, {
        props: {
          isVisible: true,
          mode: 'CREATE',
          vendors: mockVendors,
          accounts: mixedAccounts,
          deliveries: [],
          serviceBookings: [],
          payments: paymentsWithInactiveAccount,
        },
      });

      await nextTick();

      // Even though account1 has most usage, it's inactive, so account2 should be selected
      expect(wrapper.vm.form.account).toBe('account2');
    });

    it('does not auto-select if account is already set', async () => {
      const multipleAccounts = [
        { id: 'account1', name: 'Cash Account', type: 'cash', current_balance: 1000, is_active: true },
        { id: 'account2', name: 'Bank Account', type: 'bank', current_balance: 5000, is_active: true },
      ];

      wrapper = mount(PaymentModal, {
        props: {
          isVisible: true,
          mode: 'CREATE',
          vendors: mockVendors,
          accounts: multipleAccounts,
          deliveries: [],
          serviceBookings: [],
          payments: [],
        },
      });

      await nextTick();

      // First auto-selection should happen
      const initialAccount = wrapper.vm.form.account;
      expect(initialAccount).toBeTruthy();

      // Manually change account
      wrapper.vm.form.account = 'account2';
      await nextTick();

      // Trigger accounts watcher by updating props
      await wrapper.setProps({ accounts: [...multipleAccounts] });
      await nextTick();

      // Account should remain as manually set, not auto-selected again
      expect(wrapper.vm.form.account).toBe('account2');
    });
  });
});