import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePaymentPartials, type PaymentAllocation } from '../../composables/usePaymentPartials';
import type { Delivery, ServiceBooking, VendorCreditNote } from '../../services/pocketbase';

describe('usePaymentPartials', () => {
  let paymentPartials: ReturnType<typeof usePaymentPartials>;

  const mockDeliveries: Delivery[] = [
    {
      id: 'delivery-1',
      vendor: 'vendor-1',
      delivery_date: '2024-01-15',
      total_amount: 100,
      paid_amount: 0,
      payment_status: 'pending',
      delivery_reference: 'DEL-001',
      notes: ''
    },
    {
      id: 'delivery-2', 
      vendor: 'vendor-1',
      delivery_date: '2024-01-16',
      total_amount: 150,
      paid_amount: 0,
      payment_status: 'pending',
      delivery_reference: 'DEL-002',
      notes: ''
    },
    {
      id: 'delivery-3',
      vendor: 'vendor-1', 
      delivery_date: '2024-01-17',
      total_amount: 500,
      paid_amount: 0,
      payment_status: 'pending',
      delivery_reference: 'DEL-003',
      notes: ''
    }
  ];

  const mockServiceBookings: ServiceBooking[] = [
    {
      id: 'booking-1',
      vendor: 'vendor-1',
      service: 'service-1',
      start_date: '2024-01-20',
      end_date: '2024-01-21',
      total_amount: 200,
      paid_amount: 0,
      payment_status: 'pending',
      notes: ''
    }
  ];

  const mockCreditNotes: VendorCreditNote[] = [
    {
      id: 'credit-1',
      vendor: 'vendor-1',
      balance: 50,
      status: 'active',
      reason: 'Return credit',
      reference: 'CR-001',
      created: '2024-01-10',
      updated: '2024-01-10'
    }
  ];

  beforeEach(() => {
    paymentPartials = usePaymentPartials();
  });

  describe('initializeAllocations', () => {
    it('should initialize allocations from deliveries and service bookings', () => {
      paymentPartials.initializeAllocations(mockDeliveries, mockServiceBookings, 'vendor-1');
      
      expect(paymentPartials.form.allocations).toHaveLength(4);
      
      // Check delivery allocations
      const deliveryAllocations = paymentPartials.form.allocations.filter(a => a.type === 'delivery');
      expect(deliveryAllocations).toHaveLength(3);
      expect(deliveryAllocations[0].outstandingAmount).toBe(100);
      expect(deliveryAllocations[1].outstandingAmount).toBe(150);
      expect(deliveryAllocations[2].outstandingAmount).toBe(500);
      
      // Check service booking allocations
      const bookingAllocations = paymentPartials.form.allocations.filter(a => a.type === 'service_booking');
      expect(bookingAllocations).toHaveLength(1);
      expect(bookingAllocations[0].outstandingAmount).toBe(200);
      
      // All should start as unchecked
      paymentPartials.form.allocations.forEach(allocation => {
        expect(allocation.state).toBe('unchecked');
        expect(allocation.allocatedAmount).toBe(0);
      });
    });

    it('should sort allocations by date', () => {
      paymentPartials.initializeAllocations(mockDeliveries, mockServiceBookings, 'vendor-1');
      
      const dates = paymentPartials.form.allocations.map(allocation => {
        return allocation.type === 'delivery' 
          ? new Date((allocation.item as Delivery).delivery_date).getTime()
          : new Date((allocation.item as ServiceBooking).start_date).getTime();
      });
      
      // Should be sorted in ascending order
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it('should only include items with outstanding amounts', () => {
      const paidDeliveries = mockDeliveries.map(d => ({
        ...d,
        paid_amount: d.total_amount,
        payment_status: 'paid' as const
      }));
      
      paymentPartials.initializeAllocations(paidDeliveries, mockServiceBookings, 'vendor-1');
      
      // Only service booking should remain
      expect(paymentPartials.form.allocations).toHaveLength(1);
      expect(paymentPartials.form.allocations[0].type).toBe('service_booking');
    });
  });

  describe('distributeAmountToAllocations', () => {
    beforeEach(() => {
      paymentPartials.initializeAllocations(mockDeliveries, mockServiceBookings, 'vendor-1');
    });

    it('should distribute amount to allocations in order', () => {
      paymentPartials.form.amount = 200;
      paymentPartials.distributeAmountToAllocations();
      
      // First delivery should be fully allocated (100)
      expect(paymentPartials.form.allocations[0].state).toBe('checked');
      expect(paymentPartials.form.allocations[0].allocatedAmount).toBe(100);
      
      // Second delivery should be partially allocated (100 remaining)
      expect(paymentPartials.form.allocations[1].state).toBe('partial');
      expect(paymentPartials.form.allocations[1].allocatedAmount).toBe(100);
      
      // Third delivery and service booking should remain unchecked
      expect(paymentPartials.form.allocations[2].state).toBe('unchecked');
      expect(paymentPartials.form.allocations[2].allocatedAmount).toBe(0);
      expect(paymentPartials.form.allocations[3].state).toBe('unchecked');
      expect(paymentPartials.form.allocations[3].allocatedAmount).toBe(0);
    });

    it('should handle exact amount matching', () => {
      paymentPartials.form.amount = 250; // 100 + 150
      paymentPartials.distributeAmountToAllocations();
      
      // First two deliveries should be fully allocated
      expect(paymentPartials.form.allocations[0].state).toBe('checked');
      expect(paymentPartials.form.allocations[0].allocatedAmount).toBe(100);
      expect(paymentPartials.form.allocations[1].state).toBe('checked');
      expect(paymentPartials.form.allocations[1].allocatedAmount).toBe(150);
      
      // Others should remain unchecked
      expect(paymentPartials.form.allocations[2].state).toBe('unchecked');
      expect(paymentPartials.form.allocations[3].state).toBe('unchecked');
    });

    it('should clear allocations when amount is zero', () => {
      // First set some allocations
      paymentPartials.form.amount = 200;
      paymentPartials.distributeAmountToAllocations();
      
      // Then clear them
      paymentPartials.form.amount = 0;
      paymentPartials.distributeAmountToAllocations();
      
      paymentPartials.form.allocations.forEach(allocation => {
        expect(allocation.state).toBe('unchecked');
        expect(allocation.allocatedAmount).toBe(0);
      });
    });
  });

  describe('updateAllocationState', () => {
    beforeEach(() => {
      paymentPartials.initializeAllocations(mockDeliveries, mockServiceBookings, 'vendor-1');
    });

    it('should update allocation state and amount', () => {
      paymentPartials.updateAllocationState('delivery-1', 'checked', 100);
      
      const allocation = paymentPartials.form.allocations.find(a => a.id === 'delivery-1');
      expect(allocation?.state).toBe('checked');
      expect(allocation?.allocatedAmount).toBe(100);
    });

    it('should update total amount when not amount-driven', () => {
      paymentPartials.updateAllocationState('delivery-1', 'checked', 100);
      paymentPartials.updateAllocationState('delivery-2', 'partial', 75);
      
      expect(paymentPartials.form.amount).toBe(175);
    });
  });

  describe('computed properties', () => {
    beforeEach(() => {
      paymentPartials.initializeAllocations(mockDeliveries, mockServiceBookings, 'vendor-1');
    });

    it('should calculate totalAllocatedAmount correctly', () => {
      paymentPartials.updateAllocationState('delivery-1', 'checked', 100);
      paymentPartials.updateAllocationState('delivery-2', 'partial', 75);
      
      expect(paymentPartials.totalAllocatedAmount.value).toBe(175);
    });

    it('should calculate unallocatedAmount correctly', () => {
      paymentPartials.form.amount = 200;
      paymentPartials.distributeAmountToAllocations(); // Use distribution instead of direct state update
      
      expect(paymentPartials.unallocatedAmount.value).toBe(0); // 200 is fully allocated to first two deliveries
    });

    it('should calculate allocationPercentage correctly', () => {
      paymentPartials.form.amount = 200;
      paymentPartials.distributeAmountToAllocations(); // Use distribution instead of direct state update
      
      expect(paymentPartials.allocationPercentage.value).toBe(100); // 200 is fully allocated
    });

    it('should detect over-allocation', () => {
      paymentPartials.form.amount = 100;
      // Manually set allocations without triggering auto-update
      paymentPartials.form.allocations[0].allocatedAmount = 100;
      paymentPartials.form.allocations[1].allocatedAmount = 50;
      
      expect(paymentPartials.isOverAllocated.value).toBe(true);
    });

    it('should detect full allocation', () => {
      paymentPartials.form.amount = 100;
      paymentPartials.updateAllocationState('delivery-1', 'checked', 100);
      
      expect(paymentPartials.isFullyAllocated.value).toBe(true);
    });
  });

  describe('credit notes integration', () => {
    beforeEach(() => {
      paymentPartials.initializeAllocations(mockDeliveries, mockServiceBookings, 'vendor-1');
      paymentPartials.availableCreditNotes.value = mockCreditNotes;
    });

    it('should calculate selectedCreditNoteAmount correctly', () => {
      paymentPartials.form.credit_notes = ['credit-1'];
      
      expect(paymentPartials.selectedCreditNoteAmount.value).toBe(50);
    });

    it('should calculate accountPaymentAmount correctly with credit notes', () => {
      paymentPartials.form.amount = 200;
      paymentPartials.form.credit_notes = ['credit-1'];
      
      expect(paymentPartials.accountPaymentAmount.value).toBe(150);
    });

    it('should handle credit notes in distribution', () => {
      paymentPartials.form.amount = 200;
      paymentPartials.form.credit_notes = ['credit-1']; // 50 credit
      paymentPartials.distributeAmountToAllocations();
      
      // Should distribute 150 (200 - 50 credit) to allocations
      expect(paymentPartials.form.allocations[0].allocatedAmount).toBe(100);
      expect(paymentPartials.form.allocations[1].allocatedAmount).toBe(50);
    });
  });

  describe('payAllOutstanding', () => {
    beforeEach(() => {
      paymentPartials.initializeAllocations(mockDeliveries, mockServiceBookings, 'vendor-1');
      paymentPartials.availableCreditNotes.value = mockCreditNotes;
    });

    it('should set amount to total outstanding plus credit notes', () => {
      paymentPartials.form.credit_notes = ['credit-1'];
      paymentPartials.payAllOutstanding();
      
      // Total outstanding: 100 + 150 + 500 + 200 = 950
      // Plus credit notes: 50
      expect(paymentPartials.form.amount).toBe(1000);
    });

    it('should mark all allocations as fully checked', () => {
      paymentPartials.payAllOutstanding();
      
      paymentPartials.form.allocations.forEach(allocation => {
        expect(allocation.state).toBe('checked');
        expect(allocation.allocatedAmount).toBe(allocation.outstandingAmount);
      });
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      paymentPartials.initializeAllocations(mockDeliveries, mockServiceBookings, 'vendor-1');
    });

    it('should validate minimum amount', () => {
      paymentPartials.form.amount = 0;
      const errors = paymentPartials.validateAllocations();
      
      expect(errors).toContain('Payment amount must be greater than 0');
    });

    it('should validate over-allocation', () => {
      paymentPartials.form.amount = 100;
      // Manually set allocations without triggering auto-update
      paymentPartials.form.allocations[0].allocatedAmount = 100;
      paymentPartials.form.allocations[1].allocatedAmount = 50;
      
      const errors = paymentPartials.validateAllocations();
      
      expect(errors).toContain('Total allocated amount exceeds payment amount');
    });

    it('should validate minimum allocation', () => {
      paymentPartials.form.amount = 100;
      // Don't allocate anything
      
      const errors = paymentPartials.validateAllocations();
      
      expect(errors).toContain('Please allocate payment to at least one delivery or service booking');
    });
  });

  describe('getPaymentData', () => {
    beforeEach(() => {
      paymentPartials.initializeAllocations(mockDeliveries, mockServiceBookings, 'vendor-1');
    });

    it('should return properly formatted payment data', () => {
      paymentPartials.form.vendor = 'vendor-1';
      paymentPartials.form.account = 'account-1';
      paymentPartials.form.reference = 'REF-001';
      paymentPartials.form.notes = 'Test payment';
      paymentPartials.form.credit_notes = ['credit-1'];
      
      paymentPartials.updateAllocationState('delivery-1', 'checked', 100);
      paymentPartials.updateAllocationState('delivery-2', 'partial', 50);
      
      // After updateAllocationState, form.amount is automatically set to 150 (100 + 50)
      // This is the expected behavior of the system
      
      const data = paymentPartials.getPaymentData();
      
      expect(data.vendor).toBe('vendor-1');
      expect(data.account).toBe('account-1');
      expect(data.amount).toBe(150); // Updated to reflect actual system behavior
      expect(data.reference).toBe('REF-001');
      expect(data.notes).toBe('Test payment');
      expect(data.credit_notes).toEqual(['credit-1']);
      expect(data.allocations).toHaveLength(2);
      expect(data.allocations[0].allocated_amount).toBe(100);
      expect(data.allocations[1].allocated_amount).toBe(50);
    });

    it('should only include allocations with amounts greater than 0', () => {
      paymentPartials.updateAllocationState('delivery-1', 'checked', 100);
      // delivery-2 and others remain at 0
      
      const data = paymentPartials.getPaymentData();
      
      expect(data.allocations).toHaveLength(1);
      expect(data.allocations[0].id).toBe('delivery-1');
    });
  });

  describe('resetForm', () => {
    it('should reset all form fields and state', () => {
      // Set some data
      paymentPartials.form.vendor = 'vendor-1';
      paymentPartials.form.amount = 200;
      paymentPartials.availableCreditNotes.value = mockCreditNotes;
      
      paymentPartials.resetForm();
      
      expect(paymentPartials.form.vendor).toBe('');
      expect(paymentPartials.form.amount).toBe(0);
      expect(paymentPartials.form.allocations).toHaveLength(0);
      expect(paymentPartials.availableCreditNotes.value).toHaveLength(0);
    });
  });
});