import { describe, it, expect } from 'vitest'

/**
 * SAFETY-NET: ServicesView per-service booking count.
 *
 * WHAT THIS PROTECTS
 * ------------------
 * ServicesView renders, per service card:
 *   getServiceBookingsCount(serviceId)
 *     = serviceBookings.filter(b => b.service === serviceId).length || 0
 *
 * WHY IT MUST SURVIVE THE REFACTOR
 * --------------------------------
 * The refactor will replace the per-row `.filter().length` scan (run once per card)
 * with a precomputed count Map keyed by service id, and/or a `getByService` query.
 * The displayed COUNT for each service must be unchanged. These tests bind DIRECTLY to
 * the REAL extracted helpers (computeServiceBookingCounts + getServiceBookingsCount in
 * src/utils/serviceAggregations.ts) that ServicesView.vue now calls, so a regression in
 * the Map version fails loudly here.
 *
 * (Note: ServiceBookingsView booking-count logic is intentionally out of scope here;
 * this file only locks the ServicesView card count.)
 */

import {
  computeServiceBookingCounts,
  getServiceBookingsCount as getBookingsCount,
} from '../../utils/serviceAggregations'

interface BookingFix {
  id: string
  service: string
}

// thin adapter over the REAL production helpers (src/utils/serviceAggregations.ts)
function getServiceBookingsCount(bookings: BookingFix[], serviceId: string): number {
  return getBookingsCount(computeServiceBookingCounts(bookings), serviceId)
}

/**
 * Fixture:
 * - service-many: 3 bookings
 * - service-one:  1 booking
 * - service-zero: 0 bookings (id present in catalogue, none reference it)
 * - DECOY: bookings for service-other must not count toward the above.
 */
const bookings: BookingFix[] = [
  { id: 'b1', service: 'service-many' },
  { id: 'b2', service: 'service-many' },
  { id: 'b3', service: 'service-many' },
  { id: 'b4', service: 'service-one' },
  { id: 'b5', service: 'service-other' }, // DECOY
  { id: 'b6', service: 'service-other' }, // DECOY
]

describe('ServicesView booking-count safety-net: getServiceBookingsCount', () => {
  it('counts many bookings for one service', () => {
    expect(getServiceBookingsCount(bookings, 'service-many')).toBe(3)
  })

  it('counts exactly one booking for a service with a single booking', () => {
    expect(getServiceBookingsCount(bookings, 'service-one')).toBe(1)
  })

  it('returns 0 for a service id that has no bookings', () => {
    expect(getServiceBookingsCount(bookings, 'service-zero')).toBe(0)
  })

  it('returns 0 for a service id absent from the dataset entirely', () => {
    expect(getServiceBookingsCount(bookings, 'service-nonexistent')).toBe(0)
  })

  it('decoy bookings for another service never inflate a service count', () => {
    expect(getServiceBookingsCount(bookings, 'service-many')).toBe(3)
    expect(getServiceBookingsCount(bookings, 'service-other')).toBe(2)
  })

  it('returns 0 (not NaN/undefined) for an empty booking list', () => {
    expect(getServiceBookingsCount([], 'service-many')).toBe(0)
  })
})
