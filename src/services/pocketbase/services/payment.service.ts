import type { RecordModel } from 'pocketbase';
import { pb } from '../client';
import { getCurrentSiteId, getCurrentUserRole } from '../context';
import { calculatePermissions } from '../types/permissions';
import type { Payment, Delivery, ServiceBooking, PaymentAllocation, VendorCreditNote, CreditNoteUsage, AccountTransaction } from '../types';
import { mapRecordToVendor, mapRecordToAccount } from './mappers';

// Forward references for circular dependencies
let accountTransactionServiceRef: {
  create: (data: Omit<AccountTransaction, 'id' | 'site' | 'created' | 'updated'>) => Promise<AccountTransaction>;
  getByAccount: (accountId: string) => Promise<AccountTransaction[]>;
  deleteByPayment: (paymentId: string) => Promise<void>;
} | null = null;

let deliveryServiceRef: {
  mapRecordToDelivery: (record: RecordModel) => Delivery;
  calculatePaidAmount: (deliveryId: string) => Promise<number>;
} | null = null;

let serviceBookingServiceRef: {
  mapRecordToServiceBooking: (record: RecordModel) => ServiceBooking;
  calculatePaidAmount: (bookingId: string) => Promise<number>;
  calculateProgressBasedAmount: (serviceBooking: ServiceBooking) => number;
} | null = null;

let paymentAllocationServiceRef: {
  create: (data: Omit<PaymentAllocation, 'id' | 'created' | 'updated'>) => Promise<PaymentAllocation>;
  getByPayment: (paymentId: string) => Promise<PaymentAllocation[]>;
  deleteByPayment: (paymentId: string) => Promise<void>;
  mapRecordToPaymentAllocation?: (record: RecordModel) => PaymentAllocation;
} | null = null;

let vendorCreditNoteServiceRef: {
  getById: (id: string) => Promise<VendorCreditNote | null>;
  getByVendor: (vendorId: string) => Promise<VendorCreditNote[]>;
  update: (id: string, data: Partial<VendorCreditNote>) => Promise<VendorCreditNote>;
  updateBalance: (id: string, amountToRestore: number) => Promise<void>;
  mapRecordToCreditNote?: (record: RecordModel) => VendorCreditNote;
} | null = null;

let creditNoteUsageServiceRef: {
  create: (data: Omit<CreditNoteUsage, 'id' | 'site' | 'created' | 'updated'>) => Promise<CreditNoteUsage>;
  getByPayment: (paymentId: string) => Promise<CreditNoteUsage[]>;
  getByCreditNote: (creditNoteId: string) => Promise<CreditNoteUsage[]>;
  deleteByPayment: (paymentId: string) => Promise<void>;
} | null = null;

export function setPaymentServiceDependencies(deps: {
  accountTransactionService: typeof accountTransactionServiceRef;
  deliveryService: typeof deliveryServiceRef;
  serviceBookingService: typeof serviceBookingServiceRef;
  paymentAllocationService: typeof paymentAllocationServiceRef;
  vendorCreditNoteService: typeof vendorCreditNoteServiceRef;
  creditNoteUsageService: typeof creditNoteUsageServiceRef;
}) {
  accountTransactionServiceRef = deps.accountTransactionService;
  deliveryServiceRef = deps.deliveryService;
  serviceBookingServiceRef = deps.serviceBookingService;
  paymentAllocationServiceRef = deps.paymentAllocationService;
  vendorCreditNoteServiceRef = deps.vendorCreditNoteService;
  creditNoteUsageServiceRef = deps.creditNoteUsageService;
}

export class PaymentService {
  async getAll(options?: { sort?: string }): Promise<Payment[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    const records = await pb.collection('payments').getFullList({
      filter: `site="${siteId}"`,
      expand: 'vendor,account,deliveries,service_bookings,payment_allocations,payment_allocations.delivery,payment_allocations.service_booking,payment_allocations.service_booking.service,credit_notes',
      sort: options?.sort || '-payment_date' // Default sort by payment_date descending
    });
    return records.map(record => this.mapRecordToPayment(record));
  }

