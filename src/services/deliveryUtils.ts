import type { Delivery, PaymentAllocation } from './pocketbase';

export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface DeliveryWithPaymentStatus extends Delivery {
  payment_status: PaymentStatus;
  outstanding: number;
  paid_amount: number;
}

export class DeliveryPaymentCalculator {
  /**
   * Calculate payment status for a delivery based on payment allocations
   */
  static calculatePaymentStatus(delivery: Delivery, paymentAllocations: PaymentAllocation[]): PaymentStatus {
    if (!paymentAllocations.length) return 'pending';
    
    const allocatedAmount = paymentAllocations
      .filter(allocation => allocation.delivery === delivery.id)
      .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
    
    if (allocatedAmount <= 0) return 'pending';
    if (allocatedAmount >= delivery.total_amount) return 'paid';
    return 'partial';
  }

  /**
   * Calculate outstanding amount for a delivery
   */
  static calculateOutstandingAmount(delivery: Delivery, paymentAllocations: PaymentAllocation[]): number {
    if (!paymentAllocations.length) return delivery.total_amount;
    
    const allocatedAmount = paymentAllocations
      .filter(allocation => allocation.delivery === delivery.id)
      .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
    
    return Math.max(0, delivery.total_amount - allocatedAmount);
  }

  /**
   * Calculate paid amount for a delivery
   */
  static calculatePaidAmount(delivery: Delivery, paymentAllocations: PaymentAllocation[]): number {
    if (!paymentAllocations.length) return 0;
    
    return paymentAllocations
      .filter(allocation => allocation.delivery === delivery.id)
      .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  }

  /**
   * Enhance deliveries with payment status, outstanding amount, and paid amount
   */
  static enhanceDeliveriesWithPaymentStatus(
    deliveries: Delivery[], 
    paymentAllocations: PaymentAllocation[]
  ): DeliveryWithPaymentStatus[] {
    return deliveries.map(delivery => ({
      ...delivery,
      payment_status: this.calculatePaymentStatus(delivery, paymentAllocations),
      outstanding: this.calculateOutstandingAmount(delivery, paymentAllocations),
      paid_amount: this.calculatePaidAmount(delivery, paymentAllocations)
    }));
  }

  /**
   * Get payment status CSS class for display
   */
  static getPaymentStatusClass(status: PaymentStatus): string {
    const statusClasses = {
      pending: 'status-pending',
      partial: 'status-partial', 
      paid: 'status-paid'
    };
    return statusClasses[status];
  }

  /**
   * Get payment status display text key for i18n
   */
  static getPaymentStatusTextKey(status: PaymentStatus): string {
    const statusKeys = {
      pending: 'common.pending',
      partial: 'common.partial',
      paid: 'common.paid'
    };
    return statusKeys[status];
  }
}