<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { usePasskey } from '../composables/usePasskey';
import { useI18n } from '../composables/useI18n';

const props = defineProps<{
  email?: string;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'error', message: string): void;
}>();

const { t } = useI18n();
const {
  isSupported,
  isPlatformAvailable,
  isConditionalAvailable,
  isLoading,
  error,
  authenticateWithPasskey,
  setupConditionalUI,
  checkSupport,
} = usePasskey({ checkOnMount: false });

const showButton = ref(false);

// AbortController for cancelling conditional UI on unmount
let abortController: AbortController | null = null;

onMounted(async () => {
  await checkSupport();
  showButton.value = isSupported.value && isPlatformAvailable.value;

  // Setup conditional UI if available (passkey autofill)
  if (isConditionalAvailable.value) {
    abortController = new AbortController();
    setupConditionalUI(abortController.signal).then(() => {
      // If user selected a passkey from autofill, emit success
      emit('success');
    }).catch(() => {
      // User didn't select a passkey, that's fine
    });
  }
});

onUnmounted(() => {
  // Cancel conditional UI when component unmounts (e.g., after login)
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
});

async function handlePasskeyLogin() {
  const success = await authenticateWithPasskey(props.email);
  if (success) {
    emit('success');
  } else if (error.value) {
    emit('error', error.value);
  }
}
</script>

<template>
  <button
    v-if="showButton"
    @click="handlePasskeyLogin"
    :disabled="isLoading"
    type="button"
    class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    <!-- Fingerprint/Face ID Icon -->
    <svg
      class="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 10v4" />
      <path d="M10 12h4" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7h.01" />
      <path d="M17 7h.01" />
      <path d="M7 17h.01" />
      <path d="M17 17h.01" />
    </svg>

    <span v-if="isLoading">{{ t('passkey.authenticating') }}</span>
    <span v-else>{{ t('passkey.signInWithPasskey') }}</span>

    <!-- Loading spinner -->
    <svg
      v-if="isLoading"
      class="animate-spin h-5 w-5 ml-2"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </button>
</template>
