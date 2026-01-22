<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="impersonation-request-title"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        @click="handleClose"
      ></div>

      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div
          class="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl transition-all"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h3
                id="impersonation-request-title"
                class="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {{ t('impersonation.requestTitle') }}
              </h3>
              <button
                @click="handleClose"
                class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="px-6 py-4 space-y-4">
            <!-- Step 1: Search User -->
            <div v-if="step === 'search'" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('impersonation.searchUser') }}
                </label>
                <div class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    v-model="searchQuery"
                    @input="handleSearch"
                    type="text"
                    class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    :placeholder="t('impersonation.searchPlaceholder')"
                  />
                </div>
              </div>

              <!-- Search Results -->
              <div v-if="isSearching" class="flex items-center justify-center py-8">
                <Loader2 class="h-6 w-6 animate-spin text-primary-500" />
              </div>

              <div
                v-else-if="searchResults.length > 0"
                class="max-h-64 overflow-y-auto space-y-2"
              >
                <button
                  v-for="user in searchResults"
                  :key="user.id"
                  @click="selectUser(user)"
                  class="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div class="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span class="text-primary-600 dark:text-primary-400 font-medium">
                      {{ user.name?.charAt(0) || user.email?.charAt(0) || '?' }}
                    </span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 dark:text-white truncate">
                      {{ user.name || 'Unknown' }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {{ user.email }}
                    </p>
                  </div>
                  <ChevronRight class="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div
                v-else-if="searchQuery.length >= 2"
                class="text-center py-8 text-gray-500 dark:text-gray-400"
              >
                {{ t('impersonation.noUsersFound') }}
              </div>
            </div>

            <!-- Step 2: Select Site -->
            <div v-if="step === 'site'" class="space-y-4">
              <button
                @click="step = 'search'"
                class="flex items-center text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                <ArrowLeft class="h-4 w-4 mr-1" />
                {{ t('common.back') }}
              </button>

              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div class="flex items-center space-x-3">
                  <div class="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span class="text-primary-600 dark:text-primary-400 font-medium">
                      {{ selectedUser?.name?.charAt(0) || '?' }}
                    </span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ selectedUser?.name }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ selectedUser?.email }}</p>
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {{ t('impersonation.selectSite') }}
                </label>

                <div v-if="isLoadingSites" class="flex items-center justify-center py-8">
                  <Loader2 class="h-6 w-6 animate-spin text-primary-500" />
                </div>

                <div v-else-if="userSites.length > 0" class="space-y-2">
                  <button
                    v-for="siteEntry in userSites"
                    :key="siteEntry.site?.id"
                    @click="selectSite(siteEntry)"
                    class="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                    :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-900/20': selectedSite?.id === siteEntry.site?.id }"
                  >
                    <div class="flex items-center space-x-3">
                      <Building class="h-5 w-5 text-gray-400" />
                      <div class="text-left">
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ siteEntry.site?.name }}
                        </p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          {{ t('roles.' + siteEntry.role) }}
                        </p>
                      </div>
                    </div>
                    <div v-if="selectedSite?.id === siteEntry.site?.id">
                      <CheckCircle class="h-5 w-5 text-primary-500" />
                    </div>
                  </button>
                </div>

                <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
                  {{ t('impersonation.noSitesFound') }}
                </div>
              </div>
            </div>

            <!-- Step 3: Request Details -->
            <div v-if="step === 'details'" class="space-y-4">
              <button
                @click="step = 'site'"
                class="flex items-center text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                <ArrowLeft class="h-4 w-4 mr-1" />
                {{ t('common.back') }}
              </button>

              <!-- Summary -->
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('impersonation.user') }}</span>
                  <span class="font-medium text-gray-900 dark:text-white">{{ selectedUser?.name }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('impersonation.site') }}</span>
                  <span class="font-medium text-gray-900 dark:text-white">{{ selectedSite?.name }}</span>
                </div>
              </div>

              <!-- Reason -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('impersonation.reason') }} <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="reason"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  rows="3"
                  :placeholder="t('impersonation.reasonPlaceholder')"
                  required
                ></textarea>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('impersonation.reasonHint') }}
                </p>
              </div>

              <!-- Duration -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('impersonation.duration') }}
                </label>
                <select
                  v-model="duration"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option :value="15">15 {{ t('common.minutes') }}</option>
                  <option :value="30">30 {{ t('common.minutes') }}</option>
                  <option :value="45">45 {{ t('common.minutes') }}</option>
                  <option :value="60">60 {{ t('common.minutes') }}</option>
                </select>
              </div>

              <!-- Warning -->
              <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div class="flex items-start space-x-2">
                  <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <p class="text-sm text-yellow-700 dark:text-yellow-300">
                    {{ t('impersonation.requestWarning') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Waiting for Approval -->
            <div v-if="step === 'waiting'" class="text-center py-8 space-y-4">
              <div class="flex justify-center">
                <div class="h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Loader2 class="h-8 w-8 animate-spin text-primary-500" />
                </div>
              </div>
              <div>
                <h4 class="text-lg font-medium text-gray-900 dark:text-white">
                  {{ t('impersonation.waitingForApproval') }}
                </h4>
                <p class="text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('impersonation.waitingMessage') }}
                </p>
              </div>
              <div class="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock class="h-4 w-4" />
                <span>{{ t('impersonation.expiresIn') }} {{ formatTimeRemaining(waitingTimeRemaining) }}</span>
              </div>
            </div>

            <!-- Request Result -->
            <div v-if="step === 'result'" class="text-center py-8 space-y-4">
              <div v-if="requestResult === 'approved'" class="space-y-4">
                <div class="flex justify-center">
                  <div class="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle class="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div>
                  <h4 class="text-lg font-medium text-green-600 dark:text-green-400">
                    {{ t('impersonation.requestApproved') }}
                  </h4>
                  <p class="text-gray-500 dark:text-gray-400 mt-1">
                    {{ t('impersonation.sessionStarting') }}
                  </p>
                </div>
              </div>

              <div v-else-if="requestResult === 'denied'" class="space-y-4">
                <div class="flex justify-center">
                  <div class="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle class="h-8 w-8 text-red-500" />
                  </div>
                </div>
                <div>
                  <h4 class="text-lg font-medium text-red-600 dark:text-red-400">
                    {{ t('impersonation.requestDenied') }}
                  </h4>
                  <p v-if="deniedReason" class="text-gray-500 dark:text-gray-400 mt-1">
                    {{ deniedReason }}
                  </p>
                </div>
              </div>

              <div v-else-if="requestResult === 'expired'" class="space-y-4">
                <div class="flex justify-center">
                  <div class="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Clock class="h-8 w-8 text-yellow-500" />
                  </div>
                </div>
                <div>
                  <h4 class="text-lg font-medium text-yellow-600 dark:text-yellow-400">
                    {{ t('impersonation.requestExpired') }}
                  </h4>
                  <p class="text-gray-500 dark:text-gray-400 mt-1">
                    {{ t('impersonation.requestExpiredMessage') }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            v-if="step === 'details'"
            class="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700"
          >
            <div class="flex space-x-3">
              <button
                @click="handleClose"
                class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 font-medium"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                @click="submitRequest"
                :disabled="!reason.trim() || isSubmitting"
                class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <template v-if="isSubmitting">
                  <Loader2 class="h-4 w-4 inline mr-2 animate-spin" />
                  {{ t('common.submitting') }}
                </template>
                <template v-else>
                  {{ t('impersonation.sendRequest') }}
                </template>
              </button>
            </div>
          </div>

          <div
            v-if="step === 'result'"
            class="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700"
          >
            <button
              @click="handleClose"
              class="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
            >
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import {
  X,
  Search,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useImpersonation } from '../composables/useImpersonation';
import type { User, Site } from '../services/pocketbase';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'session-started', sessionId: string): void;
}>();

const { t } = useI18n();
const { requestImpersonation, searchUsers, getUserSites } = useImpersonation();

// State
type Step = 'search' | 'site' | 'details' | 'waiting' | 'result';
const step = ref<Step>('search');
const searchQuery = ref('');
const searchResults = ref<User[]>([]);
const isSearching = ref(false);
const selectedUser = ref<User | null>(null);
const userSites = ref<{ site: Site; role: string }[]>([]);
const isLoadingSites = ref(false);
const selectedSite = ref<Site | null>(null);
const selectedRole = ref<string>('');
const reason = ref('');
const duration = ref(30);
const isSubmitting = ref(false);
const requestResult = ref<'approved' | 'denied' | 'expired' | null>(null);
const deniedReason = ref('');
const currentRequestId = ref<string | null>(null);
const waitingTimeRemaining = ref(300); // 5 minutes default

let searchTimeout: ReturnType<typeof setTimeout> | null = null;
let waitingInterval: ReturnType<typeof setInterval> | null = null;
let unsubscribe: (() => void) | null = null;

// Methods
function handleClose(): void {
  resetState();
  emit('close');
}

function resetState(): void {
  step.value = 'search';
  searchQuery.value = '';
  searchResults.value = [];
  selectedUser.value = null;
  userSites.value = [];
  selectedSite.value = null;
  selectedRole.value = '';
  reason.value = '';
  duration.value = 30;
  requestResult.value = null;
  deniedReason.value = '';
  currentRequestId.value = null;

  if (waitingInterval) {
    clearInterval(waitingInterval);
    waitingInterval = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

async function handleSearch(): Promise<void> {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }

  searchTimeout = setTimeout(async () => {
    isSearching.value = true;
    try {
      searchResults.value = await searchUsers(searchQuery.value);
    } catch (error) {
      console.error('Search failed:', error);
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }, 300);
}

async function selectUser(user: User): Promise<void> {
  selectedUser.value = user;
  step.value = 'site';
  isLoadingSites.value = true;

  try {
    userSites.value = await getUserSites(user.id);
  } catch (error) {
    console.error('Failed to load sites:', error);
    userSites.value = [];
  } finally {
    isLoadingSites.value = false;
  }
}

function selectSite(siteEntry: { site: Site; role: string }): void {
  selectedSite.value = siteEntry.site;
  selectedRole.value = siteEntry.role;
  step.value = 'details';
}

async function submitRequest(): Promise<void> {
  if (!selectedUser.value || !selectedSite.value || !reason.value.trim()) {
    return;
  }

  isSubmitting.value = true;

  try {
    const result = await requestImpersonation(
      selectedUser.value.id,
      selectedSite.value.id!,
      reason.value.trim(),
      duration.value
    );

    currentRequestId.value = result.requestId;
    const expiresAt = new Date(result.expiresAt);
    waitingTimeRemaining.value = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    step.value = 'waiting';

    // Start countdown
    waitingInterval = setInterval(() => {
      waitingTimeRemaining.value--;
      if (waitingTimeRemaining.value <= 0) {
        if (waitingInterval) clearInterval(waitingInterval);
        requestResult.value = 'expired';
        step.value = 'result';
      }
    }, 1000);

    // Subscribe to WebSocket events for this request
    const { impersonationService } = await import('../services/impersonationService');
    unsubscribe = impersonationService.subscribe((event) => {
      if (event.type === 'impersonation_approved' && event.data?.requestId === currentRequestId.value) {
        if (waitingInterval) clearInterval(waitingInterval);
        requestResult.value = 'approved';
        step.value = 'result';
        if (event.data.sessionId) {
          emit('session-started', event.data.sessionId);
        }
      } else if (event.type === 'impersonation_denied' && event.data?.requestId === currentRequestId.value) {
        if (waitingInterval) clearInterval(waitingInterval);
        requestResult.value = 'denied';
        deniedReason.value = event.data.reason || '';
        step.value = 'result';
      }
    });
  } catch (error) {
    console.error('Failed to submit request:', error);
  } finally {
    isSubmitting.value = false;
  }
}

function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Cleanup
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    resetState();
  }
});

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout);
  if (waitingInterval) clearInterval(waitingInterval);
  if (unsubscribe) unsubscribe();
});
</script>
