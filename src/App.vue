<template>
  <div id="app">
    <router-view v-if="!isAuthenticated" />
    <AppLayout v-else />
  </div>
</template>

<script setup lang="ts">
import { useAuth } from './composables/useAuth';
import AppLayout from './components/AppLayout.vue';

const { isAuthenticated } = useAuth();
</script>