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

// Note: The remaining services (VendorService, QuotationService, ServiceBookingService,
// PaymentService, PaymentAllocationService, AccountTransactionService, DeliveryService,
// DeliveryItemService, VendorReturnService, VendorReturnItemService, VendorRefundService,
// VendorCreditNoteService, CreditNoteUsageService, SiteInvitationService) are still
// being refactored and are currently exported from the main pocketbase.ts file.
//
// As the refactoring continues, they will be moved here one by one.
