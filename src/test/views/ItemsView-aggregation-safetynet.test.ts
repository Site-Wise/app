import { describe, it, expect } from 'vitest'

/**
 * SAFETY-NET: ItemsView delivered-quantity & average-price aggregation.
 *
 * WHAT THIS PROTECTS
 * ------------------
 * ItemsView computes, per item card:
 *   - getItemDeliveredQuantity(itemId): sum of delivery_item.quantity across every
 *     delivery's expanded delivery_items where delivery_item.item === itemId.
 *   - getItemAveragePrice(itemId): sum(total_amount) / sum(quantity) over those same
 *     rows, returning 0 when there is no quantity (division-by-zero guard).
 *
 * WHY IT MUST SURVIVE THE REFACTOR
 * --------------------------------
 * The upcoming performance refactor will replace the per-render nested `forEach`
 * scan over `deliveries[].expand.delivery_items[]` with a precomputed Map keyed by
 * itemId. The MATH (totals, averages, the zero-division edge) must be identical
 * afterwards. These tests assert the numeric OUTCOME for a fixed dataset, never how
 * the data is iterated, so they hold whether the code scans rows or reads a Map.
 *
 * This test binds DIRECTLY to the REAL extracted production helpers in
 * src/utils/itemAggregations.ts (computeItemDeliveryStats + getDeliveredQuantity /
 * getAveragePrice) — the same code ItemsView.vue calls. The thin wrappers below adapt
 * the per-item accessor signature to the precomputed-Map implementation, so a
 * regression in the Map version fails loudly here.
 */
import {
  computeItemDeliveryStats,
  getDeliveredQuantity,
  getAveragePrice,
} from '../../utils/itemAggregations'

interface DeliveryItemFix {
  item: string
  quantity: number
  total_amount: number
}
interface DeliveryFix {
  id: string
  expand?: { delivery_items?: DeliveryItemFix[] }
}

// --- thin adapters over the REAL production helpers ---
function getItemDeliveredQuantity(deliveries: DeliveryFix[], itemId: string): number {
  return getDeliveredQuantity(computeItemDeliveryStats(deliveries as any), itemId)
}

function getItemAveragePrice(deliveries: DeliveryFix[], itemId: string): number {
  return getAveragePrice(computeItemDeliveryStats(deliveries as any), itemId)
}

/**
 * Realistic fixture:
 * - item-steel appears across THREE deliveries (twice within one delivery).
 * - item-cement appears in ONE delivery.
 * - item-sand has NO delivery rows (zero-delivery item).
 * - DECOY: item-wrongsite row lives in the dataset but belongs to another item id;
 *   it must never leak into another item's totals.
 */
const deliveries: DeliveryFix[] = [
  {
    id: 'd1',
    expand: {
      delivery_items: [
        { item: 'item-steel', quantity: 10, total_amount: 1000 }, // 100/unit
        { item: 'item-cement', quantity: 5, total_amount: 250 },  // 50/unit
        { item: 'item-wrongsite', quantity: 999, total_amount: 999999 }, // DECOY
      ],
    },
  },
  {
    id: 'd2',
    expand: {
      delivery_items: [
        { item: 'item-steel', quantity: 20, total_amount: 2400 }, // 120/unit
        { item: 'item-steel', quantity: 12, total_amount: 1320 }, // 110/unit, same delivery
      ],
    },
  },
  {
    id: 'd3',
    expand: {
      delivery_items: [
        { item: 'item-steel', quantity: 8, total_amount: 720 }, // 90/unit
      ],
    },
  },
  // A delivery with no expand at all — must be skipped, not throw.
  { id: 'd4' },
  // A delivery with empty delivery_items — must contribute nothing.
  { id: 'd5', expand: { delivery_items: [] } },
]

describe('ItemsView aggregation safety-net: getItemDeliveredQuantity', () => {
  it('sums quantity across multiple deliveries AND multiple rows within a delivery', () => {
    // 10 (d1) + 20 + 12 (d2) + 8 (d3) = 50
    expect(getItemDeliveredQuantity(deliveries, 'item-steel')).toBe(50)
  })

  it('returns the single-delivery quantity for an item delivered once', () => {
    expect(getItemDeliveredQuantity(deliveries, 'item-cement')).toBe(5)
  })

  it('returns 0 for an item that has zero deliveries', () => {
    expect(getItemDeliveredQuantity(deliveries, 'item-sand')).toBe(0)
  })

  it('does not leak a decoy item row into another item total', () => {
    // The decoy 999 row belongs to item-wrongsite, not item-steel/cement.
    expect(getItemDeliveredQuantity(deliveries, 'item-steel')).toBe(50)
    expect(getItemDeliveredQuantity(deliveries, 'item-wrongsite')).toBe(999)
  })

  it('handles deliveries with missing expand or empty delivery_items without error', () => {
    const onlyEmpty: DeliveryFix[] = [{ id: 'x' }, { id: 'y', expand: { delivery_items: [] } }]
    expect(getItemDeliveredQuantity(onlyEmpty, 'item-steel')).toBe(0)
  })
})

describe('ItemsView aggregation safety-net: getItemAveragePrice', () => {
  it('computes weighted average = sum(total_amount)/sum(quantity) across all rows', () => {
    // steel: value 1000+2400+1320+720 = 5440 ; qty 50 ; avg = 108.8
    expect(getItemAveragePrice(deliveries, 'item-steel')).toBeCloseTo(108.8, 10)
  })

  it('computes the average for a single-delivery item', () => {
    // cement: 250 / 5 = 50
    expect(getItemAveragePrice(deliveries, 'item-cement')).toBe(50)
  })

  it('returns 0 (no division by zero) when the item has no deliveries', () => {
    expect(getItemAveragePrice(deliveries, 'item-sand')).toBe(0)
  })

  it('returns 0 when total quantity is zero even if rows exist', () => {
    const zeroQty: DeliveryFix[] = [
      { id: 'z', expand: { delivery_items: [{ item: 'item-x', quantity: 0, total_amount: 0 }] } },
    ]
    expect(getItemAveragePrice(zeroQty, 'item-x')).toBe(0)
  })

  it('decoy rows do not perturb another item average', () => {
    expect(getItemAveragePrice(deliveries, 'item-wrongsite')).toBeCloseTo(999999 / 999, 10)
  })
})
