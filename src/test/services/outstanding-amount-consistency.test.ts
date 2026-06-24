import { describe, it, expect } from 'vitest'
import {
  VendorService,
  ServiceBookingService,
  type Delivery,
  type ServiceBooking,
  type Payment,
  type PaymentAllocation
} from '../../services/pocketbase'
import { DeliveryPaymentCalculator } from '../../services/deliveryUtils'

/**
 * Outstanding amount is computed PER ITEM (each delivery / progress-based booking due,
 * clamped at 0), using the payment_allocations pivot as the source of truth — NOT by
 * globally netting a vendor's total due against their total payments. The deprecated
 * paid_amount / payment_status fields are always 0 from the API and must be ignored.
 *
 * The contract these tests lock in:
 *   1. VendorService.calculateOutstandingFromData clamps per item (an overpayment on one
 *      delivery cannot erase a genuine balance on another).
 *   2. Summing every vendor's outstanding equals the site-wide total the dashboard shows,
 *      because both derive from the same allocations and every item has exactly one vendor.
 */

// Mirror of DashboardView.vue's stats calculation — the site-wide outstanding tile.
function dashboardOutstanding(
  deliveries: Delivery[],
  serviceBookings: ServiceBooking[],
  payments: Payment[]
): number {
  const allocations = payments.flatMap(p => p.expand?.payment_allocations || [])

  const deliveriesOutstanding = deliveries.reduce(
    (sum, d) => sum + DeliveryPaymentCalculator.calculateOutstandingAmount(d, allocations),
    0
  )

  const serviceBookingsOutstanding = serviceBookings.reduce((sum, b) => {
    const allocated = allocations
      .filter(a => a.service_booking === b.id)
      .reduce((s, a) => s + a.allocated_amount, 0)
    return sum + ServiceBookingService.calculateOutstandingAmountFromData(b, allocated)
  }, 0)

  return deliveriesOutstanding + serviceBookingsOutstanding
}

const alloc = (fields: Partial<PaymentAllocation>): PaymentAllocation =>
  ({ allocated_amount: 0, payment: 'p', site: 'site-1', ...fields } as PaymentAllocation)

const payment = (vendor: string, amount: number, allocations: PaymentAllocation[]): Payment =>
  ({
    vendor,
    account: 'acc-1',
    amount,
    payment_date: '2026-01-01',
    deliveries: [],
    service_bookings: [],
    site: 'site-1',
    expand: { payment_allocations: allocations }
  } as Payment)

describe('Outstanding amount — per-item, dashboard/vendor consistency', () => {
  // Vendor A: a partially-paid delivery, a fully-paid delivery, a half-complete booking.
  // Vendor B: an untouched delivery, a 0%-complete booking, and an OVERPAID delivery
  //           (paid 500 against a 300 due) — the case global netting gets wrong.
  const deliveries: Delivery[] = [
    { id: 'D1', vendor: 'vendor-A', delivery_date: '2026-01-01', total_amount: 1000, site: 'site-1' },
    { id: 'D2', vendor: 'vendor-A', delivery_date: '2026-01-01', total_amount: 500, site: 'site-1' },
    { id: 'D3', vendor: 'vendor-B', delivery_date: '2026-01-01', total_amount: 800, site: 'site-1' },
    { id: 'D4', vendor: 'vendor-B', delivery_date: '2026-01-01', total_amount: 300, site: 'site-1' }
  ]

  const serviceBookings: ServiceBooking[] = [
    { id: 'B1', vendor: 'vendor-A', service: 's', start_date: '2026-01-01', duration: 1, unit_rate: 2000, total_amount: 2000, percent_completed: 50, site: 'site-1' },
    { id: 'B2', vendor: 'vendor-B', service: 's', start_date: '2026-01-01', duration: 1, unit_rate: 1000, total_amount: 1000, percent_completed: 0, site: 'site-1' }
  ]

  const payments: Payment[] = [
    payment('vendor-A', 900, [
      alloc({ delivery: 'D1', allocated_amount: 600 }),
      alloc({ service_booking: 'B1', allocated_amount: 300 })
    ]),
    payment('vendor-A', 500, [alloc({ delivery: 'D2', allocated_amount: 500 })]),
    // Vendor B overpays D4: 500 allocated against a 300 due.
    payment('vendor-B', 500, [alloc({ delivery: 'D4', allocated_amount: 500 })])
  ]

  it('clamps each item at 0 — Vendor A', () => {
    // D1: 1000-600=400, D2: 500-500=0, B1: 2000*50% - 300 = 700  => 1100
    expect(VendorService.calculateOutstandingFromData('vendor-A', deliveries, serviceBookings, payments)).toBe(1100)
  })

  it('overpayment on one item does not erase balance on another — Vendor B', () => {
    // D3: 800-0=800, D4: max(0, 300-500)=0, B2: 1000*0% - 0 = 0  => 800
    // (A naive global net would give max(0, 1100 due - 500 paid) = 600 — the old bug,
    // because the 200 overpayment on D4 would wrongly eat into D3's balance.)
    expect(VendorService.calculateOutstandingFromData('vendor-B', deliveries, serviceBookings, payments)).toBe(800)
  })

  it('sum of every vendor outstanding equals the dashboard total', () => {
    const vendorIds = ['vendor-A', 'vendor-B']
    const vendorSum = vendorIds.reduce(
      (sum, id) => sum + VendorService.calculateOutstandingFromData(id, deliveries, serviceBookings, payments),
      0
    )

    // 1100 (A) + 800 (B)
    expect(vendorSum).toBe(dashboardOutstanding(deliveries, serviceBookings, payments))
    expect(vendorSum).toBe(1900)
  })

  it('unallocated payments (advances) do not reduce outstanding', () => {
    // A pure advance: 1000 paid to vendor-A with no allocations. Outstanding is unchanged
    // because nothing is allocated to an item — advances are tracked separately.
    const withAdvance = [...payments, payment('vendor-A', 1000, [])]
    expect(VendorService.calculateOutstandingFromData('vendor-A', deliveries, serviceBookings, withAdvance)).toBe(1100)
    expect(dashboardOutstanding(deliveries, serviceBookings, withAdvance)).toBe(1900)
  })
})
