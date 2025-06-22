<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="flex items-center justify-center">
          <!-- <HardHat class="h-12 w-12 text-primary-600 dark:text-primary-400" /> -->
          <img src="/logo.webp" class="h-16" alt="SiteWise">
          <span class="ml-2 text-xl font-bold leading-tight text-gray-900 dark:text-white">Site</span>
          <span class="text-xl font-bold leading-tight text-blue-600">Wise</span>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {{ activeTab === 'login' ? t('auth.loginTitle') : t('auth.registerTitle') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {{ activeTab === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle') }}
        </p>
      </div>
      
      <div class="card">
        <!-- Tab Navigation -->
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            @click="activeTab = 'login'"
            :class="[
              'flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors',
              activeTab === 'login'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
          >
            {{ t('auth.signIn') }}
          </button>
          <button
            @click="activeTab = 'register'"
            :class="[
              'flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors',
              activeTab === 'register'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
          >
            {{ t('auth.createAccount') }}
          </button>
        </div>

        <!-- Login Form -->
        <div v-if="activeTab === 'login'" class="mt-6">
          <form @submit.prevent="handleLogin" class="space-y-6">
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

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('auth.email') }}
              </label>
              <div class="mt-1">
                <input
                  id="email"
                  v-model="form.email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="input"
                  :placeholder="t('forms.enterEmail')"
                />
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('auth.password') }}
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  v-model="form.password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="input"
                  :placeholder="t('forms.enterPassword')"
                />
              </div>
            </div>

            <!-- Turnstile Widget -->
            <TurnstileWidget
              v-if="turnstileSiteKey"
              :site-key="turnstileSiteKey"
              :theme="isDark ? 'dark' : 'light'"
              @success="handleTurnstileSuccess"
              @error="handleTurnstileError"
              @expired="handleTurnstileExpired"
              ref="loginTurnstileRef"
            />

            <div>
              <button
                type="submit"
                :disabled="loading || !turnstileToken"
                class="w-full btn-primary disabled:btn-disabled disabled:pointer-events-none disabled:cursor-not-allowed"
              >
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ loading ? t('auth.signingIn') : t('auth.signIn') }}
              </button>
            </div>
          </form>
        </div>

        <!-- Register Form -->
        <div v-if="activeTab === 'register'" class="mt-6">
          <form @submit.prevent="handleRegister" class="space-y-6">
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
            
            <div>
              <label for="reg-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('auth.fullName') }}
              </label>
              <div class="mt-1">
                <input
                  id="reg-name"
                  v-model="registerForm.name"
                  name="name"
                  type="text"
                  required
                  class="input"
                  :placeholder="t('forms.enterFullName')"
                />
              </div>
            </div>

            <div>
              <label for="reg-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('auth.email') }}
              </label>
              <div class="mt-1">
                <input
                  id="reg-email"
                  v-model="registerForm.email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="input"
                  :placeholder="t('forms.enterEmail')"
                />
              </div>
            </div>

            <div>
              <label for="reg-phone" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('auth.phoneNumber') }}
              </label>
              <div class="mt-1 flex">
                <select
                  id="country-code"
                  v-model="registerForm.countryCode"
                  disabled
                  class="input rounded-r-none w-20 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                >
                  <option value="+91">+91</option>
                </select>
                <input
                  id="reg-phone"
                  v-model="registerForm.phone"
                  name="phone"
                  type="tel"
                  autocomplete="tel"
                  required
                  class="input rounded-l-none flex-1"
                  :placeholder="t('forms.enterPhoneNumber')"
                />
              </div>
            </div>

            <div>
              <label for="reg-coupon" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('auth.couponCode') }} <span class="text-gray-500 dark:text-gray-400">({{ t('forms.optional') }})</span>
              </label>
              <div class="mt-1">
                <input
                  id="reg-coupon"
                  v-model="registerForm.couponCode"
                  name="couponCode"
                  type="text"
                  class="input"
                  :placeholder="t('forms.enterCouponCode')"
                />
              </div>
            </div>

            <div>
              <label for="reg-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('auth.password') }}
              </label>
              <div class="mt-1">
                <input
                  id="reg-password"
                  v-model="registerForm.password"
                  name="password"
                  type="password"
                  required
                  class="input"
                  :placeholder="t('forms.createPassword')"
                />
              </div>
            </div>

            <!-- Turnstile Widget for Registration -->
            <TurnstileWidget
              v-if="turnstileSiteKey"
              :site-key="turnstileSiteKey"
              :theme="isDark ? 'dark' : 'light'"
              @success="handleRegisterTurnstileSuccess"
              @error="handleTurnstileError"
              @expired="handleRegisterTurnstileExpired"
              ref="registerTurnstileRef"
            />

            <div class="flex space-x-3">
              <button
                type="submit"
                :disabled="registerLoading || !registerTurnstileToken"
                class="flex-1 btn-primary"
              >
                <Loader2 v-if="registerLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ t('auth.createAccount') }}
              </button>
              <button
                type="button"
                @click="activeTab = 'login'"
                class="flex-1 btn-outline"
              >
                {{ t('auth.backToLogin') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
import { AlertCircle, Loader2 } from 'lucide-vue-next';
import TurnstileWidget from '../components/TurnstileWidget.vue';

const router = useRouter();
const { login, register } = useAuth();
const { t } = useI18n();
const { isDark } = useTheme();

const loading = ref(false);
const registerLoading = ref(false);
const error = ref('');
const activeTab = ref('login');

// Turnstile configuration
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const turnstileToken = ref('');
const registerTurnstileToken = ref('');
const loginTurnstileRef = ref<InstanceType<typeof TurnstileWidget>>();
const registerTurnstileRef = ref<InstanceType<typeof TurnstileWidget>>();

const form = reactive({
  email: '',
  password: ''
});

const registerForm = reactive({
  name: '',
  email: '',
  phone: '',
  countryCode: '+91',
  couponCode: '',
  password: ''
});

const handleLogin = async () => {
  if (!turnstileToken.value && turnstileSiteKey) {
    error.value = t('auth.turnstileRequired');
    return;
  }

  loading.value = true;
  error.value = '';
  
  try {
    const result = await login(form.email, form.password, turnstileToken.value);
    if (result.success) {
      router.push('/');
    } else {
      error.value = result.error || t('auth.loginFailed');
      // Reset Turnstile on failure
      if (loginTurnstileRef.value) {
        loginTurnstileRef.value.reset();
        turnstileToken.value = '';
      }
    }
  } catch (err: any) {
    error.value = err.message || t('messages.error');
    // Reset Turnstile on error
    if (loginTurnstileRef.value) {
      loginTurnstileRef.value.reset();
      turnstileToken.value = '';
    }
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  if (!registerTurnstileToken.value && turnstileSiteKey) {
    error.value = t('auth.turnstileRequired');
    return;
  }

  registerLoading.value = true;
  error.value = '';
  
  try {
    const result = await register(
      registerForm.email, 
      registerForm.password, 
      registerForm.name, 
      registerTurnstileToken.value,
      registerForm.phone,
      registerForm.countryCode,
      registerForm.couponCode
    );
    if (result.success) {
      activeTab.value = 'login';
      error.value = '';
      // Auto-login after registration (without requiring another Turnstile)
      const loginResult = await login(registerForm.email, registerForm.password);
      if (loginResult.success) {
        router.push('/');
      }
    } else {
      error.value = result.error || t('auth.registrationFailed');
      // Reset Turnstile on failure
      if (registerTurnstileRef.value) {
        registerTurnstileRef.value.reset();
        registerTurnstileToken.value = '';
      }
    }
  } catch (err: any) {
    error.value = err.message || t('messages.error');
    // Reset Turnstile on error
    if (registerTurnstileRef.value) {
      registerTurnstileRef.value.reset();
      registerTurnstileToken.value = '';
    }
  } finally {
    registerLoading.value = false;
  }
};

// Turnstile event handlers
const handleTurnstileSuccess = (token: string) => {
  turnstileToken.value = token;
  error.value = '';
};

const handleRegisterTurnstileSuccess = (token: string) => {
  registerTurnstileToken.value = token;
  error.value = '';
};

const handleTurnstileError = () => {
  console.error('Turnstile error:', error);
  error.value = t('auth.turnstileError');
};

const handleTurnstileExpired = () => {
  turnstileToken.value = '';
  error.value = t('auth.turnstileExpired');
};

const handleRegisterTurnstileExpired = () => {
  registerTurnstileToken.value = '';
  error.value = t('auth.turnstileExpired');
};
</script>