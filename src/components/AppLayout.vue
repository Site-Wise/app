<template>
  <div class="min-h-screen bg-cream dark:bg-ink">
    <!-- Top navigation progress bar -->
    <TopProgressBar />

    <!-- PWA Prompts are now in App.vue for all users -->

    <!-- Sidebar -->
    <div
      class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-ink-3 shadow-card transform transition-transform duration-300 ease-in-out lg:translate-x-0"
      :class="{ '-translate-x-full': !sidebarOpen, 'translate-x-0': sidebarOpen }">
      <div class="flex items-center justify-between h-16 px-4 border-b border-stone-200 dark:border-ink-4">
        <router-link class="flex items-center gap-2.5" to="/">
          <img src="/sitewise-mark.svg" alt="Sitewise" class="h-9 w-9" />
          <span class="font-display text-xl font-bold tracking-tight leading-tight text-ink dark:text-cream">Sitewise</span>
        </router-link>
        <!-- Close button for mobile -->
        <button @click="sidebarOpen = false"
          class="lg:hidden p-2 rounded-md text-stone-600 dark:text-stone-300 hover:text-ink dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4"
          :aria-label="t('nav.closeSidebar')">
          <X class="h-5 w-5" />
        </button>
      </div>

      <nav class="mt-4 px-4" role="navigation" :aria-label="t('nav.mainNavigation')">
        <div class="space-y-2">
          <router-link v-for="item in navigation" :key="item.name" :to="item.to"
            class="flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200"
            :class="item.current ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 hover:text-ink dark:hover:text-cream'"
            @click="sidebarOpen = false" :aria-current="item.current ? 'page' : undefined"
            :data-keyboard-shortcut="item.shortcut">
            <component :is="item.icon" class="mr-3 h-5 w-5" :aria-hidden="true" />
            {{ t(item.nameKey) }}
          </router-link>
        </div>
      </nav>
    </div>

    <!-- Overlay for mobile -->
    <div v-if="sidebarOpen" @click="sidebarOpen = false" class="fixed inset-0 bg-black/60 z-40 lg:hidden">
    </div>

    <!-- Main content -->
    <div class="lg:pl-64">
      <!-- Top bar -->
      <div class="sticky top-0 z-40 bg-cream dark:bg-ink border-b border-stone-200 dark:border-ink-4">
        <div class="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div class="flex items-center space-x-4">
            <!-- Site Selector for mobile (hamburger menu removed - using bottom nav) -->
            <div class="lg:hidden">
              <SiteSelector />
            </div>

            <!-- Quick actions: single "+ Record" menu (desktop) -->
            <div v-if="isDashboard" class="hidden md:block relative" ref="quickMenuRef">
              <button @click="quickMenuOpen = !quickMenuOpen"
                class="flex items-center gap-2 h-9 px-3 rounded-md text-sm font-semibold bg-amber-500 text-ink hover:bg-amber-600 transition-colors duration-150 ease-snap active:scale-[0.98]"
                :class="{ 'bg-amber-600': quickMenuOpen }"
                :aria-expanded="quickMenuOpen" aria-haspopup="menu" :aria-label="t('quickActions.title')">
                <Plus class="h-4 w-4" :aria-hidden="true" />
                <span>{{ t('quickActions.record') }}</span>
                <ChevronDown class="h-3 w-3 transition-transform duration-200" :class="{ 'rotate-180': quickMenuOpen }" />
              </button>

              <div v-if="quickMenuOpen"
                class="absolute left-0 mt-2 w-56 bg-white dark:bg-ink-3 rounded-lg shadow-modal border border-stone-200 dark:border-ink-4 z-50 p-1"
                role="menu">
                <button v-for="action in baseFabActions" :key="action.type"
                  @click="quickAction(action.type); quickMenuOpen = false"
                  class="flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-md text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-cream-2 dark:hover:bg-ink-4 hover:text-ink dark:hover:text-cream transition-colors duration-150 ease-snap"
                  role="menuitem">
                  <component :is="action.icon" class="h-4 w-4 text-stone-500 dark:text-stone-400" :aria-hidden="true" />
                  <span>{{ t(action.labelKey) }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-4">
            <!-- Site Selector for desktop -->
            <div class="hidden lg:block" data-tour="site-selector">
              <SiteSelector />
            </div>

            <!-- Language Selector -->
            <LanguageSelector class="hidden md:block" />

            <!-- Theme Toggle -->
            <ThemeToggle class="hidden md:block" />

            <div class="relative inline-block" ref="userMenuRef">
              <button @click="userMenuOpen = !userMenuOpen"
                class="flex items-center justify-between p-2 rounded-md text-stone-600 hover:text-ink hover:bg-stone-100 dark:text-stone-300 dark:hover:text-cream dark:hover:bg-ink-4 transition-colors duration-200 ease-snap active:scale-[0.98] touch-manipulation w-full md:w-auto"
                :class="{ 'bg-stone-100 dark:bg-ink-4': userMenuOpen }" :aria-expanded="userMenuOpen"
                aria-haspopup="menu" :aria-label="t('nav.userMenu')">
                <div class="flex items-center">
                  <div class="relative">
                    <div
                      class="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center">
                      <span class="font-display text-ink font-bold text-sm">{{ userInitials }}</span>
                    </div>
                    <!-- Invitation Badge -->
                    <div v-if="receivedInvitationsCount > 0"
                      class="absolute -top-1 -right-1 h-5 w-5 bg-clay-500 rounded-full flex items-center justify-center">
                      <span class="font-mono text-xs font-bold text-white">{{ receivedInvitationsCount > 9 ? '9+' :
                        receivedInvitationsCount }}</span>
                    </div>
                  </div>
                  <span class="hidden md:block ml-2 text-stone-700 dark:text-stone-300 font-medium text-sm">{{ user?.name }}</span>
                </div>
                <ChevronDown class="h-3 w-3 ml-1 md:ml-2 transition-transform duration-200"
                  :class="{ 'rotate-180': userMenuOpen }" />
              </button>

              <div v-if="userMenuOpen"
                ref="userMenuRef"
                class="absolute right-0 mt-2 w-48 bg-white dark:bg-ink-3 rounded-lg shadow-modal border border-stone-200 dark:border-ink-4 z-50"
                role="menu"
                tabindex="-1"
                @keydown="handleUserMenuKeydown"
                @click="handleUserMenuClick">
                <!-- Invitations Section -->
                <div v-if="receivedInvitationsCount > 0"
                  class="px-4 py-3 border-b border-stone-200 dark:border-ink-4">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <div class="p-1 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                        <Mail class="h-3 w-3 text-amber-700 dark:text-amber-400" />
                      </div>
                      <span class="text-xs font-medium text-ink dark:text-cream">Invitations</span>
                    </div>
                    <span
                      class="bg-clay-100 dark:bg-clay-900/30 text-clay-800 dark:text-clay-300 font-mono text-xs px-2 py-0.5 rounded-full">{{
                      receivedInvitationsCount }}</span>
                  </div>
                  <button @click="goToInvites"
                    class="w-full text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors">
                    {{ t('users.viewAllInvitations') }}
                  </button>
                </div>

                <!-- User Menu Items -->
                <div class="py-2 max-h-60 overflow-y-auto">
                  <button @click="goToProfile"
                    class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-stone-50 dark:hover:bg-ink-4 transition-colors duration-200 touch-manipulation group text-stone-700 dark:text-stone-300 focus:bg-stone-50 dark:focus:bg-ink-4 focus:outline-none"
                    role="menuitem"
                    tabindex="-1">
                    <User class="mr-3 h-4 w-4 md:h-5 md:w-5" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ t('nav.profile') }}</div>
                    </div>
                  </button>
                  <button v-if="canManageUsers" @click="goToUserManagement"
                    class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-stone-50 dark:hover:bg-ink-4 transition-colors duration-200 touch-manipulation group text-stone-700 dark:text-stone-300 focus:bg-stone-50 dark:focus:bg-ink-4 focus:outline-none"
                    role="menuitem"
                    tabindex="-1">
                    <Users class="mr-3 h-4 w-4 md:h-5 md:w-5" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ t('nav.manage_users') }}</div>
                    </div>
                  </button>
                  <!-- Subscription menu temporarily hidden -->
                  <!--
                  <button v-if="isOwner" @click="goToSubscription"
                    class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 touch-manipulation group text-gray-700 dark:text-gray-300"
                    role="menuitem">
                    <CreditCard class="mr-3 h-4 w-4 md:h-5 md:w-5" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ t('subscription.title') }}</div>
                    </div>
                  </button>
                  -->
                  <button @click="restartTour"
                    class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-stone-50 dark:hover:bg-ink-4 transition-colors duration-200 touch-manipulation group text-stone-700 dark:text-stone-300 focus:bg-stone-50 dark:focus:bg-ink-4 focus:outline-none"
                    role="menuitem"
                    tabindex="-1">
                    <HelpCircle class="mr-3 h-4 w-4 md:h-5 md:w-5" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ t('nav.helpTour') }}</div>
                    </div>
                  </button>
                  <button @click="handleLogout"
                    class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-stone-50 dark:hover:bg-ink-4 transition-colors duration-200 touch-manipulation group text-stone-700 dark:text-stone-300 focus:bg-stone-50 dark:focus:bg-ink-4 focus:outline-none"
                    role="menuitem"
                    tabindex="-1">
                    <LogOut class="mr-3 h-4 w-4 md:h-5 md:w-5" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ t('nav.logout') }}</div>
                    </div>
                  </button>
                </div>

                <!-- App Version -->
                <div class="px-4 py-2 border-t border-stone-200 dark:border-ink-4">
                  <p class="text-xs text-stone-500 dark:text-stone-400">
                    {{ t('common.version') }}: <span class="font-mono sw-tabular">{{ appVersion }}</span>
                  </p>
                </div>

                <!-- Mobile Controls Section -->
                <div class="block md:hidden border-t border-stone-200 dark:border-ink-4 mt-1">
                  <!-- Language and Theme side by side -->
                  <div class="flex justify-center items-center space-x-2">
                    <LanguageSelector />
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Page content -->
      <main class="p-4 sm:p-6 lg:p-8 pb-safe-nav lg:pb-8 scroll-smooth-touch">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Bottom Navigation Bar for Mobile -->
    <BottomNavBar />

    <!-- Mobile Floating Action Button - Now positioned above bottom nav -->
    <div v-if="!isAnyModalOpen && currentRouteFabAction" class="lg:hidden fixed bottom-20 right-4 z-40 mb-safe-bottom">
      <!-- FAB Menu Options -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-4 scale-95"
      >
        <div v-if="fabMenuOpen" class="absolute bottom-16 right-0 mb-2 space-y-2 min-w-max">
          <button v-for="(action, index) in fabActions" :key="action.type" @click="quickAction(action.type)" :class="[
            'flex items-center w-full px-4 py-3 rounded-lg shadow-card border transition-all duration-200 ease-snap active:scale-[0.98] touch-feedback',
            index === 0 && action.type === currentRouteFabAction?.type
              ? 'bg-amber-500 text-ink border-amber-600'
              : 'bg-white dark:bg-ink-3 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-ink-4'
          ]">
            <component :is="action.icon" :class="[
              'mr-3 h-5 w-5',
              index === 0 && action.type === currentRouteFabAction?.type ? 'text-ink' : ''
            ]" />
            <span class="text-sm font-medium">{{ t(action.labelKey) }}</span>
          </button>
        </div>
      </Transition>

      <!-- FAB Button -->
      <button @click="fabMenuOpen = !fabMenuOpen" :class="[
        'w-14 h-14 text-ink rounded-xl shadow-card transition-all duration-200 ease-snap active:scale-[0.98] touch-feedback flex items-center justify-center',
        { 'rotate-45': fabMenuOpen },
        'bg-amber-500 hover:bg-amber-600'
      ]" :aria-label="t('nav.quickActions')" :aria-expanded="fabMenuOpen" aria-haspopup="menu">
        <Plus class="h-6 w-6" />
      </button>
    </div>

    <!-- FAB Overlay for mobile -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="fabMenuOpen && !isAnyModalOpen" @click="fabMenuOpen = false" class="lg:hidden fixed inset-0 bg-black/40 z-30"></div>
    </Transition>
    
    <!-- Keyboard Shortcut Tooltip System -->
    <KeyboardShortcutTooltip />

    <!-- Dev-only update trigger -->
    <button 
      v-if="isDev"
      @click="showUpdateDuringDev"
      class="fixed bottom-20 right-4 bg-clay-500 text-white p-2 rounded-full shadow-card"
    >
      Test Update
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useSite } from '../composables/useSite';
import { useI18n } from '../composables/useI18n';
import { useToast } from '../composables/useToast';
import { useInvitations } from '../composables/useInvitations';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { useOnboarding } from '../composables/useOnboarding';
import ThemeToggle from './ThemeToggle.vue';
import SiteSelector from './SiteSelector.vue';
import LanguageSelector from './LanguageSelector.vue';
import KeyboardShortcutTooltip from './KeyboardShortcutTooltip.vue';
import BottomNavBar from './BottomNavBar.vue';
import TopProgressBar from './TopProgressBar.vue';
import {
  BarChart3,
  Package,
  Users,
  User,
  FileText,
  TruckIcon,
  CreditCard,
  BanknoteArrowDown,
  ChevronDown,
  LogOut,
  Plus,
  X,
  DollarSign,
  Mail,
  Wrench,
  Calendar,
  RotateCcw,
  HelpCircle,
  TrendingUp,
  Calculator
} from 'lucide-vue-next';

