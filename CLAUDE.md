# Site-Wise Development Guide

## Tech Stack
Vue 3 + TypeScript + Vite, PocketBase backend, Tauri desktop, PWA mobile, Tailwind CSS, i18n (EN/HI)

## Core Files
- `src/services/pocketbase.ts` - Data models & API client
- `src/composables/useI18n.ts` - Translations
- `src/composables/useSiteContext.ts` - Site selection
- `src/components/AppLayout.vue` - Main layout
- Main views: Dashboard, Delivery, Accounts, Quotations, Payments, ServiceBookings

## Important Data Model Changes
- **Deprecation**: `incoming_items` has been deprecated. Use `deliveries` and `delivery_items` instead.
- **Payment Interface**: The `Payment` interface now has `deliveries: string[]` (not `incoming_items`)

## Security Model

### Site Data Isolation
- All service methods filter data by `getCurrentSiteId()`
- `getById()` methods include site validation to prevent cross-site access
- All site-specific services now have consistent `getById()` methods
- Exceptions: AuthService, SiteService, SiteUserService (by design)
- **Testing**: `cross-site-access-prevention.test.ts` verifies isolation works correctly

### Role-Based Access Control
- Three roles: `owner`, `supervisor`, `accountant`
- Permissions checked via `calculatePermissions(userRole)`
- API rules in PocketBase must match these roles exactly

## Key Patterns

### Code Structure
```typescript
// Vue imports, composables, components, services/types
import { ref, computed } from 'vue'
import { useI18n } from '../composables/useI18n'
import { pb, type Item } from '../services/pocketbase'

// Component order: Imports, Props/Emits, Composables, Refs/Reactive, Computed, Methods, Lifecycle
```

### Essential Rules
- Check types in `pocketbase.ts` first
- Use translations: `{{ t('key') }}` - add to both en.json/hi.json
- Mobile-first: min 44x44px taps, test on 320px+
- Responsive tables: `hidden lg:table-cell` for desktop, `lg:hidden` for mobile
- Keyboard shortcuts: `Shift+Alt+N` for new items, `Esc` for modals
- Modals: autofocus first input, handle escape key
- Forms: `reactive<FormType>({})`, proper error handling
- File uploads: `capture="environment"` for camera

### Mobile Table Pattern
```vue
<thead class="hidden lg:table-header-group"><!-- Desktop --></thead>
<thead class="lg:hidden"><!-- Mobile --></thead>
<tbody>
  <tr><td class="hidden lg:table-cell">Desktop</td><td class="lg:hidden">Mobile</td></tr>
</tbody>
```

### Tauri
- Web: PWA features, web notifications
- Desktop: System tray, native notifications, file system access
- Platform detection via `usePlatform()`

## Critical App.vue Reload Fix

### Problem
Page reload redirected users to dashboard due to race condition in App.vue

### Solution
Added `isReadyForRouting` check to prevent `SiteSelectionView` rendering before site initialization completes

### Critical Rules
- NEVER modify App.vue conditional rendering without understanding this fix
- NEVER add auto-redirect logic to components rendering during loading
- Always check `isReadyForRouting.value` before programmatic navigation

## Site Data Management

### Site Change Reactivity Architecture

The app uses a reactive architecture for handling site changes without duplicate requests:

#### Core Components
- **Pinia Store** (`src/stores/site.ts`): Central site state management
- **useSite composable** (`src/composables/useSite.ts`): Site operations wrapper
- **useSiteData composable** (`src/composables/useSiteData.ts`): Auto-reloading data for current site

#### Critical Pattern for Views
```typescript
// ✅ CORRECT: Use useSiteData for automatic site-aware data loading
import { useSiteData } from '../composables/useSiteData';

const { data: itemsData, loading: itemsLoading, reload: reloadItems } = useSiteData(async (siteId) => {
  const [items, deliveries, tags] = await Promise.all([
    itemService.getAll(),
    deliveryService.getAll(),
    tagService.getAll()
  ]);
  return { items, deliveries, tags };
});

const items = computed(() => itemsData.value?.items || []);
```

#### What NOT to do
```typescript
// ❌ WRONG: Manual event listeners cause duplicate requests
const handleSiteChange = () => { loadData(); };
window.addEventListener('site-changed', handleSiteChange);
```