  async getById(id: string): Promise<Payment | null> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    try {
      const record = await pb.collection('payments').getOne(id, {
        filter: `site="${siteId}"`,
        expand: 'vendor,account,deliveries,service_bookings,payment_allocations,payment_allocations.delivery,payment_allocations.service_booking,payment_allocations.service_booking.service,credit_notes'
      });
      return this.mapRecordToPayment(record);
    } catch (error) {
      return null;
    }
  }

  async create(data: any): Promise<Payment> {
    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canCreate) {
      throw new Error('Permission denied: Cannot create payments');
    }

    if (!accountTransactionServiceRef) {
      throw new Error('AccountTransactionService dependency not initialized');
    }
    if (!creditNoteUsageServiceRef) {
      throw new Error('CreditNoteUsageService dependency not initialized');
    }
    if (!vendorCreditNoteServiceRef) {
      throw new Error('VendorCreditNoteService dependency not initialized');
    }
    if (!paymentAllocationServiceRef) {
      throw new Error('PaymentAllocationService dependency not initialized');
    }

    // Calculate credit note amount from detailed allocations and validate BEFORE creating payment
    let creditNoteAmount = 0;
    let adjustedCreditNoteAllocations = data.credit_note_allocations;

    if (data.credit_note_allocations) {
      // Check for balance changes BEFORE any creation starts
      const balanceCheckResult = await this.checkCreditNoteBalancesBeforePayment(data.credit_note_allocations);

      if (balanceCheckResult.hasChanges && !data.allowBalanceAdjustment) {
        // Throw error with balance change details for user confirmation
        const balanceChangeError = new Error('CREDIT_NOTE_BALANCE_CHANGED');
        (balanceChangeError as any).details = balanceCheckResult.details;
        throw balanceChangeError;
      } else if (balanceCheckResult.hasChanges && data.allowBalanceAdjustment) {
        // User has confirmed - use adjusted allocations
        adjustedCreditNoteAllocations = balanceCheckResult.adjustedAllocations;
      }

      creditNoteAmount = Object.values(adjustedCreditNoteAllocations).reduce((sum: number, allocation: any) => {
        return sum + (allocation.amount || 0);
      }, 0);

      // Validate adjusted credit note allocations
      await this.validateCreditNoteAllocations(adjustedCreditNoteAllocations);

      // Validate credit note priority rule
      await this.validateCreditNotePriority(adjustedCreditNoteAllocations, data.vendor);
    }

    // Calculate actual account payment amount
    const accountPaymentAmount = data.amount - creditNoteAmount;

    if (accountPaymentAmount < 0) {
      throw new Error('Credit note amount exceeds total payment amount. This should not happen with proper validation.');
    }

    // Validate account is provided when account payment is needed
    if (accountPaymentAmount > 0 && !data.account) {
      throw new Error('Account selection is required when credit notes do not cover the full payment amount.');
    }

    // Additional validation: ensure credit notes are fully utilized before using account
    if (accountPaymentAmount > 0 && data.credit_note_allocations) {
      await this.validateCreditNotesFullyUtilizedBeforeAccount(data.credit_note_allocations, data.vendor);
    }

    // Create the payment first
    const record = await pb.collection('payments').create({
      ...data,
      site: siteId
    });

    try {
      // Process credit notes with validated allocations (no race conditions now)
      if (adjustedCreditNoteAllocations && Object.keys(adjustedCreditNoteAllocations).length > 0) {
        await this.processCreditNoteAllocationsAfterValidation(
          record.id,
          adjustedCreditNoteAllocations,
          data.vendor
        );
      }

      // Create corresponding debit transaction only for actual account payment amount
      if (accountPaymentAmount > 0) {
        const vendorName = await this.getVendorName(data.vendor);
        await accountTransactionServiceRef.create({
          account: data.account,
          type: 'debit',
          amount: accountPaymentAmount,
          transaction_date: data.payment_date,
          description: `Payment to ${vendorName}`,
          reference: data.reference,
          notes: data.notes,
          vendor: data.vendor,
          payment: record.id,
          transaction_category: 'payment'
        });
      }

      // Handle payment allocations with detailed allocation amounts
      await this.handleDetailedPaymentAllocations(
        record.id,
        data.delivery_allocations || {},
        data.service_booking_allocations || {}
      );

      return this.mapRecordToPayment(record);
    } catch (error) {
      // If any step fails, clean up the payment record and any partial data
      console.error('Payment creation failed, cleaning up:', error);

      try {
        // Delete any credit note usage records that were created
        await creditNoteUsageServiceRef.deleteByPayment(record.id);

        // Delete any payment allocation records that were created
        await paymentAllocationServiceRef.deleteByPayment(record.id);

        // Delete any account transaction records that were created
        await accountTransactionServiceRef.deleteByPayment(record.id);

        // Delete the payment record
        await pb.collection('payments').delete(record.id);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }

      throw error; // Re-throw the original error
    }
  }

  private async checkCreditNoteBalancesBeforePayment(creditNoteAllocations: Record<string, any>): Promise<{
    hasChanges: boolean;
    adjustedAllocations: Record<string, any>;
    details?: any;
  }> {
    if (!vendorCreditNoteServiceRef) {
      throw new Error('VendorCreditNoteService dependency not initialized');
    }

    const adjustedAllocations: Record<string, any> = {};
    let hasChanges = false;
    let changeDetails = null;

    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) {
        adjustedAllocations[creditNoteId] = allocation;
        continue;
      }

      // Check current balance
      const freshCreditNote = await vendorCreditNoteServiceRef.getById(creditNoteId);
      if (!freshCreditNote) {
        throw new Error(`Credit note ${creditNoteId} not found`);
      }

      if (allocation.amount > freshCreditNote.balance) {
        // Balance has changed
        hasChanges = true;
        changeDetails = {
          creditNoteId,
          reference: freshCreditNote.reference || creditNoteId.slice(-6),
          requestedAmount: allocation.amount,
          availableAmount: freshCreditNote.balance,
          originalAllocations: creditNoteAllocations
        };

        // Adjust to available balance
        adjustedAllocations[creditNoteId] = {
          ...allocation,
          amount: freshCreditNote.balance
        };
      } else {
        // No change needed
        adjustedAllocations[creditNoteId] = allocation;
      }
    }

    return {
      hasChanges,
      adjustedAllocations,
      details: changeDetails
    };
  }

  private async processCreditNoteAllocationsAfterValidation(
    paymentId: string,
    creditNoteAllocations: Record<string, any>,
    vendorId: string
  ): Promise<void> {
    if (!creditNoteUsageServiceRef) {
      throw new Error('CreditNoteUsageService dependency not initialized');
    }
    if (!vendorCreditNoteServiceRef) {
      throw new Error('VendorCreditNoteService dependency not initialized');
    }

    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) continue;

      // Create credit note usage record (no more validation needed)
      await creditNoteUsageServiceRef.create({
        credit_note: creditNoteId,
        payment: paymentId,
        vendor: vendorId,
        used_amount: allocation.amount,
        used_date: new Date().toISOString().split('T')[0],
        description: `Applied to payment ${paymentId} (${allocation.state} usage)`
      });

      // Check if credit note is now fully used and update status
      const updatedCreditNote = await vendorCreditNoteServiceRef.getById(creditNoteId);
      if (updatedCreditNote && updatedCreditNote.balance <= 0) {
        await vendorCreditNoteServiceRef.update(creditNoteId, { status: 'fully_used' });
      }
    }
  }

  private async validateCreditNotesFullyUtilizedBeforeAccount(creditNoteAllocations: Record<string, any>, vendorId: string): Promise<void> {
    if (!vendorCreditNoteServiceRef) {
      throw new Error('VendorCreditNoteService dependency not initialized');
    }

    // Get all available credit notes for this vendor
    const availableCreditNotes = await vendorCreditNoteServiceRef.getByVendor(vendorId);

    // Check if any credit note being used is not fully utilized
    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) continue;

      const creditNote = availableCreditNotes.find(cn => cn.id === creditNoteId);
      if (!creditNote) continue;

      if (allocation.amount < creditNote.balance) {
        throw new Error(
          `Credit note priority violation: Credit note ${creditNote.reference || creditNoteId.slice(-6)} ` +
          `must be fully utilized (₹${creditNote.balance.toFixed(2)}) before using account payment. ` +
          `Currently allocated: ₹${allocation.amount.toFixed(2)}`
        );
      }
    }

    // Check if there are any unused credit notes while account payment is being made
    const unusedCreditNotes = availableCreditNotes.filter(cn => {
      const allocation = creditNoteAllocations[cn.id];
      return !allocation || allocation.amount <= 0;
    });

    if (unusedCreditNotes.length > 0) {
      const unusedRefs = unusedCreditNotes.map(cn => cn.reference || cn.id?.slice(-6)).join(', ');
      throw new Error(
        `Credit note priority violation: All available credit notes must be used before account payment. ` +
        `Unused credit notes: ${unusedRefs}`
      );
    }
  }

  private async validateCreditNotePriority(creditNoteAllocations: Record<string, any>, vendorId: string): Promise<void> {
    if (!vendorCreditNoteServiceRef) {
      throw new Error('VendorCreditNoteService dependency not initialized');
    }

    // Get all available credit notes for this vendor
    const availableCreditNotes = await vendorCreditNoteServiceRef.getByVendor(vendorId);

    // Check if any credit note is being used partially while others remain unused
    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) continue;

      const creditNote = availableCreditNotes.find(cn => cn.id === creditNoteId);
      if (!creditNote) continue;

      // If this credit note is being used partially
      if (allocation.amount < creditNote.balance) {
        // Check if there are older unused credit notes
        const olderUnusedCreditNotes = availableCreditNotes.filter(cn => {
          const cnDate = new Date(cn.issue_date);
          const currentDate = new Date(creditNote.issue_date);
          const isOlder = cnDate < currentDate;
          const isUnused = !creditNoteAllocations[cn.id] || creditNoteAllocations[cn.id].amount <= 0;
          return isOlder && isUnused && cn.balance > 0;
        });

        if (olderUnusedCreditNotes.length > 0) {
          throw new Error(
            `Credit note priority violation: Cannot partially use credit note ${creditNote.reference || creditNoteId.slice(-6)} ` +
            `while older credit notes remain unused. Please use credit notes in chronological order (oldest first).`
          );
        }
      }
    }
  }

  private async validateCreditNoteAllocations(creditNoteAllocations: Record<string, any>): Promise<void> {
    if (!vendorCreditNoteServiceRef) {
      throw new Error('VendorCreditNoteService dependency not initialized');
    }
    if (!creditNoteUsageServiceRef) {
      throw new Error('CreditNoteUsageService dependency not initialized');
    }

    for (const [creditNoteId, allocation] of Object.entries(creditNoteAllocations)) {
      if (allocation.amount <= 0) continue;

      const creditNote = await vendorCreditNoteServiceRef.getById(creditNoteId);
      if (!creditNote) {
        throw new Error(`Credit note ${creditNoteId} not found`);
      }

      if (allocation.amount > creditNote.balance) {
        // Get usage details for better error context
        const usageRecords = await creditNoteUsageServiceRef.getByCreditNote(creditNoteId);
        const totalUsed = usageRecords.reduce((sum, usage) => sum + usage.used_amount, 0);

        throw new Error(
          `Credit note ${creditNote.reference || creditNoteId.slice(-6)} is not available for this amount.\n` +
          `Requested: ₹${allocation.amount.toFixed(2)}\n` +
          `Available: ₹${creditNote.balance.toFixed(2)}\n` +
          `Original amount: ₹${creditNote.credit_amount.toFixed(2)}\n` +
          `Already used: ₹${totalUsed.toFixed(2)}\n` +
          `The credit note may have been used in another payment. Please refresh and try again.`
        );
      }
    }
  }


  private async handleDetailedPaymentAllocations(
    paymentId: string,
    deliveryAllocations: Record<string, any>,
    serviceBookingAllocations: Record<string, any>
  ): Promise<string[]> {
    const siteId = getCurrentSiteId();
    if (!siteId) return [];

    if (!paymentAllocationServiceRef) {
      throw new Error('PaymentAllocationService dependency not initialized');
    }

    console.log('handleDetailedPaymentAllocations called with:', {
      paymentId,
      deliveryAllocations,
      serviceBookingAllocations
    });

    const createdAllocationIds: string[] = [];

    // Handle delivery allocations with exact amounts
    for (const [deliveryId, allocation] of Object.entries(deliveryAllocations)) {
      if (allocation.amount <= 0) continue;

      // Create payment allocation record with exact amount
      const allocationRecord = await paymentAllocationServiceRef.create({
        payment: paymentId,
        delivery: deliveryId,
        allocated_amount: allocation.amount,
        site: siteId
      });

      if (allocationRecord.id) {
        createdAllocationIds.push(allocationRecord.id);
      }
    }

    // Handle service booking allocations with exact amounts
    for (const [bookingId, allocation] of Object.entries(serviceBookingAllocations)) {
      if (allocation.amount <= 0) continue;

      // Create payment allocation record with exact amount
      const allocationRecord = await paymentAllocationServiceRef.create({
        payment: paymentId,
        service_booking: bookingId,
        allocated_amount: allocation.amount,
        site: siteId
      });

      if (allocationRecord.id) {
        createdAllocationIds.push(allocationRecord.id);
      }
    }

    // Update payment record with allocation IDs so expand works properly
    if (createdAllocationIds.length > 0) {
      await pb.collection('payments').update(paymentId, {
        payment_allocations: createdAllocationIds
      });
    }

    return createdAllocationIds;
  }

  private async getVendorName(vendorId: string): Promise<string> {
    try {
      const vendor = await pb.collection('vendors').getOne(vendorId);
      return vendor.contact_person || 'Unknown Vendor';
    } catch (error) {
      return 'Unknown Vendor';
    }
  }

  async updateAllocations(paymentId: string, deliveryIds: string[], serviceBookingIds: string[]): Promise<void> {
    if (!paymentAllocationServiceRef) {
      throw new Error('PaymentAllocationService dependency not initialized');
    }
    if (!deliveryServiceRef) {
      throw new Error('DeliveryService dependency not initialized');
    }
    if (!serviceBookingServiceRef) {
      throw new Error('ServiceBookingService dependency not initialized');
    }

    // Get the payment to determine total amount
    const payment = await this.getById(paymentId);
    if (!payment) throw new Error('Payment not found');

    const siteId = getCurrentSiteId();
    if (!siteId) throw new Error('No site selected');

    // Get existing allocations - we'll preserve these and only add new ones
    const existingAllocations = await paymentAllocationServiceRef.getByPayment(paymentId);

    // Create sets of already allocated item IDs
    const existingDeliveryIds = new Set(
      existingAllocations.filter(a => a.delivery).map(a => a.delivery!)
    );
    const existingServiceBookingIds = new Set(
      existingAllocations.filter(a => a.service_booking).map(a => a.service_booking!)
    );

    // Calculate already allocated amount from existing allocations
    const existingAllocatedAmount = existingAllocations.reduce((sum, a) => sum + a.allocated_amount, 0);

    // Filter to only new items (not already allocated)
    const newDeliveryIds = deliveryIds.filter(id => !existingDeliveryIds.has(id));
    const newServiceBookingIds = serviceBookingIds.filter(id => !existingServiceBookingIds.has(id));

    // If no new items to allocate, return early
    if (newDeliveryIds.length === 0 && newServiceBookingIds.length === 0) {
      return;
    }

    // Calculate remaining amount available for new allocations
    let remainingAmount = payment.amount - existingAllocatedAmount;

    if (remainingAmount <= 0) {
      console.warn('Payment is already fully allocated, cannot add new allocations');
      return;
    }

    // Prepare data for new allocations only
    const allocationData: Array<{delivery?: string, service_booking?: string, allocated_amount: number}> = [];

    // Handle new delivery allocations
    for (const deliveryId of newDeliveryIds) {
      if (remainingAmount <= 0) break;

      const delivery = await pb.collection('deliveries').getOne(deliveryId);
      const currentPaidAmount = await deliveryServiceRef.calculatePaidAmount(deliveryId);
      const outstandingAmount = delivery.total_amount - currentPaidAmount;
      const allocatedAmount = Math.min(remainingAmount, outstandingAmount);

      if (allocatedAmount > 0) {
        allocationData.push({
          delivery: deliveryId,
          allocated_amount: allocatedAmount
        });
        remainingAmount -= allocatedAmount;
      }
    }

    // Handle new service booking allocations
    for (const bookingId of newServiceBookingIds) {
      if (remainingAmount <= 0) break;

      const bookingRecord = await pb.collection('service_bookings').getOne(bookingId);
      const booking = serviceBookingServiceRef.mapRecordToServiceBooking(bookingRecord);
      const currentPaidAmount = await serviceBookingServiceRef.calculatePaidAmount(bookingId);
      const progressAmount = serviceBookingServiceRef.calculateProgressBasedAmount(booking);
      const outstandingAmount = progressAmount - currentPaidAmount;
      const allocatedAmount = Math.min(remainingAmount, outstandingAmount);

      if (allocatedAmount > 0) {
        allocationData.push({
          service_booking: bookingId,
          allocated_amount: allocatedAmount
        });
        remainingAmount -= allocatedAmount;
      }
    }

    // Create new allocation records and collect their IDs
    const newAllocationIds: string[] = [];
    for (const data of allocationData) {
      const allocationRecord = await paymentAllocationServiceRef.create({
        payment: paymentId,
        delivery: data.delivery,
        service_booking: data.service_booking,
        allocated_amount: data.allocated_amount,
        site: siteId
      });
      if (allocationRecord.id) {
        newAllocationIds.push(allocationRecord.id);
      }
    }

    // Update the payment record with all allocation IDs (existing + new)
    if (newAllocationIds.length > 0) {
      const existingAllocationIds = existingAllocations.map(a => a.id!).filter(id => id);
      const allAllocationIds = [...existingAllocationIds, ...newAllocationIds];

      await pb.collection('payments').update(paymentId, {
        payment_allocations: allAllocationIds
      });
    }
  }

  async delete(id: string): Promise<boolean> {
    // Check permissions
    const userRole = getCurrentUserRole();
    const permissions = calculatePermissions(userRole);
    if (!permissions.canDelete) {
      throw new Error('Permission denied: Cannot delete payments');
    }

    if (!paymentAllocationServiceRef) {
      throw new Error('PaymentAllocationService dependency not initialized');
    }
    if (!creditNoteUsageServiceRef) {
      throw new Error('CreditNoteUsageService dependency not initialized');
    }
    if (!vendorCreditNoteServiceRef) {
      throw new Error('VendorCreditNoteService dependency not initialized');
    }
    if (!accountTransactionServiceRef) {
      throw new Error('AccountTransactionService dependency not initialized');
    }

    // Get payment allocations - payment can only be deleted if no allocations exist
    const allocations = await paymentAllocationServiceRef.getByPayment(id);
    if (allocations.length > 0) {
      throw new Error('Cannot delete payment with existing allocations. Please remove all allocations first.');
    }

    // Get the payment to find related account transaction
    const payment = await this.getById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Get credit note usage records to restore balances before deletion
    try {
      const creditNoteUsages = await creditNoteUsageServiceRef.getByPayment(id);

      // Restore credit note balances
      for (const usage of creditNoteUsages) {
        if (usage.credit_note) {
          await vendorCreditNoteServiceRef.updateBalance(usage.credit_note, usage.used_amount);
        }
      }

      // Delete credit note usage records
      await creditNoteUsageServiceRef.deleteByPayment(id);
    } catch (error) {
      console.error('Error deleting credit note usage records:', error);
      // Continue with payment deletion even if credit note usage deletion fails
    }

    // Find and delete the related account transaction
    try {
      const accountTransactions = await accountTransactionServiceRef.getByAccount(payment.account);
      const relatedTransaction = accountTransactions.find(
        transaction => transaction.payment === id && transaction.type === 'debit'
      );

      if (relatedTransaction && relatedTransaction.id) {
        await pb.collection('account_transactions').delete(relatedTransaction.id);
      }
    } catch (error) {
      console.error('Error deleting related account transaction:', error);
      // Continue with payment deletion even if account transaction deletion fails
    }

    // Delete the payment
    await pb.collection('payments').delete(id);

    return true;
  }

  mapRecordToPayment(record: RecordModel): Payment {
    if (!deliveryServiceRef) {
      throw new Error('DeliveryService dependency not initialized');
    }
    if (!serviceBookingServiceRef) {
      throw new Error('ServiceBookingService dependency not initialized');
    }

    return {
      id: record.id,
      vendor: record.vendor,
      account: record.account,
      amount: record.amount,
      payment_date: record.payment_date,
      reference: record.reference,
      notes: record.notes,
      deliveries: record.deliveries || [],
      service_bookings: record.service_bookings || [],
      credit_notes: record.credit_notes || [],
      site: record.site,
      created: record.created,
      updated: record.updated,
      expand: record.expand ? {
        vendor: record.expand.vendor ? mapRecordToVendor(record.expand.vendor) : undefined,
        account: record.expand.account ? mapRecordToAccount(record.expand.account) : undefined,
        deliveries: record.expand.deliveries && Array.isArray(record.expand.deliveries) ?
          record.expand.deliveries.map((delivery: RecordModel) => deliveryServiceRef!.mapRecordToDelivery(delivery)) : undefined,
        service_bookings: record.expand.service_bookings && Array.isArray(record.expand.service_bookings) ?
          record.expand.service_bookings.map((booking: RecordModel) => serviceBookingServiceRef!.mapRecordToServiceBooking(booking)) : undefined,
        payment_allocations: record.expand.payment_allocations && Array.isArray(record.expand.payment_allocations) && paymentAllocationServiceRef?.mapRecordToPaymentAllocation ?
          record.expand.payment_allocations.map((allocation: RecordModel) => paymentAllocationServiceRef!.mapRecordToPaymentAllocation!(allocation)) : undefined,
        credit_notes: record.expand.credit_notes && Array.isArray(record.expand.credit_notes) && vendorCreditNoteServiceRef?.mapRecordToCreditNote ?
          record.expand.credit_notes.map((creditNote: RecordModel) => vendorCreditNoteServiceRef!.mapRecordToCreditNote!(creditNote)) : undefined
      } : undefined
    };
  }
}

export const paymentService = new PaymentService();
