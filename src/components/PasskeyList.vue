<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePasskey, type PasskeyCredential } from '../composables/usePasskey';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();
const {
  passkeys,
  isLoading,
  error,
  canUsePasskeys,
  registerPasskey,
  removePasskey,
  renamePasskey,
  clearError,
} = usePasskey();

// Local state
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const showRenameModal = ref(false);
const selectedPasskey = ref<PasskeyCredential | null>(null);
const newDeviceName = ref('');
const renameValue = ref('');
const deviceNameError = ref('');

// Device name validation constants
const MAX_DEVICE_NAME_LENGTH = 100;
const DEVICE_NAME_PATTERN = /^[a-zA-Z0-9\s\-_().,'\u0900-\u097F]*$/;

/**
 * Validate device name for XSS prevention
 */
function validateDeviceName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { valid: true }; // Empty is allowed - server will default to 'Unknown Device'
  }

  const trimmed = name.trim();

  if (trimmed.length > MAX_DEVICE_NAME_LENGTH) {
    return { valid: false, error: t('passkey.errorNameTooLong') };
  }

  if (!DEVICE_NAME_PATTERN.test(trimmed)) {
    return { valid: false, error: t('passkey.errorInvalidCharacters') };
  }

  // HTML injection check
  if (/<[^>]*>/.test(trimmed)) {
    return { valid: false, error: t('passkey.errorNoHtml') };
  }

  // Script injection check
  if (/javascript:|on\w+\s*=/i.test(trimmed)) {
    return { valid: false, error: t('passkey.errorInvalidContent') };
  }

  return { valid: true };
}

// Computed
const sortedPasskeys = computed(() => {
  return [...passkeys.value].sort((a, b) => {
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });
});

// Methods
async function handleAddPasskey() {
  clearError();
  deviceNameError.value = '';

  // Validate device name
  const validation = validateDeviceName(newDeviceName.value);
  if (!validation.valid) {
    deviceNameError.value = validation.error || '';
    return;
  }

  const result = await registerPasskey(newDeviceName.value || undefined);
  if (result) {
    showAddModal.value = false;
    newDeviceName.value = '';
    deviceNameError.value = '';
  }
}

function handleDeviceNameInput(value: string) {
  deviceNameError.value = '';
  if (value.length > MAX_DEVICE_NAME_LENGTH) {
    deviceNameError.value = t('passkey.errorNameTooLong');
  }
}

function openAddModal() {
  newDeviceName.value = '';
  deviceNameError.value = '';
  showAddModal.value = true;
}

function closeAddModal() {
  showAddModal.value = false;
  newDeviceName.value = '';
  deviceNameError.value = '';
}

function openDeleteModal(passkey: PasskeyCredential) {
  selectedPasskey.value = passkey;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (selectedPasskey.value) {
    const success = await removePasskey(selectedPasskey.value.id);
    if (success) {
      showDeleteModal.value = false;
      selectedPasskey.value = null;
    }
  }
}

function openRenameModal(passkey: PasskeyCredential) {
  selectedPasskey.value = passkey;
  renameValue.value = passkey.deviceName;
  deviceNameError.value = '';
  showRenameModal.value = true;
}

function closeRenameModal() {
  showRenameModal.value = false;
  selectedPasskey.value = null;
  renameValue.value = '';
  deviceNameError.value = '';
}

async function confirmRename() {
  if (!selectedPasskey.value || !renameValue.value.trim()) {
    return;
  }

  deviceNameError.value = '';

  // Validate device name
  const validation = validateDeviceName(renameValue.value);
  if (!validation.valid) {
    deviceNameError.value = validation.error || '';
    return;
  }

  const success = await renamePasskey(selectedPasskey.value.id, renameValue.value.trim());
  if (success) {
    showRenameModal.value = false;
    selectedPasskey.value = null;
    renameValue.value = '';
    deviceNameError.value = '';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return t('passkey.today');
  } else if (diffDays === 1) {
    return t('passkey.yesterday');
  } else if (diffDays < 7) {
    return `${diffDays} ${t('passkey.daysAgo')}`;
  } else {
    return formatDate(dateString);
  }
}

function getDeviceIcon(deviceType: string, deviceName: string): string {
  const name = deviceName.toLowerCase();
  if (name.includes('iphone')) return '📱';
  if (name.includes('ipad')) return '📱';
  if (name.includes('android')) return '📱';
  if (name.includes('mac')) return '💻';
  if (name.includes('windows')) return '🖥️';
  if (name.includes('linux')) return '🐧';
  return deviceType === 'platform' ? '🔐' : '🔑';
}
</script>

