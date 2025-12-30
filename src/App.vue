<template>
  <div id="app">
    <router-view v-if="!isAuthenticated" />
    <SiteSelectionView v-else-if="isAuthenticated && isReadyForRouting && !hasSiteAccess" />
    <AppLayout v-else-if="isAuthenticated && isReadyForRouting && hasSiteAccess" />
    <!-- Loading skeleton during site initialization -->
    <div v-else-if="isAuthenticated && !isReadyForRouting" class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="animate-pulse">
        <!-- Header skeleton -->
        <div class="bg-white dark:bg-gray-800 shadow border-b border-gray-200 dark:border-gray-700">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-6">
              <div class="flex items-center space-x-4">
                <div class="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div class="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <div class="flex items-center space-x-4">
                <div class="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div class="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div class="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Content skeleton -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="space-y-6">
            <div class="h-8 w-48 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="h-32 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
              <div class="h-32 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
              <div class="h-32 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
            </div>
            <div class="h-64 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
    <ToastContainer />
    <!-- PWA prompts shown for all users -->
    <PWAPrompt />
    <PWAUpdateNotification />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useAuth } from './composables/useAuth';
import { useSite } from './composables/useSite';
import { useSiteStore } from './stores/site';
import { usePlatform } from './composables/usePlatform';
import { useNativeNotifications } from './composables/useNativeNotifications';
import AppLayout from './components/AppLayout.vue';
import SiteSelectionView from './views/SiteSelectionView.vue';
import ToastContainer from './components/ToastContainer.vue';
import PWAUpdateNotification from './components/PWAUpdateNotification.vue';
import PWAPrompt from './components/PWAPrompt.vue';

// PWA Debug utility (development only)
if (import.meta.env.DEV) {
  import('./utils/pwaTest');
}

const { isAuthenticated } = useAuth();
const { hasSiteAccess, isReadyForRouting, loadUserSites } = useSite();
const { platformInfo } = usePlatform();
const { requestPermission } = useNativeNotifications();

// Import PWA testing utilities in development
if (import.meta.env.DEV) {
  import('./utils/pwa-test');
}

// Watch for authentication changes to handle login/logout
watch(() => isAuthenticated.value, async (newValue, oldValue) => {
  // Handle login
  if (newValue && !oldValue) {
    await loadUserSites();
    
    // Request notification permission if supported
    if (platformInfo.value.isTauri || 'Notification' in window) {
      await requestPermission();
    }
  } 
  // Handle logout - clear site data to prevent race conditions  
  else if (!newValue && oldValue) {
    const siteStore = useSiteStore();
    await siteStore.clearCurrentSite();
    siteStore.$patch({ 
      userSites: [],
      isLoading: false
      // Keep isInitialized: true to avoid showing loading skeleton on logout
    });
  }
});

onMounted(async () => {
  // Only load if authenticated and not already initialized
  if (isAuthenticated.value && !isReadyForRouting.value) {
    await loadUserSites();
    
    // Request notification permission if supported
    if (platformInfo.value.isTauri || 'Notification' in window) {
      await requestPermission();
    }
  }
});
</script>