import { usePWAUpdate } from '../composables/usePWAUpdate';
import { useModalState, handlePopState, resetModalStack, setHistoryIntegrationEnabled } from '../composables/useModalState';
import { useBodyScrollLock } from '../composables/useBodyScrollLock';
import { usePlatform } from '../composables/usePlatform';
import { requestQuickActionModal } from '../composables/useQuickActionModal';

const pwaUpdate = usePWAUpdate();

const isDev = import.meta.env.DEV;

const showUpdateDuringDev = () => {
  if (isDev && pwaUpdate.simulateUpdateAndReload) {
    pwaUpdate.simulateUpdateAndReload();
  }
};

const route = useRoute();
const router = useRouter();
// The global "+ Record" quick-action lives only on the dashboard. Every list page
// has its own contextual add button, so it's redundant (and was race-prone) elsewhere.
const isDashboard = computed(() => route.name === 'Dashboard');
const { user, logout } = useAuth();
const { hasSiteAccess, canManageUsers } = useSite();
const { t } = useI18n();
const { warning: showWarning } = useToast();
const { autoStartTour, resetTour, getOnboardingDebugInfo } = useOnboarding();
const { receivedInvitationsCount, loadReceivedInvitations } = useInvitations();
const { } = useKeyboardShortcuts(); // Initialize keyboard shortcuts system
const { isAnyModalOpen } = useModalState();
const { platformInfo } = usePlatform();