### Key Rules
- **Views**: Use `useSiteData()` composable for automatic site-aware data loading
- **Services**: Already filter by current site via `getCurrentSiteId()` 
- **NO custom events**: Site changes are handled reactively through watchers
- **Store optimizations**: Early return prevents unnecessary updates for same site/role
- **App.vue**: Prevents duplicate `loadUserSites()` calls on auth state

## Testing Site Data Reactivity

### Key Requirements
All views using `useSiteData` must handle:
1. **Initial Data Loading** for current site
2. **Site Change Reactivity** - data reloads when site changes  
3. **Null Site Handling** - data clears when site becomes null
4. **No Duplicate Requests** - same site selection doesn't trigger reload

### Manual Testing Checklist
- [ ] Navigate between sites in SiteSelector  
- [ ] Verify each view updates immediately without page reload
- [ ] Check loading states during site changes
- [ ] Verify no duplicate requests in Network tab

## Testing Guide

### Preferred Testing Strategy: Logic-Focused Testing

**🎯 Primary Approach: Test business logic without DOM mounting to avoid environment issues while achieving comprehensive coverage.**

### Logic-Focused Component Testing Pattern

#### Standard Logic Test Structure
```typescript
// Logic-focused test file - no DOM mounting required
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('ComponentName Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test business logic, calculations, state management, etc.
  // Focus on function behavior rather than DOM interactions
})
```

#### Key Benefits of Logic-Focused Testing
- ✅ **No DOM environment issues** - Avoids `insertBefore`, `setAttribute` errors
- ✅ **Faster test execution** - No component mounting overhead
- ✅ **More reliable** - Tests pure logic, not DOM implementation details
- ✅ **Better refactoring safety** - Logic tests survive UI changes
- ✅ **Comprehensive coverage** - Can test edge cases and error scenarios easily

### Testing Categories to Cover

#### 1. Business Logic & Data Processing
```typescript
describe('Data Processing Logic', () => {
  it('should calculate values correctly', () => {
    const calculateTotal = (items: any[]) => {
      return items.reduce((sum, item) => sum + item.price, 0)
    }
    
    const items = [{ price: 10 }, { price: 20 }]
    expect(calculateTotal(items)).toBe(30)
  })
})
```

#### 2. Function Behavior & Edge Cases
```typescript
describe('Function Behavior', () => {
  it('should handle empty input gracefully', () => {
    const processData = (data: any[]) => {
      return data.length > 0 ? data.map(item => item.name) : []
    }
    
    expect(processData([])).toEqual([])
    expect(processData([{ name: 'test' }])).toEqual(['test'])
  })
})
```

#### 3. State Management & Validation
```typescript
describe('State Management Logic', () => {
  it('should validate state transitions', () => {
    const stateManager = {
      isOpen: false,
      toggle: () => { stateManager.isOpen = !stateManager.isOpen }
    }
    
    expect(stateManager.isOpen).toBe(false)
    stateManager.toggle()
    expect(stateManager.isOpen).toBe(true)
  })
})
```

#### 4. Error Handling Scenarios
```typescript
describe('Error Handling Logic', () => {
  it('should handle errors gracefully', async () => {
    const safeOperation = async (shouldFail: boolean) => {
      try {
        if (shouldFail) throw new Error('Test error')
        return 'success'
      } catch (error) {
        return 'error handled'
      }
    }
    
    expect(await safeOperation(false)).toBe('success')
    expect(await safeOperation(true)).toBe('error handled')
  })
})
```

#### 5. CSS Class Generation Logic
```typescript
describe('CSS Classes Logic', () => {
  it('should generate correct classes', () => {
    const getButtonClasses = (variant: string, disabled: boolean) => {
      const base = 'btn'
      const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary'
      const disabledClass = disabled ? 'btn-disabled' : ''
      return `${base} ${variantClass} ${disabledClass}`.trim()
    }
    
    expect(getButtonClasses('primary', false)).toBe('btn btn-primary')
    expect(getButtonClasses('primary', true)).toBe('btn btn-primary btn-disabled')
  })
})
```

#### 6. Props & Interface Validation
```typescript
describe('Props Validation Logic', () => {
  it('should validate interface requirements', () => {
    interface Props {
      title: string
      count?: number
    }
    
    const validateProps = (props: any): props is Props => {
      return typeof props.title === 'string' && 
             (props.count === undefined || typeof props.count === 'number')
    }
    
    expect(validateProps({ title: 'test' })).toBe(true)
    expect(validateProps({ title: 123 })).toBe(false)
  })
})
```

