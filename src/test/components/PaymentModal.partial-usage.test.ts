import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('PaymentModal - Partial Usage Tracking', () => {
  const mockVendors = [
    { id: 'vendor1', name: 'Vendor A' },
    { id: 'vendor2', name: 'Vendor B' },
  ];
  const mockAccounts = [
    { id: 'account1', name: 'Cash Account', type: 'cash', current_balance: 1000, is_active: true },
    { id: 'account2', name: 'Bank Account', type: 'bank', current_balance: 5000, is_active: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows remaining balance after partial usage', async () => {
    // Credit note with partial usage: originally 200, now 150 remaining
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
      }
    ];
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
      },
      attachTo: document.body,
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();

    // Should display remaining balance vs original amount
    expect(wrapper.html()).toContain('CN-001');
    expect(wrapper.html()).toContain('₹150.00'); // remaining balance
    expect(wrapper.html()).toContain('of ₹200.00'); // original amount
    expect(wrapper.html()).toContain('Return'); // reason
    expect(wrapper.html()).toContain('2024-01-01'); // issue date
  });

  it('handles credit note with zero balance (fully used)', async () => {
    // Credit note that's fully used
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 0, 
        status: 'fully_used', 
        reference: 'CN-001', 
        reason: 'Return', 
        credit_amount: 100, 
        issue_date: '2024-01-01' 
      }
    ];
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
      },
      attachTo: document.body,
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();

    // Should not display fully used credit notes (balance = 0)
    expect(wrapper.html()).not.toContain('CN-001');
    expect((wrapper.vm as any).availableCreditNotes).toHaveLength(0);
  });

  it('correctly calculates payment with mixed partial and full credit notes', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 75, // partial usage from 100
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return', 
        credit_amount: 100, 
        issue_date: '2024-01-01' 
      },
      { 
        id: 'cn2', 
        vendor: 'vendor1', 
        balance: 50, // full unused credit note
        status: 'active', 
        reference: 'CN-002', 
        reason: 'Refund', 
        credit_amount: 50, 
        issue_date: '2024-01-02' 
      }
    ];
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    const wrapper = mount(PaymentModal, {
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
      attachTo: document.body,
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await wrapper.find('select[name="account"]').setValue('account1');
    await nextTick();

    // Select delivery (100 needed)
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await nextTick();

    // Should auto-select credit notes by date (oldest first)
    // cn1 (2024-01-01) then cn2 (2024-01-02)
    const selectedCreditNotes = (wrapper.vm as any).form.credit_notes;
    expect(selectedCreditNotes).toEqual(['cn1', 'cn2']);
    expect((wrapper.vm as any).selectedCreditNoteAmount).toBe(125); // 75 + 50
    
    // Since total credit (125) > needed (100), should only use 100
    expect((wrapper.vm as any).form.amount).toBe(100);
    
    // Should show that only 100 will be used from credit notes
    expect(wrapper.html()).toContain('Credit notes: ₹100.00');
    expect(wrapper.html()).toContain('Account payment: ₹0.00');
  });

  it('handles multiple partially used credit notes with insufficient total', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 30, // partial usage from 100
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return', 
        credit_amount: 100, 
        issue_date: '2024-01-01' 
      },
      { 
        id: 'cn2', 
        vendor: 'vendor1', 
        balance: 25, // partial usage from 80
        status: 'active', 
        reference: 'CN-002', 
        reason: 'Refund', 
        credit_amount: 80, 
        issue_date: '2024-01-02' 
      }
    ];
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    const wrapper = mount(PaymentModal, {
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
      attachTo: document.body,
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await wrapper.find('select[name="account"]').setValue('account1');
    await nextTick();

    // Select delivery (100 needed)
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await nextTick();

    // Should auto-select both credit notes
    const selectedCreditNotes = (wrapper.vm as any).form.credit_notes;
    expect(selectedCreditNotes).toEqual(['cn1', 'cn2']);
    expect((wrapper.vm as any).selectedCreditNoteAmount).toBe(55); // 30 + 25
    
    // Should need account payment for the remaining 45
    expect((wrapper.vm as any).accountPaymentAmount).toBe(45);
    expect((wrapper.vm as any).form.amount).toBe(100);
    
    // Should show breakdown
    expect(wrapper.html()).toContain('Credit notes: ₹55.00');
    expect(wrapper.html()).toContain('Account payment: ₹45.00');
  });

  it('correctly shows partial usage information in credit note display', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 60, // 40 already used
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return for damaged goods', 
        credit_amount: 100, 
        issue_date: '2024-01-01' 
      },
      { 
        id: 'cn2', 
        vendor: 'vendor1', 
        balance: 25, // 75 already used
        status: 'active', 
        reference: 'CN-002', 
        reason: 'Excess delivery', 
        credit_amount: 100, 
        issue_date: '2024-01-02' 
      }
    ];
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [],
        serviceBookings: [],
      },
      attachTo: document.body,
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();

    // Check first credit note display
    expect(wrapper.html()).toContain('CN-001');
    expect(wrapper.html()).toContain('₹60.00'); // remaining balance
    expect(wrapper.html()).toContain('of ₹100.00'); // original amount
    expect(wrapper.html()).toContain('Return for damaged goods');
    
    // Check second credit note display  
    expect(wrapper.html()).toContain('CN-002');
    expect(wrapper.html()).toContain('₹25.00'); // remaining balance
    expect(wrapper.html()).toContain('of ₹100.00'); // original amount
    expect(wrapper.html()).toContain('Excess delivery');
  });

  it('handles scenario where single partially used credit note exceeds payment need', async () => {
    const mockCreditNotes = [
      { 
        id: 'cn1', 
        vendor: 'vendor1', 
        balance: 150, // partial usage from 200
        status: 'active', 
        reference: 'CN-001', 
        reason: 'Return', 
        credit_amount: 200, 
        issue_date: '2024-01-01' 
      }
    ];
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    const wrapper = mount(PaymentModal, {
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
      attachTo: document.body,
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();

    // Select delivery (100 needed)
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await nextTick();

    // Should auto-select the credit note
    const selectedCreditNotes = (wrapper.vm as any).form.credit_notes;
    expect(selectedCreditNotes).toEqual(['cn1']);
    expect((wrapper.vm as any).selectedCreditNoteAmount).toBe(150);
    
    // Should only use 100 from credit note, no account payment needed
    expect((wrapper.vm as any).accountPaymentAmount).toBe(0);
    expect((wrapper.vm as any).form.amount).toBe(100);
    
    // Should show that only 100 will be used from credit notes
    expect(wrapper.html()).toContain('Credit notes: ₹100.00');
    expect(wrapper.html()).toContain('Account payment: ₹0.00');
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
        issue_date: '2024-01-15' // newer
      },
      { 
        id: 'cn2', 
        vendor: 'vendor1', 
        balance: 80, 
        status: 'active', 
        reference: 'CN-002', 
        reason: 'Refund', 
        credit_amount: 100, 
        issue_date: '2024-01-10' // older
      },
      { 
        id: 'cn3', 
        vendor: 'vendor1', 
        balance: 40, 
        status: 'active', 
        reference: 'CN-003', 
        reason: 'Excess', 
        credit_amount: 50, 
        issue_date: '2024-01-05' // oldest
      }
    ];
    vi.mocked(vendorCreditNoteService.getByVendor).mockResolvedValue(mockCreditNotes as any);

    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [
          { id: 'delivery1', vendor: 'vendor1', total_amount: 150, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-01' }
        ],
        serviceBookings: [],
      },
      attachTo: document.body,
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await wrapper.find('select[name="account"]').setValue('account1');
    await nextTick();

    // Select delivery (150 needed)
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await nextTick();

    // Should auto-select credit notes by date (oldest first)
    // cn3 (2024-01-05), cn2 (2024-01-10), cn1 (2024-01-15)
    const selectedCreditNotes = (wrapper.vm as any).form.credit_notes;
    expect(selectedCreditNotes).toEqual(['cn3', 'cn2', 'cn1']);
    expect((wrapper.vm as any).selectedCreditNoteAmount).toBe(180); // 40 + 80 + 60
    
    // Should use all credit notes as needed
    expect((wrapper.vm as any).form.amount).toBe(150);
    expect((wrapper.vm as any).accountPaymentAmount).toBe(0);
  });
});