// Central body-scroll-lock: locks/unlocks the body whenever the modal stack
// transitions between 0 and >0 open overlays (mounted once, here).
useBodyScrollLock();

const sidebarOpen = ref(false);
const userMenuOpen = ref(false);
const fabMenuOpen = ref(false);
const quickMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const quickMenuRef = ref<HTMLElement | null>(null);
const appVersion = ref(__APP_VERSION__);

const navigation = computed(() => [
  { name: 'Dashboard', nameKey: 'nav.dashboard', to: '/', icon: BarChart3, current: route.name === 'Dashboard', shortcut: 'd' },
  { name: 'Items', nameKey: 'nav.items', to: '/items', icon: Package, current: route.name === 'Items', shortcut: 'i' },
  { name: 'Services', nameKey: 'nav.services', to: '/services', icon: Wrench, current: route.name === 'Services', shortcut: 's' },
  { name: 'Vendors', nameKey: 'nav.vendors', to: '/vendors', icon: Users, current: route.name === 'Vendors', shortcut: 'v' },
  { name: 'Deliveries', nameKey: 'nav.deliveries', to: '/deliveries', icon: TruckIcon, current: route.name === 'Deliveries', shortcut: 'e' },
  { name: 'Service Bookings', nameKey: 'nav.serviceBookings', to: '/service-bookings', icon: Calendar, current: route.name === 'ServiceBookings', shortcut: 'b' },
  { name: 'Quotations', nameKey: 'nav.quotations', to: '/quotations', icon: FileText, current: route.name === 'Quotations', shortcut: 'q' },
  { name: 'Accounts', nameKey: 'nav.accounts', to: '/accounts', icon: CreditCard, current: route.name === 'Accounts', shortcut: 'a' },
  { name: 'Payments', nameKey: 'nav.payments', to: '/payments', icon: BanknoteArrowDown, current: route.name === 'Payments', shortcut: 'p' },
  { name: 'Analytics', nameKey: 'nav.analytics', to: '/analytics', icon: TrendingUp, current: route.name === 'Analytics', shortcut: 'y' },
  { name: 'Tools', nameKey: 'nav.tools', to: '/tools', icon: Calculator, current: route.name === 'Tools', shortcut: 't' },
  { name: 'Vendor Returns', nameKey: 'nav.vendorReturns', to: '/vendor-returns', icon: RotateCcw, current: route.name === 'VendorReturns', shortcut: 'r' },
]);

