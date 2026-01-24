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
            <div v-if="registrationSuccess" class="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
              <div class="flex">
                <CheckCircle2 class="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0" />
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-green-800 dark:text-green-300">
                    {{ t('auth.registrationSuccessTitle') }}
                  </h3>
                  <p class="mt-1 text-sm text-green-700 dark:text-green-400">
                    {{ t('auth.registrationSuccessMessage') }}
                  </p>
                </div>
              </div>
            </div>
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
              <div class="mt-1 relative">
                <input
                  id="password"
                  v-model="form.password"
                  name="password"
                  :type="showLoginPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  class="input pr-10"
                  :placeholder="t('forms.enterPassword')"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  @mousedown="showLoginPassword = true"
                  @mouseup="showLoginPassword = false"
                  @mouseleave="showLoginPassword = false"
                  @touchstart.prevent="showLoginPassword = true"
                  @touchend="showLoginPassword = false"
                  tabindex="-1"
                >
                  <Eye v-if="showLoginPassword" class="h-5 w-5" />
                  <EyeOff v-else class="h-5 w-5" />
                </button>
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
                  :class="[
                    registerForm.email && !isEmailValid
                      ? 'border-error-500 focus:border-error-500 focus:ring-error-500 dark:border-error-500'
                      : ''
                  ]"
                  :placeholder="t('forms.enterEmail')"
                />
              </div>
              <div v-if="registerForm.email && !isEmailValid" class="mt-1 text-sm text-error-600 dark:text-error-400">
                {{ t('auth.emailInvalid') }}
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
                  :class="[
                    registerForm.phone && !isPhoneValid
                      ? 'border-error-500 focus:border-error-500 focus:ring-error-500 dark:border-error-500'
                      : ''
                  ]"
                  :placeholder="t('forms.enterPhoneNumber')"
                  maxlength="15"
                />
              </div>
              <div v-if="registerForm.phone && !isPhoneValid" class="mt-1 text-sm text-error-600 dark:text-error-400">
                {{ t('auth.phoneInvalid') }}
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
              <div class="mt-1 relative">
                <input
                  id="reg-password"
                  v-model="registerForm.password"
                  name="password"
                  :type="showRegisterPassword ? 'text' : 'password'"
                  required
                  class="input pr-10"
                  :placeholder="t('forms.createPassword')"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  @mousedown="showRegisterPassword = true"
                  @mouseup="showRegisterPassword = false"
                  @mouseleave="showRegisterPassword = false"
                  @touchstart.prevent="showRegisterPassword = true"
                  @touchend="showRegisterPassword = false"
                  tabindex="-1"
                >
                  <Eye v-if="showRegisterPassword" class="h-5 w-5" />
                  <EyeOff v-else class="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <label for="reg-confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('auth.confirmPassword') }}
              </label>
              <div class="mt-1 relative">
                <input
                  id="reg-confirm-password"
                  v-model="registerForm.confirmPassword"
                  name="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  class="input pr-10"
                  :class="[
                    registerForm.confirmPassword && !passwordsMatch
                      ? 'border-error-500 focus:border-error-500 focus:ring-error-500 dark:border-error-500'
                      : ''
                  ]"
                  :placeholder="t('forms.confirmPassword')"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  @mousedown="showConfirmPassword = true"
                  @mouseup="showConfirmPassword = false"
                  @mouseleave="showConfirmPassword = false"
                  @touchstart.prevent="showConfirmPassword = true"
                  @touchend="showConfirmPassword = false"
                  tabindex="-1"
                >
                  <Eye v-if="showConfirmPassword" class="h-5 w-5" />
                  <EyeOff v-else class="h-5 w-5" />
                </button>
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
                :disabled="registerLoading || !registerTurnstileToken || !passwordsMatch || !registerForm.legalAccepted || !isPhoneValid || !isEmailValid"
                class="flex-1 btn-primary disabled:btn-disabled disabled:pointer-events-none disabled:cursor-not-allowed"
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
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-vue-next';
import TurnstileWidget from '../components/TurnstileWidget.vue';
import LegalModal from '../components/LegalModal.vue';

const router = useRouter();
const { login, register, logout, requestEmailVerification } = useAuth();
const { t } = useI18n();
const { isDark } = useTheme();

const loading = ref(false);
const registerLoading = ref(false);
const error = ref('');
const activeTab = ref('login');
const showValidationErrors = ref(false);
const showTermsModal = ref(false);
const showPrivacyModal = ref(false);
const registrationSuccess = ref(false);

// Password visibility states
const showLoginPassword = ref(false);
const showRegisterPassword = ref(false);
const showConfirmPassword = ref(false);

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

// Phone validation
const sanitizedPhone = computed(() => {
  let phone = registerForm.phone.trim();
  // Strip common prefixes users might add redundantly
  if (phone.startsWith('+91')) {
    phone = phone.slice(3);
  } else if (phone.startsWith('91') && phone.length > 10) {
    phone = phone.slice(2);
  } else if (phone.startsWith('0')) {
    phone = phone.slice(1);
  }
  // Remove any spaces, dashes, or dots
  phone = phone.replace(/[\s\-\.]/g, '');
  return phone;
});

const isPhoneValid = computed(() => {
  if (!registerForm.phone) return true; // required handled by HTML
  const phone = sanitizedPhone.value;
  // Indian mobile numbers: exactly 10 digits, starting with 6-9
  return /^[6-9]\d{9}$/.test(phone);
});

// Email validation
const isEmailValid = computed(() => {
  if (!registerForm.email) return true; // required handled by HTML
  // Standard email format check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email.trim());
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
  registrationSuccess.value = false;

  try {
    const result = await login(form.email, form.password, turnstileToken.value);
    if (result.success) {
      // Check if user's email is verified
      if (!result.verified) {
        // User not verified - log them out and show message
        await logout();
        error.value = t('auth.emailNotVerified');
        // Offer to resend verification email
        try {
          await requestEmailVerification(form.email);
        } catch (e) {
          // Ignore - just informing the user
        }
        if (loginTurnstileRef.value && typeof loginTurnstileRef.value.reset === 'function') {
          loginTurnstileRef.value.reset();
          turnstileToken.value = '';
        }
        return;
      }
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

  // Validate email format
  if (!isEmailValid.value) {
    error.value = t('auth.emailInvalid');
    return;
  }

  // Validate phone number
  if (!isPhoneValid.value) {
    error.value = t('auth.phoneInvalid');
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
      sanitizedPhone.value,
      registerForm.countryCode,
      registerForm.couponCode,
      registerForm.legalAccepted
    );
    if (result.success) {
      // Request email verification
      try {
        await requestEmailVerification(registerForm.email);
      } catch (verifyErr) {
        // Don't block registration if verification request fails
        console.warn('Email verification request failed:', verifyErr);
      }
      // Switch to login tab and show verification message
      activeTab.value = 'login';
      error.value = '';
      registrationSuccess.value = true;
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