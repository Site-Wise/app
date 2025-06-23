# Site-Wise Development Guide

## Project Overview
Site-Wise is a construction site management application built with:
- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: PocketBase
- **Desktop**: Tauri (for native apps)
- **Mobile**: PWA (Progressive Web App)
- **Styling**: Tailwind CSS with dark mode support
- **i18n**: Multi-language support (English & Hindi)

## Directory Structure

```
app/
├── src/
│   ├── assets/          # Static assets (images, icons)
│   ├── components/      # Reusable Vue components
│   ├── composables/     # Vue composition API utilities
│   ├── locales/         # Translation files (en.json, hi.json)
│   ├── router/          # Vue Router configuration
│   ├── services/        # API services (pocketbase.ts)
│   ├── stores/          # Pinia state management
│   ├── styles/          # Global styles
│   ├── test/            # Test files
│   ├── types/           # TypeScript type definitions
│   └── views/           # Page components
├── src-tauri/           # Tauri desktop app configuration
├── public/              # Public static files
└── index.html           # Entry HTML file
```

## Key Files & Their Purpose

### Core Services
- `src/services/pocketbase.ts` - PocketBase client and data models
- `src/services/auth.ts` - Authentication service
- `src/services/subscription.ts` - Subscription management

### Important Composables
- `src/composables/useI18n.ts` - Internationalization
- `src/composables/useToast.ts` - Toast notifications
- `src/composables/useSubscription.ts` - Subscription state
- `src/composables/useSiteContext.ts` - Site selection context

### Main Views
- `src/views/IncomingView.vue` - Incoming deliveries/materials
- `src/views/ServiceBookingsView.vue` - Service bookings
- `src/views/DashboardView.vue` - Main dashboard
- `src/views/AccountsView.vue` - Financial accounts
- `src/views/QuotationsView.vue` - Project quotations

### Key Components
- `src/components/AppLayout.vue` - Main layout wrapper
- `src/components/PhotoGallery.vue` - Photo viewing component
- `src/components/FileUploadComponent.vue` - File upload with camera
- `src/components/SubscriptionBanner.vue` - Subscription status

## Development Guidelines

### 1. Code Style & Conventions
```typescript
// Import order
import { ref, computed } from 'vue'                    // Vue imports first
import { useI18n } from '../composables/useI18n'       // Composables
import PhotoGallery from '../components/PhotoGallery.vue' // Components
import { pb, type Item } from '../services/pocketbase'  // Services & types

// Component structure
<template>
  <!-- Template content -->
</template>

<script setup lang="ts">
// Imports
// Props & Emits
// Composables
// Refs & Reactive
// Computed
// Methods
// Lifecycle hooks
</script>

<style scoped>
/* Use @apply for Tailwind classes */
/* Avoid @apply with utilities like 'group' */
</style>
```

### 2. TypeScript Types
Always check existing types in:
- `src/services/pocketbase.ts` - Data models
- Component files - Local interfaces

```typescript
// Example proper typing
interface FileWithPreview {
  file: File
  preview: string
}

const form = reactive<IncomingFormData>({
  item: '',
  vendor: '',
  quantity: 0
})
```

### 3. API & Data Handling

#### PocketBase URL Construction
```typescript
// Correct way (avoid deprecated methods)
const getPhotoUrl = (itemId: string, filename: string) => {
  return `${import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'}/api/files/collection_name/${itemId}/${filename}`
}
```

#### Service Pattern
```typescript
// Use existing services
const items = await itemService.getAll()
const savedItem = await itemService.create(data)
```

### 4. Internationalization
Always use translations for user-facing text:

```typescript
const { t } = useI18n()

// In template
{{ t('common.save') }}

// Add new translations to both:
// - src/locales/en.json
// - src/locales/hi.json
```

### 5. Responsive Design Checklist
- [ ] Mobile-first approach
- [ ] Test on small screens (320px+)
- [ ] Touch-friendly tap targets (min 44x44px)
- [ ] Proper spacing for mobile
- [ ] Responsive grid layouts
- [ ] Dark mode support

### 6. Platform Considerations

#### Tauri (Desktop)
- File paths must be absolute
- Consider native file dialogs
- Test file permissions

#### PWA (Mobile)
- Camera access: use `capture="environment"`
- Offline support considerations
- Service worker updates

### 7. Component Creation Checklist
When creating new components:
1. [ ] Check if similar component exists
2. [ ] Use TypeScript with proper types
3. [ ] Add translations for all text
4. [ ] Support dark mode
5. [ ] Make it responsive
6. [ ] Test on mobile devices
7. [ ] Handle loading/error states
8. [ ] Add proper ARIA labels

### 8. Common Patterns

#### Modal Pattern
```vue
<div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 z-50">
  <div class="modal-content">
    <!-- Content -->
  </div>
</div>
```

#### Form Handling
```typescript
const form = reactive({...})
const loading = ref(false)

const handleSubmit = async () => {
  loading.value = true
  try {
    await service.create(form)
    success(t('messages.success'))
    closeModal()
  } catch (error) {
    error(t('messages.error'))
  } finally {
    loading.value = false
  }
}
```

#### File Upload
```typescript
const handleFilesSelected = (files: File[]) => {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('photos', file)
  })
  await pb.collection('items').update(id, formData)
}
```

### 9. Testing Approach
- Unit tests in `src/test/`
- Use Vitest for testing
- Mock PocketBase calls
- Test composables separately

### 10. Performance Tips
- Use `v-show` for frequently toggled elements
- Lazy load images with `loading="lazy"`
- Use computed properties for derived state
- Implement virtual scrolling for long lists

## Common Issues & Solutions

### Issue: Tailwind @apply errors
**Solution**: Don't use @apply with interactive utilities like 'group', 'hover:', etc.

### Issue: TypeScript errors with PocketBase
**Solution**: Import types from services/pocketbase.ts

### Issue: Missing translations
**Solution**: Add to both en.json and hi.json files

### Issue: Camera not working on mobile
**Solution**: Use `capture="environment"` attribute

## Before Committing
1. Run type check: `npx vue-tsc --noEmit`
2. Test on mobile viewport
3. Check dark mode
4. Verify translations
5. Test offline functionality (PWA)

## Important Environment Variables
```env
VITE_POCKETBASE_URL=http://localhost:8090
```

## Useful Commands
```bash
npm run dev          # Development server
npm run dev:tauri    # Tauri development
npm run build        # Production build
npm run build:tauri  # Tauri build
npm test            # Run tests
```

## Architecture Decisions
1. **No Redux/Vuex**: Using Pinia for state management
2. **Composition API**: Preferred over Options API
3. **TypeScript**: Strict mode enabled
4. **Tailwind**: Utility-first CSS approach
5. **PocketBase**: Self-hosted backend solution

## Feature Implementation Flow
1. Check existing patterns in codebase
2. Create/modify view component
3. Add necessary services/composables
4. Implement responsive design
5. Add translations
6. Test on both platforms
7. Handle edge cases
8. Add proper error handling

---
*Last Updated: Current Session*