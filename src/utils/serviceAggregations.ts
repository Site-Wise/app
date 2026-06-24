/**
 * Pure aggregation helper for ServicesView per-service booking counts.
 *
 * ServicesView renders a booking count per service card. Instead of running a
 * `.filter().length` scan once per card (O(services × bookings)), it builds ONE count
 * Map keyed by service id via `computeServiceBookingCounts` and reads each card's count
 * with an O(1) lookup.
 *
 * Semantics (must match the original scan exactly):
 *   getServiceBookingsCount(serviceId) = bookings.filter(b => b.service === serviceId).length || 0
 */

interface BookingLike {
  service: string;
}

/** Build a Map of service id -> number of bookings referencing it. */
export function computeServiceBookingCounts(
  bookings: BookingLike[] | null | undefined
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!bookings) return counts;
  for (const booking of bookings) {
    counts.set(booking.service, (counts.get(booking.service) || 0) + 1);
  }
  return counts;
}

/** Per-service booking count from a precomputed count Map (0 when absent). */
export function getServiceBookingsCount(
  counts: Map<string, number>,
  serviceId: string
): number {
  return counts.get(serviceId) || 0;
}
