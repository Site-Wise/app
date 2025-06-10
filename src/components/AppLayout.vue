<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <div class="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0" 
         :class="{ '-translate-x-full': !sidebarOpen, 'translate-x-0': sidebarOpen }">
      <div class="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div class="flex items-center space-x-2">
          <HardHat class="h-8 w-8 text-primary-600" />
          <span class="text-xl font-bold text-gray-900">ConstructTrack</span>
        </div>
      </div>
      
      <nav class="mt-8 px-4">
        <div class="space-y-2">
          <router-link
            v-for="item in navigation"
            :key="item.name"
            :to="item.to"
            class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200"
            :class="item.current ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
          >
            <component :is="item.icon" class="mr-3 h-5 w-5" />
            {{ item.name }}
          </router-link>
        </div>
      </nav>
    </div>

    <!-- Main content -->
    <div class="lg:pl-64">
      <!-- Top bar -->
      <div class="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div class="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Menu class="h-6 w-6" />
          </button>
          
          <div class="flex items-center space-x-4">
            <div class="relative" ref="userMenuRef">
              <button
                @click="userMenuOpen = !userMenuOpen"
                class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <div class="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span class="text-white font-medium">{{ userInitials }}</span>
                </div>
                <span class="ml-2 text-gray-700">{{ user?.name }}</span>
                <ChevronDown class="ml-1 h-4 w-4 text-gray-500" />
              </button>
              
              <div
                v-if="userMenuOpen"
                class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
              >
                <button
                  @click="handleLogout"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
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
  LogOut
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { user, logout } = useAuth();

const sidebarOpen = ref(false);
const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

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