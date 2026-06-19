<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-500/15 rounded-full mb-4">
        <Rocket class="w-8 h-8 text-amber-700 dark:text-amber-400" />
      </div>
      <h2 class="sw-h2 font-display text-ink dark:text-cream">
        {{ t('newUserOnboarding.welcome') }}
      </h2>
      <p class="mt-2 text-sm sm:text-base text-stone-600 dark:text-stone-400 max-w-lg mx-auto">
        {{ t('newUserOnboarding.welcomeSubtitle') }}
      </p>
    </div>

    <!-- Progress Steps -->
    <div class="card p-4 sm:p-6">
      <h3 class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-4">
        {{ t('newUserOnboarding.gettingStarted') }}
      </h3>

      <div class="space-y-4">
        <!-- Step 1: Add Vendor -->
        <div
          class="flex items-start gap-4 p-4 rounded-lg transition-colors"
          :class="hasVendors
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40'"
        >
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            :class="hasVendors
              ? 'bg-green-100 dark:bg-green-900/40'
              : 'bg-amber-100 dark:bg-amber-500/20'"
          >
            <CheckCircle2 v-if="hasVendors" class="w-6 h-6 text-green-600 dark:text-green-400" />
            <span v-else class="font-display text-lg font-semibold text-amber-700 dark:text-amber-400">1</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h4 class="font-display font-medium text-ink dark:text-cream">
                {{ t('newUserOnboarding.steps.addVendor.title') }}
              </h4>
              <span
                v-if="hasVendors"
                class="text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
              >
                {{ t('newUserOnboarding.completed') }}
              </span>
            </div>
            <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
              {{ t('newUserOnboarding.steps.addVendor.description') }}
            </p>
            <button
              v-if="!hasVendors"
              @click="quickAction('/vendors')"
              class="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-ink text-sm font-medium rounded-md transition-colors"
            >
              <Plus class="w-4 h-4" />
              {{ t('newUserOnboarding.steps.addVendor.action') }}
            </button>
          </div>
        </div>

        <!-- Step 2: Add Delivery or Service Booking (only show when vendors exist) -->
        <div
          v-if="hasVendors"
          class="flex items-start gap-4 p-4 rounded-lg transition-colors"
          :class="hasDeliveriesOrBookings
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40'"
        >
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            :class="hasDeliveriesOrBookings
              ? 'bg-green-100 dark:bg-green-900/40'
              : 'bg-amber-100 dark:bg-amber-500/20'"
          >
            <CheckCircle2 v-if="hasDeliveriesOrBookings" class="w-6 h-6 text-green-600 dark:text-green-400" />
            <span v-else class="font-display text-lg font-semibold text-amber-700 dark:text-amber-400">2</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h4 class="font-display font-medium text-ink dark:text-cream">
                {{ t('newUserOnboarding.steps.addActivity.title') }}
              </h4>
              <span
                v-if="hasDeliveriesOrBookings"
                class="text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
              >
                {{ t('newUserOnboarding.completed') }}
              </span>
            </div>
            <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
              {{ t('newUserOnboarding.steps.addActivity.description') }}
            </p>

            <!-- Two action buttons for deliveries and service bookings -->
            <div v-if="!hasDeliveriesOrBookings" class="flex flex-wrap gap-2 mt-3">
              <button
                @click="quickAction('/deliveries')"
                class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-ink text-sm font-medium rounded-md transition-colors"
              >
                <Truck class="w-4 h-4" />
                {{ t('newUserOnboarding.steps.addActivity.recordDelivery') }}
              </button>
              <button
                @click="quickAction('/service-bookings')"
                class="inline-flex items-center gap-2 px-4 py-2 bg-ink hover:bg-ink-2 text-cream dark:bg-ink-2 dark:hover:bg-ink-3 text-sm font-medium rounded-md transition-colors"
              >
                <Wrench class="w-4 h-4" />
                {{ t('newUserOnboarding.steps.addActivity.bookService') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Locked Step 2 (shown when no vendors yet) -->
        <div
          v-if="!hasVendors"
          class="flex items-start gap-4 p-4 rounded-lg bg-stone-50 dark:bg-ink-2/50 border border-stone-200 dark:border-ink-4 opacity-60"
        >
          <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-200 dark:bg-ink-3">
            <Lock class="w-5 h-5 text-stone-400 dark:text-stone-500" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-display font-medium text-stone-500 dark:text-stone-400">
              {{ t('newUserOnboarding.steps.addActivity.title') }}
            </h4>
            <p class="mt-1 text-sm text-stone-400 dark:text-stone-500">
              {{ t('newUserOnboarding.steps.addActivity.locked') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Tips Section -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Tip 1: Items -->
      <div class="card p-4 flex items-start gap-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
          <Package class="w-5 h-5 text-amber-700 dark:text-amber-400" />
        </div>
        <div>
          <h4 class="font-display font-medium text-ink dark:text-cream text-sm">
            {{ t('newUserOnboarding.tips.items.title') }}
          </h4>
          <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {{ t('newUserOnboarding.tips.items.description') }}
          </p>
          <router-link
            to="/items"
            class="inline-flex items-center text-xs font-medium text-ink dark:text-cream hover:text-amber-700 dark:hover:text-amber-400 mt-2"
          >
            {{ t('newUserOnboarding.tips.items.action') }}
            <ChevronRight class="w-3 h-3 ml-1" />
          </router-link>
        </div>
      </div>

      <!-- Tip 2: Services -->
      <div class="card p-4 flex items-start gap-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-stone-100 dark:bg-ink-2 flex items-center justify-center">
          <Wrench class="w-5 h-5 text-stone-700 dark:text-stone-300" />
        </div>
        <div>
          <h4 class="font-display font-medium text-ink dark:text-cream text-sm">
            {{ t('newUserOnboarding.tips.services.title') }}
          </h4>
          <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {{ t('newUserOnboarding.tips.services.description') }}
          </p>
          <router-link
            to="/services"
            class="inline-flex items-center text-xs font-medium text-ink dark:text-cream hover:text-amber-700 dark:hover:text-amber-400 mt-2"
          >
            {{ t('newUserOnboarding.tips.services.action') }}
            <ChevronRight class="w-3 h-3 ml-1" />
          </router-link>
        </div>
      </div>

      <!-- Tip 3: Accounts -->
      <div class="card p-4 flex items-start gap-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Wallet class="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h4 class="font-display font-medium text-ink dark:text-cream text-sm">
            {{ t('newUserOnboarding.tips.accounts.title') }}
          </h4>
          <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {{ t('newUserOnboarding.tips.accounts.description') }}
          </p>
          <router-link
            to="/accounts"
            class="inline-flex items-center text-xs font-medium text-ink dark:text-cream hover:text-amber-700 dark:hover:text-amber-400 mt-2"
          >
            {{ t('newUserOnboarding.tips.accounts.action') }}
            <ChevronRight class="w-3 h-3 ml-1" />
          </router-link>
        </div>
      </div>
    </div>

    <!-- Dismiss Option -->
    <div class="text-center pt-4">
      <button
        @click="$emit('dismiss')"
        class="text-sm text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream underline transition-colors"
      >
        {{ t('newUserOnboarding.skipForNow') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  Rocket,
  CheckCircle2,
  Plus,
  Lock,
  Truck,
  Wrench,
  Package,
  Wallet,
  ChevronRight
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();
const router = useRouter();

const props = defineProps<{
  vendorCount: number;
  deliveryCount: number;
  serviceBookingCount: number;
}>();

defineEmits<{
  dismiss: [];
}>();

const hasVendors = computed(() => props.vendorCount > 0);
const hasDeliveriesOrBookings = computed(() =>
  props.deliveryCount > 0 || props.serviceBookingCount > 0
);

// Quick action to navigate and open modal
const quickAction = (route: string) => {
  router.push(route);
  // Dispatch event after route change to open the add modal
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('show-add-modal'));
  }, 100);
};
</script>
