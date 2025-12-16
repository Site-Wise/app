<template>
  <div>
    <!-- Desktop Header with Add Button -->
    <div class="hidden md:flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('serviceBookings.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('serviceBookings.subtitle') }}
        </p>
      </div>
      <button 
        @click="handleAddServiceBooking" 
        :disabled="!canCreateServiceBooking"
        :class="[
          canCreateServiceBooking ? 'btn-primary' : 'btn-disabled'
        ]"
        :title="!canCreateServiceBooking ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
        data-keyboard-shortcut="n"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('serviceBookings.bookService') }}
      </button>
    </div>

    <!-- Mobile Header with Search -->
    <div class="md:hidden mb-6">
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('serviceBookings.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('serviceBookings.subtitle') }}
        </p>
      </div>
      
      <!-- Mobile Search Box -->
      <SearchBox
        v-model="searchQuery"
        :placeholder="t('search.serviceBookings')"
        :search-loading="searchLoading"
      />
      
      <!-- Mobile Search Results Summary -->
      <div v-if="searchQuery.trim() && !searchLoading" class="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div class="flex items-center gap-1">
          <span class="font-medium text-gray-900 dark:text-white">{{ searchResultsCount }}</span>
          <span>{{ searchResultsCount === 1 ? t('serviceBookings.result') : t('serviceBookings.results') }}</span>
        </div>
        <div class="h-4 border-l border-gray-300 dark:border-gray-600"></div>
        <div class="flex items-center gap-1">
          <span class="text-xs">{{ t('common.total') }}:</span>
          <span class="font-semibold text-gray-900 dark:text-white">₹{{ searchResultsTotal.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- Desktop Search with Results Summary -->
    <div class="hidden md:block mb-6">
      <div class="flex items-center gap-6">
        <div class="w-96">
          <SearchBox
            v-model="searchQuery"
            :placeholder="t('search.serviceBookings')"
            :search-loading="searchLoading"
          />
        </div>
        
        <!-- Search Results Summary -->
        <div v-if="searchQuery.trim() && !searchLoading" class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div class="flex items-center gap-1">
            <span class="font-medium text-gray-900 dark:text-white">{{ searchResultsCount }}</span>
            <span>{{ searchResultsCount === 1 ? t('serviceBookings.result') : t('serviceBookings.results') }}</span>
          </div>
          <div class="h-4 border-l border-gray-300 dark:border-gray-600"></div>
          <div class="flex items-center gap-1">
            <span class="text-xs">{{ t('common.total') }}:</span>
            <span class="font-semibold text-gray-900 dark:text-white">₹{{ searchResultsTotal.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Bookings Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <!-- Desktop Headers -->
        <thead class="bg-gray-50 dark:bg-gray-700 hidden lg:table-header-group">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('services.service') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('services.vendor') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('serviceBookings.startDate') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('serviceBookings.duration') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('serviceBookings.rate') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.total') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('serviceBookings.progress') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('serviceBookings.paymentStatus') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        
        <!-- Mobile Headers -->
        <thead class="bg-gray-50 dark:bg-gray-700 lg:hidden">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('services.service') }}</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('services.details') }}</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="booking in serviceBookings" :key="booking.id">
            <!-- Desktop Row -->
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ booking.expand?.service?.name || 'Unknown Service' }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ booking.expand?.service?.category || 'Unknown Type' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ booking.expand?.vendor?.contact_person || 'Unknown Vendor' }}
                </div>
                <div v-if="booking.expand?.vendor?.name" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ booking.expand.vendor.name }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              {{ formatDate(booking.start_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              {{ booking.duration }} {{ booking.expand?.service?.unit || 'units' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              ₹{{ booking.unit_rate.toFixed(2) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div class="text-sm text-gray-900 dark:text-white">₹{{ booking.total_amount.toFixed(2) }}</div>
              <div v-if="(booking.paid_amount || 0) > 0" class="text-xs text-green-600 dark:text-green-400">
                {{ t('serviceBookings.paid') }}: ₹{{ (booking.paid_amount || 0).toFixed(2) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div class="flex items-center space-x-2">
                <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${booking.percent_completed || 0}%` }"
                  ></div>
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-400 font-medium min-w-[3rem]">
                  {{ booking.percent_completed || 0 }}%
                </span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <span :class="`status-${booking.payment_status === 'currently_paid_up' ? 'paid' : booking.payment_status}`">
                {{ booking.payment_status === 'currently_paid_up' ? t('serviceBookings.currentlyPaidUp') : t(`common.${booking.payment_status}`) }}
              </span>
              <!-- Show outstanding amount for partial payments -->
              <div v-if="booking.payment_status === 'partial'" class="text-xs text-gray-500 dark:text-gray-400">
                ₹{{ booking.outstanding.toFixed(2) }} pending
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium hidden lg:table-cell">
              <!-- Desktop Action Buttons -->
              <div class="hidden lg:flex items-center space-x-2" @click.stop>
                <button 
                  @click="viewBooking(booking)" 
                  class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" 
                  :title="t('common.view')"
                >
                  <Eye class="h-4 w-4" />
                </button>
                <button 
                  v-if="canEditBooking(booking)"
                  @click="editBooking(booking)" 
                  class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" 
                  :title="t('common.edit')"
                >
                  <Edit2 class="h-4 w-4" />
                </button>
                <button 
                  @click="deleteBooking(booking.id!)" 
                  :disabled="!canDeleteBooking(booking)"
                  :class="[
                    canDeleteBooking(booking) 
                      ? 'text-red-400 hover:text-red-600 dark:hover:text-red-300' 
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                    'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
                  ]"
                  :title="hasPayments(booking) ? t('serviceBookings.cannotDeleteWithPayments') : t('common.deleteAction')"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>

              <!-- Mobile Dropdown Menu -->
              <div class="lg:hidden">
                <CardDropdownMenu
                  :actions="getBookingActions(booking)"
                  @action="handleBookingAction(booking, $event)"
                />
              </div>
            </td>

            <!-- Mobile Row -->
            <td class="px-4 py-4 lg:hidden">
              <div class="flex items-center gap-2 mb-1">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ booking.expand?.vendor?.contact_person || 'Unknown Vendor' }}
                </div>
                <span v-if="booking.expand?.vendor?.name" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ booking.expand.vendor.name }}
                </span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ booking.expand?.service?.name || 'Unknown Service' }}</div>
              <div class="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                {{ formatDate(booking.start_date) }}
              </div>
            </td>
            <td class="px-4 py-4 lg:hidden">
              <div class="text-right">
                <div :class="[
                  'text-sm font-semibold',
                  booking.payment_status === 'paid' 
                    ? 'text-green-600 dark:text-green-400'
                    : booking.payment_status === 'pending'
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-600 dark:text-gray-400'
                ]">
                  ₹{{ booking.total_amount.toFixed(2) }}
                </div>
                <!-- Progress for Mobile -->
                <div class="mt-2">
                  <div class="flex items-center space-x-2">
                    <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        class="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        :style="{ width: `${booking.percent_completed || 0}%` }"
                      ></div>
                    </div>
                    <span class="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      {{ booking.percent_completed || 0 }}%
                    </span>
                  </div>
                </div>
                <!-- Payment Status for Mobile -->
                <div class="mt-1">
                  <span :class="`status-${booking.payment_status === 'currently_paid_up' ? 'paid' : booking.payment_status}`">
                    {{ booking.payment_status === 'currently_paid_up' ? t('serviceBookings.currentlyPaidUp') : t(`common.${booking.payment_status}`) }}
                  </span>
                  <span v-if="booking.payment_status === 'partial'" class="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    (₹{{ booking.outstanding.toFixed(2) }} pending)
                  </span>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 lg:hidden">
              <div class="flex items-center justify-end">
                <CardDropdownMenu
                  :actions="getBookingActions(booking)"
                  @action="handleBookingAction(booking, $event)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="serviceBookings.length === 0" class="text-center py-12">
        <Calendar class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('serviceBookings.noBookings') }}</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('serviceBookings.startBooking') }}</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingBooking" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md m-4 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingBooking ? t('serviceBookings.editBooking') : t('serviceBookings.bookService') }}
          </h3>
          
          <form @submit.prevent="() => saveBooking()" @keydown="handleKeydown" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.service') }}</label>
              <ServiceSearchBox
                ref="serviceInputRef"
                v-model="form.service"
                :services="activeServices"
                :placeholder="t('forms.selectService')"
                :required="true"
                :autofocus="true"
                :disabled="!!(editingBooking && hasPayments(editingBooking))"
                class="mt-1"
                @service-selected="handleServiceSelected"
              />
              <p v-if="editingBooking && hasPayments(editingBooking)" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ t('serviceBookings.cannotChangeServiceWithPayments') }}
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('services.vendor') }}</label>
              <VendorSearchBox
                ref="vendorSearchRef"
                v-model="form.vendor"
                :vendors="vendors"
                :deliveries="[]"
                :service-bookings="[]"
                :payments="[]"
                :placeholder="t('forms.selectProvider')"
                :required="true"
                :disabled="!!(editingBooking && hasPayments(editingBooking))"
                :class="[
                  'mt-1',
                  editingBooking && hasPayments(editingBooking) ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''
                ]"
                @vendor-selected="handleVendorSelected"
              />
              <p v-if="editingBooking && hasPayments(editingBooking)" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ t('serviceBookings.cannotChangeVendorWithPayments') }}
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.startDate') }}</label>
              <input
                ref="startDateInputRef"
                v-model="form.start_date"
                type="date"
                required
                :class="[
                  'input mt-1',
                  editingBooking && hasPayments(editingBooking) ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''
                ]"
                :disabled="!!(editingBooking && hasPayments(editingBooking))"
                @keydown="handleKeydown"
              />
              <p v-if="editingBooking && hasPayments(editingBooking)" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ t('serviceBookings.cannotChangeDateWithPayments') }}
              </p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.duration') }}</label>
                <div class="flex gap-2 mt-1">
                  <input v-model.number="form.duration" type="number" step="0.5" required class="input flex-1" placeholder="0" @input="calculateTotal" />
                  <button
                    v-if="isHourlyService"
                    type="button"
                    @click="openTimeCalculator"
                    class="btn-outline px-3 py-2 flex items-center gap-1 min-w-fit"
                    :title="t('serviceBookings.calculateFromTime')"
                  >
                    <Clock class="h-4 w-4" />
                    <span class="hidden sm:inline">{{ t('serviceBookings.calculate') }}</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.unitRate') }}</label>
                <input 
                  v-model.number="form.unit_rate" 
                  type="number" 
                  step="0.01" 
                  required 
                  class="input mt-1" 
                  placeholder="0.00" 
                  @input="handleUnitRateChange" 
                />
                <div v-if="showUnitRateWarning && editingBooking && hasPayments(editingBooking)" class="mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p class="text-xs text-yellow-800 dark:text-yellow-300">
                    ⚠️ {{ t('serviceBookings.unitRateChangeWarning') }}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.total') }}</label>
              <input v-model.number="form.total_amount" type="number" step="0.01" required class="input mt-1" readonly />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.percentCompleted') }}</label>
              <div class="relative">
                <input 
                  v-model.number="form.percent_completed" 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="1" 
                  required 
                  class="input mt-1 pr-8" 
                  placeholder="0"
                />
                <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm mt-0.5">%</span>
              </div>
            </div>
            
            <!-- <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.paymentStatus') }}</label>
              <select v-model="form.payment_status" required class="input mt-1">
                <option value="pending">{{ t('common.pending') }}</option>
                <option value="partial">{{ t('common.partial') }}</option>
                <option value="paid">{{ t('common.paid') }}</option>
              </select>
            </div> -->
            
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.notes') }}</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" :placeholder="t('forms.serviceNotes')"></textarea>
            </div>
            
            <div class="space-y-3 pt-4">
              <!-- Keyboard shortcut hint for new bookings (desktop only) -->
              <div v-if="!editingBooking" class="hidden sm:block text-xs text-gray-500 dark:text-gray-400 text-center">
                {{ t('common.tip') }}: {{ t('common.keyboardShortcut', { keys: 'Ctrl+Enter' }) }} {{ t('serviceBookings.addAndContinue') }}
              </div>

              <div class="flex space-x-3">
                <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                  <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                  {{ editingBooking ? t('common.update') : t('common.create') }}
                </button>
                <button type="button" @click="closeModal" class="flex-1 btn-outline">
                  {{ t('common.cancel') }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Modal -->
    <div v-if="viewingBooking" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="viewingBooking = null" @keydown.esc="viewingBooking = null" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-4xl m-4 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('serviceBookings.bookingDetails') }}</h3>
            <button @click="viewingBooking = null" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Booking Information -->
            <div class="space-y-4">
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('services.service') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingBooking.expand?.service?.name || 'Unknown Service' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('services.vendor') }}:</span>
                <div class="ml-2 inline-block">
                  <span class="text-gray-900 dark:text-white">{{ viewingBooking.expand?.vendor?.contact_person || 'Unknown Vendor' }}</span>
                  <div v-if="viewingBooking.expand?.vendor?.name" class="text-xs text-gray-500 dark:text-gray-400">
                    {{ viewingBooking.expand.vendor.name }}
                  </div>
                </div>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.startDate') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ formatDateTime(viewingBooking.start_date) }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.duration') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingBooking.duration }} {{ viewingBooking.expand?.service?.unit || 'units' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.total') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">₹{{ viewingBooking.total_amount.toFixed(2) }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.progress') }}:</span>
                <div class="mt-2 flex items-center space-x-3">
                  <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      class="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-300"
                      :style="{ width: `${viewingBooking.percent_completed || 0}%` }"
                    ></div>
                  </div>
                  <span class="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {{ viewingBooking.percent_completed || 0 }}%
                  </span>
                </div>
              </div>
              <div v-if="viewingBooking.notes">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.notes') }}:</span>
                <p class="ml-2 text-gray-600 dark:text-gray-400 mt-1">{{ viewingBooking.notes }}</p>
              </div>
            </div>

            <!-- Completion Photos -->
            <div>
              <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-3">{{ t('serviceBookings.completionPhotos') }}</h4>
              <PhotoGallery 
                v-if="viewingBooking.completion_photos && viewingBooking.completion_photos.length > 0"
                :photos="viewingBooking.completion_photos" 
                :item-id="viewingBooking.id"
                collection="service_bookings"
              />
              <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
                {{ t('serviceBookings.noCompletionPhotos') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Time Calculator Modal -->
    <TimeCalculatorModal
      v-if="showTimeCalculator"
      :current-date="form.start_date"
      :current-duration="form.duration"
      @close="closeTimeCalculator"
      @apply="handleTimeCalculatorApply"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Eye,
  X,
  Clock
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { usePermissions } from '../composables/usePermissions';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useModalState } from '../composables/useModalState';
import { useSiteData } from '../composables/useSiteData';
import { useServiceBookingSearch } from '../composables/useSearch';
import PhotoGallery from '../components/PhotoGallery.vue';
import SearchBox from '../components/SearchBox.vue';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import VendorSearchBox from '../components/VendorSearchBox.vue';
import ServiceSearchBox from '../components/ServiceSearchBox.vue';
import TimeCalculatorModal from '../components/TimeCalculatorModal.vue';
import { 
  serviceBookingService, 
  serviceService,
  vendorService,
  paymentAllocationService,
  ServiceBookingService,
  type ServiceBooking 
} from '../services/pocketbase';

// Extended ServiceBooking with computed payment properties
interface ServiceBookingWithPaymentStatus extends ServiceBooking {
  payment_status: 'pending' | 'partial' | 'paid' | 'currently_paid_up';
  outstanding: number;
}

const { t } = useI18n();
const { canCreate, canUpdate, canDelete } = usePermissions();
const { success: showSuccessToast } = useToast();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { openModal, closeModal: closeModalState } = useModalState();

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults, loadAll } = useServiceBookingSearch();

// Client-side payment status calculation
const paymentAllocations = computed(() => paymentAllocationsData.value || []);

// Helper function to calculate payment status based on allocations
const calculatePaymentStatus = (serviceBooking: ServiceBooking): 'pending' | 'partial' | 'paid' | 'currently_paid_up' => {
  if (!paymentAllocations.value.length) return 'pending';
  
  const allocatedAmount = paymentAllocations.value
    .filter(allocation => allocation.service_booking === serviceBooking.id)
    .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  
  return ServiceBookingService.calculatePaymentStatusFromData(serviceBooking, allocatedAmount);
};

// Helper function to calculate outstanding amount based on progress
const calculateOutstandingAmount = (serviceBooking: ServiceBooking): number => {
  if (!paymentAllocations.value.length) {
    return ServiceBookingService.calculateProgressBasedAmount(serviceBooking);
  }
  
  const allocatedAmount = paymentAllocations.value
    .filter(allocation => allocation.service_booking === serviceBooking.id)
    .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  
  return ServiceBookingService.calculateOutstandingAmountFromData(serviceBooking, allocatedAmount);
};

// Display items: use search results if searching, otherwise all items with calculated payment status
const serviceBookings = computed((): ServiceBookingWithPaymentStatus[] => {
  const baseBookings = searchQuery.value.trim() ? searchResults.value : (allServiceBookingsData.value || []);
  
  // Add computed payment status and outstanding amount to each booking
  return baseBookings.map(booking => ({
    ...booking,
    payment_status: calculatePaymentStatus(booking),
    outstanding: calculateOutstandingAmount(booking)
  }));
});

// Use site data management - Load service bookings
const { data: allServiceBookingsData, reload: reloadBookings } = useSiteData(
  async () => await serviceBookingService.getAll()
);

// Load payment allocations separately
const { data: paymentAllocationsData } = useSiteData(
  async () => {
    try {
      return await paymentAllocationService.getAll();
    } catch (error) {
      console.error('Error loading payment allocations:', error);
      return [];
    }
  }
);

const { data: servicesData } = useSiteData(
  async () => await serviceService.getAll()
);

const { data: vendorsData } = useSiteData(
  async () => await vendorService.getAll()
);

// Computed properties from useSiteData
const services = computed(() => servicesData.value || []);
const vendors = computed(() => vendorsData.value || []);
const showAddModal = ref(false);
const editingBooking = ref<ServiceBooking | null>(null);
const viewingBooking = ref<ServiceBooking | null>(null);
const showTimeCalculator = ref(false);
const loading = ref(false);
const showUnitRateWarning = ref(false);
const originalUnitRate = ref(0);

const serviceInputRef = ref<InstanceType<typeof ServiceSearchBox>>();
const vendorSearchRef = ref();
const startDateInputRef = ref<HTMLInputElement>();

const form = reactive({
  service: '',
  vendor: '',
  start_date: '',
  duration: 0,
  unit_rate: 0,
  total_amount: 0,
  percent_completed: 0,
  notes: ''
});

const activeServices = computed(() => {
  return services.value?.filter(service => service.is_active) || [];
});

const canCreateServiceBooking = computed(() => {
  return canCreate.value && checkCreateLimit('service_bookings') && !isReadOnly.value;
});

// Search results summary computed properties
const searchResultsCount = computed(() => {
  return searchQuery.value.trim() ? serviceBookings.value.length : 0;
});

const searchResultsTotal = computed(() => {
  if (!searchQuery.value.trim() || serviceBookings.value.length === 0) return 0;

  return serviceBookings.value.reduce((total, booking) => {
    return total + (booking.total_amount || 0);
  }, 0);
});

// Check if selected service uses hourly calculation
const selectedService = computed(() => {
  return services.value.find(service => service.id === form.service);
});

const isHourlyService = computed(() => {
  return selectedService.value?.unit === 'hour';
});

const reloadAllData = async () => {
  await reloadBookings();
  // Other data will be reloaded automatically by useSiteData
  
  // Load all items for search functionality
  loadAll();
};

const calculateTotal = () => {
  form.total_amount = form.duration * form.unit_rate;
};

const updateRateFromService = () => {
  const selectedService = services.value?.find(service => service.id === form.service);
  if (selectedService && selectedService.standard_rate) {
    form.unit_rate = selectedService.standard_rate;
    calculateTotal();
  }
};

const handleUnitRateChange = () => {
  calculateTotal();

  // Show warning if editing a booking with payments and unit rate has changed
  if (editingBooking.value && hasPayments(editingBooking.value)) {
    showUnitRateWarning.value = form.unit_rate !== originalUnitRate.value;
  }
};

const handleVendorSelected = (vendor: any) => {
  if (vendor) {
    form.vendor = vendor.id;
  }
};

const handleServiceSelected = (service: any) => {
  if (service) {
    form.service = service.id;
    if (service.standard_rate) {
      form.unit_rate = service.standard_rate;
      calculateTotal();
    }
  }
};

const handleKeydown = async (event: KeyboardEvent) => {
  // CTRL + ENTER to save and keep modal open (for multiple bookings)
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    if (!editingBooking.value && !loading.value) {
      await saveBooking(true); // Keep modal open
    }
  }
};


const saveBooking = async (keepModalOpen = false) => {
  loading.value = true;
  try {
    const data = { ...form };

    // Ensure dates are in proper format (keep as date strings)
    if (data.start_date) {
      data.start_date = data.start_date; // Keep YYYY-MM-DD format
    }

    if (editingBooking.value) {
      await serviceBookingService.update(editingBooking.value.id!, data);
      await reloadAllData();
      showSuccessToast(t('messages.updateSuccess', { item: t('common.serviceBooking') }));
      closeModal();
    } else {
      await serviceBookingService.create(data);
      await reloadAllData();
      showSuccessToast(t('messages.createSuccess', { item: t('common.serviceBooking') }));

      if (keepModalOpen) {
        // Keep modal open for multiple bookings
        // Retain provider and service, clear other fields, focus start date
        const retainedProvider = form.vendor;
        const retainedService = form.service;
        const retainedUnitRate = form.unit_rate;

        Object.assign(form, {
          service: retainedService,
          vendor: retainedProvider,
          start_date: '',
          duration: 0,
          unit_rate: retainedUnitRate,
          total_amount: 0,
          percent_completed: 0,
          notes: ''
        });

        // Focus on start date for next booking
        await nextTick();
        startDateInputRef.value?.focus();
      } else {
        closeModal();
      }
    }
  } catch (error) {
    console.error('Error saving service booking:', error);
    alert(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const formatDateForInput = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD format
};

const editBooking = (booking: ServiceBooking) => {
  editingBooking.value = booking;
  showAddModal.value = true;
  openModal('service-bookings-edit-modal');
  originalUnitRate.value = booking.unit_rate;
  showUnitRateWarning.value = false;
  Object.assign(form, {
    service: booking.service,
    vendor: booking.vendor,
    start_date: formatDateForInput(booking.start_date),
    duration: booking.duration,
    unit_rate: booking.unit_rate,
    total_amount: booking.total_amount,
    percent_completed: booking.percent_completed || 0,
    notes: booking.notes || ''
  });
};

const viewBooking = (booking: ServiceBooking) => {
  viewingBooking.value = booking;
};

const deleteBooking = async (id: string) => {
  if (confirm(t('messages.confirmDelete', { item: t('serviceBookings.booking') }))) {
    try {
      await serviceBookingService.delete(id);
      await reloadAllData();
    } catch (error) {
      console.error('Error deleting service booking:', error);
      // Show specific error message if it's about payments
      if (error instanceof Error && error.message.includes('payments assigned')) {
        alert(t('serviceBookings.cannotDeleteWithPayments'));
      } else {
        alert(t('messages.error'));
      }
    }
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Time calculator functions
const openTimeCalculator = () => {
  showTimeCalculator.value = true;
};

const closeTimeCalculator = () => {
  showTimeCalculator.value = false;
};

const handleTimeCalculatorApply = (duration: number, date: string) => {
  form.duration = duration;
  form.start_date = date;
  calculateTotal();
  closeTimeCalculator();
};

const canEditBooking = (booking: ServiceBooking) => {
  return canUpdate.value && (booking.percent_completed || 0) < 100;
};

const hasPayments = (booking: ServiceBooking) => {
  if (!paymentAllocations.value.length) return false;
  return paymentAllocations.value.some(allocation => allocation.service_booking === booking.id);
};

const canDeleteBooking = (booking: ServiceBooking) => {
  return canDelete.value && !hasPayments(booking);
};

const getBookingActions = (booking: ServiceBooking) => {
  return [
    {
      key: 'view',
      label: t('common.view'),
      icon: Eye,
      variant: 'default' as const
    },
    {
      key: 'edit',
      label: t('common.edit'),
      icon: Edit2,
      variant: 'default' as const,
      disabled: !canEditBooking(booking)
    },
    {
      key: 'delete',
      label: t('common.deleteAction'),
      icon: Trash2,
      variant: 'danger' as const,
      disabled: !canDeleteBooking(booking)
    }
  ];
};

const handleBookingAction = (booking: ServiceBooking, action: string) => {
  switch (action) {
    case 'view':
      viewBooking(booking);
      break;
    case 'edit':
      editBooking(booking);
      break;
    case 'delete':
      deleteBooking(booking.id!);
      break;
  }
};

const handleAddServiceBooking = () => {
  if (canCreateServiceBooking.value) {
    showAddModal.value = true;
    openModal('service-bookings-add-modal');
  }
};

const closeModal = () => {
  showAddModal.value = false;
  closeModalState('service-bookings-add-modal');
  closeModalState('service-bookings-edit-modal');
  editingBooking.value = null;
  showUnitRateWarning.value = false;
  originalUnitRate.value = 0;
  Object.assign(form, {
    service: '',
    vendor: '',
    start_date: '',
    duration: 0,
    unit_rate: 0,
    total_amount: 0,
    percent_completed: 0,
    notes: ''
  });
};

const handleQuickAction = async () => {
  if (canCreate.value) {
    showAddModal.value = true;
    await nextTick();
    serviceInputRef.value?.focus();
  }
};

// Site change is handled automatically by useSiteData

const handleKeyboardShortcut = async (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    if (canCreate.value) {
      showAddModal.value = true;
      await nextTick();
      serviceInputRef.value?.focus();
    }
  }
};

// Event listeners using @vueuse/core
useEventListener(window, 'show-add-modal', handleQuickAction);
useEventListener(window, 'keydown', handleKeyboardShortcut);
</script>