const baseFabActions = [
  { type: 'serviceBooking', labelKey: 'quickActions.recordServiceBooking', icon: Calendar },
  { type: 'delivery', labelKey: 'quickActions.recordDelivery', icon: TruckIcon },
  { type: 'payment', labelKey: 'quickActions.recordPayment', icon: DollarSign },
];

// Reorder FAB actions to show current page's action first, and add it if not in baseFabActions
const fabActions = computed(() => {
  const currentRouteAction = currentRouteFabAction.value;

  if (!currentRouteAction) {
    // No current route action, return base actions
    return baseFabActions;
  }

  // Check if current route action is already in baseFabActions
  const existingAction = baseFabActions.find(action => action.type === currentRouteAction.type);

  if (existingAction) {
    // Current action exists in base actions, reorder to put it first
    const otherActions = baseFabActions.filter(action => action.type !== currentRouteAction.type);
    return [existingAction, ...otherActions];
  } else {
    // Current action doesn't exist in base actions, add it first
    return [currentRouteAction, ...baseFabActions];
  }
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



// Conceptual FAB action for current route (complete object like baseFabActions elements)
const currentRouteFabAction = computed(() => {
  const routeToActionConfig = {
    '/service-bookings': { type: 'serviceBooking', labelKey: 'quickActions.recordServiceBooking' },
    '/deliveries': { type: 'delivery', labelKey: 'quickActions.recordDelivery' },
    '/payments': { type: 'payment', labelKey: 'quickActions.recordPayment' },
    '/accounts': { type: 'account', labelKey: 'accounts.addAccount' },
    '/quotations': { type: 'quotation', labelKey: 'quotations.addQuotation' },
    '/items': { type: 'item', labelKey: 'items.addItem' },
    '/vendors': { type: 'vendor', labelKey: 'vendors.addVendor' },
    '/services': { type: 'service', labelKey: 'services.addService' }
  };

  const actionConfig = routeToActionConfig[route.path as keyof typeof routeToActionConfig];
  if (!actionConfig) return null;

  // Find the corresponding navigation item to get the icon
  const navItem = navigation.value.find(nav => nav.to === route.path);
  if (!navItem) return null;

  return {
    type: actionConfig.type,
    labelKey: actionConfig.labelKey,
    icon: navItem.icon
  };
});


const quickAction = (type: string) => {
  if (!hasSiteAccess.value) {
    showWarning(t('messages.selectSiteFirst'));
    return;
  }

  // Close mobile menu
  fabMenuOpen.value = false;
  sidebarOpen.value = false;

  const routes = {
    item: '/items',
    vendor: '/vendors',
    account: '/accounts',
    serviceBooking: '/service-bookings',
    delivery: '/deliveries',
    payment: '/payments',
    quotation: '/quotations',
    service: '/services'
  };

  const targetRoute = routes[type as keyof typeof routes];
  if (targetRoute) {
    // Persist the intent BEFORE navigating; the destination view consumes it
    // once it's mounted and ready (survives lazy route-chunk + site-data loads).
    requestQuickActionModal();
    router.push(targetRoute);
  }
};

const handleLogout = () => {
  logout();
  router.push('/login');
};

const handleClickOutside = (event: Event) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    userMenuOpen.value = false;
  }
  if (quickMenuRef.value && !quickMenuRef.value.contains(event.target as Node)) {
    quickMenuOpen.value = false;
  }
};

