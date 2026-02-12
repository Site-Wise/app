<template>
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 h-nav-safe will-change-transform"
    role="navigation"
    :aria-label="t('nav.mainNavigation')"
  >
    <div class="flex items-center justify-around h-16 px-2">
      <router-link
        v-for="item in primaryNavItems"
        :key="item.name"
        :to="item.to"
        class="flex flex-col items-center justify-center flex-1 h-full touch-feedback touch-none-select"
        :class="[
          item.current
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-500 dark:text-gray-400'
        ]"
        :aria-current="item.current ? 'page' : undefined"
      >
        <component
          :is="item.icon"
          class="h-6 w-6 transition-transform duration-200"
          :class="{ 'scale-110': item.current }"
          :aria-hidden="true"
        />
        <span class="text-xs font-medium truncate max-w-[4rem]">
          {{ t(item.nameKey) }}
        </span>
        <!-- Active indicator pill -->
        <div
          class="w-6 h-1 rounded-full mt-0.5 transition-colors duration-200"
          :class="item.current ? 'bg-primary-600 dark:bg-primary-400' : 'bg-transparent'"
        />
      </router-link>

      <!-- More menu button -->
      <button
        @click="showMoreMenu = !showMoreMenu"
        class="flex flex-col items-center justify-center flex-1 h-full touch-feedback touch-none-select"
        :class="[
          isMoreActive
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-500 dark:text-gray-400'
        ]"
        :aria-expanded="showMoreMenu"
        aria-haspopup="menu"
      >
        <MoreHorizontal
          class="h-6 w-6 transition-transform duration-200"
          :class="{ 'scale-110': isMoreActive }"
          :aria-hidden="true"
        />
        <span class="text-xs font-medium">{{ t('nav.more') }}</span>
        <!-- Active indicator pill -->
        <div
          class="w-6 h-1 rounded-full mt-0.5 transition-colors duration-200"
          :class="isMoreActive ? 'bg-primary-600 dark:bg-primary-400' : 'bg-transparent'"
        />
      </button>
    </div>

    <!-- More menu overlay -->
    <Transition name="bottom-sheet-overlay">
      <div
        v-if="showMoreMenu"
        class="fixed inset-0 bg-black/50 z-40"
        @click="showMoreMenu = false"
      />
    </Transition>

    <!-- More menu bottom sheet -->
    <Transition name="bottom-sheet">
      <div
        v-if="showMoreMenu"
        class="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl pb-safe"
        @click.stop
      >
        <!-- Handle bar -->
        <div class="flex justify-center pt-3 pb-2">
          <div class="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        <!-- Menu items -->
        <div class="px-4 pb-4 max-h-[60vh] overflow-y-auto">
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <router-link
              v-for="item in secondaryNavItems"
              :key="item.name"
              :to="item.to"
              class="flex flex-col items-center justify-center p-4 rounded-xl touch-feedback"
              :class="[
                item.current
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
              ]"
              @click="showMoreMenu = false"
            >
              <component
                :is="item.icon"
                class="h-7 w-7 mb-2"
                :aria-hidden="true"
              />
              <span class="text-xs font-medium text-center leading-tight">
                {{ t(item.nameKey) }}
              </span>
            </router-link>
          </div>
        </div>

        <!-- Cancel button -->
        <div class="px-4 pb-4">
          <button
            @click="showMoreMenu = false"
            class="w-full py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-medium touch-feedback"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '../composables/useI18n';
import {
  BarChart3,
  TruckIcon,
  CreditCard,
  BanknoteArrowDown,
  MoreHorizontal,
  Package,
  Users,
  FileText,
  Calendar,
  Wrench,
  RotateCcw,
  TrendingUp,
  Calculator,
} from 'lucide-vue-next';

const route = useRoute();
const { t } = useI18n();

const showMoreMenu = ref(false);

// Primary nav items shown in bottom bar (most used)
const primaryNavItems = computed(() => [
  {
    name: 'Dashboard',
    nameKey: 'nav.dashboard',
    to: '/',
    icon: BarChart3,
    current: route.name === 'Dashboard',
  },
  {
    name: 'Deliveries',
    nameKey: 'nav.deliveries',
    to: '/deliveries',
    icon: TruckIcon,
    current: route.name === 'Deliveries',
  },
  {
    name: 'Payments',
    nameKey: 'nav.payments',
    to: '/payments',
    icon: BanknoteArrowDown,
    current: route.name === 'Payments',
  },
  {
    name: 'Accounts',
    nameKey: 'nav.accounts',
    to: '/accounts',
    icon: CreditCard,
    current: route.name === 'Accounts',
  },
]);

// Secondary nav items shown in "More" menu
const secondaryNavItems = computed(() => [
  {
    name: 'Items',
    nameKey: 'nav.items',
    to: '/items',
    icon: Package,
    current: route.name === 'Items',
  },
  {
    name: 'Services',
    nameKey: 'nav.services',
    to: '/services',
    icon: Wrench,
    current: route.name === 'Services',
  },
  {
    name: 'Vendors',
    nameKey: 'nav.vendors',
    to: '/vendors',
    icon: Users,
    current: route.name === 'Vendors',
  },
  {
    name: 'Service Bookings',
    nameKey: 'nav.serviceBookings',
    to: '/service-bookings',
    icon: Calendar,
    current: route.name === 'ServiceBookings',
  },
  {
    name: 'Quotations',
    nameKey: 'nav.quotations',
    to: '/quotations',
    icon: FileText,
    current: route.name === 'Quotations',
  },
  {
    name: 'Analytics',
    nameKey: 'nav.analytics',
    to: '/analytics',
    icon: TrendingUp,
    current: route.name === 'Analytics',
  },
  {
    name: 'Tools',
    nameKey: 'nav.tools',
    to: '/tools',
    icon: Calculator,
    current: route.name === 'Tools',
  },
  {
    name: 'Vendor Returns',
    nameKey: 'nav.vendorReturns',
    to: '/vendor-returns',
    icon: RotateCcw,
    current: route.name === 'VendorReturns',
  },
]);

// Check if any secondary item is active
const isMoreActive = computed(() =>
  secondaryNavItems.value.some((item) => item.current)
);
</script>
