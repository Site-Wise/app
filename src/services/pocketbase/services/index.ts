/**
 * Barrel export for all PocketBase services
 *
 * This module provides a clean separation of concerns while maintaining
 * backwards compatibility with the existing pocketbase.ts file.
 */

// Export mappers for internal use
export * from './mappers';

// Export individual services
export { AuthService, authService } from './auth.service';
export { SiteUserService, siteUserService } from './site-user.service';
export { SiteService, siteService } from './site.service';
export { AccountService, accountService, setAccountTransactionServiceRef } from './account.service';
export { ItemService, itemService } from './item.service';
export { ServiceService, serviceService } from './service.service';
export { TagService, tagService } from './tag.service';
export { VendorService, vendorService, setVendorServiceDependencies } from './vendor.service';
export { QuotationService, quotationService } from './quotation.service';
export { ServiceBookingService, serviceBookingService, setServiceBookingServiceDependencies } from './service-booking.service';
export { PaymentAllocationService, paymentAllocationService } from './payment-allocation.service';
export { AccountTransactionService, accountTransactionService } from './account-transaction.service';
export { SiteInvitationService, siteInvitationService } from './site-invitation.service';
export { DeliveryService, deliveryService, setDeliveryServiceDependencies } from './delivery.service';
export { DeliveryItemService, deliveryItemService } from './delivery-item.service';
export { VendorReturnService, vendorReturnService, setVendorReturnServiceDependencies } from './vendor-return.service';
export { VendorReturnItemService, vendorReturnItemService, setVendorReturnItemServiceDependencies } from './vendor-return-item.service';
export { VendorRefundService, vendorRefundService, setVendorRefundServiceDependencies } from './vendor-refund.service';
export { VendorCreditNoteService, vendorCreditNoteService } from './vendor-credit-note.service';
export { CreditNoteUsageService, creditNoteUsageService, setCreditNoteUsageServiceDependencies } from './credit-note-usage.service';
export { PaymentService, paymentService, setPaymentServiceDependencies } from './payment.service';
export { AnalyticsSettingService, analyticsSettingService } from './analytics-setting.service';
