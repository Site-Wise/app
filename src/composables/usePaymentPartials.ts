import { ref, computed, reactive, watch } from 'vue';
import type { Delivery, ServiceBooking, VendorCreditNote } from '../services/pocketbase';

export interface PaymentAllocation {
  id: string;
  type: 'delivery' | 'service_booking';
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  allocatedAmount: number;
  state: 'unchecked' | 'partial' | 'checked';
  item: Delivery | ServiceBooking;
}

export interface PaymentPartialForm {
  vendor: string;
  account: string;
  amount: number;
  transaction_date: string;
  reference: string;
  notes: string;
  credit_notes: string[];
  allocations: PaymentAllocation[];
}

export function usePaymentPartials() {
  const form = reactive<PaymentPartialForm>({
    vendor: '',
    account: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    credit_notes: [],
    allocations: []
  });

  const availableCreditNotes = ref<VendorCreditNote[]>([]);
  const isAmountDriven = ref(false); // Track if amount is being manually changed

  // Computed properties
  const selectedCreditNoteAmount = computed(() => {
    return form.credit_notes.reduce((total, creditNoteId) => {
      const creditNote = availableCreditNotes.value.find(cn => cn.id === creditNoteId);
      return total + (creditNote?.balance || 0);
    }, 0);
  });

  const totalAllocatedAmount = computed(() => {
    return form.allocations.reduce((total, allocation) => total + allocation.allocatedAmount, 0);
  });

  const accountPaymentAmount = computed(() => {
    return Math.max(0, form.amount - selectedCreditNoteAmount.value);
  });

  const unallocatedAmount = computed(() => {
    return Math.max(0, form.amount - totalAllocatedAmount.value);
  });

  const allocationPercentage = computed(() => {
    if (form.amount === 0) return 0;
    return Math.round((totalAllocatedAmount.value / form.amount) * 100);
  });

  const isFullyAllocated = computed(() => {
    return Math.abs(unallocatedAmount.value) < 0.01; // Account for floating point precision
  });

  const isOverAllocated = computed(() => {
    return totalAllocatedAmount.value > form.amount;
  });

  // Methods
  const initializeAllocations = (deliveries: Delivery[], serviceBookings: ServiceBooking[], vendorId: string) => {
    const allocations: PaymentAllocation[] = [];

    // Add deliveries
    deliveries
      .filter(delivery => delivery.vendor === vendorId && delivery.payment_status !== 'paid')
      .forEach(delivery => {
        const outstanding = delivery.total_amount - delivery.paid_amount;
        if (outstanding > 0) {
          allocations.push({
            id: delivery.id!,
            type: 'delivery',
            totalAmount: delivery.total_amount,
            paidAmount: delivery.paid_amount,
            outstandingAmount: outstanding,
            allocatedAmount: 0,
            state: 'unchecked',
            item: delivery
          });
        }
      });

    // Add service bookings
    serviceBookings
      .filter(booking => booking.vendor === vendorId && booking.payment_status !== 'paid')
      .forEach(booking => {
        const outstanding = booking.total_amount - booking.paid_amount;
        if (outstanding > 0) {
          allocations.push({
            id: booking.id!,
            type: 'service_booking',
            totalAmount: booking.total_amount,
            paidAmount: booking.paid_amount,
            outstandingAmount: outstanding,
            allocatedAmount: 0,
            state: 'unchecked',
            item: booking
          });
        }
      });

    // Sort by date (deliveries by delivery_date, bookings by start_date)
    allocations.sort((a, b) => {
      const dateA = a.type === 'delivery' 
        ? new Date((a.item as Delivery).delivery_date).getTime()
        : new Date((a.item as ServiceBooking).start_date).getTime();
      const dateB = b.type === 'delivery' 
        ? new Date((b.item as Delivery).delivery_date).getTime()
        : new Date((b.item as ServiceBooking).start_date).getTime();
      return dateA - dateB;
    });

    form.allocations = allocations;
  };

  const updateAllocationState = (allocationId: string, newState: 'unchecked' | 'partial' | 'checked', allocatedAmount: number) => {
    const allocation = form.allocations.find(a => a.id === allocationId);
    if (!allocation) return;

    allocation.state = newState;
    allocation.allocatedAmount = allocatedAmount;

    // If not amount-driven, update the total amount
    if (!isAmountDriven.value) {
      updateAmountFromAllocations();
    }
  };

  const updateAmountFromAllocations = () => {
    const totalFromAllocations = totalAllocatedAmount.value;
    const creditNoteAmount = selectedCreditNoteAmount.value;
    form.amount = totalFromAllocations + creditNoteAmount;
  };

  const distributeAmountToAllocations = () => {
    if (form.amount <= 0) {
      // Clear all allocations
      form.allocations.forEach(allocation => {
        allocation.state = 'unchecked';
        allocation.allocatedAmount = 0;
      });
      return;
    }

    let remainingAmount = form.amount;

    // First, apply credit notes (they don't affect allocation distribution)
    const creditNoteAmount = selectedCreditNoteAmount.value;
    
    // The remaining amount after credit notes is what we distribute to allocations
    remainingAmount = Math.max(0, remainingAmount - creditNoteAmount);

    // Reset all allocations first
    form.allocations.forEach(allocation => {
      allocation.state = 'unchecked';
      allocation.allocatedAmount = 0;
    });

    // Distribute remaining amount to allocations in order
    for (const allocation of form.allocations) {
      if (remainingAmount <= 0) break;

      const canAllocate = Math.min(remainingAmount, allocation.outstandingAmount);
      
      if (canAllocate > 0) {
        allocation.allocatedAmount = canAllocate;
        
        if (Math.abs(canAllocate - allocation.outstandingAmount) < 0.01) {
          allocation.state = 'checked';
        } else {
          allocation.state = 'partial';
        }
        
        remainingAmount -= canAllocate;
      }
    }
  };

  const handleAmountChange = (newAmount: number) => {
    isAmountDriven.value = true;
    form.amount = newAmount;
    distributeAmountToAllocations();
    
    // Reset flag after a short delay to allow for selection-driven updates
    setTimeout(() => {
      isAmountDriven.value = false;
    }, 100);
  };

  const handleCreditNoteChange = () => {
    // When credit notes change, redistribute if amount-driven
    if (isAmountDriven.value) {
      distributeAmountToAllocations();
    } else {
      updateAmountFromAllocations();
    }
  };

  const payAllOutstanding = () => {
    const totalOutstanding = form.allocations.reduce((sum, allocation) => sum + allocation.outstandingAmount, 0);
    const creditNoteAmount = selectedCreditNoteAmount.value;
    
    form.amount = totalOutstanding + creditNoteAmount;
    
    // Mark all allocations as fully checked
    form.allocations.forEach(allocation => {
      allocation.state = 'checked';
      allocation.allocatedAmount = allocation.outstandingAmount;
    });
  };

  const validateAllocations = (): string[] => {
    const errors: string[] = [];

    if (form.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (isOverAllocated.value) {
      errors.push('Total allocated amount exceeds payment amount');
    }

    if (totalAllocatedAmount.value === 0) {
      errors.push('Please allocate payment to at least one delivery or service booking');
    }

    // Check for individual allocation errors
    form.allocations.forEach((allocation, index) => {
      if (allocation.allocatedAmount > allocation.outstandingAmount) {
        errors.push(`Allocation ${index + 1} exceeds outstanding amount`);
      }
    });

    return errors;
  };

  const resetForm = () => {
    Object.assign(form, {
      vendor: '',
      account: '',
      amount: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
      credit_notes: [],
      allocations: []
    });
    availableCreditNotes.value = [];
    isAmountDriven.value = false;
  };

  const getPaymentData = () => {
    return {
      vendor: form.vendor,
      account: form.account,
      amount: form.amount,
      payment_date: form.transaction_date,
      reference: form.reference,
      notes: form.notes,
      credit_notes: form.credit_notes,
      allocations: form.allocations
        .filter(allocation => allocation.allocatedAmount > 0)
        .map(allocation => ({
          id: allocation.id,
          type: allocation.type,
          allocated_amount: allocation.allocatedAmount
        }))
    };
  };

  // Watchers
  watch(() => form.vendor, () => {
    form.credit_notes = [];
    availableCreditNotes.value = [];
  });

  return {
    form,
    availableCreditNotes,
    selectedCreditNoteAmount,
    totalAllocatedAmount,
    accountPaymentAmount,
    unallocatedAmount,
    allocationPercentage,
    isFullyAllocated,
    isOverAllocated,
    initializeAllocations,
    updateAllocationState,
    updateAmountFromAllocations,
    distributeAmountToAllocations,
    handleAmountChange,
    handleCreditNoteChange,
    payAllOutstanding,
    validateAllocations,
    resetForm,
    getPaymentData
  };
}