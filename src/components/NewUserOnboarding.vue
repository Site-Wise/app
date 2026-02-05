<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
        <Rocket class="w-8 h-8 text-primary-600 dark:text-primary-400" />
      </div>
      <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('newUserOnboarding.welcome') }}
      </h2>
      <p class="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
        {{ t('newUserOnboarding.welcomeSubtitle') }}
      </p>
    </div>

    <!-- Progress Steps -->
    <div class="card p-4 sm:p-6">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
        {{ t('newUserOnboarding.gettingStarted') }}
      </h3>

      <div class="space-y-4">
        <!-- Step 1: Add Vendor -->
        <div
          class="flex items-start gap-4 p-4 rounded-lg transition-colors"
          :class="hasVendors
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-300 dark:border-primary-700'"
        >
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            :class="hasVendors
              ? 'bg-green-100 dark:bg-green-900/40'
              : 'bg-primary-100 dark:bg-primary-900/40'"
          >
            <CheckCircle2 v-if="hasVendors" class="w-6 h-6 text-green-600 dark:text-green-400" />
            <span v-else class="text-lg font-semibold text-primary-600 dark:text-primary-400">1</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ t('newUserOnboarding.steps.addVendor.title') }}
              </h4>
              <span
                v-if="hasVendors"
                class="text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
              >
                {{ t('newUserOnboarding.completed') }}
              </span>
            </div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ t('newUserOnboarding.steps.addVendor.description') }}
            </p>
            <router-link
              v-if="!hasVendors"
              to="/vendors"
              class="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus class="w-4 h-4" />
              {{ t('newUserOnboarding.steps.addVendor.action') }}
            </router-link>
          </div>
        </div>

        <!-- Step 2: Add Delivery or Service Booking (only show when vendors exist) -->
        <div
          v-if="hasVendors"
          class="flex items-start gap-4 p-4 rounded-lg transition-colors"
          :class="hasDeliveriesOrBookings
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-300 dark:border-primary-700'"
        >
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            :class="hasDeliveriesOrBookings
              ? 'bg-green-100 dark:bg-green-900/40'
              : 'bg-primary-100 dark:bg-primary-900/40'"
          >
            <CheckCircle2 v-if="hasDeliveriesOrBookings" class="w-6 h-6 text-green-600 dark:text-green-400" />
            <span v-else class="text-lg font-semibold text-primary-600 dark:text-primary-400">2</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ t('newUserOnboarding.steps.addActivity.title') }}
              </h4>
              <span
                v-if="hasDeliveriesOrBookings"
                class="text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
              >
                {{ t('newUserOnboarding.completed') }}
              </span>
            </div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ t('newUserOnboarding.steps.addActivity.description') }}
            </p>

            <!-- Two action buttons for deliveries and service bookings -->
            <div v-if="!hasDeliveriesOrBookings" class="flex flex-wrap gap-2 mt-3">
              <router-link
                to="/delivery"
                class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Truck class="w-4 h-4" />
                {{ t('newUserOnboarding.steps.addActivity.recordDelivery') }}
              </router-link>
              <router-link
                to="/service-bookings"
                class="inline-flex items-center gap-2 px-4 py-2 bg-secondary-600 hover:bg-secondary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Wrench class="w-4 h-4" />
                {{ t('newUserOnboarding.steps.addActivity.bookService') }}
              </router-link>
            </div>
          </div>
        </div>

        <!-- Locked Step 2 (shown when no vendors yet) -->
        <div
          v-if="!hasVendors"
          class="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 opacity-60"
        >
          <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <Lock class="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-gray-500 dark:text-gray-400">
              {{ t('newUserOnboarding.steps.addActivity.title') }}
            </h4>
            <p class="mt-1 text-sm text-gray-400 dark:text-gray-500">
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
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Package class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h4 class="font-medium text-gray-900 dark:text-white text-sm">
            {{ t('newUserOnboarding.tips.items.title') }}
          </h4>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ t('newUserOnboarding.tips.items.description') }}
          </p>
          <router-link
            to="/items"
            class="inline-flex items-center text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2"
          >
            {{ t('newUserOnboarding.tips.items.action') }}
            <ChevronRight class="w-3 h-3 ml-1" />
          </router-link>
        </div>
      </div>

      <!-- Tip 2: Services -->
      <div class="card p-4 flex items-start gap-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Wrench class="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h4 class="font-medium text-gray-900 dark:text-white text-sm">
            {{ t('newUserOnboarding.tips.services.title') }}
          </h4>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ t('newUserOnboarding.tips.services.description') }}
          </p>
          <router-link
            to="/services"
            class="inline-flex items-center text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2"
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
          <h4 class="font-medium text-gray-900 dark:text-white text-sm">
            {{ t('newUserOnboarding.tips.accounts.title') }}
          </h4>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ t('newUserOnboarding.tips.accounts.description') }}
          </p>
          <router-link
            to="/accounts"
            class="inline-flex items-center text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2"
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
        class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline transition-colors"
      >
        {{ t('newUserOnboarding.skipForNow') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
</script>
