/**
 * PocketBase Service Layer
 *
 * This file re-exports all types, services, and utilities from the modular
 * PocketBase structure for backwards compatibility.
 *
 * The actual implementations are now in:
 * - ./pocketbase/types/ - All type definitions
 * - ./pocketbase/services/ - All service classes
 * - ./pocketbase/client.ts - PocketBase client initialization
 * - ./pocketbase/context.ts - Site context management
 */

// Re-export everything from the modular structure
export * from './pocketbase/index';

// Import services for dependency initialization
import {
  // Services that need dependencies injected
  setAccountTransactionServiceRef,
  setVendorServiceDependencies,
  setServiceBookingServiceDependencies,
  setDeliveryServiceDependencies,
  setVendorReturnServiceDependencies,
  setVendorReturnItemServiceDependencies,
  setVendorRefundServiceDependencies,
  setCreditNoteUsageServiceDependencies,
  setPaymentServiceDependencies,
  // Service instances
  authService,
  accountTransactionService,
  deliveryService,
  deliveryItemService,
  serviceBookingService,
  paymentAllocationService,
  vendorCreditNoteService,
  creditNoteUsageService,
  paymentService,
  vendorReturnService,
} from './pocketbase/index';

// Initialize service dependencies
// This handles circular dependencies between services

// Account service needs account transaction service for balance calculations
setAccountTransactionServiceRef(accountTransactionService);

// Vendor service needs delivery service for vendor-related queries
setVendorServiceDependencies({
  deliveryService,
  serviceBookingService,
  paymentService
});

// Service booking service needs payment allocation service
setServiceBookingServiceDependencies({
  paymentAllocationService
});

// Delivery service needs delivery item service and payment allocation service
setDeliveryServiceDependencies({
  deliveryItemService,
  paymentAllocationService
});

// Vendor return service needs auth service for user info
setVendorReturnServiceDependencies({
  authService
});

// Vendor return item service needs delivery item service
setVendorReturnItemServiceDependencies({
  deliveryItemService
});

// Vendor refund service needs account transaction and vendor return services
setVendorRefundServiceDependencies({
  accountTransactionService,
  vendorReturnService,
  authService
});

// Credit note usage service needs vendor credit note and payment services for mapping
setCreditNoteUsageServiceDependencies({
  vendorCreditNoteService,
  paymentService
});

// Payment service needs many dependencies for credit note handling and allocations
setPaymentServiceDependencies({
  accountTransactionService,
  deliveryService,
  serviceBookingService,
  paymentAllocationService,
  vendorCreditNoteService,
  creditNoteUsageService
});
