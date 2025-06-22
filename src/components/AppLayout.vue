<template>
<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- PWA Prompts -->
    <PWAPrompt />
    
    <!-- Sidebar -->
    <div class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0" 
         :class="{ '-translate-x-full': !sidebarOpen, 'translate-x-0': sidebarOpen }">
      <div class="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <router-link class="flex items-center" to="/">
          <img src="/logo.webp" alt="SiteWise Logo" class="h-12 rounded-lg" />
          <span class="ml-2 text-xl font-bold leading-tight text-gray-900 dark:text-white">Site</span>
          <span class="text-xl font-bold leading-tight text-blue-600">Wise</span>
        </router-link>
        <!-- Close button for mobile -->
        <button
          @click="sidebarOpen = false"
          class="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <nav class="mt-4 px-4">
        <div class="space-y-2">
          <router-link
            v-for="item in navigation"
            :key="item.name"
            :to="item.to"
            class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200"
            :class="item.current ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'"
            @click="sidebarOpen = false"
          >
            <component :is="item.icon" class="mr-3 h-5 w-5" />
            {{ t(item.nameKey) }}
          </router-link>
        </div>
      </nav>
    </div>

    <!-- Overlay for mobile -->
    <div 
      v-if="sidebarOpen" 
      @click="sidebarOpen = false"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
    ></div>

    <!-- Main content -->
    <div class="lg:pl-64">
      <!-- Top bar -->
      <div class="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div class="flex items-center space-x-4">
            <button
              @click="sidebarOpen = !sidebarOpen"
              class="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu class="h-6 w-6" />
            </button>
            
            <!-- Site Selector for mobile -->
            <div class="lg:hidden">
              <SiteSelector />
            </div>
            
            <!-- Quick action buttons in header for desktop -->
            <div class="hidden md:flex items-center space-x-2">
              <button
                v-for="action in fabActions"
                :key="action.type"
                @click="quickAction(action.type)"
                class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <component :is="action.icon" class="mr-1 h-4 w-4" />
                <span class="text-sm font-medium">{{ t(action.labelKey) }}</span>
              </button>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Site Selector for desktop -->
            <div class="hidden lg:block">
              <SiteSelector />
            </div>

            <!-- Language Selector -->
            <LanguageSelector class="hidden md:block" />
            
            <!-- Theme Toggle -->
            <ThemeToggle class="hidden md:block" />
            
            <div class="relative inline-block" ref="userMenuRef">
              <button
                @click="userMenuOpen = !userMenuOpen"
                class="flex items-center justify-between p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors duration-200 touch-manipulation w-full md:w-auto"
                :class="{ 'bg-gray-100 dark:bg-gray-700': userMenuOpen }"
                :aria-expanded="userMenuOpen"
                aria-haspopup="true"
              >
                <div class="flex items-center">
                  <div class="relative">
                    <div class="h-8 w-8 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center">
                      <span class="text-white font-medium">{{ userInitials }}</span>
                    </div>
                    <!-- Invitation Badge -->
                    <div v-if="receivedInvitationsCount > 0" class="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span class="text-xs font-bold text-white">{{ receivedInvitationsCount > 9 ? '9+' : receivedInvitationsCount }}</span>
                    </div>
                  </div>
                  <span class="ml-2 text-gray-700 dark:text-gray-300 font-medium text-sm">{{ user?.name }}</span>
                </div>
                <ChevronDown 
                  class="h-3 w-3 ml-1 md:ml-2 transition-transform duration-200" 
                  :class="{ 'rotate-180': userMenuOpen }"
                />
              </button>
              
              <div
                v-if="userMenuOpen"
                class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                role="menu"
              >
                <!-- Invitations Section -->
                <div v-if="receivedInvitationsCount > 0" class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <div class="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                        <Mail class="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span class="text-xs font-medium text-gray-900 dark:text-white">Invitations</span>
                    </div>
                    <span class="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2 py-0.5 rounded-full">{{ receivedInvitationsCount }}</span>
                  </div>
                  <button 
                    @click="goToInvites"
                    class="w-full text-left text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    {{ t('users.viewAllInvitations') }}
                  </button>
                </div>
                
                <!-- User Menu Items -->
                <div class="py-2 max-h-60 overflow-y-auto">
                  <button
                    @click="goToProfile"
                    class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 touch-manipulation group text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <User class="mr-3 h-4 w-4 md:h-5 md:w-5" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ t('nav.profile') }}</div>
                    </div>
                  </button>
                  <button
                    v-if="canManageUsers"
                    @click="goToUserManagement"
                    class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 touch-manipulation group text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <Users class="mr-3 h-4 w-4 md:h-5 md:w-5" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ t('nav.manage_users') }}</div>
                    </div>
                  </button>
                  <button
                    v-if="isOwner"
                    @click="goToSubscription"
                    class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 touch-manipulation group text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <CreditCard class="mr-3 h-4 w-4 md:h-5 md:w-5" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ t('subscription.title') }}</div>
                    </div>
                  </button>
                  <button
                    @click="handleLogout"
                    class="flex items-center w-full px-3 py-2 md:px-4 md:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 touch-manipulation group text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <LogOut class="mr-3 h-4 w-4 md:h-5 md:w-5" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ t('nav.logout') }}</div>
                    </div>
                  </button>
                </div>

                <!-- Mobile Controls Section -->
                <div class="block md:hidden border-t border-gray-200 dark:border-gray-700 mt-1">
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
      <main class="p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
        <router-view />
      </main>
    </div>

    <!-- Mobile Floating Action Button -->
    <div class="md:hidden fixed bottom-6 right-6 z-50">
      <!-- FAB Menu Options -->
      <div
        v-if="fabMenuOpen"
        class="absolute bottom-16 right-0 mb-2 space-y-2 min-w-max"
      >
        <button
          v-for="action in fabActions"
          :key="action.type"
          @click="quickAction(action.type)"
          class="flex items-center w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105"
        >
          <component :is="action.icon" class="mr-3 h-5 w-5" />
          <span class="text-sm font-medium">{{ t(action.labelKey) }}</span>
        </button>
      </div>

      <!-- FAB Button -->
      <button
        @click="fabMenuOpen = !fabMenuOpen"
        class="w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 flex items-center justify-center"
        :class="{ 'rotate-45': fabMenuOpen }"
      >
        <Plus class="h-6 w-6" />
      </button>
    </div>

    <!-- FAB Overlay for mobile -->
    <div 
      v-if="fabMenuOpen" 
      @click="fabMenuOpen = false"
      class="md:hidden fixed inset-0 bg-transparent z-40"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useSite } from '../composables/useSite';
