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
        vendor: { name: 'Vendor A' },
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
      },
    });

    await wrapper.find('button').filter((btn: any) => btn.text().includes('common.cancel'))[0].trigger('click');
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
      },
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    // Select credit note
    wrapper.vm.form.credit_notes = ['cn1'];
    wrapper.vm.form.amount = 100;
    await nextTick();

    expect(wrapper.vm.selectedCreditNoteAmount).toBe(50);
    expect(wrapper.html()).toContain('Selected credit notes: ₹50.00');
    expect(wrapper.html()).toContain('Account payment: ₹50.00');
    expect(wrapper.html()).toContain('Credit notes: ₹50.00');
    expect(wrapper.html()).toContain('Total payment: ₹100.00');
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
      },
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    wrapper.vm.form.credit_notes = ['cn1'];
    wrapper.vm.form.amount = 100;
    await nextTick();

    expect(wrapper.html()).toContain('⚠️ Credit notes exceed payment amount. Only ₹100.00 will be used.');
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
        vendor: { name: 'Vendor A' },
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
      },
    });

    expect(wrapper.html()).toContain('No additional items available for allocation');
  });
});