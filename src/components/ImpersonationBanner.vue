<template>
  <div
    v-if="isImpersonating && currentSession"
    class="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white shadow-lg"
  >
    <div class="max-w-7xl mx-auto px-4 py-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <!-- Warning Icon -->
          <div class="flex-shrink-0">
            <ShieldAlert class="h-6 w-6 animate-pulse" />
          </div>

          <!-- Status Text -->
          <div class="flex items-center space-x-2 text-sm font-medium">
            <span>{{ t('impersonation.activeSession') }}</span>
            <span class="opacity-75">|</span>
            <span class="flex items-center space-x-1">
              <User class="h-4 w-4" />
              <span>{{ targetUserName }}</span>
            </span>
            <span class="opacity-75">|</span>
            <span class="flex items-center space-x-1">
              <Building class="h-4 w-4" />
              <span>{{ siteName }}</span>
            </span>
            <span class="opacity-75">|</span>
            <span class="flex items-center space-x-1">
              <Shield class="h-4 w-4" />
              <span>{{ t('roles.' + currentSession.effective_role) }}</span>
            </span>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <!-- Timer -->
          <div class="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
            <Clock class="h-4 w-4" />
            <span class="font-mono font-bold" :class="{ 'text-yellow-200': sessionTimeRemaining < 300 }">
              {{ formatTimeRemaining(sessionTimeRemaining) }}
            </span>
          </div>

          <!-- End Session Button -->
          <button
            @click="handleEndSession"
            :disabled="isLoading"
            class="flex items-center space-x-2 bg-white/20 hover:bg-white/30 rounded-full px-4 py-1 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <template v-if="isLoading">
              <Loader2 class="h-4 w-4 animate-spin" />
              <span>{{ t('common.ending') }}</span>
            </template>
            <template v-else>
              <LogOut class="h-4 w-4" />
              <span>{{ t('impersonation.endSession') }}</span>
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ShieldAlert, User, Building, Shield, Clock, LogOut, Loader2 } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useImpersonation } from '../composables/useImpersonation';

const { t } = useI18n();
const { isImpersonating, currentSession, sessionTimeRemaining, endCurrentSession, isLoading } = useImpersonation();

// Computed
const targetUserName = computed(() => {
  return currentSession.value?.expand?.target_user?.name || 'User';
});

const siteName = computed(() => {
  return currentSession.value?.expand?.target_site?.name || 'Site';
});

// Methods
function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function handleEndSession(): Promise<void> {
  await endCurrentSession('Support ended session');
}
</script>