const goToInvites = () => {
  userMenuOpen.value = false;
  router.push('/invites');
};

const goToProfile = () => {
  userMenuOpen.value = false;
  router.push('/profile');
};

const goToUserManagement = () => {
  userMenuOpen.value = false;
  router.push('/users');
};


const restartTour = () => {
  userMenuOpen.value = false;
  
  // Reset the current page's tour and use the centralized composable to restart it
  const tourId = route.name?.toString().toLowerCase() || 'dashboard';
  resetTour(tourId);
  
  // Trigger the centralized autoStartTour which has all routes properly defined
  setTimeout(() => {
    autoStartTour();
  }, 100);
};

// Keyboard navigation for user menu
const handleUserMenuKeydown = (event: KeyboardEvent) => {
  if (!userMenuRef.value) return;
  
  const menuItems = userMenuRef.value.querySelectorAll('[role="menuitem"]');
  const currentFocus = document.activeElement;
  let currentIndex = Array.from(menuItems).indexOf(currentFocus as Element);
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      currentIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
      (menuItems[currentIndex] as HTMLElement).focus();
      break;
    case 'ArrowUp':
      event.preventDefault();
      currentIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
      (menuItems[currentIndex] as HTMLElement).focus();
      break;
    case 'Escape':
      event.preventDefault();
      userMenuOpen.value = false;
      break;
    case 'Tab':
      // Allow normal tab behavior but close menu if tabbing out
      if (event.shiftKey && currentIndex === 0) {
        userMenuOpen.value = false;
      } else if (!event.shiftKey && currentIndex === menuItems.length - 1) {
        userMenuOpen.value = false;
      }
      break;
  }
};

