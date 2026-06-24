import type { Delivery } from '../services/pocketbase';

/**
 * Pure aggregation helpers for ItemsView delivered-quantity & average-price stats.
 *
 * These functions take plain delivery data (with expanded delivery_items) and return
 * plain results — no Vue reactivity. ItemsView precomputes a single Map over all
 * deliveries via `computeItemDeliveryStats`, then reads per-item stats with O(1)
 * lookups instead of re-scanning every delivery per card.
 *
 * Semantics (must match the original per-row scan exactly):
 *   - delivered quantity = sum of delivery_item.quantity across every delivery's
 *     expanded delivery_items where delivery_item.item === itemId.
 *   - average price = sum(total_amount) / sum(quantity) over those same rows,
 *     returning 0 when there is no quantity (division-by-zero guard).
 */

export interface ItemDeliveryStats {
  qty: number;
  totalValue: number;
  avgPrice: number;
}

type DeliveryLike = Pick<Delivery, 'expand'>;

/**
 * Build a Map keyed by item id holding the aggregated delivery stats for every item
 * that appears in the provided deliveries. Iterates each delivery_item exactly once.
 */
export function computeItemDeliveryStats(
  deliveries: DeliveryLike[]
): Map<string, ItemDeliveryStats> {
  const totals = new Map<string, { qty: number; totalValue: number }>();

  deliveries.forEach(delivery => {
    const items = delivery.expand?.delivery_items;
    if (!items) return;
    items.forEach(di => {
      const existing = totals.get(di.item) || { qty: 0, totalValue: 0 };
      existing.qty += di.quantity;
      existing.totalValue += di.total_amount;
      totals.set(di.item, existing);
    });
  });

  const stats = new Map<string, ItemDeliveryStats>();
  totals.forEach((value, itemId) => {
    stats.set(itemId, {
      qty: value.qty,
      totalValue: value.totalValue,
      avgPrice: value.qty > 0 ? value.totalValue / value.qty : 0,
    });
  });
  return stats;
}

/** Per-item delivered quantity from a precomputed stats Map (0 when absent). */
export function getDeliveredQuantity(
  stats: Map<string, ItemDeliveryStats>,
  itemId: string
): number {
  return stats.get(itemId)?.qty ?? 0;
}

/** Per-item weighted average price from a precomputed stats Map (0 when absent). */
export function getAveragePrice(
  stats: Map<string, ItemDeliveryStats>,
  itemId: string
): number {
  return stats.get(itemId)?.avgPrice ?? 0;
}
