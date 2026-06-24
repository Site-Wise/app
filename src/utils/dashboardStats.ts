import { DeliveryPaymentCalculator } from '../services/deliveryUtils';
import { ServiceBookingService } from '../services/pocketbase';
import type {
  Delivery,
  ServiceBooking,
  Payment,
  VendorRefund,
  VendorReturn,
  VendorCreditNote,
} from '../services/pocketbase';

/**
 * Pure computation of the DashboardView summary tiles.
 *
 * Extracted out of DashboardView.vue's inline `stats` computed so the displayed tile
 * numbers are pinned by the financial safety-net test (which now binds to THIS function)
 * before the deferred shared-cache refactor reroutes where the collections come from.
 *
 * Semantics — must match the original inline computation exactly:
 *   - grossExpenses = Σ deliveries.total_amount + Σ bookings.total_amount
 *   - totalExpenses = grossExpenses − Σ vendorRefunds.refund_amount
 *   - expensePerSqft = round(totalExpenses / (totalPlannedArea || 1))
 *   - outstanding is summed PER ITEM and clamped at 0 (no global netting); paid comes
 *     from the payment_allocations pivot carried on payment.expand.
 *   - unpaidCount = #deliveries-with-balance + #bookings-with-balance
 *   - advances = Σ max(0, payment.amount − Σ allocated) ; advanceCount = #such payments
 *   - pendingRecovery = unsettled vendor returns (no linked refund/credit note, not rejected)
 */

export interface DashboardStatsInput {
  deliveries: Delivery[];
  serviceBookings: ServiceBooking[];
  payments: Payment[];
  vendorRefunds: VendorRefund[];
  vendorReturns?: VendorReturn[];
  creditNotes?: VendorCreditNote[];
  totalPlannedArea: number;
}

export interface DashboardStats {
  grossExpenses: number;
  totalExpenses: number;
  expensePerSqft: number;
  outstandingAmount: number;
  unpaidCount: number;
  advances: number;
  advanceCount: number;
  pendingRecovery: number;
  pendingRecoveryCount: number;
}

export function computeDashboardStats(input: DashboardStatsInput): DashboardStats {
  const {
    deliveries,
    serviceBookings,
    payments,
    vendorRefunds,
    vendorReturns = [],
    creditNotes = [],
    totalPlannedArea,
  } = input;

  // Calculate gross expenses from deliveries and service bookings
  const grossExpenses =
    deliveries.reduce((sum, delivery) => sum + delivery.total_amount, 0) +
    serviceBookings.reduce((sum, booking) => sum + booking.total_amount, 0);

  // Calculate total refunds received
  const totalRefunds = vendorRefunds.reduce((sum, refund) => sum + refund.refund_amount, 0);

  // Net expenses = Gross expenses - Refunds
  const totalExpenses = grossExpenses - totalRefunds;

  const totalSqft = totalPlannedArea || 1;
  const expensePerSqft = Math.round(totalExpenses / totalSqft);

  // Paid comes from the payment_allocations pivot, carried on each payment's expand.
  const allocations = payments.flatMap(p => p.expand?.payment_allocations || []);

  // Deliveries: outstanding = total_amount - allocated (clamped at 0).
  const deliveriesOutstanding = deliveries.reduce(
    (sum, delivery) =>
      sum + DeliveryPaymentCalculator.calculateOutstandingAmount(delivery, allocations),
    0
  );

  // Service bookings: progress-based due minus what's allocated (clamped at 0).
  const serviceBookingsOutstanding = serviceBookings.reduce((sum, booking) => {
    const allocated = allocations
      .filter(a => a.service_booking === booking.id)
      .reduce((s, a) => s + a.allocated_amount, 0);
    return sum + ServiceBookingService.calculateOutstandingAmountFromData(booking, allocated);
  }, 0);

  const outstandingAmount = deliveriesOutstanding + serviceBookingsOutstanding;

  const unpaidCount =
    deliveries.filter(
      d => DeliveryPaymentCalculator.calculateOutstandingAmount(d, allocations) > 0
    ).length +
    serviceBookings.filter(b => {
      const allocated = allocations
        .filter(a => a.service_booking === b.id)
        .reduce((s, a) => s + a.allocated_amount, 0);
      return ServiceBookingService.calculateOutstandingAmountFromData(b, allocated) > 0;
    }).length;

  // Advances = max(0, payment.amount - sum(allocated)) per payment.
  let advances = 0;
  let advanceCount = 0;
  for (const payment of payments) {
    const paymentAllocations = payment.expand?.payment_allocations || [];
    const allocated = paymentAllocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
    const unattributed = payment.amount - allocated;
    if (unattributed > 0) {
      advances += unattributed;
      advanceCount += 1;
    }
  }

  // Pending recovery = unsettled vendor returns (not rejected, no linked refund/credit).
  const refundedReturnIds = new Set(
    vendorRefunds.map(r => r.vendor_return).filter(Boolean)
  );
  const creditedReturnIds = new Set(
    creditNotes.map(cn => cn.return_id).filter(Boolean)
  );
  let pendingRecovery = 0;
  let pendingRecoveryCount = 0;
  for (const ret of vendorReturns) {
    if (ret.status === 'rejected') continue;
    const settled = refundedReturnIds.has(ret.id!) || creditedReturnIds.has(ret.id!);
    if (!settled) {
      pendingRecovery += ret.total_return_amount || 0;
      pendingRecoveryCount += 1;
    }
  }

  return {
    grossExpenses,
    totalExpenses,
    expensePerSqft,
    outstandingAmount,
    unpaidCount,
    advances,
    advanceCount,
    pendingRecovery,
    pendingRecoveryCount,
  };
}
