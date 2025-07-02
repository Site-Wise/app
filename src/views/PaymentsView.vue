<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('payments.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('payments.subtitle') }}
        </p>
      </div>
      <button 
        @click="handleAddPayment" 
        :disabled="!canCreatePayment"
        :class="[
          canCreatePayment ? 'btn-primary' : 'btn-disabled',
          'hidden md:flex items-center'
        ]"
        :title="!canCreatePayment ? t('subscription.banner.freeTierLimitReached') : ''"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('payments.recordPayment') }}
      </button>
    </div>

    <!-- Search Box -->
    <div class="mb-6">
      <div class="max-w-md">
        <SearchBox
          v-model="searchQuery"
          :placeholder="t('search.payments')"
          :search-loading="searchLoading"
        />
      </div>
    </div>

    <!-- Payments Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <!-- Desktop Headers -->
        <thead class="bg-gray-50 dark:bg-gray-700 hidden lg:table-header-group">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.vendor') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.account') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.amount') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.date') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.reference') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        
        <!-- Mobile Headers -->
        <thead class="bg-gray-50 dark:bg-gray-700 lg:hidden">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.vendor') }}</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.account') }}</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="payment in payments" :key="payment.id">
            <!-- Desktop Row -->
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ payment.expand?.vendor?.name || t('common.unknown') + ' ' + t('common.vendor') }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div class="flex items-center">
                <component :is="getAccountIcon(payment.expand?.account?.type)" class="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <div class="text-sm text-gray-900 dark:text-white">{{ payment.expand?.account?.name || t('common.unknown') + ' ' + t('common.account') }}</div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
              <div class="text-sm font-medium text-gray-900 dark:text-white">₹{{ payment.amount.toFixed(2) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              {{ formatDate(payment.payment_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              {{ payment.reference || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium hidden lg:table-cell">
              <div class="flex items-center space-x-2">
                <button @click="viewPayment(payment)" class="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300" :title="t('common.view')">
                  <Eye class="h-4 w-4" />
                </button>
              </div>
            </td>

            <!-- Mobile Row -->
            <td class="px-4 py-4 lg:hidden">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ payment.expand?.vendor?.name || t('common.unknown') + ' ' + t('common.vendor') }}</div>
              <div class="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                {{ formatDate(payment.payment_date) }}
              </div>
            </td>
            <td class="px-4 py-4 lg:hidden">
              <div class="text-right">
                <div class="text-sm font-semibold text-green-600 dark:text-green-400">₹{{ payment.amount.toFixed(2) }}</div>
                <div class="flex items-center justify-end mt-1">
                  <component :is="getAccountIcon(payment.expand?.account?.type)" class="mr-1 h-3 w-3 text-gray-500 dark:text-gray-400" />
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ payment.expand?.account?.name || t('common.unknown') }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 lg:hidden">
              <div class="relative flex items-center justify-end">
                <button 
                  @click="toggleMobileMenu(payment.id!)"
                  class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  :title="t('common.actions')"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                  </svg>
                </button>
                
                <!-- Mobile Actions Menu -->
                <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <div 
                    v-if="openMobileMenuId === payment.id"
                    class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[120px] origin-top-right"
                    @click.stop
                  >
                    <button 
                      @click="viewPayment(payment); closeMobileMenu()"
                      class="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <Eye class="h-4 w-4 mr-2" />
                      {{ t('common.view') }}
                    </button>
                  </div>
                </Transition>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="payments.length === 0" class="text-center py-12">
        <CreditCard class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No payments recorded</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Start tracking by recording a payment.</p>
      </div>
    </div>

    <!-- Outstanding Amounts by Vendor -->
    <div class="mt-8 card">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Outstanding Amounts by Vendor</h2>
      <div class="space-y-4">
        <div v-for="vendor in vendorsWithOutstanding" :key="vendor.id" class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="mb-3 sm:mb-0">
            <h3 class="font-medium text-gray-900 dark:text-white">{{ vendor.name }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ vendor.pendingItems }} pending deliveries</p>
          </div>
          <div class="flex items-center justify-between sm:block sm:text-right">
            <p class="text-lg font-semibold text-gray-900 dark:text-white">₹{{ vendor.outstandingAmount.toFixed(2) }}</p>
            <button 
              @click="quickPayment(vendor)" 
              :disabled="!canCreatePayment"
              :class="[
                canCreatePayment 
                  ? 'text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300' 
                  : 'text-sm text-gray-300 dark:text-gray-600 cursor-not-allowed',
                'ml-3 sm:ml-0'
              ]"
            >
              Pay Now
            </button>
          </div>
        </div>
        
        <div v-if="vendorsWithOutstanding.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          No outstanding amounts
        </div>
      </div>
    </div>

    <!-- Add Payment Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Record New Payment</h3>
          
          <form @submit.prevent="savePayment" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}</label>
              <select ref="vendorInputRef" v-model="form.vendor" required class="input mt-1" @change="loadVendorOutstanding" autofocus>
                <option value="">{{ t('forms.selectVendor') }}</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentAccount') }}</label>
              <select v-model="form.account" required class="input mt-1">
                <option value="">{{ t('forms.selectAccount') }}</option>
                <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                  {{ account.name }} ({{ account.type.replace('_', ' ') }}) - ₹{{ account.current_balance.toFixed(2) }}
                </option>
              </select>
            </div>
            
            <div v-if="form.vendor && vendorOutstanding > 0" class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p class="text-sm text-yellow-800 dark:text-yellow-300">
                Outstanding amount for this vendor: <strong>₹{{ vendorOutstanding.toFixed(2) }}</strong>
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.amount') }}</label>
              <input v-model.number="form.amount" type="number" step="0.01" required class="input mt-1" placeholder="0.00" @input="updateSelectableItems" />
            </div>
            
            <!-- Deliveries/Bookings Selection -->
            <div v-if="form.vendor && form.amount > 0 && (selectableDeliveries.length > 0 || selectableBookings.length > 0)" class="space-y-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.selectItemsToPay') }}</label>
              
              <!-- Deliveries -->
              <div v-if="selectableDeliveries.length > 0">
                <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{{ t('common.deliveries') }}</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <label v-for="delivery in selectableDeliveries" :key="delivery.id" class="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      :value="delivery.id" 
                      v-model="form.deliveries"
                      @change="updateAmountFromSelection"
                      class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div class="flex-1 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-900 dark:text-white">{{ formatDate(delivery.delivery_date) }}</span>
                        <span class="font-medium text-gray-900 dark:text-white">₹{{ delivery.outstanding.toFixed(2) }}</span>
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        Total: ₹{{ delivery.total_amount.toFixed(2) }} | Paid: ₹{{ delivery.paid_amount.toFixed(2) }}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              
              <!-- Service Bookings -->
              <div v-if="selectableBookings.length > 0">
                <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{{ t('common.serviceBookings') }}</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <label v-for="booking in selectableBookings" :key="booking.id" class="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      :value="booking.id" 
                      v-model="form.service_bookings"
                      @change="updateAmountFromSelection"
                      class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div class="flex-1 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-900 dark:text-white">{{ booking.expand?.service?.name || 'Service' }}</span>
                        <span class="font-medium text-gray-900 dark:text-white">₹{{ booking.outstanding.toFixed(2) }}</span>
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatDate(booking.start_date) }} | Total: ₹{{ booking.total_amount.toFixed(2) }}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentDate') }}</label>
              <input v-model="form.transaction_date" type="date" required class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
              <input v-model="form.reference" type="text" class="input mt-1" placeholder="Check number, transfer ID, etc." />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" placeholder="Payment notes"></textarea>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                Record Payment
              </button>
              <button type="button" @click="closeModal" class="flex-1 btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Payment Modal -->
    <div v-if="viewingPayment" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Details</h3>
          
          <div class="space-y-4">
            <div>
              <span class="font-medium text-gray-700 dark:text-gray-300">Vendor:</span>
              <span class="ml-2 text-gray-900 dark:text-white">{{ viewingPayment.expand?.vendor?.name || 'Unknown Vendor' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700 dark:text-gray-300">Account:</span>
              <div class="ml-2 flex items-center">
                <component :is="getAccountIcon(viewingPayment.expand?.account?.type)" class="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span class="text-gray-900 dark:text-white">{{ viewingPayment.expand?.account?.name || 'Unknown Account' }}</span>
              </div>
            </div>
            <div>
              <span class="font-medium text-gray-700 dark:text-gray-300">Amount:</span>
              <span class="ml-2 text-gray-900 dark:text-white">₹{{ viewingPayment.amount.toFixed(2) }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700 dark:text-gray-300">Payment Date:</span>
              <span class="ml-2 text-gray-900 dark:text-white">{{ formatDate(viewingPayment.payment_date) }}</span>
            </div>
            <div v-if="viewingPayment.reference">
              <span class="font-medium text-gray-700 dark:text-gray-300">Reference:</span>
              <span class="ml-2 text-gray-900 dark:text-white">{{ viewingPayment.reference }}</span>
            </div>
            <div v-if="viewingPayment.notes">
              <span class="font-medium text-gray-700 dark:text-gray-300">Notes:</span>
              <p class="ml-2 text-gray-600 dark:text-gray-400">{{ viewingPayment.notes }}</p>
            </div>
            <!-- Related return info if available -->
            <div v-if="viewingPayment.expand?.related_return">
              <span class="font-medium text-gray-700 dark:text-gray-300">Related Return:</span>
              <div class="ml-2 mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <p class="text-sm font-medium text-gray-900 dark:text-white">Return Date: {{ formatDate(viewingPayment.expand.related_return.return_date) }}</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">Amount: ₹{{ viewingPayment.expand.related_return.total_return_amount.toFixed(2) }}</p>
              </div>
            </div>
          </div>
          
          <!-- Payment Allocations -->
          <div v-if="viewingPaymentAllocations.length > 0" class="mt-6">
            <h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">{{ t('payments.paidFor') }}</h4>
            <div v-if="loadingAllocations" class="flex items-center justify-center py-4">
              <Loader2 class="h-5 w-5 animate-spin text-gray-500" />
            </div>
            <div v-else class="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead class="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('common.type') }}</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('common.date') }}</th>
                    <th class="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('common.amount') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
                  <tr v-for="allocation in viewingPaymentAllocations" :key="allocation.id" class="hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td class="px-4 py-3 text-sm">
                      <div v-if="allocation.delivery" class="text-gray-900 dark:text-white">
                        <div class="font-medium">{{ t('common.delivery') }}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(allocation.expand?.delivery?.delivery_date || '') }}</div>
                      </div>
                      <div v-else-if="allocation.service_booking" class="text-gray-900 dark:text-white">
                        <div class="font-medium">{{ t('common.serviceBooking') }}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          {{ allocation.expand?.service_booking?.expand?.service?.name || 'Service' }}
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {{ allocation.delivery ? formatDate(allocation.expand?.delivery?.delivery_date || '') : formatDate(allocation.expand?.service_booking?.start_date || '') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                      ₹{{ allocation.allocated_amount.toFixed(2) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="mt-6 flex space-x-3">
            <button 
              v-if="viewingPayment && canPaymentBeEdited(viewingPayment, viewingPaymentAllocations)" 
              @click="startEditPayment(viewingPayment)" 
              class="flex-1 btn-primary"
            >
              {{ t('common.edit') }}
            </button>
            <button @click="viewingPayment = null" :class="[
              viewingPayment && canPaymentBeEdited(viewingPayment, viewingPaymentAllocations) ? 'flex-1' : 'w-full',
              'btn-outline'
            ]">
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Payment Modal -->
    <div v-if="showEditModal && editingPayment" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeEditModal" @keydown.esc="closeEditModal" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ t('payments.editPayment') }}</h3>
          
          <form @submit.prevent="saveEditPayment" class="space-y-4">
            <!-- Payment Info (Read-only) -->
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div class="flex justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}:</span>
                <span class="text-sm text-gray-900 dark:text-white">{{ editingPayment.expand?.vendor?.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.amount') }}:</span>
                <span class="text-sm text-gray-900 dark:text-white">₹{{ editingPayment.amount.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.allocated') }}:</span>
                <span class="text-sm text-gray-900 dark:text-white">₹{{ (editingPayment.amount - getUnallocatedAmount(editingPayment, editingPaymentAllocations)).toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.unallocated') }}:</span>
                <span class="text-sm font-semibold text-orange-600 dark:text-orange-400">₹{{ getUnallocatedAmount(editingPayment, editingPaymentAllocations).toFixed(2) }}</span>
              </div>
            </div>
            
            <!-- Deliveries/Bookings Selection (Same as create, but for editing) -->
            <div v-if="editingPayment.vendor && getUnallocatedAmount(editingPayment, editingPaymentAllocations) > 0 && (selectableDeliveries.length > 0 || selectableBookings.length > 0)" class="space-y-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.selectItemsToPay') }}</label>
              
              <!-- Deliveries -->
              <div v-if="selectableDeliveries.length > 0">
                <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{{ t('common.deliveries') }}</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <label v-for="delivery in selectableDeliveries" :key="delivery.id" class="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      :value="delivery.id" 
                      v-model="form.deliveries"
                      @change="updateAmountFromSelection"
                      class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div class="flex-1 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-900 dark:text-white">{{ formatDate(delivery.delivery_date) }}</span>
                        <span class="font-medium text-gray-900 dark:text-white">₹{{ delivery.outstanding.toFixed(2) }}</span>
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        Total: ₹{{ delivery.total_amount.toFixed(2) }} | Paid: ₹{{ delivery.paid_amount.toFixed(2) }}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              
              <!-- Service Bookings -->
              <div v-if="selectableBookings.length > 0">
                <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{{ t('common.serviceBookings') }}</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <label v-for="booking in selectableBookings" :key="booking.id" class="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      :value="booking.id" 
                      v-model="form.service_bookings"
                      @change="updateAmountFromSelection"
                      class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div class="flex-1 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-900 dark:text-white">{{ booking.expand?.service?.name || 'Service' }}</span>
                        <span class="font-medium text-gray-900 dark:text-white">₹{{ booking.outstanding.toFixed(2) }}</span>
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatDate(booking.start_date) }} | Total: ₹{{ booking.total_amount.toFixed(2) }}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ t('payments.updatePayment') }}
              </button>
              <button type="button" @click="closeEditModal" class="flex-1 btn-outline">
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { 
  CreditCard, 
  Plus, 
  Eye, 
  Loader2,
  Banknote,
  Wallet,
  Smartphone,
  Building2
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useSiteData } from '../composables/useSiteData';
import { usePaymentSearch } from '../composables/useSearch';
import SearchBox from '../components/SearchBox.vue';
import { 
  paymentService, 
  paymentAllocationService,
  accountTransactionService,
  vendorService,
  accountService,
  deliveryService,
  serviceBookingService,
  getCurrentUserRole,
  getCurrentSiteId,
  pb,
  type Payment,
  type AccountTransaction, 
  type Vendor,
  type Account,
  type PaymentAllocation
} from '../services/pocketbase';

const route = useRoute();
const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error } = useToast();

// Search functionality
const { searchQuery, loading: searchLoading } = usePaymentSearch();

interface VendorWithOutstanding extends Vendor {
  outstandingAmount: number;
  pendingItems: number;
}

// Use site data management - consolidated to prevent auto-cancellation issues
const { data: paymentsData, reload: reloadPayments } = useSiteData(async () => {
  const [payments, vendors, accounts, deliveries, serviceBookings] = await Promise.all([
    paymentService.getAll(),
    vendorService.getAll(),
    accountService.getAll(),
    deliveryService.getAll(),
    serviceBookingService.getAll()
  ]);
  
  return {
    payments,
    vendors,
    accounts,
    deliveries,
    serviceBookings
  };
});

// Computed properties from consolidated useSiteData
const payments = computed<Payment[]>(() => paymentsData.value?.payments || []);
const vendors = computed(() => paymentsData.value?.vendors || []);
const accounts = computed(() => paymentsData.value?.accounts || []);
const deliveries = computed(() => paymentsData.value?.deliveries || []);
const serviceBookings = computed(() => paymentsData.value?.serviceBookings || []);
const showAddModal = ref(false);
const showEditModal = ref(false);
const viewingPayment = ref<Payment | null>(null);
const editingPayment = ref<Payment | null>(null);
const viewingPaymentAllocations = ref<PaymentAllocation[]>([]);
const editingPaymentAllocations = ref<PaymentAllocation[]>([]);
const loading = ref(false);
const loadingAllocations = ref(false);
const allocationLoadingPromises = ref<Map<string, Promise<PaymentAllocation[]>>>(new Map());

const vendorOutstanding = ref(0);
const vendorInputRef = ref<HTMLInputElement>();
const openMobileMenuId = ref<string | null>(null);

const form = reactive({
  vendor: '',
  account: '',
  amount: 0,
  transaction_date: new Date().toISOString().split('T')[0],
  reference: '',
  notes: '',
  description: '',
  deliveries: [] as string[],
  service_bookings: [] as string[]
});

const canCreatePayment = computed(() => {
  return !isReadOnly.value && checkCreateLimit('payments');
});

const canEditPayment = computed(() => {
  return !isReadOnly.value && getCurrentUserRole() === 'owner';
});

const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
  const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  return payment.amount - allocatedAmount;
};

const canPaymentBeEdited = (payment: Payment, allocations: PaymentAllocation[]): boolean => {
  if (!canEditPayment.value) return false;
  const unallocatedAmount = getUnallocatedAmount(payment, allocations);
  return unallocatedAmount > 0;
};

interface SelectableDelivery {
  id: string;
  delivery_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
}

interface SelectableBooking {
  id: string;
  start_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
  expand?: {
    service?: { name: string };
  };
}

const selectableDeliveries = ref<SelectableDelivery[]>([]);
const selectableBookings = ref<SelectableBooking[]>([]);


const activeAccounts = computed(() => {
  return accounts.value?.filter(account => account.is_active) || [];
});

const vendorsWithOutstanding = computed(() => {
  if (!vendors.value) return [];
  return vendors.value.map(vendor => {
    // Calculate outstanding from deliveries
    const vendorDeliveries = deliveries.value.filter(delivery => 
      delivery.vendor === vendor.id
    );
    const deliveryOutstanding = vendorDeliveries.reduce((sum, delivery) => {
      const outstanding = delivery.total_amount - delivery.paid_amount;
      return sum + (outstanding > 0 ? outstanding : 0);
    }, 0);
    
    // Calculate outstanding from service bookings
    const vendorBookings = serviceBookings.value.filter(booking => 
      booking.vendor === vendor.id
    );
    const serviceOutstanding = vendorBookings.reduce((sum, booking) => {
      const outstanding = booking.total_amount - booking.paid_amount;
      return sum + (outstanding > 0 ? outstanding : 0);
    }, 0);
    
    const outstandingAmount = deliveryOutstanding + serviceOutstanding;
    const pendingItems = vendorDeliveries.filter(d => d.payment_status !== 'paid').length + vendorBookings.filter(b => b.payment_status !== 'paid').length;
    
    return {
      ...vendor,
      outstandingAmount,
      pendingItems
    } as VendorWithOutstanding;
  }).filter(vendor => vendor.outstandingAmount > 0);
});

const getAccountIcon = (type?: Account['type']) => {
  if (!type) return Wallet;
  const icons = {
    bank: Building2,
    credit_card: CreditCard,
    cash: Banknote,
    digital_wallet: Smartphone,
    other: Wallet
  };
  return icons[type] || Wallet;
};


const reloadAllData = async () => {
  // With consolidated useSiteData, one reload call reloads all data
  await reloadPayments();
};

const loadVendorOutstanding = () => {
  if (form.vendor) {
    // Calculate outstanding from deliveries
    const vendorDeliveries = deliveries.value.filter(delivery => 
      delivery.vendor === form.vendor
    );
    const deliveryOutstanding = vendorDeliveries.reduce((sum, delivery) => {
      const outstanding = delivery.total_amount - delivery.paid_amount;
      return sum + (outstanding > 0 ? outstanding : 0);
    }, 0);
    
    // Calculate outstanding from service bookings
    const vendorBookings = serviceBookings.value.filter(booking => 
      booking.vendor === form.vendor
    );
    const serviceOutstanding = vendorBookings.reduce((sum, booking) => {
      const outstanding = booking.total_amount - booking.paid_amount;
      return sum + (outstanding > 0 ? outstanding : 0);
    }, 0);
    
    vendorOutstanding.value = deliveryOutstanding + serviceOutstanding;
    updateSelectableItems();
  }
};

const updateSelectableItems = () => {
  if (!form.vendor || form.amount <= 0) {
    selectableDeliveries.value = [];
    selectableBookings.value = [];
    return;
  }
  
  // Get unpaid/partially paid deliveries for this vendor
  const vendorDeliveries = deliveries.value.filter(delivery => 
    delivery.vendor === form.vendor && delivery.payment_status !== 'paid'
  );
  
  selectableDeliveries.value = vendorDeliveries.map(delivery => ({
    id: delivery.id!,
    delivery_date: delivery.delivery_date,
    total_amount: delivery.total_amount,
    paid_amount: delivery.paid_amount,
    outstanding: delivery.total_amount - delivery.paid_amount
  })).filter(d => d.outstanding > 0);
  
  // Get unpaid/partially paid service bookings for this vendor
  const vendorBookings = serviceBookings.value.filter(booking => 
    booking.vendor === form.vendor && booking.payment_status !== 'paid'
  );
  
  selectableBookings.value = vendorBookings.map(booking => ({
    id: booking.id!,
    start_date: booking.start_date,
    total_amount: booking.total_amount,
    paid_amount: booking.paid_amount,
    outstanding: booking.total_amount - booking.paid_amount,
    expand: booking.expand
  })).filter(b => b.outstanding > 0);
};

const updateAmountFromSelection = () => {
  let totalAmount = 0;
  
  // Calculate total from selected deliveries
  form.deliveries.forEach(deliveryId => {
    const delivery = selectableDeliveries.value.find(d => d.id === deliveryId);
    if (delivery) {
      totalAmount += delivery.outstanding;
    }
  });
  
  // Calculate total from selected service bookings
  form.service_bookings.forEach(bookingId => {
    const booking = selectableBookings.value.find(b => b.id === bookingId);
    if (booking) {
      totalAmount += booking.outstanding;
    }
  });
  
  if (totalAmount > 0) {
    form.amount = totalAmount;
  }
};

const handleAddPayment = () => {
  if (!canCreatePayment.value) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  showAddModal.value = true;
  vendorInputRef.value?.focus();
};

const savePayment = async () => {
  if (!checkCreateLimit('payments')) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  loading.value = true;
  try {
    // Map form to payment format for backward compatibility
    const paymentData = {
      vendor: form.vendor,
      account: form.account,
      amount: form.amount,
      payment_date: form.transaction_date,
      reference: form.reference,
      notes: form.notes,
      deliveries: form.deliveries,
      service_bookings: form.service_bookings
    };
    
    await paymentService.create(paymentData);
    success(t('messages.createSuccess', { item: t('common.payment') }));
    // Usage is automatically incremented by PocketBase hooks
    await reloadAllData();
    closeModal();
  } catch (err) {
    console.error('Error saving payment:', err);
    error(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const quickPayment = (vendor: VendorWithOutstanding) => {
  if (!canCreatePayment.value) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  form.vendor = vendor.id!;
  form.amount = vendor.outstandingAmount;
  loadVendorOutstanding();
  showAddModal.value = true;
  vendorInputRef.value?.focus();
};

const viewPayment = async (payment: Payment) => {
  viewingPayment.value = payment;
  viewingPaymentAllocations.value = [];
  
  // Load payment allocations with request deduplication
  if (payment.id) {
    loadingAllocations.value = true;
    try {
      // Check if we're already loading allocations for this payment
      let allocationsPromise = allocationLoadingPromises.value.get(payment.id);
      
      if (!allocationsPromise) {
        // Create new promise and cache it
        allocationsPromise = paymentAllocationService.getByPayment(payment.id);
        allocationLoadingPromises.value.set(payment.id, allocationsPromise);
        
        // Clean up promise after completion
        allocationsPromise.finally(() => {
          allocationLoadingPromises.value.delete(payment.id!);
        });
      }
      
      const allocations = await allocationsPromise;
      viewingPaymentAllocations.value = allocations;
    } catch (err) {
      console.error('Error loading payment allocations:', err);
    } finally {
      loadingAllocations.value = false;
    }
  }
};

const startEditPayment = async (payment: Payment) => {
  editingPayment.value = payment;
  // Reuse allocations already loaded in viewPayment to prevent duplicate requests
  editingPaymentAllocations.value = viewingPaymentAllocations.value;
  
  // Set up form for editing
  form.vendor = payment.vendor;
  form.deliveries = [];
  form.service_bookings = [];
  
  // Load selectable items for this vendor
  updateSelectableItemsForEdit();
  
  // Close view modal and open edit modal
  viewingPayment.value = null;
  showEditModal.value = true;
};

const updateSelectableItemsForEdit = () => {
  if (!editingPayment.value?.vendor) {
    selectableDeliveries.value = [];
    selectableBookings.value = [];
    return;
  }
  
  // Get unpaid/partially paid deliveries for this vendor
  const vendorDeliveries = deliveries.value.filter(delivery => 
    delivery.vendor === editingPayment.value?.vendor && delivery.payment_status !== 'paid'
  );
  
  selectableDeliveries.value = vendorDeliveries.map(delivery => ({
    id: delivery.id!,
    delivery_date: delivery.delivery_date,
    total_amount: delivery.total_amount,
    paid_amount: delivery.paid_amount,
    outstanding: delivery.total_amount - delivery.paid_amount
  })).filter(d => d.outstanding > 0);
  
  // Get unpaid/partially paid service bookings for this vendor
  const vendorBookings = serviceBookings.value.filter(booking => 
    booking.vendor === editingPayment.value?.vendor && booking.payment_status !== 'paid'
  );
  
  selectableBookings.value = vendorBookings.map(booking => ({
    id: booking.id!,
    start_date: booking.start_date,
    total_amount: booking.total_amount,
    paid_amount: booking.paid_amount,
    outstanding: booking.total_amount - booking.paid_amount,
    expand: booking.expand
  })).filter(b => b.outstanding > 0);
};

const saveEditPayment = async () => {
  if (!editingPayment.value) return;
  
  loading.value = true;
  try {
    // Calculate how much we can allocate (limited by unallocated amount)
    const unallocatedAmount = getUnallocatedAmount(editingPayment.value, editingPaymentAllocations.value);
    
    // Create new allocations for selected items
    let remainingAmount = unallocatedAmount;
    
    // Handle delivery allocations
    for (const deliveryId of form.deliveries) {
      if (remainingAmount <= 0) break;
      
      const delivery = selectableDeliveries.value.find(d => d.id === deliveryId);
      if (!delivery) continue;
      
      const allocatedAmount = Math.min(remainingAmount, delivery.outstanding);
      
      // Create payment allocation record
      await paymentAllocationService.create({
        payment: editingPayment.value.id!,
        delivery: deliveryId,
        allocated_amount: allocatedAmount,
        site: getCurrentSiteId()!
      });
      
      // Update delivery payment status
      const newPaidAmount = delivery.paid_amount + allocatedAmount;
      const newStatus = newPaidAmount >= delivery.total_amount ? 'paid' : 'partial';
      
      await pb.collection('deliveries').update(deliveryId, {
        paid_amount: newPaidAmount,
        payment_status: newStatus
      });
      
      remainingAmount -= allocatedAmount;
    }
    
    // Handle service booking allocations
    for (const bookingId of form.service_bookings) {
      if (remainingAmount <= 0) break;
      
      const booking = selectableBookings.value.find(b => b.id === bookingId);
      if (!booking) continue;
      
      const allocatedAmount = Math.min(remainingAmount, booking.outstanding);
      
      // Create payment allocation record
      await paymentAllocationService.create({
        payment: editingPayment.value.id!,
        service_booking: bookingId,
        allocated_amount: allocatedAmount,
        site: getCurrentSiteId()!
      });
      
      // Update service booking payment status
      const newPaidAmount = booking.paid_amount + allocatedAmount;
      const newStatus = newPaidAmount >= booking.total_amount ? 'paid' : 'partial';
      
      await pb.collection('service_bookings').update(bookingId, {
        paid_amount: newPaidAmount,
        payment_status: newStatus
      });
      
      remainingAmount -= allocatedAmount;
    }
    
    success(t('messages.updateSuccess', { item: t('common.payment') }));
    await reloadAllData();
    closeEditModal();
  } catch (err) {
    console.error('Error updating payment allocations:', err);
    error(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingPayment.value = null;
  editingPaymentAllocations.value = [];
  Object.assign(form, {
    vendor: '',
    account: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    description: '',
    deliveries: [],
    service_bookings: []
  });
  selectableDeliveries.value = [];
  selectableBookings.value = [];
};


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const toggleMobileMenu = (paymentId: string) => {
  openMobileMenuId.value = openMobileMenuId.value === paymentId ? null : paymentId;
};

const closeMobileMenu = () => {
  openMobileMenuId.value = null;
};

const closeModal = () => {
  showAddModal.value = false;
  Object.assign(form, {
    vendor: '',
    account: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    description: '',
    deliveries: [],
    service_bookings: []
  });
  vendorOutstanding.value = 0;
};

const handleQuickAction = () => {
  showAddModal.value = true;
  vendorInputRef.value?.focus();
};

// Site change is handled automatically by useSiteData

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    if (canCreatePayment.value) {
      showAddModal.value = true;
      vendorInputRef.value?.focus();
    }
  }
};

const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  if (!target.closest('.relative')) {
    closeMobileMenu();
  }
};

onMounted(async () => {
  // Data loading is handled automatically by useSiteData
  // Check for paymentId query parameter and auto-open payment modal
  const paymentId = route.query.paymentId as string;
  if (paymentId) {
    // Wait a bit for data to load, then check for the payment
    setTimeout(async () => {
      const payment = payments.value.find(p => p.id === paymentId);
      if (payment) {
        await viewPayment(payment);
      }
    }, 500);
  }
  
  window.addEventListener('show-add-modal', handleQuickAction);
  window.addEventListener('keydown', handleKeyboardShortcut);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
  window.removeEventListener('keydown', handleKeyboardShortcut);
  document.removeEventListener('click', handleClickOutside);
});
</script>