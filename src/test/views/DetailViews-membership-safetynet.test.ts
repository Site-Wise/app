import { describe, it, expect } from 'vitest'

/**
 * SAFETY-NET: ItemDetailView / ServiceDetailView / VendorDetailView record selection.
 *
 * WHAT THIS PROTECTS
 * ------------------
 * Each detail view today loads ALL records via getAll() and then, in JS:
 *   - picks the SINGLE entity by id (`.find(x => x.id === routeId)`), and
 *   - derives the associated child collections by FILTERING the full lists to the
 *     entity id (deliveries / delivery_items / bookings / payments / refunds).
 *
 * WHY IT MUST SURVIVE THE REFACTOR
 * --------------------------------
 * The refactor replaces getAll()+find()/filter() with targeted queries
 * (getById / getByVendor / getByItem / getByService). The SET of records each view
 * associates with the entity — and the single entity it surfaces — must be EXACTLY
 * the same membership as the current filter produces, no more and no less. We assert
 * the resulting membership (ids) and derived numbers, never the fetch mechanism, so
 * the tests pass whether selection happens client-side or via a filtered query.
 *
 * Each helper below binds DIRECTLY to the REAL extracted production selectors in
 * src/utils/detailViewSelectors.ts (the same functions the views now call). The single
 * entity lookup (`allX.find(...)`) remains tiny view glue. Every fixture includes DECOY
 * records (wrong item / service / vendor) that must be excluded.
 */
import {
  selectItemDeliveryHistory,
  selectServiceBookings,
  selectVendorDeliveries,
  selectVendorServiceBookings,
  selectVendorPayments,
  selectVendorRefundTransactions,
} from '../../utils/detailViewSelectors'

// ----------------------------------------------------------------------------
// ItemDetailView: single item + its delivery-item history (membership by item id)
// binds to REAL selectItemDeliveryHistory
// ----------------------------------------------------------------------------
interface DI { id: string; item: string; quantity: number; unit_price: number; total_amount: number }
interface Del { id: string; delivery_date: string; expand?: { delivery_items?: DI[] } }
interface ItemRec { id: string; name: string }

function selectItemAndHistory(allItems: ItemRec[], allDeliveries: Del[], itemId: string) {
  const item = allItems.find(i => i.id === itemId) || null
  const itemDeliveries = selectItemDeliveryHistory(allDeliveries as any, itemId)
  return { item, itemDeliveries }
}

describe('ItemDetailView membership safety-net', () => {
  const items: ItemRec[] = [
    { id: 'item-A', name: 'Steel' },
    { id: 'item-B', name: 'Cement' }, // decoy item
  ]
  const deliveries: Del[] = [
    {
      id: 'd1', delivery_date: '2024-03-10',
      expand: { delivery_items: [
        { id: 'di1', item: 'item-A', quantity: 10, unit_price: 100, total_amount: 1000 },
        { id: 'di2', item: 'item-B', quantity: 4, unit_price: 50, total_amount: 200 }, // DECOY (other item)
      ] },
    },
    {
      id: 'd2', delivery_date: '2024-01-05', // earlier date -> should sort first
      expand: { delivery_items: [
        { id: 'di3', item: 'item-A', quantity: 5, unit_price: 90, total_amount: 450 },
      ] },
    },
    { id: 'd3', delivery_date: '2024-02-01' }, // no expand, contributes nothing
  ]

  it('surfaces the correct single item by id', () => {
    expect(selectItemAndHistory(items, deliveries, 'item-A').item).toEqual({ id: 'item-A', name: 'Steel' })
  })

  it('history contains exactly the delivery_items for that item (decoys excluded)', () => {
    const { itemDeliveries } = selectItemAndHistory(items, deliveries, 'item-A')
    expect(itemDeliveries.map(d => d.id)).toEqual(['di3', 'di1']) // sorted ascending by date
    expect(itemDeliveries.every(d => d.item === 'item-A')).toBe(true)
  })

  it('derived totals match the membership (qty 15, avg = 1450/15)', () => {
    const { itemDeliveries } = selectItemAndHistory(items, deliveries, 'item-A')
    const totalQty = itemDeliveries.reduce((s, d) => s + d.quantity, 0)
    const totalValue = itemDeliveries.reduce((s, d) => s + d.total_amount, 0)
    expect(totalQty).toBe(15)
    expect(totalValue / totalQty).toBeCloseTo(1450 / 15, 10)
  })

  it('item with no delivery rows yields empty history but still resolves the item', () => {
    const lonelyItems: ItemRec[] = [{ id: 'item-Z', name: 'Sand' }]
    const res = selectItemAndHistory(lonelyItems, deliveries, 'item-Z')
    expect(res.item).toEqual({ id: 'item-Z', name: 'Sand' })
    expect(res.itemDeliveries).toEqual([])
  })

  it('unknown item id resolves to null', () => {
    expect(selectItemAndHistory(items, deliveries, 'nope').item).toBeNull()
  })
})

