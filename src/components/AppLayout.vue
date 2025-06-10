<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar -->
    <div class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0" 
         :class="{ '-translate-x-full': !sidebarOpen, 'translate-x-0': sidebarOpen }">
      <div class="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center space-x-2">
          <HardHat class="h-8 w-8 text-primary-600 dark:text-primary-400" />
          <span class="text-xl font-bold text-gray-900 dark:text-white">ConstructTrack</span>
        </div>
        <!-- Close button for mobile -->
        <button
          @click="sidebarOpen = false"
          class="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <!-- Quick Actions -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div class="space-y-2">
          <router-link
            to="/items"
            @click="showQuickModal('item')"
            class="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
          >
            <Plus class="mr-2 h-4 w-4" />
            Add Item
          </router-link>
          <router-link
            to="/vendors"
            @click="showQuickModal('vendor')"
            class="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
          >
            <Plus class="mr-2 h-4 w-4" />
            Add Vendor
          </router-link>
          <router-link
            to="/incoming"
            @click="showQuickModal('delivery')"
            class="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
          >
            <Plus class="mr-2 h-4 w-4" />
            Record Delivery
          </router-link>
          <router-link
            to="/payments"
            @click="showQuickModal('payment')"
            class="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
          >
            <Plus class="mr-2 h-4 w-4" />
            Record Payment
          </router-link>
        </div>
      </div>
      
      <nav class="mt-4 px-4">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Navigation</h3>
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
            {{ item.name }}
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
            
            <!-- Quick action buttons in header -->
            <div class="hidden md:flex items-center space-x-2">
              <button
                @click="showQuickModal('item')"
                class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <Package class="mr-1 h-4 w-4" />
                Add Item
              </button>
              <button
                @click="showQuickModal('delivery')"
                class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <TruckIcon class="mr-1 h-4 w-4" />
                Record Delivery
              </button>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Theme Toggle -->
            <ThemeToggle />
            
            <div class="relative" ref="userMenuRef">
              <button
                @click="userMenuOpen = !userMenuOpen"
                class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
              >
                <div class="h-8 w-8 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center">
                  <span class="text-white font-medium">{{ userInitials }}</span>
                </div>
                <span class="ml-2 text-gray-700 dark:text-gray-300">{{ user?.name }}</span>
                <ChevronDown class="ml-1 h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
              
              <div
                v-if="userMenuOpen"
                class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
              >
                <button
                  @click="handleLogout"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <LogOut class="inline mr-2 h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Page content -->
      <main class="p-4 sm:p-6 lg:p-8">
        <router-view />
      </main>
    </div>

    <!-- Quick Action Modal -->
    <div v-if="quickModalType" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ quickModalTitle }}
            </h3>
            <button @click="closeQuickModal" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <X class="h-5 w-5" />
            </button>
          </div>
          
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {{ quickModalDescription }}
          </p>
          
          <div class="flex space-x-3">
            <button @click="navigateToPage" class="flex-1 btn-primary">
              Continue
            </button>
            <button @click="closeQuickModal" class="flex-1 btn-outline">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import ThemeToggle from './ThemeToggle.vue';
import {
  HardHat,
  BarChart3,
  Package,
  Users,
  FileText,
  TruckIcon,
  CreditCard,
  Menu,
  ChevronDown,
  LogOut,
  Plus,
  X
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { user, logout } = useAuth();

const sidebarOpen = ref(false);
const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const quickModalType = ref<string | null>(null);

const navigation = computed(() => [
  { name: 'Dashboard', to: '/', icon: BarChart3, current: route.name === 'Dashboard' },
  { name: 'Items', to: '/items', icon: Package, current: route.name === 'Items' },
  { name: 'Vendors', to: '/vendors', icon: Users, current: route.name === 'Vendors' },
  { name: 'Quotations', to: '/quotations', icon: FileText, current: route.name === 'Quotations' },
  { name: 'Incoming Items', to: '/incoming', icon: TruckIcon, current: route.name === 'Incoming' },
  { name: 'Payments', to: '/payments', icon: CreditCard, current: route.name === 'Payments' },
]);

const userInitials = computed(() => {
  if (!user.value?.name) return 'U';
  return user.value.name
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

const quickModalTitle = computed(() => {
  const titles = {
    item: 'Add New Item',
    vendor: 'Add New Vendor',
    delivery: 'Record New Delivery',
    payment: 'Record New Payment'
  };
  return titles[quickModalType.value as keyof typeof titles] || '';
});

const quickModalDescription = computed(() => {
  const descriptions = {
    item: 'Add a new construction item to your inventory with quantities and specifications.',
    vendor: 'Add a new vendor contact with their details and specialties.',
    delivery: 'Record a new delivery with photos, quantities, and payment information.',
    payment: 'Record a payment made to a vendor and update delivery statuses.'
  };
  return descriptions[quickModalType.value as keyof typeof descriptions] || '';
});

const showQuickModal = (type: string) => {
  quickModalType.value = type;
  sidebarOpen.value = false; // Close sidebar on mobile
};

const closeQuickModal = () => {
  quickModalType.value = null;
};

const navigateToPage = () => {
  const routes = {
    item: '/items',
    vendor: '/vendors',
    delivery: '/incoming',
    payment: '/payments'
  };
  
  const targetRoute = routes[quickModalType.value as keyof typeof routes];
  if (targetRoute) {
    router.push(targetRoute);
    // Add a small delay to ensure navigation completes before triggering modal
    setTimeout(() => {
      // Emit event to trigger add modal on the target page
      window.dispatchEvent(new CustomEvent('show-add-modal'));
    }, 100);
  }
  closeQuickModal();
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>