const handleUserMenuClick = (event: Event) => {
  // Don't close menu if clicking inside it unless it's a menu item
  const target = event.target as HTMLElement;
  if (target.getAttribute('role') === 'menuitem') {
    userMenuOpen.value = false;
  }
};

// Focus management for user menu
watch(userMenuOpen, (isOpen) => {
  if (isOpen && userMenuRef.value) {
    nextTick(() => {
      const firstMenuItem = userMenuRef.value?.querySelector('[role="menuitem"]') as HTMLElement;
      if (firstMenuItem) {
        firstMenuItem.focus();
      }
    });
  }
});

// Platform gating for per-modal history integration. usePlatform() resolves
// asynchronously; we DEFAULT to enabled web behaviour (safe — desktop never
// presses a hardware back button). Once resolved, disable the synthetic
// pushState on Tauri DESKTOP so it doesn't interfere with native window-close.
watch(
  () => platformInfo.value,
  (info) => {
    if (info.isTauri && info.isDesktop) {
      setHistoryIntegrationEnabled(false);
    } else {
      setHistoryIntegrationEnabled(true);
    }
  },
  { immediate: true }
);

// Hardware/browser BACK while an overlay is open closes the topmost overlay
// instead of navigating. AppLayout mounts only AFTER App.vue's
// isReadyForRouting && hasSiteAccess gate, so this listener never runs during
// the loading skeleton phase. handlePopState never calls router.push/redirect
// and never touches isReadyForRouting (App.vue boot-fix safe).
const onPopState = () => handlePopState();

// A guard redirect mid-modal must not leave orphaned overlays/history entries
// or a stale scroll-lock — flush the modal stack on every route change.
const stopAfterEach = router.afterEach(() => {
  resetModalStack();
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('popstate', onPopState);
  // Load invitations when component mounts
  loadReceivedInvitations();

  // Make debug info available in console
  (window as any).onboardingDebug = getOnboardingDebugInfo;

  // Start onboarding tour if needed - only on initial load
  setTimeout(() => autoStartTour(), 100);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('popstate', onPopState);
  stopAfterEach();
});
</script>