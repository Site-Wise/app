import type { Payment } from '../services/pocketbase';

export interface PaymentListFilters {
  vendor?: string;
  account?: string;
}

/**
 * Insert or replace a just-saved payment in an already-loaded payments list,
 * so derived figures (vendor dues etc.) update without re-fetching the list.
 * The saved payment goes to the top; if it doesn't match an active
 * ?vendor / ?account filter it is left out of (or removed from) the list.
 */
export function upsertSavedPayment(
  payments: Payment[],
  saved: Payment,
  filters: PaymentListFilters = {}
): Payment[] {
  const others = payments.filter(p => p.id !== saved.id);
  const matchesFilter = (!filters.vendor || saved.vendor === filters.vendor) &&
    (!filters.account || saved.account === filters.account);
  return matchesFilter ? [saved, ...others] : others;
}
