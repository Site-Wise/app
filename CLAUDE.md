# Site-Wise Development Guide

## Tech Stack
Vue 3 + TypeScript + Vite, PocketBase backend, Tauri desktop, PWA mobile, Tailwind CSS, i18n (EN/HI)

## Core Files
- `src/services/pocketbase.ts` - Data models & API client
- `src/composables/useI18n.ts` - Translations
- `src/composables/useSiteContext.ts` - Site selection
- `src/components/AppLayout.vue` - Main layout
- Main views: Dashboard, Delivery, Accounts, Quotations, Payments, ServiceBookings

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

## Testing Guide

### Test Structure
```typescript
// Standard test file
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

describe('Component', () => {
  let wrapper: any
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { wrapper?.unmount() })
  // Tests...
})
```

### Key Patterns
- Button finding: `buttons.find((btn: any) => btn.text().includes('text'))`
- Mock services: Reset implementations in `beforeEach`, not just calls
- Async operations: `await wrapper.vm.$nextTick()` + `setTimeout(50)` pattern
- Form testing: Set `wrapper.vm.form.field` directly, not DOM elements
- FileReader mocking: Simulate async with `setTimeout(5)` in mock

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

