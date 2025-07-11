<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
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
        <div class="flex border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Authentication options">
          <button
            @click="activeTab = 'login'"
            :class="[
              'flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors',
              activeTab === 'login'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
            role="tab"
            :aria-selected="activeTab === 'login'"
            :tabindex="activeTab === 'login' ? 0 : -1"
            aria-controls="login-panel"
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
            role="tab"
            :aria-selected="activeTab === 'register'"
            :tabindex="activeTab === 'register' ? 0 : -1"
            aria-controls="register-panel"
          >
            {{ t('auth.createAccount') }}
          </button>
        </div>

        <!-- Login Form -->
        <div v-if="activeTab === 'login'" class="mt-6" role="tabpanel" id="login-panel" aria-labelledby="login-tab">
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
              <div class="flex items-center justify-between">
                <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('auth.password') }}
                </label>
                <router-link
                  to="/forgot-password"
                  class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                >
                  {{ t('auth.forgotPassword') }}?
                </router-link>
              </div>
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
            <div class="h-[65px]">
              <TurnstileWidget
                v-if="turnstileSiteKey"
                :site-key="turnstileSiteKey"
                :theme="isDark ? 'dark' : 'light'"
                @success="handleTurnstileSuccess"
                @error="handleTurnstileError"
                @expired="handleTurnstileExpired"
                ref="loginTurnstileRef"
              />
            </div>

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
        <div v-if="activeTab === 'register'" class="mt-6" role="tabpanel" id="register-panel" aria-labelledby="register-tab">
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

            <div>
              <label for="reg-confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('auth.confirmPassword') }}
              </label>
              <div class="mt-1">
                <input
                  id="reg-confirm-password"
                  v-model="registerForm.confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  class="input"
                  :class="[
                    registerForm.confirmPassword && !passwordsMatch
                      ? 'border-error-500 focus:border-error-500 focus:ring-error-500 dark:border-error-500'
                      : ''
                  ]"
                  :placeholder="t('forms.confirmPassword')"
                />
              </div>
              <div v-if="registerForm.confirmPassword && !passwordsMatch" class="mt-1 text-sm text-error-600 dark:text-error-400">
                {{ t('auth.passwordsDoNotMatch') }}
              </div>
            </div>

            <!-- Legal Acceptance -->
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <label class="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="registerForm.legalAccepted"
                  required
                  class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  <span>I agree to the</span>
                  <button
                    type="button"
                    @click="showTermsModal = true"
                    class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 underline mx-1"
                  >
                    Terms and Conditions
                  </button>
                  <span>and</span>
                  <button
                    type="button"
                    @click="showPrivacyModal = true"
                    class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 underline mx-1"
                  >
                    Privacy Policy
                  </button>
                  <span>of Site-Wise.</span>
                </div>
              </label>
              
              <!-- Error message for validation -->
              <div v-if="showValidationErrors && !registerForm.legalAccepted" class="mt-2 text-sm text-red-600 dark:text-red-400">
                You must accept the Terms and Conditions and Privacy Policy to continue.
              </div>
            </div>

            <!-- Turnstile Widget for Registration -->
            <div class="h-[65px]">
              <TurnstileWidget
                v-if="turnstileSiteKey"
                :site-key="turnstileSiteKey"
                :theme="isDark ? 'dark' : 'light'"
                @success="handleRegisterTurnstileSuccess"
                @error="handleTurnstileError"
                @expired="handleRegisterTurnstileExpired"
                ref="registerTurnstileRef"
              />
            </div>

            <div class="flex space-x-3">
              <button
                type="submit"
                :disabled="registerLoading || !registerTurnstileToken || !passwordsMatch || !registerForm.legalAccepted"
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

    <!-- Legal Modals -->
    <LegalModal
      :is-visible="showTermsModal"
      type="terms"
      @close="showTermsModal = false"
    />
    
    <LegalModal
      :is-visible="showPrivacyModal"
      type="privacy"
      @close="showPrivacyModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useSite } from '../composables/useSite';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
import { AlertCircle, Loader2 } from 'lucide-vue-next';
import TurnstileWidget from '../components/TurnstileWidget.vue';
import LegalModal from '../components/LegalModal.vue';

const router = useRouter();
const { login, register } = useAuth();
const { t } = useI18n();
const { isDark } = useTheme();

const loading = ref(false);
const registerLoading = ref(false);
const error = ref('');
const activeTab = ref('login');
const showValidationErrors = ref(false);
const showTermsModal = ref(false);
const showPrivacyModal = ref(false);

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
  password: '',
  confirmPassword: '',
  legalAccepted: false
});

// Password validation
const passwordsMatch = computed(() => {
  return registerForm.password === registerForm.confirmPassword;
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
      // Load user sites before navigation to prevent race condition
      const { loadUserSites } = useSite();
      await loadUserSites();
      router.push('/');
    } else {
      error.value = result.error || t('auth.loginFailed');
      // Reset Turnstile on failure
      if (loginTurnstileRef.value && typeof loginTurnstileRef.value.reset === 'function') {
        loginTurnstileRef.value.reset();
        turnstileToken.value = '';
      }
    }
  } catch (err: any) {
    error.value = err.message || t('messages.error');
    // Reset Turnstile on error
    if (loginTurnstileRef.value && typeof loginTurnstileRef.value.reset === 'function') {
      loginTurnstileRef.value.reset();
      turnstileToken.value = '';
    }
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  showValidationErrors.value = true;

  if (!registerForm.legalAccepted) {
    error.value = 'You must accept the Terms and Conditions and Privacy Policy to continue.';
    return;
  }

  if (!registerTurnstileToken.value && turnstileSiteKey) {
    error.value = t('auth.turnstileRequired');
    return;
  }

  // Validate passwords match
  if (!passwordsMatch.value) {
    error.value = t('auth.passwordsDoNotMatch');
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
      registerForm.couponCode,
      registerForm.legalAccepted
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
      if (registerTurnstileRef.value && typeof registerTurnstileRef.value.reset === 'function') {
        registerTurnstileRef.value.reset();
        registerTurnstileToken.value = '';
      }
    }
  } catch (err: any) {
    error.value = err.message || t('messages.error');
    // Reset Turnstile on error
    if (registerTurnstileRef.value && typeof registerTurnstileRef.value.reset === 'function') {
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