import type { RecordModel } from 'pocketbase';
import type {
  User,
  Site,
  SiteUser,
  Account,
  Item,
  Vendor,
  Service,
  Tag,
  Quotation,
  ServiceBooking,
  Delivery,
  DeliveryItem,
  PaymentAllocation,
  Payment,
  AccountTransaction,
  SiteInvitation,
  VendorReturn,
  VendorReturnItem,
  VendorRefund,
  VendorCreditNote,
  CreditNoteUsage,
  AnalyticsSetting
} from '../types';

/**
 * Maps a PocketBase RecordModel to a User object
 */
export function mapRecordToUser(record: RecordModel): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    phone: record.phone,
    avatar: record.avatar,
    sites: record.sites || [],
    created: record.created,
    updated: record.updated
  };
}

/**
 * Maps a PocketBase RecordModel to a Site object
 */
export function mapRecordToSite(record: RecordModel): Site {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    total_units: record.total_units,
    total_planned_area: record.total_planned_area,
    admin_user: record.admin_user,
    is_active: record.is_active,
    deleted_at: record.deleted_at,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      admin_user: record.expand.admin_user ? mapRecordToUser(record.expand.admin_user) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a SiteUser object
 */
export function mapRecordToSiteUser(record: RecordModel): SiteUser {
  return {
    id: record.id,
    site: record.site,
    user: record.user,
    role: record.role,
    assigned_by: record.assigned_by,
    assigned_at: record.assigned_at,
    is_active: record.is_active,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      site: record.expand.site ? mapRecordToSite(record.expand.site) : undefined,
      user: record.expand.user ? mapRecordToUser(record.expand.user) : undefined,
      assigned_by: record.expand.assigned_by ? mapRecordToUser(record.expand.assigned_by) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to an Account object
 */
export function mapRecordToAccount(record: RecordModel): Account {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    account_number: record.account_number,
    bank_name: record.bank_name,
    description: record.description,
    is_active: record.is_active,
    opening_balance: record.opening_balance,
    current_balance: record.current_balance,
    site: record.site,
    created: record.created,
    updated: record.updated
  };
}

/**
 * Maps a PocketBase RecordModel to an Item object
 */
export function mapRecordToItem(record: RecordModel): Item {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    unit: record.unit,
    tags: record.tags || [],
    site: record.site,
    created: record.created,
    updated: record.updated
  };
}

/**
 * Maps a PocketBase RecordModel to a Vendor object
 */
export function mapRecordToVendor(record: RecordModel): Vendor {
  return {
    id: record.id,
    name: record.name,
    contact_person: record.contact_person,
    email: record.email,
    phone: record.phone,
    address: record.address,
    payment_details: record.payment_details,
    tags: record.tags || [],
    site: record.site,
    created: record.created,
    updated: record.updated
  };
}

/**
 * Maps a PocketBase RecordModel to a Service object
 */
export function mapRecordToService(record: RecordModel): Service {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    category: record.category,
    service_type: record.service_type,
    unit: record.unit,
    standard_rate: record.standard_rate,
    is_active: record.is_active,
    tags: record.tags || [],
    site: record.site,
    created: record.created,
    updated: record.updated
  };
}

/**
 * Maps a PocketBase RecordModel to a Tag object
 */
export function mapRecordToTag(record: RecordModel): Tag {
  return {
    id: record.id,
    name: record.name,
    color: record.color,
    type: record.type,
    site: record.site,
    usage_count: record.usage_count || 0,
    created: record.created,
    updated: record.updated
  };
}

/**
 * Maps a PocketBase RecordModel to a Quotation object
 */
