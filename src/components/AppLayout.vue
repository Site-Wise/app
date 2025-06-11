<template>
<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- PWA Prompts -->
    <PWAPrompt />
    
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
            
            <!-- Site Selector for mobile -->
            <div class="lg:hidden">
              <SiteSelector />
            </div>
            
            <!-- Quick action buttons in header for desktop -->
            <div class="hidden md:flex items-center space-x-2">
              <button
                @click="quickAction('item')"
                class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <Package class="mr-1 h-4 w-4" />
                Add Item
              </button>
              <button
                @click="quickAction('vendor')"
                class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <Users class="mr-1 h-4 w-4" />
                Add Vendor
              </button>
              <button
                @click="quickAction('account')"
                class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <CreditCard class="mr-1 h-4 w-4" />
                Add Account
              </button>
              <button
                @click="quickAction('delivery')"
                class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <TruckIcon class="mr-1 h-4 w-4" />
                Record Delivery
              </button>
              <button
                @click="quickAction('payment')"
                class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <DollarSign class="mr-1 h-4 w-4" />
                Record Payment
              </button>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Site Selector for desktop -->
            <div class="hidden lg:block">
              <SiteSelector />
            </div>
            
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
          <span class="text-sm font-medium">{{ action.label }}</span>
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