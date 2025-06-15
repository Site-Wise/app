<template>
  <div id="app">
    <router-view v-if="!isAuthenticated" />
    <SiteSelectionView v-else-if="isAuthenticated && !hasSiteAccess" />
    <AppLayout v-else />
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuth } from './composables/useAuth';
import { useSite } from './composables/useSite';
import AppLayout from './components/AppLayout.vue';
import SiteSelectionView from './views/SiteSelectionView.vue';
import ToastContainer from './components/ToastContainer.vue';

const { isAuthenticated } = useAuth();
const { hasSiteAccess, loadUserSites } = useSite();

onMounted(async () => {
  if (isAuthenticated.value) {
    await loadUserSites();
  }
});
</script>