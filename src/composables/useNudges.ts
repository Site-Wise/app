import { computed } from 'vue';
import type { DashboardStats } from '../utils/dashboardStats';

/**
 * Behavioral nudge engine — pure prioritization of a single "next move".
 *
 * Grounded in the product's nudge principles: never dump a task list, surface
 * ONE friction-free action at a time, frame it as a quick micro-sprint, and
 * celebrate when there's nothing left to do. Placement is the Dashboard nudge
 * card; the signals are the two the product opted into — outstanding payments
 * and unallocated advances — both already computed by computeDashboardStats,
 * so the engine derives its nudge from data the dashboard has already loaded
 * (no extra fetch).
 */

export type NudgeId = 'outstanding' | 'advances';

export interface NudgeDescriptor {
  id: NudgeId;
  /** i18n key for the short title. */
  titleKey: string;
  /** i18n key for the body copy, already resolved to singular/plural by count. */
  messageKey: string;
  /** Interpolation params for the message ({count}, {amount}). */
  params: { count: number; amount: number };
  /** i18n key for the reassuring "won't take long" line. */
  microSprintKey: string;
  /** i18n key for the primary call-to-action button. */
  ctaKey: string;
  /** Route the CTA navigates to. */
  route: string;
  /** Optional query appended to the route (e.g. deep-link the due-payments modal). */
  query?: Record<string, string>;
}

/**
 * Pick the single highest-priority actionable nudge from the dashboard stats,
 * or null when nothing is pending (the caller renders the celebration state).
 *
 * Priority order (highest-value first):
 *   1. Outstanding payments — deliveries/bookings still carrying a balance.
 *   2. Unallocated advances — payments not yet tied to a delivery/booking.
 */
export function selectNudge(stats: DashboardStats | null | undefined): NudgeDescriptor | null {
  if (!stats) return null;

  if (stats.unpaidCount > 0) {
    return {
      id: 'outstanding',
      titleKey: 'nudges.outstanding.title',
      messageKey: stats.unpaidCount === 1
        ? 'nudges.outstanding.message'
        : 'nudges.outstanding.message_plural',
      params: { count: stats.unpaidCount, amount: stats.outstandingAmount },
      microSprintKey: 'nudges.outstanding.microSprint',
      ctaKey: 'nudges.outstanding.cta',
      route: '/payments',
      query: { due: '1' },
    };
  }

  if (stats.advanceCount > 0) {
    return {
      id: 'advances',
      titleKey: 'nudges.advances.title',
      messageKey: stats.advanceCount === 1
        ? 'nudges.advances.message'
        : 'nudges.advances.message_plural',
      params: { count: stats.advanceCount, amount: stats.advances },
      microSprintKey: 'nudges.advances.microSprint',
      ctaKey: 'nudges.advances.cta',
      route: '/payments',
    };
  }

  return null;
}

/**
 * Reactive wrapper around selectNudge. Pass a getter for the current dashboard
 * stats; get back the active nudge and an all-clear flag for the celebration.
 */
export function useNudges(statsGetter: () => DashboardStats | null | undefined) {
  const activeNudge = computed(() => selectNudge(statsGetter()));

  // All-clear = stats loaded AND both tracked signals are zero. The Dashboard
  // only renders the card for established sites (brand-new sites get the
  // onboarding checklist instead), so this reads as positive reinforcement.
  const allClear = computed(() => {
    const s = statsGetter();
    if (!s) return false;
    return s.unpaidCount === 0 && s.advanceCount === 0;
  });

  return { activeNudge, allClear };
}
