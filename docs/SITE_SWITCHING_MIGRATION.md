# Site Switching Migration Guide

This guide explains how to migrate views to use the new reactive site switching pattern with Pinia.

## Overview

The new pattern uses Pinia store for site management, which automatically triggers reactive updates when the site changes. This eliminates the need for manual event listeners and provides a cleaner, more maintainable solution.

## Key Changes

1. **Pinia Store**: Site state is now managed in `src/stores/site.ts`
2. **Reactive Composables**: New composables `useSiteData` and `useSitePaginatedData` handle automatic data reloading
3. **No Manual Events**: Remove `addEventListener('site-changed')` and `removeEventListener`

## Migration Steps

### 1. Simple Data Loading

**Before:**
```typescript
const items = ref<Item[]>([]);

const loadItems = async () => {
  const siteId = getCurrentSiteId();
  if (!siteId) return;
  
  items.value = await itemService.getBySite(siteId);
};

onMounted(() => {
  loadItems();
  window.addEventListener('site-changed', loadItems);
});

onUnmounted(() => {
  window.removeEventListener('site-changed', loadItems);
});
```

**After:**
```typescript
import { useSiteData } from '@/composables/useSiteData';

const { data: items, loading, error, reload } = useSiteData(
  async (siteId) => await itemService.getBySite(siteId)
);
```

### 2. Paginated Data Loading

**Before:**
```typescript
const deliveries = ref<Delivery[]>([]);
const currentPage = ref(1);
const totalPages = ref(1);

const loadDeliveries = async () => {
  const siteId = getCurrentSiteId();
  if (!siteId) return;
  
  const result = await deliveryService.getBySite(siteId, currentPage.value, 20);
  deliveries.value = result.items;
  totalPages.value = result.totalPages;
};

watch(currentPage, loadDeliveries);

onMounted(() => {
  loadDeliveries();
  window.addEventListener('site-changed', () => {
    currentPage.value = 1;
    loadDeliveries();
  });
});
```

**After:**
```typescript
import { useSitePaginatedData } from '@/composables/useSiteData';

const { 
  items: deliveries, 
  loading, 
  currentPage, 
  totalPages, 
  nextPage, 
  prevPage,
  reload 
} = useSitePaginatedData(
  async (siteId, page, perPage) => await deliveryService.getBySite(siteId, page, perPage),
  { perPage: 20 }
);
```

### 3. Multiple Data Sources

If you need to load multiple types of data:

```typescript
import { useSiteData } from '@/composables/useSiteData';

// Each will automatically reload when site changes
const { data: items } = useSiteData(
  async (siteId) => await itemService.getBySite(siteId)
);

const { data: vendors } = useSiteData(
  async (siteId) => await vendorService.getBySite(siteId)
);

const { data: stats } = useSiteData(
  async (siteId) => await dashboardService.getStats(siteId)
);
```

### 4. Custom Logic on Site Change

If you need to perform custom logic when the site changes:

```typescript
import { watch } from 'vue';
import { useSiteStore } from '@/stores/site';

const siteStore = useSiteStore();

watch(
  () => siteStore.currentSiteId,
  (newSiteId, oldSiteId) => {
    if (newSiteId && newSiteId !== oldSiteId) {
      // Custom logic here
      resetForm();
      clearSelection();
      // etc.
    }
  }
);
```

### 5. Accessing Site Information

```typescript
import { useSiteStore } from '@/stores/site';

const siteStore = useSiteStore();

// Reactive references
const currentSite = computed(() => siteStore.currentSite);
const currentSiteId = computed(() => siteStore.currentSiteId);
const userRole = computed(() => siteStore.currentUserRole);
const canManage = computed(() => siteStore.canManageSite());
```

## Benefits

1. **Automatic Updates**: Data automatically reloads when site changes
2. **No Memory Leaks**: No need to manage event listeners
3. **Consistent Pattern**: Same pattern works for all data types
4. **Better TypeScript**: Full type safety with generics
5. **Loading States**: Built-in loading and error handling
6. **Testable**: Easier to test with mock stores

## Example: Complete View Migration

Here's a complete example of migrating a view:

```typescript
<template>
  <div>
    <h1>{{ t('items.title') }}</h1>
    
    <div v-if="loading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    
    <div v-else-if="error" class="alert alert-error">
      {{ t('common.errorLoading') }}
    </div>
    
    <div v-else>
      <ItemList :items="items || []" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSiteData } from '@/composables/useSiteData';
import { itemService } from '@/services/pocketbase';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

// This automatically handles site switching!
const { data: items, loading, error } = useSiteData(
  async (siteId) => await itemService.getBySite(siteId)
);
</script>
```

## Backward Compatibility

The `useSite` composable still dispatches the `site-changed` event for backward compatibility. This allows gradual migration of views.

## Testing

When testing components that use `useSiteData`:

```typescript
import { createTestingPinia } from '@pinia/testing';

const wrapper = mount(Component, {
  global: {
    plugins: [
      createTestingPinia({
        initialState: {
          site: {
            currentSiteId: 'test-site-id',
            currentSite: { id: 'test-site-id', name: 'Test Site' }
          }
        }
      })
    ]
  }
});
```