### When to Use DOM-Based Testing

**Only use DOM mounting when absolutely necessary:**
- Testing actual user interactions that can't be isolated
- Integration testing between multiple components  
- Testing complex DOM manipulation logic

### View Testing Patterns (DOM-Based)

#### Standard View Test Structure
```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../utils/test-setup'

describe('ViewName', () => {
  let wrapper: any
  let pinia: any
  let siteStore: any
  
  beforeEach(() => { 
    vi.clearAllMocks()
    const { pinia: testPinia, siteStore: testSiteStore } = setupTestPinia()
    pinia = testPinia
    siteStore = testSiteStore
  })
  afterEach(() => { wrapper?.unmount() })
})
```

#### Critical Pinia & PocketBase Mock Patterns

#### 1. REQUIRED: PocketBase Mock Structure for View Tests
```typescript
// ✅ MUST include these functions for Pinia store compatibility
vi.mock('../../services/pocketbase', () => ({
  // Your service mocks...
  itemService: { getAll: vi.fn().mockResolvedValue([]) },
  paymentService: { getAll: vi.fn().mockResolvedValue([]) },
  
  // ⚠️ CRITICAL: Always include these for useSiteStore and usePermissions
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
  setCurrentUserRole: vi.fn(),
  calculatePermissions: vi.fn().mockReturnValue({
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canManageRoles: true,
    canExport: true,
    canViewFinancials: true
  }),
  
  // Optional: pb object if needed
  pb: {
    authStore: { isValid: true, model: { id: 'user-1' } },
    collection: vi.fn(() => ({ getFullList: vi.fn().mockResolvedValue([]) }))
  }
}))
```

#### 2. Always Mock useSubscription for Views
```typescript
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: { value: false }
  })
}))
```

#### 3. Modal Testing Pattern (Avoid Hidden Button Issues)
```typescript
// ❌ WRONG: Clicking hidden add buttons (mobile responsiveness hides them)
const addButton = wrapper.find('[data-testid="add-item-btn"]')
await addButton.trigger('click')

// ✅ CORRECT: Direct modal state manipulation
wrapper.vm.showAddModal = true
wrapper.vm.paymentModalMode = 'CREATE'
await wrapper.vm.$nextTick()
```

### Successful Testing Examples

Our logic-focused approach has successfully created **224 comprehensive tests** across 7 components:
- **TurnstileWidget.test.ts** - 30 tests (script loading, API integration, callbacks)
- **ToastContainer.test.ts** - 37 tests (icon selection, styling, state management)  
- **StatusBadge.test.ts** - 30 tests (badge text, size/color classes, props validation)
- **SiteDeleteModal.test.ts** - 25 tests (confirmation logic, state management, error handling)
- **KeyboardShortcutTooltip.test.ts** - 33 tests (positioning, event handling, accessibility)
- **CardDropdownMenu.test.ts** - 33 tests (action handling, CSS classes, keyboard events)
- **TagSelector.test.ts** - 36 tests (filtering, creation workflow, type selection)

### Common View Test Patterns
- **Site changes**: `await siteStore.selectSite(mockSite, 'role')` 
- **Site clearing**: `await siteStore.clearCurrentSite()`
- **Button finding**: `buttons.find((btn: any) => btn.text().includes('text'))`
- **Form testing**: Set `wrapper.vm.form.field` directly, not DOM elements
- **Async operations**: `await wrapper.vm.$nextTick()` + `setTimeout(50)` pattern

### Testing Strategy Decision Tree

```
Is this a component test?
├── Yes: Can the logic be tested without DOM?
│   ├── Yes: Use Logic-Focused Testing ✅
│   └── No: Use DOM-based testing (mount component)
└── No: Is this a view/integration test?
    └── Use DOM-based testing with proper mocks
```

## Common Build Error Patterns

### 1. Type Conversion Errors
When you encounter type conversion errors like:
```
Conversion of type 'X[]' to type 'Y[]' may be a mistake
```
**Fix**: Check if you're mixing different data types. Common case: search functionality returning different types than the view expects.