export function mapRecordToQuotation(record: RecordModel): Quotation {
  return {
    id: record.id,
    vendor: record.vendor,
    item: record.item,
    service: record.service,
    quotation_type: record.quotation_type,
    unit_price: record.unit_price,
    minimum_quantity: record.minimum_quantity,
    valid_until: record.valid_until,
    notes: record.notes,
    status: record.status,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      vendor: record.expand.vendor ? mapRecordToVendor(record.expand.vendor) : undefined,
      item: record.expand.item ? mapRecordToItem(record.expand.item) : undefined,
      service: record.expand.service ? mapRecordToService(record.expand.service) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a ServiceBooking object
 */
export function mapRecordToServiceBooking(record: RecordModel): ServiceBooking {
  return {
    id: record.id,
    service: record.service,
    vendor: record.vendor,
    start_date: record.start_date,
    end_date: record.end_date,
    duration: record.duration,
    unit_rate: record.unit_rate,
    total_amount: record.total_amount,
    percent_completed: record.percent_completed || 0,
    payment_status: 'pending' as const, // Will be calculated when needed
    paid_amount: 0, // Will be calculated when needed
    completion_photos: record.completion_photos,
    notes: record.notes,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      vendor: record.expand.vendor ? mapRecordToVendor(record.expand.vendor) : undefined,
      service: record.expand.service ? mapRecordToService(record.expand.service) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a Delivery object
 * Note: This is a simplified version without delivery_items expansion
 */
export function mapRecordToDelivery(record: RecordModel): Delivery {
  return {
    id: record.id,
    vendor: record.vendor,
    delivery_date: record.delivery_date,
    delivery_reference: record.delivery_reference,
    photos: record.photos || [],
    notes: record.notes,
    total_amount: record.total_amount,
    payment_status: record.payment_status || 'pending' as const,
    paid_amount: record.paid_amount || 0,
    delivery_items: record.delivery_items || [],
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      vendor: record.expand.vendor ? mapRecordToVendor(record.expand.vendor) : undefined,
      delivery_items: record.expand.delivery_items && Array.isArray(record.expand.delivery_items) ?
        record.expand.delivery_items.map((item: RecordModel) => mapRecordToDeliveryItem(item)) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a DeliveryItem object
 * Note: This version includes expand for delivery and item
 */
export function mapRecordToDeliveryItem(record: RecordModel): DeliveryItem {
  return {
    id: record.id,
    delivery: record.delivery,
    item: record.item,
    quantity: record.quantity,
    unit_price: record.unit_price,
    total_amount: record.total_amount,
    notes: record.notes,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      delivery: record.expand.delivery ? mapRecordToDelivery(record.expand.delivery) : undefined,
      item: record.expand.item ? mapRecordToItem(record.expand.item) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a PaymentAllocation object
 */
export function mapRecordToPaymentAllocation(record: RecordModel): PaymentAllocation {
  return {
    id: record.id,
    payment: record.payment,
    delivery: record.delivery,
    service_booking: record.service_booking,
    allocated_amount: record.allocated_amount,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand
  };
}

/**
 * Maps a PocketBase RecordModel to a Payment object
 * Note: This version includes complex expand relationships
 * Circular dependencies with deliveries/service_bookings are handled by the services
 */
export function mapRecordToPayment(record: RecordModel): Payment {
  return {
    id: record.id,
    vendor: record.vendor,
    account: record.account,
    amount: record.amount,
    payment_date: record.payment_date,
    reference: record.reference,
    notes: record.notes,
    deliveries: record.deliveries || [],
    service_bookings: record.service_bookings || [],
    credit_notes: record.credit_notes || [],
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      vendor: record.expand.vendor ? mapRecordToVendor(record.expand.vendor) : undefined,
      account: record.expand.account ? mapRecordToAccount(record.expand.account) : undefined,
      // Note: Complex expand relationships like deliveries, service_bookings,
      // payment_allocations, and credit_notes should be handled by the service layer
      // to avoid circular dependencies
      deliveries: undefined,
      service_bookings: undefined,
      payment_allocations: undefined,
      credit_notes: undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to an AccountTransaction object
 * Note: Expanded payment and vendor_refund should be handled by service layer
 */
export function mapRecordToAccountTransaction(record: RecordModel): AccountTransaction {
  return {
    id: record.id,
    account: record.account,
    type: record.type,
    amount: record.amount,
    transaction_date: record.transaction_date,
    description: record.description,
    reference: record.reference,
    notes: record.notes,
    vendor: record.vendor,
    payment: record.payment,
    vendor_refund: record.vendor_refund,
    transaction_category: record.transaction_category,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      account: record.expand.account ? mapRecordToAccount(record.expand.account) : undefined,
      vendor: record.expand.vendor ? mapRecordToVendor(record.expand.vendor) : undefined,
      // Note: payment and vendor_refund expand should be handled by service layer
      payment: undefined,
      vendor_refund: undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a SiteInvitation object
 */
export function mapRecordToSiteInvitation(record: RecordModel): SiteInvitation {
  return {
    id: record.id,
    site: record.site,
    email: record.email,
    role: record.role,
    invited_by: record.invited_by,
    invited_at: record.invited_at,
    status: record.status,
    expires_at: record.expires_at,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      site: record.expand.site ? mapRecordToSite(record.expand.site) : undefined,
      invited_by: record.expand.invited_by ? mapRecordToUser(record.expand.invited_by) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a VendorReturn object
 */
export function mapRecordToVendorReturn(record: RecordModel): VendorReturn {
  return {
    id: record.id,
    vendor: record.vendor,
    return_date: record.return_date,
    reason: record.reason,
    status: record.status,
    notes: record.notes,
    photos: record.photos,
    approval_notes: record.approval_notes,
    approved_by: record.approved_by,
    approved_at: record.approved_at,
    total_return_amount: record.total_return_amount,
    actual_refund_amount: record.actual_refund_amount,
    completion_date: record.completion_date,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      vendor: record.expand.vendor ? mapRecordToVendor(record.expand.vendor) : undefined,
      approved_by: record.expand.approved_by ? mapRecordToUser(record.expand.approved_by) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a VendorReturnItem object
 * Note: delivery_item expand should be handled by service layer to avoid circular deps
 */
export function mapRecordToVendorReturnItem(record: RecordModel): VendorReturnItem {
  return {
    id: record.id,
    vendor_return: record.vendor_return,
    delivery_item: record.delivery_item,
    quantity_returned: record.quantity_returned,
    return_rate: record.return_rate,
    return_amount: record.return_amount,
    condition: record.condition,
    item_notes: record.item_notes,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      vendor_return: record.expand.vendor_return ? mapRecordToVendorReturn(record.expand.vendor_return) : undefined,
      // Note: delivery_item expand should be handled by service layer
      delivery_item: undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a VendorRefund object
 */
export function mapRecordToVendorRefund(record: RecordModel): VendorRefund {
  return {
    id: record.id,
    vendor_return: record.vendor_return,
    vendor: record.vendor,
    account: record.account,
    refund_amount: record.refund_amount,
    refund_date: record.refund_date,
    refund_method: record.refund_method,
    reference: record.reference,
    notes: record.notes,
    processed_by: record.processed_by,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      vendor_return: record.expand.vendor_return ? mapRecordToVendorReturn(record.expand.vendor_return) : undefined,
      vendor: record.expand.vendor ? mapRecordToVendor(record.expand.vendor) : undefined,
      account: record.expand.account ? mapRecordToAccount(record.expand.account) : undefined,
      processed_by: record.expand.processed_by ? mapRecordToUser(record.expand.processed_by) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a VendorCreditNote object
 */
export function mapRecordToVendorCreditNote(record: RecordModel): VendorCreditNote {
  return {
    id: record.id,
    vendor: record.vendor,
    credit_amount: record.credit_amount,
    balance: record.balance,
    issue_date: record.issue_date,
    expiry_date: record.expiry_date,
    reference: record.reference,
    reason: record.reason,
    return_id: record.return_id,
    status: record.status,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      vendor: record.expand.vendor ? mapRecordToVendor(record.expand.vendor) : undefined,
      return: record.expand.return ? mapRecordToVendorReturn(record.expand.return) : undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to a CreditNoteUsage object
 * Note: credit_note and payment expand should be handled by service layer
 */
export function mapRecordToCreditNoteUsage(record: RecordModel): CreditNoteUsage {
  return {
    id: record.id,
    credit_note: record.credit_note,
    used_amount: record.used_amount,
    used_date: record.used_date,
    payment: record.payment,
    vendor: record.vendor,
    description: record.description,
    site: record.site,
    created: record.created,
    updated: record.updated,
    expand: record.expand ? {
      // Note: credit_note and payment expand should be handled by service layer
      credit_note: undefined,
      payment: undefined
    } : undefined
  };
}

/**
 * Maps a PocketBase RecordModel to an AnalyticsSetting object
 */
export function mapRecordToAnalyticsSetting(record: RecordModel): AnalyticsSetting {
  return {
    id: record.id,
    site: record.site,
    name: record.name,
    tag_ids: Array.isArray(record.tag_ids) ? record.tag_ids : [],
    date_from: record.date_from,
    date_to: record.date_to,
    amount_min: record.amount_min,
    amount_max: record.amount_max,
    created: record.created,
    updated: record.updated
  };
}
