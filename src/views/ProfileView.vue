<template>
  <div class="max-w-4xl mx-auto">
    <div class="bg-white dark:bg-ink-3 border border-stone-200 dark:border-ink-4 shadow-card rounded-2xl">
      <div class="px-4 py-5 sm:p-6">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-display font-bold text-ink dark:text-cream">{{ t('nav.profile') }}</h1>
        </div>

        <div v-if="error" class="mb-6 rounded-md bg-error-50 dark:bg-error-900/30 p-4">
          <div class="flex">
            <AlertCircle class="h-5 w-5 text-error-600 dark:text-error-300" />
            <div class="ml-3">
              <h3 class="text-sm font-medium text-error-800 dark:text-error-300">
                {{ error }}
              </h3>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <!-- Profile Picture Section -->
          <div class="sm:col-span-2">
            <div class="flex items-center space-x-6">
              <div class="h-20 w-20 rounded-full bg-amber-500 flex items-center justify-center">
                <span class="text-2xl font-display font-semibold text-ink">{{ userInitials }}</span>
              </div>
              <div>
                <h3 class="text-lg font-display font-medium text-ink dark:text-cream">{{ user?.name }}</h3>
                <p class="text-sm text-stone-600 dark:text-stone-400">{{ user?.email }}</p>
                <p v-if="user?.phone" class="text-sm font-mono text-stone-600 dark:text-stone-400">{{ user.phone }}</p>
              </div>
            </div>
          </div>

          <!-- Edit Form -->
          <div class="sm:col-span-2">
            <form @submit.prevent="handleUpdateProfile" class="space-y-6">
              <div>
                <label for="name" class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  {{ t('auth.fullName') }}
                </label>
                <div class="mt-1">
                  <input
                    id="name"
                    v-model="profileForm.name"
                    name="name"
                    type="text"
                    required
                    :disabled="loading"
                    class="input"
                    :placeholder="t('forms.enterFullName')"
                  />
                </div>
              </div>

              <div>
                <label for="email" class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  {{ t('auth.email') }}
                </label>
                <div class="mt-1">
                  <input
                    id="email"
                    v-model="profileForm.email"
                    name="email"
                    type="email"
                    required
                    :disabled="loading"
                    class="input"
                    :placeholder="t('forms.enterEmail')"
                  />
                </div>
              </div>

              <div>
                <label for="phone" class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  {{ t('auth.phoneNumber') }}
                </label>
                <div class="mt-1 flex">
                  <select
                    id="country-code"
                    v-model="profileForm.countryCode"
                    disabled
                    class="input rounded-r-none w-20 bg-stone-100 dark:bg-ink-2 cursor-not-allowed"
                  >
                    <option value="+91">+91</option>
                  </select>
                  <input
                    id="phone"
                    v-model="profileForm.phone"
                    name="phone"
                    type="tel"
                    :disabled="loading"
                    class="input rounded-l-none flex-1"
                    :placeholder="t('forms.enterPhoneNumber')"
                  />
                </div>
              </div>

              <!-- Password Change Section -->
              <div class="border-t border-stone-200 dark:border-ink-4 pt-6">
                <h3 class="text-lg font-display font-medium text-ink dark:text-cream mb-4">{{ t('auth.changePassword') }}</h3>
                
                <div class="space-y-4">
                  <div>
                    <label for="current-password" class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                      {{ t('auth.currentPassword') }}
                    </label>
                    <div class="mt-1">
                      <input
                        id="current-password"
                        v-model="profileForm.currentPassword"
                        name="current-password"
                        type="password"
                        :disabled="loading"
                        class="input"
                        :placeholder="t('forms.enterCurrentPassword')"
                      />
                    </div>
                  </div>

                  <div>
                    <label for="new-password" class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                      {{ t('auth.newPassword') }}
                    </label>
                    <div class="mt-1">
                      <input
                        id="new-password"
                        v-model="profileForm.newPassword"
                        name="new-password"
                        type="password"
                        :disabled="loading"
                        class="input"
                        :placeholder="t('forms.enterNewPassword')"
                      />
                    </div>
                  </div>

                  <div>
                    <label for="confirm-password" class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                      {{ t('auth.confirmPassword') }}
                    </label>
                    <div class="mt-1">
                      <input
                        id="confirm-password"
                        v-model="profileForm.confirmPassword"
                        name="confirm-password"
                        type="password"
                        :disabled="loading"
                        class="input"
                        :placeholder="t('forms.confirmNewPassword')"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  @click="resetForm"
                  class="btn-outline"
                  :disabled="loading"
                >
                  {{ t('common.reset') }}
                </button>
                <button
                  type="submit"
                  :disabled="loading"
                  class="btn-primary"
                >
                  <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                  {{ t('common.save') }}
                </button>
              </div>
            </form>
          </div>

          <!-- Security: biometric quick unlock -->
          <div v-if="biometricSupported" class="sm:col-span-2">
            <div class="border-t border-stone-200 dark:border-ink-4 pt-6">
              <h3 class="text-lg font-display font-medium text-ink dark:text-cream mb-4">
                {{ t('biometric.settingsTitle') }}
              </h3>
              <div class="flex items-center justify-between gap-4 rounded-xl bg-cream-2 dark:bg-ink-2 border border-stone-200 dark:border-ink-4 p-4">
                <div class="flex items-start gap-3 min-w-0">
                  <span class="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
                    <component :is="biometricIcon" class="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-stone-800 dark:text-stone-200">
                      {{ t('biometric.settingsLabel', { method: biometricMethodLabel }) }}
                    </p>
                    <p class="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      {{ t('biometric.settingsDescription', { method: biometricMethodLabel }) }}
                    </p>
                    <p v-if="isBiometricEnabled" class="text-xs font-medium text-forest-600 dark:text-forest-400 mt-1 flex items-center gap-1">
                      <Check class="h-3.5 w-3.5" /> {{ t('biometric.settingsEnabledOn') }}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  :model-value="isBiometricEnabled"
                  :disabled="biometricBusy"
                  size="lg"
                  :aria-label="t('biometric.settingsTitle')"
                  @update:model-value="onToggleBiometric"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useI18n } from '../composables/useI18n';