// ----------------------------------------------------------------------------
// ServiceDetailView: single service + its bookings (membership by service id)
// binds to REAL selectServiceBookings
// ----------------------------------------------------------------------------
interface SvcRec { id: string; name: string }
interface BookingRec { id: string; service: string; start_date: string }

function selectServiceAndBookings(allServices: SvcRec[], allBookings: BookingRec[], serviceId: string) {
  const service = allServices.find(s => s.id === serviceId) || null
  const serviceBookings = selectServiceBookings(allBookings as any, serviceId)
  return { service, serviceBookings }
}

describe('ServiceDetailView membership safety-net', () => {
  const services: SvcRec[] = [
    { id: 'svc-A', name: 'Plastering' },
    { id: 'svc-B', name: 'Painting' }, // decoy
  ]
  const allBookings: BookingRec[] = [
    { id: 'bk1', service: 'svc-A', start_date: '2024-05-01' },
    { id: 'bk2', service: 'svc-B', start_date: '2024-05-02' }, // DECOY
    { id: 'bk3', service: 'svc-A', start_date: '2024-04-01' }, // earlier -> sorts first
    { id: 'bk4', service: 'svc-A', start_date: '2024-06-01' },
  ]

  it('surfaces the correct single service by id', () => {
    expect(selectServiceAndBookings(services, allBookings, 'svc-A').service).toEqual({ id: 'svc-A', name: 'Plastering' })
  })

  it('bookings are exactly those for the service id, ascending by start_date (decoys excluded)', () => {
    const { serviceBookings } = selectServiceAndBookings(services, allBookings, 'svc-A')
    expect(serviceBookings.map(b => b.id)).toEqual(['bk3', 'bk1', 'bk4'])
    expect(serviceBookings.every(b => b.service === 'svc-A')).toBe(true)
  })

  it('service with no bookings yields empty list but resolves the service', () => {
    const res = selectServiceAndBookings([{ id: 'svc-Z', name: 'Cleaning' }], allBookings, 'svc-Z')
    expect(res.service).toEqual({ id: 'svc-Z', name: 'Cleaning' })
    expect(res.serviceBookings).toEqual([])
  })

  it('unknown service id resolves to null', () => {
    expect(selectServiceAndBookings(services, allBookings, 'nope').service).toBeNull()
  })
})

// ----------------------------------------------------------------------------
// VendorDetailView: single vendor + its deliveries/bookings/payments/refunds
// binds to REAL selectVendor* selectors
// ----------------------------------------------------------------------------
interface VendorRec { id: string; name: string }
interface VDelivery { id: string; vendor: string; delivery_date: string }
interface VBooking { id: string; vendor: string; start_date: string }
interface VPayment { id: string; vendor: string; amount: number; payment_date: string }
interface VTxn { id: string; type: 'credit' | 'debit'; vendor: string; transaction_date: string }

