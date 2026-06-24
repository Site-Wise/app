import { describe, it, expect } from 'vitest'
import { VendorService, ServiceBookingService } from '../../services/pocketbase'
import { computeDashboardStats as computeDashboardStatsReal } from '../../utils/dashboardStats'

/**
 * SAFETY-NET: financial figures shown by VendorsView and DashboardView.
 *
 * WHAT THIS PROTECTS
 * ------------------
 * Both views derive money figures from loaded collections:
 *   - VendorsView card:   getVendorOutstanding(id)  -> VendorService.calculateOutstandingFromData(...)
 *                         getVendorPaid(id)          -> VendorService.calculateTotalPaidFromData(...)
 *   - DashboardView tiles: grossExpenses, totalExpenses (gross - refunds),
 *                          site-wide outstandingAmount (per-item, clamped, summed),
 *                          unpaidCount, advances/advanceCount.
 *
 * WHY IT MUST SURVIVE THE REFACTOR
 * --------------------------------
 * These views are slated to move to a SHARED DATA CACHE. That refactor changes only
 * the fetch plumbing (where the deliveries/payments/etc. arrays come from) — the
 * DISPLAYED NUMBERS computed from those arrays must be byte-for-byte identical.
 * We lock the numeric OUTCOMES here. To bind directly to production behavior we call
 * the REAL VendorService / ServiceBookingService math for the per-vendor figures, and
 * the REAL extracted computeDashboardStats helper (src/utils/dashboardStats.ts) — the
 * same function DashboardView.vue now calls — for the dashboard tile numbers.
 *
 * Key correctness nuance pinned by these tests:
 *   - "Paid" against a delivery/booking comes from the payment_allocations pivot,
 *     carried on payment.expand.payment_allocations — NOT the deprecated paid_amount.
 *   - Outstanding is summed PER ITEM and clamped at 0, so an advance on one item never
 *     cancels a real balance on another.
 *   - DeliveryPaymentCalculator.calculateOutstandingAmount returns the FULL total when
 *     there are zero allocations at all (its early-return). Fixtures below always pass
 *     a non-empty allocation list to exercise the per-delivery filter path.
 */

// ----- shared fixture -----------------------------------------------------
// Two vendors so we can prove per-vendor isolation. ven-A: one delivery (3000) with
// a 1000 allocation -> 2000 outstanding; ven-B: one delivery (500) fully unpaid.
const VEN_A = 'ven-A'
const VEN_B = 'ven-B'

const deliveries: any[] = [
  { id: 'd-a1', vendor: VEN_A, total_amount: 3000 },
  { id: 'd-b1', vendor: VEN_B, total_amount: 500 },
]

// One service booking for ven-A: total 2000 at 50% progress -> progressAmount 1000;
// 400 allocated -> outstanding 600.
const serviceBookings: any[] = [
  { id: 'sb-a1', vendor: VEN_A, total_amount: 2000, percent_completed: 50 },
]

// Payments carry their allocations in expand.payment_allocations (canonical source).
// ven-A paid 1400 total (1000 -> delivery d-a1, 400 -> booking sb-a1).
const payments: any[] = [
  {
    id: 'p-a1', vendor: VEN_A, amount: 1400,
    expand: {
      payment_allocations: [
        { id: 'al1', delivery: 'd-a1', service_booking: '', allocated_amount: 1000 },
        { id: 'al2', delivery: '', service_booking: 'sb-a1', allocated_amount: 400 },
      ],
    },
  },
  // ven-B made no payment.
]

