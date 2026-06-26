<template>
  <div class="min-h-screen flex bg-cream dark:bg-ink">
    <!-- Brand panel — desktop only -->
    <div class="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-ink text-cream sw-dotgrid">
      <div class="relative flex flex-col justify-between p-12 xl:p-16 w-full">
        <div class="flex items-center gap-3">
          <img src="/sitewise-mark.svg" class="h-11 w-11" alt="Sitewise" />
          <span class="text-2xl font-display font-bold tracking-tight text-cream">Sitewise</span>
        </div>

        <div class="max-w-md">
          <div class="sw-eyebrow text-amber-400 mb-4">Site expense management</div>
          <h1 class="sw-h1 text-cream">Track every rupee, across every site.</h1>
          <p class="mt-5 text-lg text-stone-300 leading-relaxed">
            Materials, mazdoor, vendor payments and budgets — one khata for all your
            sites. Fast entry, works offline.
          </p>

          <ul class="mt-10 space-y-4">
            <li class="flex items-start gap-3">
              <span class="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md bg-amber-500">
                <Check class="h-4 w-4 text-ink" />
              </span>
              <span class="text-stone-200">Track materials, labour &amp; vendor payments in one place.</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md bg-amber-500">
                <Check class="h-4 w-4 text-ink" />
              </span>
              <span class="text-stone-200">Multi-site budgets and a running ledger that always adds up.</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md bg-amber-500">
                <Check class="h-4 w-4 text-ink" />
              </span>
              <span class="text-stone-200">Works offline on site, syncs everywhere automatically.</span>
            </li>
          </ul>
        </div>

        <div class="text-sm text-stone-400">Made with AI ❤️ in India</div>
      </div>
    </div>

    <!-- Form panel -->
    <div class="flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
      <div class="w-full transition-[max-width] duration-300 ease-snap" :class="activeTab === 'register' ? 'max-w-xl' : 'max-w-sm'">
        <!-- Mobile logo -->
        <div class="lg:hidden flex items-center justify-center gap-2.5 mb-8">
          <img src="/sitewise-mark.svg" class="h-10 w-10" alt="Sitewise" />
          <span class="text-2xl font-display font-bold tracking-tight text-ink dark:text-cream">Sitewise</span>
        </div>

        <!-- Heading -->
        <div class="mb-7">
          <h2 class="sw-h2 text-ink dark:text-cream">
            {{ activeTab === 'login' ? t('auth.loginTitle') : t('auth.registerTitle') }}
          </h2>
          <p class="mt-2 text-stone-600 dark:text-stone-400">
            {{ activeTab === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle') }}
          </p>
        </div>

        <!-- Shared error -->
        <div v-if="error" class="mb-6 rounded-md bg-clay-100 dark:bg-clay-500/15 border border-clay-200 dark:border-clay-500/30 p-4">
          <div class="flex items-start gap-3">
            <AlertCircle class="h-5 w-5 flex-none text-clay-600 dark:text-clay-400" />
            <h3 class="text-sm font-medium text-clay-700 dark:text-clay-300">{{ error }}</h3>
          </div>
        </div>

        <!-- Login form -->
        <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label for="email" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ t('auth.email') }}
            </label>
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

          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="password" class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                {{ t('auth.password') }}
              </label>
              <router-link
                to="/forgot-password"
                class="text-sm font-medium text-ink dark:text-cream hover:text-amber-700 dark:hover:text-amber-400"
              >
                {{ t('auth.forgotPassword') }}?
              </router-link>
            </div>
            <div class="relative">
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
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream"
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

          <!-- Turnstile -->
          <div class="min-h-[65px]">
            <TurnstileWidget
              v-if="turnstileEnabled"
              :site-key="turnstileSiteKey"
              :theme="isDark ? 'dark' : 'light'"
              @success="handleTurnstileSuccess"
              @error="handleTurnstileError"
              @expired="handleTurnstileExpired"
              ref="loginTurnstileRef"
            />
          </div>

          <button
            type="submit"
            :disabled="loading || (turnstileEnabled && !turnstileToken)"
            class="w-full btn-primary disabled:btn-disabled disabled:pointer-events-none disabled:cursor-not-allowed"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            {{ loading ? t('auth.signingIn') : t('auth.signIn') }}
          </button>

          <p class="text-center text-sm text-stone-600 dark:text-stone-400">
            {{ t('auth.registerSubtitle') }}
            <button
              type="button"
              @click="switchTo('register')"
              class="ml-1 font-semibold text-ink dark:text-cream hover:text-amber-700 dark:hover:text-amber-400"
            >
              {{ t('auth.createAccount') }}
            </button>
          </p>
        </form>

        <!-- Register form -->
        <form v-else @submit.prevent="handleRegister" class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <div>
              <label for="reg-name" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('auth.fullName') }}
              </label>
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

            <div>
              <label for="reg-email" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('auth.email') }}
              </label>
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

            <div>
              <label for="reg-phone" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('auth.phoneNumber') }}
              </label>
              <div class="flex">
                <select
                  id="country-code"
                  v-model="registerForm.countryCode"
                  disabled
                  class="input rounded-r-none w-20 bg-stone-100 dark:bg-ink-2 cursor-not-allowed"
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
              <label for="reg-coupon" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('auth.couponCode') }} <span class="text-stone-500 dark:text-stone-400">({{ t('forms.optional') }})</span>
              </label>
              <input
                id="reg-coupon"
                v-model="registerForm.couponCode"
                name="couponCode"
                type="text"
                class="input"
                :placeholder="t('forms.enterCouponCode')"
              />
            </div>

            <div>
              <label for="reg-password" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('auth.password') }}
              </label>
              <div class="relative">
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
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream"
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
              <label for="reg-confirm-password" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('auth.confirmPassword') }}
              </label>
              <div class="relative">
                <input
                  id="reg-confirm-password"
                  v-model="registerForm.confirmPassword"
                  name="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  class="input pr-10"
                  :class="[
                    registerForm.confirmPassword && !passwordsMatch
                      ? 'border-clay-500 focus:border-clay-500 dark:border-clay-500'
                      : ''
                  ]"
                  :placeholder="t('forms.confirmPassword')"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream"
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
              <div v-if="registerForm.confirmPassword && !passwordsMatch" class="mt-1 text-sm text-clay-600 dark:text-clay-400">
                {{ t('auth.passwordsDoNotMatch') }}
              </div>
            </div>
          </div>

          <!-- Legal Acceptance -->
          <div class="bg-cream-2 dark:bg-ink-2 rounded-lg p-4 border border-stone-200 dark:border-ink-4">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="registerForm.legalAccepted"
                required
                class="mt-0.5 h-4 w-4 text-amber-500 focus:ring-amber-500 border-stone-300 dark:border-ink-4 rounded"
              />
              <div class="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                <span>I agree to the</span>
                <button
                  type="button"
                  @click="showTermsModal = true"
                  class="text-ink dark:text-cream font-medium hover:text-amber-700 dark:hover:text-amber-400 underline mx-1"
                >
                  Terms and Conditions
                </button>
                <span>and</span>
                <button
                  type="button"
                  @click="showPrivacyModal = true"
                  class="text-ink dark:text-cream font-medium hover:text-amber-700 dark:hover:text-amber-400 underline mx-1"
                >
                  Privacy Policy
                </button>
                <span>of Site-Wise.</span>
              </div>
            </label>

            <div v-if="showValidationErrors && !registerForm.legalAccepted" class="mt-2 text-sm text-clay-600 dark:text-clay-400">
              You must accept the Terms and Conditions and Privacy Policy to continue.
            </div>
          </div>

          <!-- Turnstile -->
          <div class="min-h-[65px]">
            <TurnstileWidget
              v-if="turnstileEnabled"
              :site-key="turnstileSiteKey"
              :theme="isDark ? 'dark' : 'light'"
              @success="handleRegisterTurnstileSuccess"
              @error="handleTurnstileError"
              @expired="handleRegisterTurnstileExpired"
              ref="registerTurnstileRef"
            />
          </div>

          <button
            type="submit"
            :disabled="registerLoading || (turnstileEnabled && !registerTurnstileToken) || !passwordsMatch || !registerForm.legalAccepted"
            class="w-full btn-primary disabled:btn-disabled disabled:pointer-events-none disabled:cursor-not-allowed"
          >
            <Loader2 v-if="registerLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ t('auth.createAccount') }}
          </button>

          <p class="text-center text-sm text-stone-600 dark:text-stone-400">
            {{ t('auth.loginSubtitle') }}
            <button
              type="button"
              @click="switchTo('login')"
              class="ml-1 font-semibold text-ink dark:text-cream hover:text-amber-700 dark:hover:text-amber-400"
            >
              {{ t('auth.signIn') }}
            </button>
          </p>
        </form>
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
import { ref, reactive, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useSite } from '../composables/useSite';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
import { AlertCircle, Loader2, Eye, EyeOff, Check } from 'lucide-vue-next';
import TurnstileWidget from '../components/TurnstileWidget.vue';
import LegalModal from '../components/LegalModal.vue';
import { isTauriRuntime } from '../composables/usePlatform';