### 2. Incomplete Script Setup in Views
If a view has `<script setup lang="ts">` with only imports and no implementation:
- The view needs complete implementation of all methods/properties referenced in the template
- Use `useSiteData` composable for data loading
- Include all state variables, computed properties, and methods

### 3. Service Method Availability
Not all services have a `getAll()` method. Check `src/services/pocketbase.ts` for available methods:
- Most services have `getAll()`: items, deliveries, vendors, etc.
- Some services are query-only: deliveryItemService (use specific query methods)

### 4. Search Implementation Type Mismatches
When implementing search in views that use different data types:
- Ensure search returns match the expected type
- Consider disabling search if types are incompatible
- Document why search is disabled with a comment

### 5. Missing calculatePermissions in Test Mocks
**Error Pattern**: `[vitest] No "calculatePermissions" export is defined on the "../../services/pocketbase" mock`

**Root Cause**: Views using `usePermissions` composable require `calculatePermissions` function from PocketBase service

**Fix**: Always include `calculatePermissions` in PocketBase service mocks:
```typescript
vi.mock('../../services/pocketbase', () => ({
  // ...other service mocks
  calculatePermissions: vi.fn().mockReturnValue({
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canManageRoles: true,
    canExport: true,
    canViewFinancials: true
  }),
  // ...rest of mock
}))
```

**Prevention**: Use the centralized mock from `src/test/mocks/pocketbase.ts` when possible, or ensure all required functions are included in custom mocks.

## Subscription System

### Critical Fix: Usage Data Handling
The `checkCreateLimit` function in `useSubscription.ts` must handle cases where usage data doesn't exist yet:

```typescript
// ✅ CORRECT: Handle null usage data
const usage = currentUsage.value || {
  items_count: 0,
  vendors_count: 0,
  deliveries_count: 0,
  service_bookings_count: 0,
  payments_count: 0
};

// ❌ WRONG: Block creation when usage data is null
if (!currentSubscription.value || !currentUsage.value) return false;
```

**Why**: Usage records are created by PocketBase hooks when needed. If no usage record exists yet, treat current usage as 0 rather than blocking all creation.

**Impact**: Views like ItemsView, VendorsView, etc. use `checkCreateLimit` to enable/disable add buttons.

### Unlimited Plans
Plans with `max_items: -1` (or any limit set to -1) should be treated as unlimited:
- The `isUnlimited()` helper function correctly identifies these plans
- The `checkCreateLimit` function should return `true` for unlimited plans regardless of usage

## Subscription System Integration

### Critical Rule: Subscription Limits Control Button Availability
**All create/add buttons in views MUST be controlled by subscription limits.** Views use `checkCreateLimit('type')` to determine if creation is allowed based on current usage vs plan limits.

### Test Patterns for Subscription Integration

#### 1. REQUIRED: useSubscription Mock in View Tests
```typescript
// ✅ CORRECT: Always include useSubscription mock in view tests
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true), // Allow creation by default
    isReadOnly: { value: false }
  })
}))
```

#### 2. Modal Opening Pattern for Tests
When testing views with subscription-controlled add buttons:
```typescript
// ❌ WRONG: Clicking hidden add buttons (mobile responsiveness hides them)
const addButton = wrapper.find('[data-testid="add-item-btn"]')
await addButton.trigger('click')

// ✅ CORRECT: Direct modal state manipulation
wrapper.vm.showAddModal = true
wrapper.vm.paymentModalMode = 'CREATE' // For specific modal modes
await wrapper.vm.$nextTick()
```

**Reason**: Add buttons often have `hidden md:flex` classes for mobile responsiveness, making them invisible in tests. Direct state manipulation bypasses DOM interaction issues.

#### 3. Subscription Store Integration
The subscription system uses Pinia stores with these key components:
- **Store**: `useSubscriptionStore()` - Central subscription state management  
- **Composable**: `useSubscription()` - Wrapper for store with reactive site changes
- **Integration**: Views use `checkCreateLimit(type)` to control button visibility

#### 4. Complete PocketBase Mock for Subscription Tests
```typescript
// ✅ REQUIRED: Complete mock with collection routing
vi.mock('../../services/pocketbase', () => ({
  pb: {
    collection: vi.fn((name: string) => {
      if (name === 'site_subscriptions') {
        return { getFirstListItem: vi.fn().mockResolvedValue(mockSubscriptionData) }
      } else if (name === 'subscription_usage') {
        return { getFirstListItem: vi.fn().mockResolvedValue(mockUsageData) }
      }
      return { getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')) }
    })
  },
  getCurrentSiteId: vi.fn(() => 'site-1'),
  // ... other required service mocks
}))
```

