<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="flex items-center justify-center">
          <img src="/logo.webp" class="h-16" alt="SiteWise">
          <span class="ml-2 text-xl font-bold leading-tight text-gray-900 dark:text-white">Site</span>
          <span class="text-xl font-bold leading-tight text-blue-600">Wise</span>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {{ t('auth.forgotPasswordTitle') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {{ t('auth.forgotPasswordSubtitle') }}
        </p>
      </div>

      <div class="card">
        <!-- Success Message -->
        <div v-if="emailSent" class="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
          <div class="flex">
            <CheckCircle class="h-5 w-5 text-green-400 dark:text-green-300" />
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800 dark:text-green-300">
                {{ t('auth.resetLinkSent') }}
              </h3>
              <p class="mt-2 text-sm text-green-700 dark:text-green-200">
                {{ t('auth.checkYourEmail') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="rounded-md bg-error-50 dark:bg-error-900/30 p-4">
          <div class="flex">
            <AlertCircle class="h-5 w-5 text-error-400 dark:text-error-300" />
            <div class="ml-3">
              <h3 class="text-sm font-medium text-error-800 dark:text-error-300">
                {{ error }}
              </h3>
            </div>
          </div>
        </div>

        <!-- Form -->
        <form v-if="!emailSent" @submit.prevent="handleResetPassword" class="mt-6 space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('auth.email') }}
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="input"
                :placeholder="t('forms.enterEmail')"
                :disabled="loading"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading || !email"
              class="w-full btn-primary disabled:btn-disabled"
            >
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ loading ? t('auth.sendingResetLink') : t('auth.sendResetLink') }}
            </button>
          </div>

          <div class="text-center">
            <router-link
              to="/login"
              class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
            >
              {{ t('auth.backToLogin') }}
            </router-link>
          </div>
        </form>

        <!-- Back to Login Button (shown after email sent) -->
        <div v-if="emailSent" class="mt-6">
          <router-link
            to="/login"
            class="w-full btn-outline"
          >
            {{ t('auth.backToLogin') }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '../composables/useI18n';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-vue-next';
import { pb } from '../services/pocketbase';

const { t } = useI18n();

const email = ref('');
const loading = ref(false);
const error = ref('');
const emailSent = ref(false);

const handleResetPassword = async () => {
  if (!email.value) {
    error.value = t('forms.emailRequired');
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await pb.collection('users').requestPasswordReset(email.value);
    emailSent.value = true;
  } catch (err: any) {
    console.error('Password reset error:', err);
    if (err.status === 400) {
      error.value = t('auth.userNotFound');
    } else {
      error.value = t('auth.passwordResetError');
    }
  } finally {
    loading.value = false;
  }
};
</script>