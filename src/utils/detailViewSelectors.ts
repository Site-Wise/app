import type {
  Item,
  Delivery,
  DeliveryItem,
  Service,
  ServiceBooking,
  Vendor,
  Payment,
  AccountTransaction,
} from '../services/pocketbase';

/**
 * Pure record-selection helpers for the detail views (ItemDetailView,
 * ServiceDetailView, VendorDetailView).
 *
 * Each detail view associates a single entity with its child collections. Historically
 * the views loaded ALL records via getAll() and picked the entity + filtered the child
 * lists client-side. The fetch refactor moves selection to targeted queries; these pure
 * helpers encode the SAME membership/sort rules so the resulting record SETS are
 * identical whether selection happens client-side or via a filtered query.
 */

// ----------------------------------------------------------------------------
// ItemDetailView: a single item's delivery-item history (membership by item id)
// ----------------------------------------------------------------------------
export interface ItemDeliveryHistoryRow extends DeliveryItem {
  delivery_date?: string;
}

/**
 * Flatten the delivery_items belonging to `itemId` out of a list of deliveries (with
 * expanded delivery_items), carrying each row's parent delivery context, then sort
 * ascending by delivery_date. Mirrors ItemDetailView.loadItemData.
 */
export function selectItemDeliveryHistory(
  deliveries: Delivery[],
  itemId: string
): ItemDeliveryHistoryRow[] {
  const rows: ItemDeliveryHistoryRow[] = [];
  deliveries.forEach(delivery => {
    const items = delivery.expand?.delivery_items;
    if (!items) return;
    items.forEach(deliveryItem => {
      if (deliveryItem.item === itemId) {
        rows.push({
          ...deliveryItem,
          delivery_date: delivery.delivery_date,
          expand: {
            ...deliveryItem.expand,
            delivery,
          },
        } as ItemDeliveryHistoryRow);
      }
    });
  });
  return rows.sort(
    (a, b) =>
      new Date(a.delivery_date || '').getTime() - new Date(b.delivery_date || '').getTime()
  );
}

/**
 * Adapt delivery_items fetched directly by item (each carrying expand.delivery) into
 * the same shape `selectItemDeliveryHistory` produces from full deliveries: a flat,
 * date-ascending list with a top-level `delivery_date`. Used when the view loads the
 * item's history via a filtered delivery_items query instead of getAll() deliveries.
 */
export function buildItemHistoryFromDeliveryItems(
  deliveryItems: DeliveryItem[]
): ItemDeliveryHistoryRow[] {
  return deliveryItems
    .map(
      di =>
        ({
          ...di,
          delivery_date: di.expand?.delivery?.delivery_date,
        }) as ItemDeliveryHistoryRow
    )
    .sort(
      (a, b) =>
        new Date(a.delivery_date || '').getTime() - new Date(b.delivery_date || '').getTime()
    );
}

// ----------------------------------------------------------------------------
// ServiceDetailView: a single service's bookings (membership by service id)
// ----------------------------------------------------------------------------
/** Bookings for `serviceId`, ascending by start_date. Mirrors ServiceDetailView. */
export function selectServiceBookings(
  bookings: ServiceBooking[],
  serviceId: string
): ServiceBooking[] {
  return bookings
    .filter(booking => booking.service === serviceId)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
}

// ----------------------------------------------------------------------------
// VendorDetailView: a single vendor's deliveries/bookings/payments/refunds
// ----------------------------------------------------------------------------
export function selectVendorDeliveries<T extends Delivery>(
  deliveries: T[],
  vendorId: string
): T[] {
  return deliveries
    .filter(delivery => delivery.vendor === vendorId)
    .sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
}

export function selectVendorServiceBookings(
  bookings: ServiceBooking[],
  vendorId: string
): ServiceBooking[] {
  return bookings
    .filter(booking => booking.vendor === vendorId)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
}

export function selectVendorPayments(payments: Payment[], vendorId: string): Payment[] {
  return payments
    .filter(payment => payment.vendor === vendorId)
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
}

/** Vendor refunds = CREDIT transactions for the vendor, newest first. */
export function selectVendorRefundTransactions(
  transactions: AccountTransaction[],
  vendorId: string
): AccountTransaction[] {
  return transactions
    .filter(transaction => transaction.type === 'credit' && transaction.vendor === vendorId)
    .sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
}

/** Resolve the tag objects referenced by an entity's tag-id list. */
export function resolveTags<T extends { id?: string }>(
  allTags: T[],
  tagIds: string[] | undefined
): T[] {
  if (!tagIds || tagIds.length === 0) return [];
  return allTags.filter(tag => tagIds.includes(tag.id!));
}

// Re-exported types to keep call-site imports tidy.
export type { Item, Service, Vendor };