#### 5. View Component Integration Pattern
Views implement subscription checks in computed properties:
```typescript
// In Vue components
const canCreateItem = computed(() => {
  return checkCreateLimit('items') && permissions.canCreate.value
})
```

### Successful Test Fixes Applied
- **ItemsView.test.ts**: Fixed add button tests using direct modal manipulation
- **ServicesView.test.ts**: Applied same pattern for service creation
- **VendorsView.test.ts**: Fixed subscription limit mocking
- **AccountsView.test.ts**: Implemented direct modal state setting
- **ServiceBookingsView.test.ts**: Fixed date input tests with form manipulation  
- **PaymentsView.test.ts**: Applied mobile-responsive test patterns
- **useSubscription tests**: Created from scratch with proper collection routing

### Key Testing Rules
1. **Always mock `useSubscription`** in view tests
2. **Use direct modal manipulation** instead of clicking hidden buttons
3. **Test subscription limits** by mocking `checkCreateLimit` return values
4. **Reference working tests** as patterns when fixing similar issues
5. **Write from scratch** when fixing becomes too complex

## PocketBase Auto-Cancellation Fix

### Problem: Dual Data Loading Race Condition
Views were getting `ClientResponseError: The request was autocancelled` due to simultaneous requests to the same PocketBase collection.

### Root Cause
Views using both `useSiteData` and search composables (e.g., `useAccountSearch`) were making duplicate requests:
1. `useSiteData` automatically loads data on mount and site changes
2. `loadAll()` from search composables also loads the same data
3. PocketBase auto-cancels the first request when the second starts

### Critical Rule
**NEVER call `loadAll()` in `onMounted()` when using `useSiteData`**

```typescript
// ❌ WRONG: Creates race condition with useSiteData
onMounted(() => {
  setTimeout(() => loadAll(), 100); // This conflicts with useSiteData
});

// ✅ CORRECT: Let useSiteData handle data loading
onMounted(() => {
  // Data loading is handled automatically by useSiteData
  window.addEventListener('keydown', handleKeyboardShortcut);
});
```

### Fixed Views
The following views were fixed by removing redundant `loadAll()` calls:
- AccountsView.vue
- VendorsView.vue  
- ItemsView.vue
- ServiceBookingsView.vue
- QuotationsView.vue
- PaymentsView.vue
- DeliveryView.vue

### Prevention
When creating new views that use both `useSiteData` and search:
- Let `useSiteData` handle automatic data loading
- Only use search composables for search functionality
- Never call `loadAll()` manually unless specifically needed for search initialization

## Site Selection Auto-Cancellation Fix

### Problem: Multiple loadUserSites() Calls
Site selection was experiencing `ClientResponseError: The request was autocancelled` due to concurrent `loadUserSites()` calls from multiple sources:
1. App.vue auth watcher (on login)
2. App.vue onMounted (on page load)  
3. SiteSelectionView onMounted (redundant)

### Solution: Request Deduplication
Implemented request deduplication in the site store to prevent multiple simultaneous calls:

```typescript
// Site store now prevents concurrent loadUserSites calls
let loadUserSitesPromise: Promise<void> | null = null

async function loadUserSites() {
  // If already loading, return the existing promise
  if (loadUserSitesPromise) {
    return loadUserSitesPromise
  }
  
  loadUserSitesPromise = loadUserSitesInternal()
  try {
    await loadUserSitesPromise
  } finally {
    loadUserSitesPromise = null
  }
}
```

### Additional Fix
Removed redundant `loadUserSites()` call from SiteSelectionView since App.vue already handles site loading.

### Result
- ✅ No more auto-cancellation errors during site selection
- ✅ Proper deduplication of concurrent requests
- ✅ Maintained functionality across all components

## Commands
```bash
npm run dev          # Development server
npm run dev:tauri    # Tauri development
npm run build        # Production build
npm run build:tauri  # Tauri build
npm test            # Run tests
npx vue-tsc --noEmit # Type check
```

## Environment
```env
VITE_POCKETBASE_URL=http://localhost:8090
```

