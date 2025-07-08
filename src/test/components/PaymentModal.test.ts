
import { describe, it, expect, vi } from 'vitest';
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

describe('PaymentModal.vue', () => {
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

  it('renders correctly in CREATE mode', async () => {
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
    const wrapper = mount(PaymentModal, {
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
      attachTo: document.body,
    });

    expect(wrapper.find('h3').text()).toBe('Pay Outstanding Amount');
    expect(wrapper.findComponent(VendorSearchBox).exists()).toBe(true);
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toBe('Pay ₹350.00');

    // Check if amount is pre-filled and deliveries/bookings are selected
    await nextTick();
    expect((wrapper.vm as any).form.amount).toBe(350);
    expect((wrapper.vm as any).form.deliveries).toContain('delivery1');
    expect((wrapper.vm as any).form.service_bookings).toContain('booking1');
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

    expect(wrapper.find('h3').text()).toBe('payments.editPayment');
    expect(wrapper.findComponent(VendorSearchBox).exists()).toBe(false); // No search box in edit mode
    expect(wrapper.find('input[type="number"]').exists()).toBe(false);
    expect(wrapper.find('button[type="submit"]').text()).toBe('payments.updatePayment');
    expect(wrapper.html()).toContain('Vendor A');
    expect(wrapper.html()).toContain('Cash Account');
    expect(wrapper.html()).toContain('₹200.00');
    expect(wrapper.html()).toContain('Delivery');
    expect(wrapper.html()).toContain('₹200.00');
  });

  it('emits close event when backdrop is clicked', async () => {
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

    await wrapper.find('.fixed.inset-0').trigger('click');
    expect(wrapper.emitted().close).toBeTruthy();
  });

  it('emits close event when escape key is pressed', async () => {
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

    await wrapper.trigger('keydown.esc');
    expect(wrapper.emitted().close).toBeTruthy();
  });

  it('emits close event when cancel button is clicked', async () => {
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

    await wrapper.find('button.btn-outline').trigger('click');
    expect(wrapper.emitted().close).toBeTruthy();
  });

  it('updates vendor outstanding and pending items on vendor change', async () => {
    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
      },
      attachTo: document.body,
    });

    // Simulate vendor selection through VendorSearchBox
    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();

    expect((wrapper.vm as any).vendorOutstanding).toBe(350); // 200 + 150
    expect((wrapper.vm as any).vendorPendingItems).toBe(2); // 1 delivery + 1 booking
  });

  it('auto-fills amount in PAY_NOW mode when vendor changes', async () => {
    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'PAY_NOW',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: mockServiceBookings,
        vendorId: 'vendor1',
      },
      attachTo: document.body,
    });

    await nextTick(); // Wait for initial form initialization
    
    // Manually set vendor to trigger change handler if not already set by prop
    if ((wrapper.vm as any).form.vendor !== 'vendor1') {
      const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
      await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
      await nextTick();
    }

    expect((wrapper.vm as any).form.amount).toBe(350);
  });

  it('selects deliveries and bookings based on amount in PAY_NOW mode', async () => {
    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'PAY_NOW',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [
          { id: 'd1', vendor: 'vendor1', total_amount: 100, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-01' },
          { id: 'd2', vendor: 'vendor1', total_amount: 50, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-02' },
        ],
        serviceBookings: [
          { id: 'b1', vendor: 'vendor1', total_amount: 75, paid_amount: 0, payment_status: 'outstanding', start_date: '2024-07-03', expand: { service: { name: 'Service Y' } } },
        ],
        vendorId: 'vendor1',
        outstandingAmount: 225, // d1 (100) + d2 (50) + b1 (75)
      },
      attachTo: document.body,
    });

    await nextTick(); // Wait for initial form initialization

    expect((wrapper.vm as any).form.deliveries).toEqual(['d1', 'd2']);
    expect((wrapper.vm as any).form.service_bookings).toEqual(['b1']);

    // Test partial selection
    await wrapper.find('input[type="number"]').setValue(120);
    await nextTick();
    expect((wrapper.vm as any).form.deliveries).toEqual(['d1']);
    expect((wrapper.vm as any).form.service_bookings).toEqual([]);
  });

  it('calculates allocated and unallocated amounts correctly', async () => {
    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [
          { id: 'd1', vendor: 'vendor1', total_amount: 100, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-01' },
        ],
        serviceBookings: [],
      },
      attachTo: document.body,
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();

    // Select a delivery
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await nextTick();

    expect((wrapper.vm as any).allocatedAmount).toBe(100);
    expect((wrapper.vm as any).unallocatedAmount).toBe(0);

    // Change amount to be less than allocated
    await wrapper.find('input[type="number"]').setValue(50);
    await nextTick();
    expect((wrapper.vm as any).unallocatedAmount).toBe(-50); // Should be negative if allocated > amount
  });

  it('shows allocation progress when applicable', async () => {
    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: mockDeliveries,
        serviceBookings: [],
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.bg-blue-50').exists()).toBe(false); // Not visible initially

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await wrapper.find('input[type="number"]').setValue(200);
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await nextTick();

    expect(wrapper.find('.bg-blue-50').exists()).toBe(true);
    expect(wrapper.html()).toContain('payments.allocated');
  });

  it('validates form correctly', async () => {
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

    // Initially invalid
    expect((wrapper.vm as any).isFormValid).toBe(false);
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBe('');

    // Valid after filling required fields
    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await wrapper.find('select[name="account"]').setValue('account1');
    await wrapper.find('input[type="number"]').setValue(100);
    await nextTick();

    expect((wrapper.vm as any).isFormValid).toBe(true);
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined();
  });

  it('handles form submission', async () => {
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
    await wrapper.find('select[name="account"]').setValue('account1');
    await wrapper.find('input[type="number"]').setValue(100);
    await nextTick();

    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted().submit).toBeTruthy();
    expect(wrapper.emitted().submit[0][0].form.amount).toBe(100);
  });

  it('loads vendor credit notes', async () => {
    const mockCreditNotes = [
      { id: 'cn1', vendor: 'vendor1', balance: 50, status: 'active', reference: 'CN-001', reason: 'Return' },
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

    expect(vendorCreditNoteService.getByVendor).toHaveBeenCalledWith('vendor1');
    expect((wrapper.vm as any).availableCreditNotes).toEqual(mockCreditNotes);
    expect(wrapper.html()).toContain('Selected credit notes: ₹0.00');
  });

  it('applies credit notes and updates amounts', async () => {
    const mockCreditNotes = [
      { id: 'cn1', vendor: 'vendor1', balance: 50, status: 'active', reference: 'CN-001', reason: 'Return' },
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

    // Select credit note
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await nextTick();

    expect((wrapper.vm as any).selectedCreditNoteAmount).toBe(50);
    expect(wrapper.html()).toContain('Selected credit notes: ₹50.00');

    // Set amount to 100, so account payment is 50
    await wrapper.find('input[type="number"]').setValue(100);
    await nextTick();

    expect(wrapper.html()).toContain('Account payment: ₹50.00');
    expect(wrapper.html()).toContain('Credit notes: ₹50.00');
    expect(wrapper.html()).toContain('Total payment: ₹100.00');
  });

  it('shows warning when credit notes exceed payment amount', async () => {
    const mockCreditNotes = [
      { id: 'cn1', vendor: 'vendor1', balance: 150, status: 'active', reference: 'CN-001', reason: 'Return' },
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

    await wrapper.find('input[type="checkbox"]').setValue(true);
    await nextTick();

    await wrapper.find('input[type="number"]').setValue(100);
    await nextTick();

    expect(wrapper.html()).toContain('⚠️ Credit notes exceed payment amount. Only ₹100.00 will be used.');
  });

  it('handles pay all outstanding button', async () => {
    const wrapper = mount(PaymentModal, {
      props: {
        isVisible: true,
        mode: 'CREATE',
        vendors: mockVendors,
        accounts: mockAccounts,
        deliveries: [
          { id: 'd1', vendor: 'vendor1', total_amount: 100, paid_amount: 0, payment_status: 'outstanding', delivery_date: '2024-07-01' },
        ],
        serviceBookings: [
          { id: 'b1', vendor: 'vendor1', total_amount: 50, paid_amount: 0, payment_status: 'outstanding', start_date: '2024-07-03', expand: { service: { name: 'Service Y' } } },
        ],
      },
      attachTo: document.body,
    });

    const vendorSearchBox = wrapper.findComponent(VendorSearchBox);
    await vendorSearchBox.vm.$emit('vendor-selected', mockVendors[0]);
    await nextTick();

    await wrapper.find('button', { text: 'Pay All (₹150.00)' }).trigger('click');
    await nextTick();

    expect((wrapper.vm as any).form.amount).toBe(150);
    expect((wrapper.vm as any).form.deliveries).toEqual(['d1']);
    expect((wrapper.vm as any).form.service_bookings).toEqual(['b1']);
  });

  it('displays no items available message when no deliveries or bookings', async () => {
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

    expect(wrapper.html()).toContain('No additional items available for allocation');
  });

  describe('Credit Note Validation Logic', () => {
    it('prevents payment when single credit note suffices but multiple selected', async () => {
      const mockCreditNotes = [
        { id: 'cn1', vendor: 'vendor1', balance: 200, status: 'active', reference: 'CN-001', reason: 'Return', credit_amount: 200, issue_date: '2024-01-01' },
        { id: 'cn2', vendor: 'vendor1', balance: 100, status: 'active', reference: 'CN-002', reason: 'Refund', credit_amount: 100, issue_date: '2024-01-02' }
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
      await nextTick();

      // Select a delivery (150 needed)
      await wrapper.find('input[type="checkbox"]').setValue(true);
      await nextTick();

      // Select both credit notes (total 300, but only 150 needed)
      const creditNoteCheckboxes = wrapper.findAll('input[type="checkbox"]').filter(cb => cb.attributes('id')?.includes('credit-note'));
      await creditNoteCheckboxes[0].setValue(true);
      await creditNoteCheckboxes[1].setValue(true);
      await nextTick();

      // Should show validation error
      expect((wrapper.vm as any).validationError).toContain('A single credit note');
      expect((wrapper.vm as any).isFormValid).toBe(false);
      expect(wrapper.find('.bg-red-50').exists()).toBe(true);
    });

    it('prevents payment when account amount alone is sufficient', async () => {
      const mockCreditNotes = [
        { id: 'cn1', vendor: 'vendor1', balance: 50, status: 'active', reference: 'CN-001', reason: 'Return', credit_amount: 50, issue_date: '2024-01-01' }
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

      // Select a delivery
      await wrapper.find('input[type="checkbox"]').setValue(true);
      await nextTick();

      // Set account payment amount to 200 (sufficient for 100 delivery)
      await wrapper.find('input[type="number"]').setValue(200);
      await nextTick();

      // Select a credit note as well
      const creditNoteCheckbox = wrapper.find('input[type="checkbox"][id*="credit-note"]');
      await creditNoteCheckbox.setValue(true);
      await nextTick();

      // Should show validation error
      expect((wrapper.vm as any).validationError).toContain('account payment amount is sufficient');
      expect((wrapper.vm as any).isFormValid).toBe(false);
      expect(wrapper.find('.bg-red-50').exists()).toBe(true);
    });

    it('requires account selection when credit notes are insufficient', async () => {
      const mockCreditNotes = [
        { id: 'cn1', vendor: 'vendor1', balance: 50, status: 'active', reference: 'CN-001', reason: 'Return', credit_amount: 50, issue_date: '2024-01-01' }
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

      // Select a delivery (100 needed)
      await wrapper.find('input[type="checkbox"]').setValue(true);
      await nextTick();

      // Credit note should be auto-selected but insufficient
      expect((wrapper.vm as any).form.credit_notes).toEqual(['cn1']);
      expect((wrapper.vm as any).selectedCreditNoteAmount).toBe(50);
      
      // Should show validation error requiring account
      expect((wrapper.vm as any).validationError).toContain('credit notes are insufficient');
      expect((wrapper.vm as any).isFormValid).toBe(false);
    });

    it('auto-selects credit notes when deliveries are selected (oldest first)', async () => {
      const mockCreditNotes = [
        { id: 'cn1', vendor: 'vendor1', balance: 75, status: 'active', reference: 'CN-001', reason: 'Return', credit_amount: 75, issue_date: '2024-01-02' },
        { id: 'cn2', vendor: 'vendor1', balance: 50, status: 'active', reference: 'CN-002', reason: 'Refund', credit_amount: 50, issue_date: '2024-01-01' }
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

      // Select a delivery (100 needed)
      await wrapper.find('input[type="checkbox"]').setValue(true);
      await nextTick();

      // Should auto-select credit notes by date (oldest first)
      const selectedCreditNotes = (wrapper.vm as any).form.credit_notes;
      expect(selectedCreditNotes).toEqual(['cn2', 'cn1']); // cn2 is older (2024-01-01), cn1 is newer (2024-01-02)
      expect((wrapper.vm as any).selectedCreditNoteAmount).toBe(125); // 50 + 75
    });

    it('disables delivery selection when account required but not selected', async () => {
      const mockCreditNotes = [
        { id: 'cn1', vendor: 'vendor1', balance: 50, status: 'active', reference: 'CN-001', reason: 'Return', credit_amount: 50, issue_date: '2024-01-01' }
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

      // Delivery checkboxes should be disabled
      const deliveryCheckbox = wrapper.find('input[type="checkbox"]:not([id*="credit-note"])');
      expect(deliveryCheckbox.attributes('disabled')).toBe('');
      
      // Should show warning message
      expect(wrapper.find('.bg-yellow-50').exists()).toBe(true);
      expect(wrapper.html()).toContain('Account Required');
      expect(wrapper.html()).toContain('credit notes are insufficient');
    });

    it('enables delivery selection when account is selected', async () => {
      const mockCreditNotes = [
        { id: 'cn1', vendor: 'vendor1', balance: 50, status: 'active', reference: 'CN-001', reason: 'Return', credit_amount: 50, issue_date: '2024-01-01' }
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

      // Delivery checkboxes should be enabled
      const deliveryCheckbox = wrapper.find('input[type="checkbox"]:not([id*="credit-note"])');
      expect(deliveryCheckbox.attributes('disabled')).toBeUndefined();
      
      // Should not show warning message
      expect(wrapper.find('.bg-yellow-50').exists()).toBe(false);
    });

    it('falls back to account amount when credit notes are insufficient', async () => {
      const mockCreditNotes = [
        { id: 'cn1', vendor: 'vendor1', balance: 50, status: 'active', reference: 'CN-001', reason: 'Return', credit_amount: 50, issue_date: '2024-01-01' }
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

      // Select a delivery (100 needed)
      await wrapper.find('input[type="checkbox"]').setValue(true);
      await nextTick();

      // Should use credit note (50) + account payment (50) = 100 total
      expect((wrapper.vm as any).selectedCreditNoteAmount).toBe(50);
      expect((wrapper.vm as any).accountPaymentAmount).toBe(50);
      expect((wrapper.vm as any).form.amount).toBe(100);
      
      // Should show breakdown
      expect(wrapper.html()).toContain('Account payment: ₹50.00');
      expect(wrapper.html()).toContain('Credit notes: ₹50.00');
    });

    it('displays credit note information correctly', async () => {
      const mockCreditNotes = [
        { id: 'cn1', vendor: 'vendor1', balance: 75, status: 'active', reference: 'CN-001', reason: 'Return', credit_amount: 100, issue_date: '2024-01-01' }
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

      // Should display credit note with remaining balance and original amount
      expect(wrapper.html()).toContain('CN-001');
      expect(wrapper.html()).toContain('₹75.00'); // remaining balance
      expect(wrapper.html()).toContain('of ₹100.00'); // original amount
      expect(wrapper.html()).toContain('Return'); // reason
    });
  });
});