const router = useRouter();
const route = useRoute();
const { login, register } = useAuth();
const { t } = useI18n();
const { isDark } = useTheme();

const loading = ref(false);
const registerLoading = ref(false);
const error = ref('');
// Login vs register is route-driven (/login, /register) but `activeTab` stays the
// single source of truth for which form renders.
const activeTab = ref<'login' | 'register'>(route.name === 'Register' ? 'register' : 'login');
const showValidationErrors = ref(false);
const showTermsModal = ref(false);
const showPrivacyModal = ref(false);

// Password visibility states
const showLoginPassword = ref(false);
const showRegisterPassword = ref(false);
const showConfirmPassword = ref(false);

// Turnstile configuration
// Cloudflare Turnstile cannot complete its challenge inside a native Tauri
// webview (desktop/Android/iOS), and anyone who has installed the app has
// already cleared that bar — so we skip the human-verification step entirely
// in Tauri builds and only require it on the web.
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const turnstileEnabled = computed(() => !!turnstileSiteKey && !isTauriRuntime());
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

// Switch between the separate login / signup screens.
const switchTo = (mode: 'login' | 'register') => {
  activeTab.value = mode;
  error.value = '';
  showValidationErrors.value = false;
  const target = mode === 'register' ? '/register' : '/login';
  if (route.path !== target) {
    router.push(target).catch(() => {});
  }
};

// Keep the form in sync if the route changes (deep-link, back/forward).
watch(() => route.name, (name) => {
  activeTab.value = name === 'Register' ? 'register' : 'login';
});

const handleLogin = async () => {
  if (turnstileEnabled.value && !turnstileToken.value) {
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

  if (turnstileEnabled.value && !registerTurnstileToken.value) {
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
