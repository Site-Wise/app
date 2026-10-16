import { describe, it, expect } from 'vitest';
import { selectNudge } from '../../composables/useNudges';
import type { DashboardStats } from '../../utils/dashboardStats';

// Logic-focused tests for the behavioral nudge engine's prioritization.
// The engine surfaces exactly ONE next step; these pin the priority order and
// singular/plural copy selection for the two opted-in signals.

const makeStats = (overrides: Partial<DashboardStats> = {}): DashboardStats => ({
  grossExpenses: 0,
  totalExpenses: 0,
  expensePerSqft: 0,
  outstandingAmount: 0,
  unpaidCount: 0,
  advances: 0,
  advanceCount: 0,
  pendingRecovery: 0,
  pendingRecoveryCount: 0,
  ...overrides,
});

describe('selectNudge', () => {
  it('returns null for missing stats', () => {
    expect(selectNudge(null)).toBeNull();
    expect(selectNudge(undefined)).toBeNull();
  });

  it('returns null (celebration state) when nothing is pending', () => {
    expect(selectNudge(makeStats())).toBeNull();
  });

  it('nudges outstanding payments when deliveries carry a balance', () => {
    const nudge = selectNudge(makeStats({ unpaidCount: 3, outstandingAmount: 120000 }));
    expect(nudge?.id).toBe('outstanding');
    expect(nudge?.params).toEqual({ count: 3, amount: 120000 });
    expect(nudge?.route).toBe('/payments');
    expect(nudge?.query).toEqual({ due: '1' });
  });

  it('uses singular copy for exactly one outstanding payment', () => {
    expect(selectNudge(makeStats({ unpaidCount: 1 }))?.messageKey).toBe(
      'nudges.outstanding.message'
    );
    expect(selectNudge(makeStats({ unpaidCount: 2 }))?.messageKey).toBe(
      'nudges.outstanding.message_plural'
    );
  });

  it('nudges advances when there are unallocated payments and nothing outstanding', () => {
    const nudge = selectNudge(makeStats({ advanceCount: 2, advances: 5000 }));
    expect(nudge?.id).toBe('advances');
    expect(nudge?.params).toEqual({ count: 2, amount: 5000 });
    expect(nudge?.messageKey).toBe('nudges.advances.message_plural');
    expect(nudge?.route).toBe('/payments');
  });

  it('prioritizes outstanding payments over advances', () => {
    const nudge = selectNudge(makeStats({ unpaidCount: 1, advanceCount: 4 }));
    expect(nudge?.id).toBe('outstanding');
  });

  it('uses singular advance copy for exactly one advance', () => {
    expect(selectNudge(makeStats({ advanceCount: 1 }))?.messageKey).toBe(
      'nudges.advances.message'
    );
  });
});
