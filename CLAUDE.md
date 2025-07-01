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

### Test Structure
```typescript
// Standard test file
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupTestPinia } from '../utils/test-setup'

describe('Component', () => {
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
  // Tests...
})
```

### Critical Pinia & PocketBase Mock Patterns

#### 1. REQUIRED: PocketBase Mock Structure for View Tests
```typescript
// ✅ MUST include these functions for Pinia store compatibility
vi.mock('../../services/pocketbase', () => ({
  // Your service mocks...
  itemService: { getAll: vi.fn().mockResolvedValue([]) },
  paymentService: { getAll: vi.fn().mockResolvedValue([]) },
  
  // ⚠️ CRITICAL: Always include these for useSiteStore
  getCurrentSiteId: vi.fn(() => 'site-1'),
  setCurrentSiteId: vi.fn(),
  getCurrentUserRole: vi.fn(() => 'owner'),
  setCurrentUserRole: vi.fn(),
  
  // Optional: pb object if needed
  pb: {
    authStore: { isValid: true, model: { id: 'user-1' } },
    collection: vi.fn(() => ({ getFullList: vi.fn().mockResolvedValue([]) }))
  }
}))
```

#### 2. Store Access Patterns - NO .value on Computed Properties
```typescript
// ✅ CORRECT: Access computed properties directly
expect(store.currentSite).toEqual(expectedSite)
expect(store.currentSiteId).toBe('site-1')
expect(store.isInitialized).toBe(true)

// ❌ WRONG: Adding .value to computed properties
expect(store.currentSite.value).toEqual(expectedSite)  // TypeError!
expect(store.currentSiteId.value).toBe('site-1')      // TypeError!
```

#### 3. Store State Modification in Tests
```typescript
// ✅ CORRECT: Use $patch for state changes
store.$patch({ currentSiteId: 'site-2' })

// ✅ CORRECT: For complex mocks, use specific collection mocks
const mockCollection = {
  getFullList: vi.fn().mockResolvedValue(mockData)
}
vi.mocked(pb.collection).mockReturnValue(mockCollection)
```

#### 4. Always Mock useSubscription for Views
```typescript
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: { value: false }
  })
}))
```

#### 5. Mock Composables with Vue Refs (REQUIRED)
```typescript
// ✅ CORRECT: Use Vue refs in mocks
vi.mock('../../composables/useSite', () => ({
  useSite: () => {
    const { ref } = require('vue')
    return {
      currentSite: ref({ id: 'site-1', name: 'Test Site', total_units: 100, total_planned_area: 50000 }),
      currentSiteId: ref('site-1'),
      isLoading: ref(false)
    }
  }
}))
```

#### 6. Global Mock Management for Pinia Tests (CRITICAL)
```typescript
// ✅ CORRECT: Proper mock management to avoid test interference
describe('ComponentName', () => {
  let pinia: any
  let siteStore: any
  let getCurrentSiteIdMock: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get and control the mock function
    const pocketbaseMocks = await import('../../services/pocketbase')
    getCurrentSiteIdMock = vi.mocked(pocketbaseMocks.getCurrentSiteId)
    
    // Reset to default return value for most tests
    getCurrentSiteIdMock.mockReturnValue('site-1')
    
    const { pinia: testPinia, siteStore: testSiteStore } = setupTestPinia()
    pinia = testPinia
    siteStore = testSiteStore
  })

  // In tests, use store methods not direct property access:
  // ✅ CORRECT: siteStore.selectSite(mockSite, 'owner')
  // ✅ CORRECT: siteStore.clearCurrentSite() 
  // ❌ WRONG: siteStore.currentSiteId = 'site-2'
})
```

### Common Test Patterns
- **Site changes**: `await siteStore.selectSite(mockSite, 'role')` 
- **Site clearing**: `await siteStore.clearCurrentSite()`
- **Button finding**: `buttons.find((btn: any) => btn.text().includes('text'))`
- **Form testing**: Set `wrapper.vm.form.field` directly, not DOM elements
- **Async operations**: `await wrapper.vm.$nextTick()` + `setTimeout(50)` pattern

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

