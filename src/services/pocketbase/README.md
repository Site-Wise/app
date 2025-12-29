# PocketBase Module Structure

This directory contains the modular refactoring of the PocketBase services for the Site-Wise application.

## Directory Structure

```
pocketbase/
├── client.ts              # PocketBase client initialization
├── context.ts             # Site context management (getCurrentSiteId, etc.)
├── index.ts               # Main barrel export
├── README.md              # This file
├── types/
│   ├── index.ts           # Types barrel export
│   ├── user.ts            # User, UserWithRoles
│   ├── permissions.ts     # Permissions, UserRole, calculatePermissions
│   ├── site.ts            # Site, SiteUser, SiteInvitation
│   ├── account.ts         # Account, AccountTransaction
│   ├── tag.ts             # Tag, TAG_COLOR_PALETTE
│   ├── item.ts            # Item, ItemWithTags
│   ├── vendor.ts          # Vendor, VendorWithTags
│   ├── service.ts         # Service, ServiceWithTags, ServiceBooking
│   ├── quotation.ts       # Quotation
│   ├── delivery.ts        # Delivery, DeliveryItem
│   ├── payment.ts         # Payment, PaymentAllocation
│   └── vendor-returns.ts  # VendorReturn, VendorReturnItem, VendorRefund, VendorCreditNote, CreditNoteUsage
└── services/
    ├── index.ts           # Services barrel export
    ├── mappers.ts         # Shared record mappers
    ├── auth.service.ts    # AuthService
    ├── site.service.ts    # SiteService
    ├── site-user.service.ts # SiteUserService
    ├── account.service.ts # AccountService
    ├── item.service.ts    # ItemService
    ├── service.service.ts # ServiceService
    └── tag.service.ts     # TagService
```

## Usage

### Importing from the module

You can import types and services from this module:

```typescript
// Import specific types
import type { User, Site, Item } from './services/pocketbase/types';

// Import services
import { itemService, authService } from './services/pocketbase/services';

// Import client and context
import { pb } from './services/pocketbase/client';
import { getCurrentSiteId } from './services/pocketbase/context';
```

### Backwards Compatibility

The main `pocketbase.ts` file in the parent directory still exports everything for backwards compatibility:

```typescript
// This still works
import { itemService, Item, pb } from './services/pocketbase';
```

## Migration Status

### Completed
- ✅ Types extracted to separate files
- ✅ Client initialization extracted
- ✅ Context management extracted
- ✅ Core services extracted (Auth, Site, SiteUser, Account, Item, Service, Tag)
- ✅ Shared mappers created

### Remaining Services (in main pocketbase.ts)
The following services remain in the main `pocketbase.ts` file due to complex interdependencies:

- VendorService
- QuotationService
- ServiceBookingService
- PaymentService
- PaymentAllocationService
- AccountTransactionService
- DeliveryService
- DeliveryItemService
- VendorReturnService
- VendorReturnItemService
- VendorRefundService
- VendorCreditNoteService
- CreditNoteUsageService
- SiteInvitationService

These can be migrated incrementally as needed.

## Design Principles

1. **Single Responsibility**: Each file handles one type or service
2. **Backwards Compatibility**: Existing imports continue to work
3. **Incremental Migration**: Services can be migrated one at a time
4. **Shared Utilities**: Common mappers are centralized to avoid duplication
5. **Clear Dependencies**: Import paths make dependencies explicit