describe('VendorsView financial figures safety-net (real VendorService math)', () => {
  it('getVendorOutstanding(ven-A) = unpaid delivery (2000) + booking due (600) = 2600', () => {
    const out = VendorService.calculateOutstandingFromData(VEN_A, deliveries, serviceBookings, payments)
    expect(out).toBe(2600)
  })

  it('getVendorOutstanding(ven-B) = fully-unpaid 500 delivery, isolated from ven-A', () => {
    const out = VendorService.calculateOutstandingFromData(VEN_B, deliveries, serviceBookings, payments)
    expect(out).toBe(500)
  })

  it('a vendor with no records has 0 outstanding and 0 paid', () => {
    expect(VendorService.calculateOutstandingFromData('ghost', deliveries, serviceBookings, payments)).toBe(0)
    expect(VendorService.calculateTotalPaidFromData('ghost', payments)).toBe(0)
  })

  it('getVendorPaid(ven-A) sums only ven-A payments (= 1400)', () => {
    expect(VendorService.calculateTotalPaidFromData(VEN_A, payments)).toBe(1400)
  })

  it('an over-allocation on one item does NOT net away another item balance (per-item clamp)', () => {
    // Overpay the 500 delivery by allocating 800 to it; outstanding must clamp at 0,
    // and ven-A's genuine 2600 stays intact (no global netting).
    const overPaid: any[] = [
      ...payments,
      {
        id: 'p-b1', vendor: VEN_B, amount: 800,
        expand: { payment_allocations: [{ id: 'al3', delivery: 'd-b1', service_booking: '', allocated_amount: 800 }] },
      },
    ]
    expect(VendorService.calculateOutstandingFromData(VEN_B, deliveries, serviceBookings, overPaid)).toBe(0)
    expect(VendorService.calculateOutstandingFromData(VEN_A, deliveries, serviceBookings, overPaid)).toBe(2600)
  })

  it('ServiceBookingService progress-based due is locked (2000 @ 50% = 1000, minus 400 paid = 600)', () => {
    // Directly pins the service-booking half of the outstanding so a refactor that
    // re-routes this through a shared cache can't silently change the rule.
    expect(ServiceBookingService.calculateProgressBasedAmount(serviceBookings[0])).toBe(1000)
    expect(ServiceBookingService.calculateOutstandingAmountFromData(serviceBookings[0], 400)).toBe(600)
  })
})

// ----------------------------------------------------------------------------
// DashboardView.stats — binds to the REAL extracted computeDashboardStats helper.
// The wrapper picks only the seven tile figures these golden tests assert (the real
// helper additionally returns pendingRecovery/pendingRecoveryCount, exercised elsewhere).
// ----------------------------------------------------------------------------
function computeDashboardStats(input: {
  deliveries: any[]
  serviceBookings: any[]
  payments: any[]
  vendorRefunds: any[]
  totalPlannedArea: number
}) {
  const { grossExpenses, totalExpenses, expensePerSqft, outstandingAmount, unpaidCount, advances, advanceCount } =
    computeDashboardStatsReal(input as any)
  return { grossExpenses, totalExpenses, expensePerSqft, outstandingAmount, unpaidCount, advances, advanceCount }
}

describe('DashboardView financial figures safety-net', () => {
  // Reuse the same vendor fixture so site-wide totals == sum over vendors.
  const refunds = [{ refund_amount: 100 }]

  const stats = computeDashboardStats({
    deliveries,
    serviceBookings,
    payments,
    vendorRefunds: refunds,
    totalPlannedArea: 1000,
  })

  it('gross expenses = all deliveries + all bookings (3000 + 500 + 2000 = 5500)', () => {
    expect(stats.grossExpenses).toBe(5500)
  })

  it('total (net) expenses = gross - refunds (5500 - 100 = 5400)', () => {
    expect(stats.totalExpenses).toBe(5400)
  })

  it('expense per sqft = round(5400 / 1000) = 5', () => {
    expect(stats.expensePerSqft).toBe(5)
  })

  it('site-wide outstanding equals the sum of every vendor outstanding (2600 + 500 = 3100)', () => {
    const perVendor =
      VendorService.calculateOutstandingFromData(VEN_A, deliveries, serviceBookings, payments) +
      VendorService.calculateOutstandingFromData(VEN_B, deliveries, serviceBookings, payments)
    expect(stats.outstandingAmount).toBe(perVendor)
    expect(stats.outstandingAmount).toBe(3100)
  })

  it('unpaid count = deliveries with balance (d-a1, d-b1) + bookings with balance (sb-a1) = 3', () => {
    expect(stats.unpaidCount).toBe(3)
  })

  it('advances = unattributed payment money; here every rupee is allocated, so 0', () => {
    expect(stats.advances).toBe(0)
    expect(stats.advanceCount).toBe(0)
  })

  it('an unattributed payment surfaces as an advance', () => {
    const withAdvance = computeDashboardStats({
      deliveries,
      serviceBookings,
      payments: [
        ...payments,
        { id: 'p-adv', vendor: VEN_A, amount: 1000, expand: { payment_allocations: [] } },
      ],
      vendorRefunds: refunds,
      totalPlannedArea: 1000,
    })
    expect(withAdvance.advances).toBe(1000)
    expect(withAdvance.advanceCount).toBe(1)
  })

  it('empty dataset yields all-zero stats (no NaN, no division blowup)', () => {
    const empty = computeDashboardStats({
      deliveries: [], serviceBookings: [], payments: [], vendorRefunds: [], totalPlannedArea: 0,
    })
    expect(empty).toEqual({
      grossExpenses: 0, totalExpenses: 0, expensePerSqft: 0,
      outstandingAmount: 0, unpaidCount: 0, advances: 0, advanceCount: 0,
    })
  })
})