function selectVendorAssociations(
  allVendors: VendorRec[],
  allDeliveries: VDelivery[],
  allBookings: VBooking[],
  allPayments: VPayment[],
  allTransactions: VTxn[],
  vendorId: string,
) {
  const vendor = allVendors.find(v => v.id === vendorId) || null
  const vendorDeliveries = selectVendorDeliveries(allDeliveries as any, vendorId)
  const vendorServiceBookings = selectVendorServiceBookings(allBookings as any, vendorId)
  const vendorPayments = selectVendorPayments(allPayments as any, vendorId)
  const vendorRefunds = selectVendorRefundTransactions(allTransactions as any, vendorId)
  return { vendor, vendorDeliveries, vendorServiceBookings, vendorPayments, vendorRefunds }
}

describe('VendorDetailView membership safety-net', () => {
  const vendors: VendorRec[] = [
    { id: 'ven-A', name: 'Acme Steel' },
    { id: 'ven-B', name: 'Other Co' }, // decoy vendor
  ]
  const deliveries: VDelivery[] = [
    { id: 'vd1', vendor: 'ven-A', delivery_date: '2024-01-10' },
    { id: 'vd2', vendor: 'ven-B', delivery_date: '2024-01-11' }, // DECOY
    { id: 'vd3', vendor: 'ven-A', delivery_date: '2024-03-15' }, // newer -> sorts first (desc)
  ]
  const bookings: VBooking[] = [
    { id: 'vb1', vendor: 'ven-A', start_date: '2024-02-01' },
    { id: 'vb2', vendor: 'ven-B', start_date: '2024-02-02' }, // DECOY
  ]
  const payments: VPayment[] = [
    { id: 'vp1', vendor: 'ven-A', amount: 5000, payment_date: '2024-01-20' },
    { id: 'vp2', vendor: 'ven-A', amount: 3000, payment_date: '2024-02-20' }, // newer -> first
    { id: 'vp3', vendor: 'ven-B', amount: 9999, payment_date: '2024-02-25' }, // DECOY
  ]
  const txns: VTxn[] = [
    { id: 'tx1', type: 'credit', vendor: 'ven-A', transaction_date: '2024-02-10' }, // refund for A
    { id: 'tx2', type: 'debit', vendor: 'ven-A', transaction_date: '2024-02-11' },  // not a refund (debit)
    { id: 'tx3', type: 'credit', vendor: 'ven-B', transaction_date: '2024-02-12' }, // DECOY (other vendor)
  ]

  const result = selectVendorAssociations(vendors, deliveries, bookings, payments, txns, 'ven-A')

  it('surfaces exactly the requested vendor', () => {
    expect(result.vendor).toEqual({ id: 'ven-A', name: 'Acme Steel' })
  })

  it("vendor deliveries are exactly the vendor's, newest first (decoys excluded)", () => {
    expect(result.vendorDeliveries.map(d => d.id)).toEqual(['vd3', 'vd1'])
  })

  it("vendor service bookings exclude other vendors' bookings", () => {
    expect(result.vendorServiceBookings.map(b => b.id)).toEqual(['vb1'])
  })

  it("vendor payments are exactly the vendor's, newest first (decoys excluded)", () => {
    expect(result.vendorPayments.map(p => p.id)).toEqual(['vp2', 'vp1'])
  })

  it('vendor refunds are only CREDIT transactions for this vendor (debits & other vendors excluded)', () => {
    expect(result.vendorRefunds.map(t => t.id)).toEqual(['tx1'])
  })

  it('unknown vendor id resolves to null and empty associations', () => {
    const none = selectVendorAssociations(vendors, deliveries, bookings, payments, txns, 'ghost')
    expect(none.vendor).toBeNull()
    expect(none.vendorDeliveries).toEqual([])
    expect(none.vendorPayments).toEqual([])
    expect(none.vendorServiceBookings).toEqual([])
    expect(none.vendorRefunds).toEqual([])
  })

  it('a vendor with no related records resolves the vendor but empty associations', () => {
    const lonely = selectVendorAssociations(
      [{ id: 'ven-C', name: 'Newbie' }], deliveries, bookings, payments, txns, 'ven-C',
    )
    expect(lonely.vendor).toEqual({ id: 'ven-C', name: 'Newbie' })
    expect(lonely.vendorDeliveries).toEqual([])
    expect(lonely.vendorPayments).toEqual([])
  })
})
