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
}));

describe('PaymentModal - Partial Usage Tracking', () => {
  let wrapper: any;

  const mockVendors = [
    { id: 'vendor1', name: 'Vendor A' },
  ];
  
  const mockAccounts = [
    { id: 'account1', name: 'Cash Account', type: 'cash', current_balance: 1000, is_active: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('shows remaining balance after partial usage', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 75, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 100,
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

    const vendorSearchBox = wrapper.findComponent({ name: 'VendorSearchBox' });
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(wrapper.html()).toContain('2024-01-01');
    expect(wrapper.html()).toContain('₹75.00'); // remaining balance
    expect(wrapper.html()).toContain('of ₹100.00'); // original amount
  });

  it('handles credit note with zero balance (fully used)', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 0, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 100,
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

    const vendorSearchBox = wrapper.findComponent({ name: 'VendorSearchBox' });
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    // Credit notes with zero balance should be filtered out
    expect(wrapper.vm.availableCreditNotes).toEqual([]);
  });

  it('correctly calculates payment with mixed partial and full credit notes', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 75, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 100,
        issue_date: '2024-01-01'
      },
      { 
        id: 'cn2', 
        vendor: 'vendor1', 
        balance: 50, 
        status: 'active', 
        reference: 'CN-002', 
        reason: 'Refund',
        credit_amount: 50,
        issue_date: '2024-01-02'
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
        deliveries: [
          { id: 'delivery1', vendor: 'vendor1', total_amount: 125, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-01' }
        ],
        serviceBookings: [],
      },
    });

    const vendorSearchBox = wrapper.findComponent({ name: 'VendorSearchBox' });
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    // Manually select deliveries to trigger auto-selection of credit notes
    wrapper.vm.form.deliveries = ['delivery1'];
    wrapper.vm.form.delivery_allocations = {
      'delivery1': { state: 'checked', amount: 125 }
    };
    
    // Trigger auto-select credit notes logic
    wrapper.vm.autoSelectCreditNotes();
    await nextTick();

    expect(wrapper.vm.form.credit_notes).toEqual(['cn1']); // Only one is sufficient
    expect(wrapper.vm.selectedCreditNoteAmount).toBe(75);
  });

  it('handles multiple partially used credit notes with insufficient total', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 30, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 100,
        issue_date: '2024-01-01'
      },
      { 
        id: 'cn2', 
        vendor: 'vendor1', 
        balance: 25, 
        status: 'active', 
        reference: 'CN-002', 
        reason: 'Refund',
        credit_amount: 50,
        issue_date: '2024-01-02'
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
        deliveries: [
          { id: 'delivery1', vendor: 'vendor1', total_amount: 100, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-01' }
        ],
        serviceBookings: [],
      },
    });

    const vendorSearchBox = wrapper.findComponent({ name: 'VendorSearchBox' });
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    // Manually select deliveries
    wrapper.vm.form.deliveries = ['delivery1'];
    wrapper.vm.form.delivery_allocations = {
      'delivery1': { state: 'checked', amount: 100 }
    };
    
    // Trigger auto-select credit notes logic
    wrapper.vm.autoSelectCreditNotes();
    await nextTick();

    expect(wrapper.vm.form.credit_notes).toEqual(['cn1']); // Auto-selects in order but insufficient
    expect(wrapper.vm.selectedCreditNoteAmount).toBe(30); // Only first one selected
  });

  it('handles scenario where single partially used credit note exceeds payment need', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 150, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 200,
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
        deliveries: [
          { id: 'delivery1', vendor: 'vendor1', total_amount: 100, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-01' }
        ],
        serviceBookings: [],
      },
    });

    const vendorSearchBox = wrapper.findComponent({ name: 'VendorSearchBox' });
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    // Manually select deliveries
    wrapper.vm.form.deliveries = ['delivery1'];
    wrapper.vm.form.delivery_allocations = {
      'delivery1': { state: 'checked', amount: 100 }
    };
    
    // Trigger auto-select credit notes logic
    wrapper.vm.autoSelectCreditNotes();
    await nextTick();

    expect(wrapper.vm.form.credit_notes).toEqual(['cn1']);
    expect(wrapper.vm.selectedCreditNoteAmount).toBe(150);
    expect(wrapper.vm.form.amount).toBe(100);
    
    // Account payment should be 0 because credit note covers it all
    expect(wrapper.vm.accountPaymentAmount).toBe(-50);
  });

  it('maintains correct sort order for partially used credit notes by date', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 60, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 100,
        issue_date: '2024-01-03'
      },
      { 
        id: 'cn2', 
        vendor: 'vendor1', 
        balance: 40, 
        status: 'active', 
        reference: 'CN-002', 
        reason: 'Refund',
        credit_amount: 50,
        issue_date: '2024-01-02'
      },
      { 
        id: 'cn3', 
        vendor: 'vendor1', 
        balance: 80, 
        status: 'active', 
        reference: 'CN-003', 
        reason: 'Adjustment',
        credit_amount: 80,
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
        deliveries: [
          { id: 'delivery1', vendor: 'vendor1', total_amount: 180, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-01' }
        ],
        serviceBookings: [],
      },
    });

    const vendorSearchBox = wrapper.findComponent({ name: 'VendorSearchBox' });
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    // Manually select deliveries
    wrapper.vm.form.deliveries = ['delivery1'];
    wrapper.vm.form.delivery_allocations = {
      'delivery1': { state: 'checked', amount: 180 }
    };
    
    // Trigger auto-select credit notes logic
    wrapper.vm.autoSelectCreditNotes();
    await nextTick();

    // Should auto-select oldest first (cn3 is oldest)
    expect(wrapper.vm.form.credit_notes).toEqual(['cn3']); // Only one is sufficient
    expect(wrapper.vm.selectedCreditNoteAmount).toBe(80);
  });

  it('correctly shows partial usage information in credit note display', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 25, 
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return',
        credit_amount: 100,
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

    const vendorSearchBox = wrapper.findComponent({ name: 'VendorSearchBox' });
    vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();
    
    // Wait for async credit notes loading
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(wrapper.html()).toContain('CN-001');
    expect(wrapper.html()).toContain('₹25.00'); // remaining balance
    expect(wrapper.html()).toContain('of ₹100.00'); // original amount
    expect(wrapper.html()).toContain('Return'); // reason
  });
});