<template>
  <div class="space-y-6">
    <!-- Pending Requests Section -->
    <div v-if="pendingRequests.length > 0" class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
        <Bell class="h-5 w-5 text-red-500" />
        <span>{{ t('impersonation.pendingRequests') }}</span>
        <span class="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {{ pendingRequests.length }}
        </span>
      </h3>

      <div class="grid gap-4">
        <div
          v-for="request in pendingRequests"
          :key="request.id"
          class="bg-white dark:bg-gray-800 rounded-lg border-2 border-red-200 dark:border-red-800 p-4 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldAlert class="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ request.expand?.support_user?.name || 'Support Agent' }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('impersonation.wantsToAccess') }} {{ request.expand?.target_site?.name }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <span class="font-medium">{{ t('impersonation.reason') }}:</span> {{ request.reason }}
                </p>
                <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span class="flex items-center space-x-1">
                    <Clock class="h-3 w-3" />
                    <span>{{ request.session_duration_minutes }} {{ t('common.minutes') }}</span>
                  </span>
                  <span class="flex items-center space-x-1">
                    <Timer class="h-3 w-3" />
                    <span>{{ t('impersonation.expiresIn') }} {{ getTimeRemaining(request.expires_at) }}</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="flex space-x-2">
              <button
                @click="handleDeny(request.id!)"
                :disabled="isLoading"
                class="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                {{ t('impersonation.deny') }}
              </button>
              <button
                @click="handleApprove(request.id!)"
                :disabled="isLoading"
                class="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                {{ t('impersonation.approve') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Sessions Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <ShieldCheck class="h-5 w-5 text-orange-500" />
          <span>{{ t('impersonation.activeSessions') }}</span>
        </h3>
        <button
          @click="refreshData"
          :disabled="isRefreshing"
          class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isRefreshing }" />
        </button>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <Loader2 class="h-8 w-8 animate-spin text-primary-500" />
      </div>

      <div v-else-if="activeSessions.length === 0" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
        <ShieldOff class="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p class="text-gray-600 dark:text-gray-400">{{ t('impersonation.noActiveSessions') }}</p>
      </div>

      <div v-else class="grid gap-4">
        <div
          v-for="session in activeSessions"
          :key="session.id"
          class="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-4 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <User class="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ session.expand?.support_user?.name || 'Support Agent' }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('impersonation.accessingSite') }} {{ session.expand?.target_site?.name }}
                </p>
                <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span class="flex items-center space-x-1">
                    <Shield class="h-3 w-3" />
                    <span>{{ t('roles.' + session.effective_role) }}</span>
                  </span>
                  <span class="flex items-center space-x-1">
                    <Clock class="h-3 w-3" />
                    <span>{{ t('impersonation.started') }} {{ formatTime(session.started_at) }}</span>
                  </span>
                  <span class="flex items-center space-x-1" :class="{ 'text-red-500': getSecondsRemaining(session.expires_at) < 300 }">
                    <Timer class="h-3 w-3" />
                    <span>{{ t('impersonation.expiresIn') }} {{ getTimeRemaining(session.expires_at) }}</span>
                  </span>
                </div>
              </div>
            </div>
            <button
              @click="handleRevoke(session.id!)"
              :disabled="isLoading"
              class="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center space-x-1"
            >
              <Ban class="h-4 w-4" />
              <span>{{ t('impersonation.revoke') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Support Agent Section (if user is support) -->
    <div v-if="isSupportAgent" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <Headphones class="h-5 w-5 text-blue-500" />
          <span>{{ t('impersonation.supportTools') }}</span>
        </h3>
      </div>

      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserPlus class="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ t('impersonation.startImpersonation') }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ t('impersonation.startImpersonationDesc') }}
              </p>
            </div>
          </div>
          <button
            @click="emit('open-request-modal')"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {{ t('impersonation.newRequest') }}
          </button>
        </div>
      </div>

      <!-- My Active Sessions -->
      <div v-if="myActiveSessions.length > 0" class="space-y-3">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('impersonation.myActiveSessions') }}
        </h4>
        <div class="grid gap-3">
          <div
            v-for="session in myActiveSessions"
            :key="session.id"
            class="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-3 shadow-sm"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ session.expand?.target_site?.name || 'Site' }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ t('impersonation.expiresIn') }} {{ getTimeRemaining(session.expires_at) }}
                </p>
              </div>
              <button
                @click="handleEndMySession(session.id!)"
                class="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                {{ t('impersonation.endSession') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Bell,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Clock,
  Timer,
  User,
  Shield,
  Ban,
  RefreshCw,
  Loader2,
  Headphones,
  UserPlus
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useImpersonation } from '../composables/useImpersonation';
import type { ImpersonationSession } from '../services/pocketbase';

const emit = defineEmits<{
  (e: 'open-request-modal'): void;
}>();

const { t } = useI18n();
const {
  pendingRequests,
  activeSessions,
  isSupportAgent,
  isLoading,
  approveRequest,
  denyRequest,
  revokeSession,
  endCurrentSession,
  loadPendingRequests,
  loadActiveSessions
} = useImpersonation();

const isRefreshing = ref(false);

// Compute my active sessions (for support agents)
const myActiveSessions = computed<ImpersonationSession[]>(() => {
  // This would be filtered from the service
  return [];
});

// Methods
function getSecondsRemaining(expiresAt: string): number {
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((expires - now) / 1000));
}

function getTimeRemaining(expiresAt: string): string {
  const seconds = getSecondsRemaining(expiresAt);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function handleApprove(requestId: string): Promise<void> {
  try {
    await approveRequest(requestId);
  } catch (error) {
    console.error('Failed to approve:', error);
  }
}

async function handleDeny(requestId: string): Promise<void> {
  try {
    await denyRequest(requestId);
  } catch (error) {
    console.error('Failed to deny:', error);
  }
}

async function handleRevoke(sessionId: string): Promise<void> {
  try {
    await revokeSession(sessionId, 'Owner revoked session');
  } catch (error) {
    console.error('Failed to revoke:', error);
  }
}

async function handleEndMySession(sessionId: string): Promise<void> {
  try {
    await endCurrentSession('Support ended session');
  } catch (error) {
    console.error('Failed to end session:', error);
  }
}

async function refreshData(): Promise<void> {
  isRefreshing.value = true;
  try {
    await Promise.all([
      loadPendingRequests(),
      loadActiveSessions()
    ]);
  } finally {
    isRefreshing.value = false;
  }
}

onMounted(() => {
  refreshData();
});
</script>