<template>
  <div class="passkey-list">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          {{ t('passkey.title') }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('passkey.description') }}
        </p>
      </div>
      <button
        v-if="canUsePasskeys"
        @click="openAddModal"
        :disabled="isLoading"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {{ t('passkey.addPasskey') }}
      </button>
    </div>

    <!-- Not supported message -->
    <div
      v-if="!canUsePasskeys"
      class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4"
    >
      <div class="flex">
        <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div class="ml-3">
          <p class="text-sm text-yellow-700 dark:text-yellow-200">
            {{ t('passkey.notSupported') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div
      v-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4"
    >
      <div class="flex">
        <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="ml-3">
          <p class="text-sm text-red-700 dark:text-red-200">{{ error }}</p>
        </div>
        <button @click="clearError" class="ml-auto text-red-400 hover:text-red-500">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Passkey list -->
    <div v-if="sortedPasskeys.length > 0" class="space-y-3">
      <div
        v-for="passkey in sortedPasskeys"
        :key="passkey.id"
        class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
      >
        <div class="flex items-center space-x-4">
          <span class="text-2xl">{{ getDeviceIcon(passkey.deviceType, passkey.deviceName) }}</span>
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-medium text-gray-900 dark:text-white">
                {{ passkey.deviceName }}
              </span>
              <span
                v-if="passkey.backedUp"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              >
                {{ t('passkey.synced') }}
              </span>
              <span
                v-if="passkey.flagged"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              >
                {{ t('passkey.flagged') }}
              </span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('passkey.lastUsed') }}: {{ formatRelativeTime(passkey.lastUsed) }}
              &middot;
              {{ t('passkey.created') }}: {{ formatDate(passkey.createdAt) }}
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="openRenameModal(passkey)"
            class="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            :title="t('passkey.rename')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            @click="openDeleteModal(passkey)"
            class="p-2 text-red-400 hover:text-red-500"
            :title="t('passkey.delete')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="canUsePasskeys"
      class="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700"
    >
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
        {{ t('passkey.noPasskeys') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ t('passkey.noPasskeysDescription') }}
      </p>
      <button
        @click="openAddModal"
        class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
      >
        {{ t('passkey.addFirstPasskey') }}
      </button>
    </div>

    <!-- Add Passkey Modal -->
    <Teleport to="body">
      <div
        v-if="showAddModal"
        class="fixed inset-0 z-50 overflow-y-auto"
        @keydown.escape="closeAddModal"
      >
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50" @click="closeAddModal"></div>
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {{ t('passkey.addPasskeyTitle') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {{ t('passkey.addPasskeyDescription') }}
            </p>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ t('passkey.deviceNameLabel') }}
              </label>
              <input
                v-model="newDeviceName"
                type="text"
                :maxlength="MAX_DEVICE_NAME_LENGTH"
                :placeholder="t('passkey.deviceNamePlaceholder')"
                @input="handleDeviceNameInput(newDeviceName)"
                class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                :class="deviceNameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'"
              />
              <p v-if="deviceNameError" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ deviceNameError }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ newDeviceName.length }}/{{ MAX_DEVICE_NAME_LENGTH }}
              </p>
            </div>
            <div class="flex justify-end space-x-3">
              <button
                @click="closeAddModal"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                @click="handleAddPasskey"
                :disabled="isLoading || !!deviceNameError"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                <span v-if="isLoading">{{ t('common.loading') }}</span>
                <span v-else>{{ t('passkey.continue') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 overflow-y-auto"
        @keydown.escape="showDeleteModal = false"
      >
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50" @click="showDeleteModal = false"></div>
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {{ t('passkey.deleteTitle') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {{ t('passkey.deleteConfirmation', { name: selectedPasskey?.deviceName }) }}
            </p>
            <div class="flex justify-end space-x-3">
              <button
                @click="showDeleteModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                @click="confirmDelete"
                :disabled="isLoading"
                class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {{ t('passkey.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Rename Modal -->
    <Teleport to="body">
      <div
        v-if="showRenameModal"
        class="fixed inset-0 z-50 overflow-y-auto"
        @keydown.escape="closeRenameModal"
      >
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50" @click="closeRenameModal"></div>
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {{ t('passkey.renameTitle') }}
            </h3>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ t('passkey.deviceNameLabel') }}
              </label>
              <input
                v-model="renameValue"
                type="text"
                :maxlength="MAX_DEVICE_NAME_LENGTH"
                class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                :class="deviceNameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'"
                @input="handleDeviceNameInput(renameValue)"
                @keydown.enter="confirmRename"
              />
              <p v-if="deviceNameError" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ deviceNameError }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ renameValue.length }}/{{ MAX_DEVICE_NAME_LENGTH }}
              </p>
            </div>
            <div class="flex justify-end space-x-3">
              <button
                @click="closeRenameModal"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                @click="confirmRename"
                :disabled="isLoading || !renameValue.trim() || !!deviceNameError"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {{ t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