import { useI18n } from '../composables/useI18n';
import { useInvitations } from '../composables/useInvitations';
import ThemeToggle from './ThemeToggle.vue';
import PWAPrompt from './PWAPrompt.vue';
import SiteSelector from './SiteSelector.vue';
import LanguageSelector from './LanguageSelector.vue';
import {
  BarChart3,
  Package,
  Users,
  User,
  FileText,
  TruckIcon,
  CreditCard,
  Menu,
  ChevronDown,
  LogOut,
  Plus,
  X,
  DollarSign,
  Mail,
  Wrench,
  Calendar
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { user, logout } = useAuth();
const { hasSiteAccess, canManageUsers, currentUserRole } = useSite();
const { t } = useI18n();
const { receivedInvitationsCount, loadReceivedInvitations } = useInvitations();

const sidebarOpen = ref(false);
const userMenuOpen = ref(false);
const fabMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

const navigation = computed(() => [
  { name: 'Dashboard', nameKey: 'nav.dashboard', to: '/', icon: BarChart3, current: route.name === 'Dashboard' },
  { name: 'Items', nameKey: 'nav.items', to: '/items', icon: Package, current: route.name === 'Items' },
  { name: 'Services', nameKey: 'nav.services', to: '/services', icon: Wrench, current: route.name === 'Services' },
  { name: 'Vendors', nameKey: 'nav.vendors', to: '/vendors', icon: Users, current: route.name === 'Vendors' },
  { name: 'Quotations', nameKey: 'nav.quotations', to: '/quotations', icon: FileText, current: route.name === 'Quotations' },
  { name: 'Incoming Items', nameKey: 'nav.incoming', to: '/incoming', icon: TruckIcon, current: route.name === 'Incoming' },
  { name: 'Service Bookings', nameKey: 'nav.serviceBookings', to: '/service-bookings', icon: Calendar, current: route.name === 'ServiceBookings' },
  { name: 'Accounts', nameKey: 'nav.accounts', to: '/accounts', icon: CreditCard, current: route.name === 'Accounts' },
  { name: 'Payments', nameKey: 'nav.payments', to: '/payments', icon: CreditCard, current: route.name === 'Payments' },
]);

const fabActions = [
  { type: 'serviceBooking', labelKey: 'quickActions.recordServiceBooking', icon: Calendar },
  { type: 'delivery', labelKey: 'quickActions.recordDelivery', icon: TruckIcon },
  { type: 'payment', labelKey: 'quickActions.recordPayment', icon: DollarSign },
];

const userInitials = computed(() => {
  if (!user.value?.name) return 'U';
  return user.value.name
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

const isOwner = computed(() => currentUserRole.value === 'owner');

const quickAction = (type: string) => {
  if (!hasSiteAccess.value) {
    alert(t('messages.selectSiteFirst'));
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
    delivery: '/incoming',
    payment: '/payments'
  };
  
  const targetRoute = routes[type as keyof typeof routes];
  if (targetRoute) {
    router.push(targetRoute);
    // Add a small delay to ensure navigation completes before triggering modal
    setTimeout(() => {
      // Emit event to trigger add modal on the target page
      window.dispatchEvent(new CustomEvent('show-add-modal'));
    }, 100);
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

const goToSubscription = () => {
  userMenuOpen.value = false;
  router.push('/subscription');
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  // Load invitations when component mounts
  loadReceivedInvitations();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>