import { useBiometricAuth } from '../composables/useBiometricAuth';
import { pb } from '../services/pocketbase';
import { AlertCircle, Loader2, Check, Fingerprint, ScanFace } from 'lucide-vue-next';
import ToggleSwitch from '../components/ToggleSwitch.vue';

const { user, refreshAuth } = useAuth();
const { t } = useI18n();

// Biometric quick-unlock controls.
const {
  isSupported: biometricSupported,
  isEnabled: isBiometricEnabled,
  isBusy: biometricBusy,
  method: biometricMethod,
  methodLabel: biometricMethodLabel,
  ensureChecked: ensureBiometricChecked,
  enable: enableBiometric,
  disable: disableBiometric,
} = useBiometricAuth();

const biometricIcon = computed(() => (biometricMethod.value === 'face' ? ScanFace : Fingerprint));

const onToggleBiometric = async (value: boolean) => {
  if (value) {
    await enableBiometric();
  } else {
    disableBiometric();
  }
};

const loading = ref(false);
const error = ref('');

const profileForm = reactive({
  name: '',
  email: '',
  phone: '',
  countryCode: '+91',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const userInitials = computed(() => {
  if (!user.value?.name) return 'U';
  return user.value.name
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

const resetForm = () => {
  if (user.value) {
    profileForm.name = user.value.name;
    profileForm.email = user.value.email;
    // Parse phone number to separate country code and number
    if (user.value.phone) {
      if (user.value.phone.startsWith('+91')) {
        profileForm.phone = user.value.phone.substring(3);
        profileForm.countryCode = '+91';
      } else {
        profileForm.phone = user.value.phone;
      }
    } else {
      profileForm.phone = '';
    }
    profileForm.currentPassword = '';
    profileForm.newPassword = '';
    profileForm.confirmPassword = '';
  }
  error.value = '';
};

const handleUpdateProfile = async () => {
  if (!user.value) return;

  loading.value = true;
  error.value = '';

  try {
    // Validate password fields if changing password
    if (profileForm.newPassword || profileForm.confirmPassword || profileForm.currentPassword) {
      if (!profileForm.currentPassword) {
        throw new Error(t('auth.currentPasswordRequired'));
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        throw new Error(t('auth.passwordsDoNotMatch'));
      }
      if (profileForm.newPassword.length < 6) {
        throw new Error(t('auth.passwordTooShort'));
      }
    }

    const updateData: any = {
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone ? `${profileForm.countryCode}${profileForm.phone}` : undefined
    };

    // Add password fields if changing password
    if (profileForm.newPassword) {
      updateData.oldPassword = profileForm.currentPassword;
      updateData.password = profileForm.newPassword;
      updateData.passwordConfirm = profileForm.confirmPassword;
    }

    await pb.collection('users').update(user.value.id, updateData);
    
    // Refresh user data
    refreshAuth();
    
    // Reset password fields
    profileForm.currentPassword = '';
    profileForm.newPassword = '';
    profileForm.confirmPassword = '';
    
    // Show success message (you can use a toast notification here)
    error.value = '';
    
  } catch (err: any) {
    error.value = err.message || t('messages.error');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  resetForm();
  ensureBiometricChecked();
});
</script>