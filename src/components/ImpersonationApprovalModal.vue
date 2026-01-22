<template>
  <Teleport to="body">
    <div
      v-if="request"
      class="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="'impersonation-title-' + request.id"
    >
      <!-- Backdrop with pulse animation for urgency -->
      <div
        class="fixed inset-0 bg-red-900/50 backdrop-blur-sm animate-pulse-slow"
        @click="handleBackdropClick"
      ></div>

      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div
          class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all border-2 border-red-500 dark:border-red-400"
        >
          <!-- Urgent Header -->
          <div class="bg-red-500 dark:bg-red-600 px-6 py-4">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <ShieldAlert class="h-8 w-8 text-white animate-bounce" />
              </div>
              <div>
                <h3
                  :id="'impersonation-title-' + request.id"
                  class="text-lg font-bold text-white"
                >
                  {{ t('impersonation.approvalRequired') }}
                </h3>
                <p class="text-red-100 text-sm">
                  {{ t('impersonation.actionRequired') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="px-6 py-4 space-y-4">
            <!-- Timer -->
            <div class="flex items-center justify-center">
              <div
                class="bg-red-100 dark:bg-red-900/30 rounded-full px-4 py-2 flex items-center space-x-2"
              >
                <Clock class="h-5 w-5 text-red-600 dark:text-red-400" />
                <span class="text-red-700 dark:text-red-300 font-mono font-bold text-lg">
                  {{ formatTimeRemaining(timeRemaining) }}
                </span>
              </div>
            </div>

            <!-- Request Details -->
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
              <div class="flex items-start space-x-3">
                <User class="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('impersonation.supportAgent') }}
                  </p>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ supportUserName }}
                  </p>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <Building class="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('impersonation.targetSite') }}
                  </p>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ siteName }}
                  </p>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <Clock class="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('impersonation.sessionDuration') }}
                  </p>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ request.session_duration_minutes }} {{ t('common.minutes') }}
                  </p>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <FileText class="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('impersonation.reason') }}
                  </p>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ request.reason }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Warning -->
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div class="flex items-start space-x-2">
                <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p class="text-sm text-yellow-700 dark:text-yellow-300">
                  {{ t('impersonation.approvalWarning') }}
                </p>
              </div>
            </div>

            <!-- Deny Reason (when denying) -->
            <div v-if="showDenyReason" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('impersonation.denyReason') }}
              </label>
              <textarea
                v-model="denyReason"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:ring-primary-500"
                rows="2"
                :placeholder="t('impersonation.denyReasonPlaceholder')"
              ></textarea>
            </div>
          </div>

          <!-- Actions -->
          <div class="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex space-x-3">
            <button
              v-if="!showDenyReason"
              @click="showDenyReason = true"
              :disabled="isLoading"
              class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 font-medium transition-colors"
            >
              <XCircle class="h-5 w-5 inline mr-2" />
              {{ t('impersonation.deny') }}
            </button>
            <button
              v-if="showDenyReason"
              @click="handleDeny"
              :disabled="isLoading"
              class="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <template v-if="isLoading">
                <Loader2 class="h-5 w-5 inline mr-2 animate-spin" />
                {{ t('common.processing') }}
              </template>
              <template v-else>
                {{ t('impersonation.confirmDeny') }}
              </template>
            </button>
            <button
              v-if="showDenyReason"
              @click="showDenyReason = false"
              :disabled="isLoading"
              class="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              v-if="!showDenyReason"
              @click="handleApprove"
              :disabled="isLoading"
              class="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <template v-if="isLoading">
                <Loader2 class="h-5 w-5 inline mr-2 animate-spin" />
                {{ t('common.processing') }}
              </template>
              <template v-else>
                <CheckCircle class="h-5 w-5 inline mr-2" />
                {{ t('impersonation.approve') }}
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  ShieldAlert,
  Clock,
  User,
  Building,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useImpersonation } from '../composables/useImpersonation';
import type { ImpersonationRequest } from '../services/pocketbase';

const props = defineProps<{
  request: ImpersonationRequest | null;
}>();

const emit = defineEmits<{
  (e: 'approved', requestId: string): void;
  (e: 'denied', requestId: string): void;
  (e: 'expired', requestId: string): void;
}>();

const { t } = useI18n();
const { approveRequest, denyRequest, isLoading } = useImpersonation();

const showDenyReason = ref(false);
const denyReason = ref('');
const timeRemaining = ref(0);
let timerInterval: ReturnType<typeof setInterval> | null = null;

// Computed properties
const supportUserName = computed(() => {
  return props.request?.expand?.support_user?.name || props.request?.support_user || 'Unknown';
});

const siteName = computed(() => {
  return props.request?.expand?.target_site?.name || props.request?.target_site || 'Unknown Site';
});

// Methods
function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTimeRemaining(): void {
  if (!props.request?.expires_at) {
    timeRemaining.value = 0;
    return;
  }

  const expiresAt = new Date(props.request.expires_at).getTime();
  const now = Date.now();
  const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
  timeRemaining.value = remaining;

  if (remaining <= 0 && props.request.id) {
    emit('expired', props.request.id);
  }
}

async function handleApprove(): Promise<void> {
  if (!props.request?.id) return;

  try {
    await approveRequest(props.request.id);
    emit('approved', props.request.id);
  } catch (error) {
    console.error('Failed to approve request:', error);
  }
}

async function handleDeny(): Promise<void> {
  if (!props.request?.id) return;

  try {
    await denyRequest(props.request.id, denyReason.value || undefined);
    emit('denied', props.request.id);
  } catch (error) {
    console.error('Failed to deny request:', error);
  }
}

function handleBackdropClick(): void {
  // Don't allow dismissing by clicking backdrop - this is a critical action
}

// Lifecycle
watch(() => props.request, (newRequest) => {
  if (newRequest) {
    updateTimeRemaining();
    showDenyReason.value = false;
    denyReason.value = '';
  }
}, { immediate: true });

onMounted(() => {
  timerInterval = setInterval(updateTimeRemaining, 1000);
});

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>

<style scoped>
@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}
</style>
