<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('payments.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('payments.subtitle') }}
        </p>
      </div>
      <div class="hidden md:flex items-center space-x-3">
        <button @click="showDuePaymentsModal = true" v-if="hasOutstandingPayments"
          class="btn-outline flex items-center">
          <AlertCircle class="mr-2 h-4 w-4 text-orange-500" />
          {{ t('payments.viewDuePayments') }}
        </button>
        <button @click="handleAddPayment" :disabled="!canCreatePayment" :class="[
          canCreatePayment ? 'btn-primary' : 'btn-disabled',
          'flex items-center'
        ]" :title="!canCreatePayment ? t('subscription.banner.freeTierLimitReached') : ''" data-keyboard-shortcut="n">
          <Plus class="mr-2 h-4 w-4" />
          {{ t('payments.recordPayment') }}
        </button>
      </div>

      <!-- Mobile Menu -->
      <div class="md:hidden relative header-mobile-menu">
        <button @click="showHeaderMobileMenu = !showHeaderMobileMenu"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <MoreVertical class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>

        <!-- Mobile Dropdown Menu -->
        <div v-if="showHeaderMobileMenu"
          class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
          <div class="py-1">
            <button v-if="hasOutstandingPayments" @click="handleHeaderMobileAction('viewDuePayments')"
              class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <AlertCircle class="mr-3 h-5 w-5 text-orange-500" />
              {{ t('payments.viewDuePayments') }}
            </button>
            <button @click="handleHeaderMobileAction('recordPayment')" :disabled="!canCreatePayment" :class="[
              canCreatePayment
                ? 'flex items-center w-full px-4 py-3 text-sm text-white bg-blue-600 hover:bg-blue-700'
                : 'flex items-center w-full px-4 py-3 text-sm text-gray-400 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
            ]">
              <Plus class="mr-3 h-5 w-5" :class="canCreatePayment ? 'text-white' : 'text-gray-400'" />
              {{ t('payments.recordPayment') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Box with Results Summary -->
    <div class="mb-6">
      <!-- Desktop: side-by-side layout -->
      <div class="hidden md:flex items-center gap-6">
        <div class="w-96">
          <SearchBox v-model="searchQuery" :placeholder="t('search.payments')" :search-loading="searchLoading" />
        </div>

        <!-- Desktop Search Results Summary -->
        <div v-if="searchQuery.trim() && !searchLoading"
          class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div class="flex items-center gap-1">
            <span class="font-medium text-gray-900 dark:text-white">{{ searchResultsCount }}</span>
            <span>{{ searchResultsCount === 1 ? t('payments.result') : t('payments.results') }}</span>
          </div>
          <div class="h-4 border-l border-gray-300 dark:border-gray-600"></div>
          <div class="flex items-center gap-1">
            <span class="text-xs">{{ t('common.total') }}:</span>
            <span class="font-semibold text-gray-900 dark:text-white">₹{{ searchResultsTotal.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Mobile: stacked layout -->
      <div class="md:hidden">
        <SearchBox v-model="searchQuery" :placeholder="t('search.payments')" :search-loading="searchLoading" />

        <!-- Mobile Search Results Summary -->
        <div v-if="searchQuery.trim() && !searchLoading"
          class="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div class="flex items-center gap-1">
            <span class="font-medium text-gray-900 dark:text-white">{{ searchResultsCount }}</span>
            <span>{{ searchResultsCount === 1 ? t('payments.result') : t('payments.results') }}</span>
          </div>
          <div class="h-4 border-l border-gray-300 dark:border-gray-600"></div>
          <div class="flex items-center gap-1">
            <span class="text-xs">{{ t('common.total') }}:</span>
            <span class="font-semibold text-gray-900 dark:text-white">₹{{ searchResultsTotal.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Payment Cards -->
    <div class="lg:hidden space-y-3">
      <!-- Sort Controls -->
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-gray-500 dark:text-gray-400">Sort:</span>
        <button @click="handleSort('date')"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
          :class="sortField === 'date' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
          {{ t('common.date') }}
          <component :is="getSortIcon('date')" class="h-3 w-3" v-if="sortField === 'date'" />
        </button>
        <button @click="handleSort('amount')"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
          :class="sortField === 'amount' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
          {{ t('common.amount') }}
          <component :is="getSortIcon('amount')" class="h-3 w-3" v-if="sortField === 'amount'" />
        </button>
        <button @click="handleSort('vendor')"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
          :class="sortField === 'vendor' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
          {{ t('common.vendor') }}
          <component :is="getSortIcon('vendor')" class="h-3 w-3" v-if="sortField === 'vendor'" />
        </button>
      </div>

      <div v-for="payment in payments" :key="payment.id"
        class="mobile-card"
        @click="viewPayment(payment)">
        <div class="flex items-start justify-between">
          <!-- Left: Vendor + Date -->
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {{ payment.expand?.vendor?.contact_person || t('common.unknown') + ' ' + t('common.vendor') }}
            </div>
            <div v-if="payment.expand?.vendor?.name" class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ payment.expand.vendor.name }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ formatDate(payment.payment_date) }}
              <span v-if="payment.reference" class="ml-1.5">&bull; {{ payment.reference }}</span>
            </div>
          </div>

          <!-- Right: Amount + Actions -->
          <div class="flex items-start gap-2 ml-3">
            <div class="text-right">
              <div class="text-base font-bold text-gray-900 dark:text-white tabular-nums">₹{{ payment.amount.toFixed(2) }}</div>
              <!-- Allocation Status Badge -->
              <div v-if="payment.expand?.payment_allocations && payment.expand.payment_allocations.length > 0" class="mt-0.5">
                <span v-if="getAllocatedAmount(payment.expand.payment_allocations) === payment.amount"
                  class="text-[10px] font-medium text-green-600 dark:text-green-400">Allocated</span>
                <span v-else-if="getAllocatedAmount(payment.expand.payment_allocations) > 0"
                  class="text-[10px] font-medium text-yellow-600 dark:text-yellow-400">Partial</span>
                <span v-else
                  class="text-[10px] font-medium text-orange-600 dark:text-orange-400">Unallocated</span>
              </div>
            </div>
            <div @click.stop>
              <CardDropdownMenu :actions="getPaymentActions(payment)"
                @action="handlePaymentAction(payment, $event)" />
            </div>
          </div>
        </div>

        <!-- Bottom row: Account + Credit Notes -->
        <div class="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700/50">
          <div v-if="payment.expand?.account" class="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <component :is="getAccountIcon(payment.expand.account.type)" class="mr-1 h-3.5 w-3.5" />
            {{ payment.expand.account.name }}
          </div>
          <div v-if="payment.credit_notes && payment.credit_notes.length > 0"
            class="flex items-center text-xs text-green-600 dark:text-green-400">
            <svg class="mr-1 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {{ payment.credit_notes.length }} Credit Note{{ payment.credit_notes.length > 1 ? 's' : '' }}
          </div>
          <div v-if="!payment.expand?.account && payment.credit_notes && payment.credit_notes.length > 0"
            class="text-xs text-blue-600 dark:text-blue-400 italic">
            Credit Note Only
          </div>
        </div>
      </div>

      <div v-if="payments.length === 0" class="text-center py-12">
        <CreditCard class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No payments recorded</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Start tracking by recording a payment.</p>
      </div>
    </div>

    <!-- Desktop Payments Table -->
    <div class="hidden lg:block card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th @click="handleSort('vendor')"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div class="flex items-center space-x-1">
                <span>{{ t('common.vendor') }}</span>
                <component :is="getSortIcon('vendor')" class="h-4 w-4"
                  :class="sortField === 'vendor' ? 'text-primary-600 dark:text-primary-400' : ''" />
              </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              {{ t('common.account') }}</th>
            <th @click="handleSort('amount')"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div class="flex items-center space-x-1">
                <span>{{ t('common.amount') }}</span>
                <component :is="getSortIcon('amount')" class="h-4 w-4"
                  :class="sortField === 'amount' ? 'text-primary-600 dark:text-primary-400' : ''" />
              </div>
            </th>
            <th @click="handleSort('date')"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div class="flex items-center space-x-1">
                <span>{{ t('common.date') }}</span>
                <component :is="getSortIcon('date')" class="h-4 w-4"
                  :class="sortField === 'date' ? 'text-primary-600 dark:text-primary-400' : ''" />
              </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              {{ t('common.reference') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              {{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="payment in payments" :key="payment.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ payment.expand?.vendor?.contact_person || t('common.unknown') + ' ' + t('common.vendor') }}
                </div>
                <div v-if="payment.expand?.vendor?.name" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ payment.expand.vendor.name }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="space-y-1">
                <div v-if="payment.expand?.account" class="flex items-center">
                  <component :is="getAccountIcon(payment.expand.account.type)" class="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <div class="text-sm text-gray-900 dark:text-white">{{ payment.expand.account.name }}</div>
                </div>
                <div v-if="payment.credit_notes && payment.credit_notes.length > 0" class="flex items-center">
                  <svg class="mr-2 h-4 w-4 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div class="text-xs text-green-600 dark:text-green-400">
                    {{ payment.credit_notes.length }} Credit Note{{ payment.credit_notes.length > 1 ? 's' : '' }}
                  </div>
                </div>
                <div v-if="!payment.expand?.account && payment.credit_notes && payment.credit_notes.length > 0" class="flex items-center">
                  <svg class="mr-2 h-4 w-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div class="text-xs text-blue-600 dark:text-blue-400 italic">Credit Note Only</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="text-sm font-medium text-gray-900 dark:text-white">₹{{ payment.amount.toFixed(2) }}</div>
                <div v-if="payment.expand?.payment_allocations && payment.expand.payment_allocations.length > 0" class="ml-2">
                  <span v-if="getAllocatedAmount(payment.expand.payment_allocations) === payment.amount"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    :title="t('payments.fullyAllocated')">Allocated</span>
                  <span v-else-if="getAllocatedAmount(payment.expand.payment_allocations) > 0"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                    :title="`${t('payments.partiallyAllocated')}: ₹${getUnallocatedAmount(payment, payment.expand.payment_allocations).toFixed(2)} remaining`">Partial</span>
                  <span v-else
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                    :title="t('payments.unallocated')">Unallocated</span>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ formatDate(payment.payment_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ payment.reference || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-2" @click.stop>
                <button @click="viewPayment(payment)"
                  class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  :title="t('common.view')">
                  <Eye class="h-4 w-4" />
                </button>
                <button v-if="canPaymentBeEdited(payment, payment.expand?.payment_allocations || [])"
                  @click="startEditPayment(payment)"
                  class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  :title="t('common.edit')">
                  <Edit2 class="h-4 w-4" />
                </button>
                <button v-if="canPaymentBeDeleted(payment, payment.expand?.payment_allocations || [])"
                  @click="deletePayment(payment)"
                  class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  :title="t('common.deleteAction')">
                  <Trash2 class="h-4 w-4" />
                </button>
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

    <!-- Due Payments Modal -->
    <DuePaymentsModal :is-visible="showDuePaymentsModal" :vendors="vendors" :deliveries="deliveries"
      :service-bookings="serviceBookings" :payments="payments" @close="showDuePaymentsModal = false"
      @pay-vendor="handleDuePaymentVendorClick" />

    <!-- Unified Payment Modal -->
    <PaymentModal :is-visible="showPaymentModal" :mode="paymentModalMode" :payment="currentPayment"
      :current-allocations="currentAllocations" :vendors="vendors" :accounts="accounts" :deliveries="deliveries"
      :service-bookings="serviceBookings" :payments="payments" :vendor-id="vendorIdForPayNow"
      :outstanding-amount="outstandingAmountForPayNow" @submit="handlePaymentModalSubmit"
      @close="handlePaymentModalClose" />

    <!-- View Payment Modal -->
    <div v-if="viewingPayment" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]"
      @click="viewingPayment = null; closeModalState('payments-view-modal')"
      @keydown.esc="viewingPayment = null; closeModalState('payments-view-modal')" tabindex="-1">
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 mb-20 lg:mb-4"
        @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Details</h3>

          <div class="space-y-4">
            <div>
              <span class="font-medium text-gray-700 dark:text-gray-300">Vendor:</span>
              <div class="ml-2 inline-block">
                <span class="text-gray-900 dark:text-white">{{ viewingPayment.expand?.vendor?.contact_person ||
                  'UnknownVendor' }}</span>
                <div v-if="viewingPayment.expand?.vendor?.name" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ viewingPayment.expand.vendor.name }}
                </div>
              </div>
            </div>
            <div>
              <span class="font-medium text-gray-700 dark:text-gray-300">Account:</span>
              <div class="ml-2 flex items-center">
                <component :is="getAccountIcon(viewingPayment.expand?.account?.type)"
                  class="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span class="text-gray-900 dark:text-white">{{ viewingPayment.expand?.account?.name || 'Unknown Account'
                }}</span>
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

            <!-- Credit Notes Used -->
            <div v-if="viewingPayment.credit_notes && viewingPayment.credit_notes.length > 0">
              <span class="font-medium text-gray-700 dark:text-gray-300">Credit Notes Used:</span>
              <div class="ml-2 mt-2 space-y-2">
                <div v-for="creditNoteId in viewingPayment.credit_notes" :key="creditNoteId"
                  class="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <div>
                    <p class="text-sm font-medium text-green-800 dark:text-green-300">
                      {{ getCreditNoteDisplay(creditNoteId) }}
                    </p>
                    <p class="text-xs text-green-600 dark:text-green-400">
                      Applied to this payment
                    </p>
                  </div>
                  <span class="text-sm font-semibold text-green-700 dark:text-green-300">
                    ₹{{ getCreditNoteAmount(creditNoteId) }}
                  </span>
                </div>
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
                    <th
                      class="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {{ t('common.type') }}</th>
                    <th
                      class="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {{ t('common.date') }}</th>
                    <th
                      class="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {{ t('common.amount') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
                  <tr v-for="allocation in viewingPaymentAllocations" :key="allocation.id"
                    class="hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td class="px-4 py-3 text-sm">
                      <div v-if="allocation.delivery" class="text-gray-900 dark:text-white">
                        <div class="font-medium">{{ t('common.delivery') }}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">{{
                          formatDate(allocation.expand?.delivery?.delivery_date || '') }}</div>
                      </div>
                      <div v-else-if="allocation.service_booking" class="text-gray-900 dark:text-white">
                        <div class="font-medium">{{ t('common.serviceBooking') }}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          {{ allocation.expand?.service_booking?.expand?.service?.name || 'Service' }}
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {{ allocation.delivery ? formatDate(allocation.expand?.delivery?.delivery_date || '') :
                        formatDate(allocation.expand?.service_booking?.start_date || '') }}
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
            <button v-if="viewingPayment && canPaymentBeEdited(viewingPayment, viewingPaymentAllocations)"
              @click="startEditPayment(viewingPayment)" class="flex-1 btn-primary">
              {{ t('common.edit') }}
            </button>
            <button v-if="viewingPayment && canPaymentBeDeleted(viewingPayment, viewingPaymentAllocations)"
              @click="deletePayment(viewingPayment)" class="flex-1 btn-danger">
              {{ t('common.deleteAction') }}
            </button>
            <button @click="viewingPayment = null; closeModalState('payments-view-modal')" :class="[
              viewingPayment && (canPaymentBeEdited(viewingPayment, viewingPaymentAllocations) || canPaymentBeDeleted(viewingPayment, viewingPaymentAllocations)) ? 'flex-1' : 'w-full',
              'btn-outline'
            ]">
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useRoute } from 'vue-router';
import {
  CreditCard,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  Banknote,
  Wallet,
  Smartphone,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  MoreVertical
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { useSiteData } from '../composables/useSiteData';
import { usePaymentSearch } from '../composables/useSearch';
import { useModalState } from '../composables/useModalState';
import SearchBox from '../components/SearchBox.vue';
import PaymentModal from '../components/PaymentModal.vue';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import DuePaymentsModal from '../components/DuePaymentsModal.vue';
import {
  paymentService,
  paymentAllocationService,
  vendorService,
  accountService,
  deliveryService,
  serviceBookingService,
  getCurrentUserRole,
  VendorService,
  type Payment,
  type Vendor,
  type Account,
  type PaymentAllocation
} from '../services/pocketbase';

const route = useRoute();
const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error } = useToast();
const { registerShortcut } = useKeyboardShortcuts();
const { openModal, closeModal: closeModalState } = useModalState();

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults } = usePaymentSearch();

interface VendorWithOutstanding extends Vendor {
  outstandingAmount: number;
  pendingItems: number;
}

// Sort state
type SortField = 'vendor' | 'amount' | 'date' | null;
type SortOrder = 'asc' | 'desc';
const sortField = ref<SortField>('date'); // Default sort by date
const sortOrder = ref<SortOrder>('desc'); // Default descending (newest first)

// Use site data management - consolidated to prevent auto-cancellation issues
const { data: paymentsData, reload: reloadPayments } = useSiteData(async () => {
  // Build sort parameter for backend
  let sortParam = '-payment_date'; // Default
  if (sortField.value === 'date') {
    sortParam = sortOrder.value === 'desc' ? '-payment_date' : 'payment_date';
  } else if (sortField.value === 'amount') {
    sortParam = sortOrder.value === 'desc' ? '-amount' : 'amount';
  }
  // Note: vendor sorting will be done client-side since it's a relation

  const [payments, vendors, accounts, deliveries, serviceBookings] = await Promise.all([
    paymentService.getAll({ sort: sortParam }),
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
const payments = computed<Payment[]>(() => {
  let paymentsList: Payment[];

  // If there's a search query, use search results; otherwise use all payments from useSiteData
  if (searchQuery.value.trim()) {
    paymentsList = searchResults.value || [];
  } else {
    paymentsList = paymentsData.value?.payments || [];
  }

  // Apply client-side sorting for vendor (since it's a relation)
  if (sortField.value === 'vendor') {
    paymentsList = [...paymentsList].sort((a, b) => {
      const vendorA = a.expand?.vendor?.contact_person || a.expand?.vendor?.name || '';
      const vendorB = b.expand?.vendor?.contact_person || b.expand?.vendor?.name || '';
      const comparison = vendorA.localeCompare(vendorB);
      return sortOrder.value === 'asc' ? comparison : -comparison;
    });
  }

  return paymentsList;
});
const vendors = computed(() => paymentsData.value?.vendors || []);
const accounts = computed(() => paymentsData.value?.accounts || []);
const deliveries = computed(() => paymentsData.value?.deliveries || []);
const serviceBookings = computed(() => paymentsData.value?.serviceBookings || []);
// Unified modal state
const showPaymentModal = ref(false);
const paymentModalMode = ref<'CREATE' | 'PAY_NOW' | 'EDIT'>('CREATE');
const currentPayment = ref<Payment | null>(null);
const currentAllocations = ref<PaymentAllocation[]>([]);
const vendorIdForPayNow = ref('');
const outstandingAmountForPayNow = ref(0);

// View payment modal state
const viewingPayment = ref<Payment | null>(null);
const viewingPaymentAllocations = ref<PaymentAllocation[]>([]);
const loadingAllocations = ref(false);
const allocationLoadingPromises = ref<Map<string, Promise<PaymentAllocation[]>>>(new Map());

// Due Payments Modal state
const showDuePaymentsModal = ref(false);

// Header mobile menu state
const showHeaderMobileMenu = ref(false);

const canCreatePayment = computed(() => {
  return !isReadOnly.value && checkCreateLimit('payments');
});

const canEditPayment = computed(() => {
  return !isReadOnly.value && getCurrentUserRole() === 'owner';
});

// Search results summary computed properties
const searchResultsCount = computed(() => {
  return searchQuery.value.trim() ? payments.value.length : 0;
});

const searchResultsTotal = computed(() => {
  if (!searchQuery.value.trim() || payments.value.length === 0) return 0;

  return payments.value.reduce((total, payment) => {
    return total + (payment.amount || 0);
  }, 0);
});

const getUnallocatedAmount = (payment: Payment, allocations: PaymentAllocation[]): number => {
  const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  return payment.amount - allocatedAmount;
};

const getAllocatedAmount = (allocations: PaymentAllocation[]): number => {
  return allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
};

const canPaymentBeEdited = (payment: Payment, allocations: PaymentAllocation[]): boolean => {
  if (!canEditPayment.value) return false;
  const unallocatedAmount = getUnallocatedAmount(payment, allocations);
  return unallocatedAmount > 0;
};

const canPaymentBeDeleted = (_payment: Payment, allocations: PaymentAllocation[]): boolean => {
  if (!canEditPayment.value) return false;
  return allocations.length === 0;
};

const vendorsWithOutstanding = computed(() => {
  if (!vendors.value) return [];
  return vendors.value.map(vendor => {
    const outstandingAmount = VendorService.calculateOutstandingFromData(
      vendor.id!,
      deliveries.value,
      serviceBookings.value,
      payments.value
    );

    // Calculate pending items based on outstanding amounts
    const vendorDeliveries = deliveries.value.filter(delivery => delivery.vendor === vendor.id);
    const vendorBookings = serviceBookings.value.filter(booking => booking.vendor === vendor.id);

    // Count items with outstanding amounts (items that have work done but not fully paid)
    const pendingDeliveries = vendorDeliveries.filter(d => d.total_amount > 0).length;
    const pendingBookings = vendorBookings.filter(b => (b.percent_completed || 0) > 0).length;
    const pendingItems = pendingDeliveries + pendingBookings;

    return {
      ...vendor,
      outstandingAmount,
      pendingItems
    } as VendorWithOutstanding;
  }).filter(vendor => vendor.outstandingAmount > 0);
});

const hasOutstandingPayments = computed(() => {
  return vendorsWithOutstanding.value.length > 0;
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

// Sort handler
const handleSort = (field: SortField) => {
  if (sortField.value === field) {
    // Toggle sort order if clicking the same field
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    // Set new field and default to descending
    sortField.value = field;
    sortOrder.value = 'desc';
  }
};

// Watch sort changes and reload data for backend-sorted fields
watch([sortField, sortOrder], () => {
  // Only reload for backend-sorted fields (amount and date)
  // Vendor sorting is done client-side
  if (sortField.value === 'amount' || sortField.value === 'date') {
    reloadPayments();
  }
});

// Helper function to get sort icon
const getSortIcon = (field: SortField) => {
  if (sortField.value !== field) return ArrowUpDown;
  return sortOrder.value === 'asc' ? ArrowUp : ArrowDown;
};


const handleAddPayment = () => {
  if (!canCreatePayment) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  paymentModalMode.value = 'CREATE';
  currentPayment.value = null;
  currentAllocations.value = [];
  showPaymentModal.value = true;
  openModal('payments-add-modal');
};


const quickPayment = (vendor: VendorWithOutstanding) => {
  if (!canCreatePayment) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  paymentModalMode.value = 'PAY_NOW';
  vendorIdForPayNow.value = vendor.id!;
  outstandingAmountForPayNow.value = vendor.outstandingAmount;
  currentPayment.value = null;
  currentAllocations.value = [];
  showPaymentModal.value = true;
  openModal('payments-paynow-modal');
};

const handleDuePaymentVendorClick = (vendor: VendorWithOutstanding) => {
  // Close the due payments modal first
  showDuePaymentsModal.value = false;
  // Then open the payment modal with this vendor pre-selected
  quickPayment(vendor);
};

const handleHeaderMobileAction = (action: string) => {
  showHeaderMobileMenu.value = false;
  switch (action) {
    case 'viewDuePayments':
      showDuePaymentsModal.value = true;
      break;
    case 'recordPayment':
      if (canCreatePayment.value) {
        handleAddPayment();
      }
      break;
  }
};

const viewPayment = async (payment: Payment) => {
  viewingPayment.value = payment;
  openModal('payments-view-modal');
  // Use allocations from expand data if available, otherwise load them
  if (payment.expand?.payment_allocations) {
    viewingPaymentAllocations.value = payment.expand.payment_allocations;
  } else if (payment.id) {
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
  } else {
    viewingPaymentAllocations.value = [];
  }
};

const startEditPayment = async (payment: Payment) => {
  // Use allocations from expand data if available
  let allocations: PaymentAllocation[] = [];
  if (payment.expand?.payment_allocations) {
    allocations = payment.expand.payment_allocations;
  } else {
    // Fallback to reusing allocations from viewPayment if called from view modal
    allocations = viewingPaymentAllocations.value.length > 0 ? viewingPaymentAllocations.value : [];

    // If no allocations available, load them
    if (allocations.length === 0 && payment.id) {
      try {
        allocations = await paymentAllocationService.getByPayment(payment.id);
      } catch (err) {
        console.error('Error loading payment allocations for edit:', err);
        allocations = [];
      }
    }
  }

  // Set up unified modal for editing
  paymentModalMode.value = 'EDIT';
  currentPayment.value = payment;
  currentAllocations.value = allocations;
  vendorIdForPayNow.value = '';
  outstandingAmountForPayNow.value = 0;

  // Close view modal and open edit modal
  closeModalState('payments-view-modal');
  viewingPayment.value = null;
  showPaymentModal.value = true;
  openModal('payments-edit-modal');
};

const deletePayment = async (payment: Payment) => {
  if (!payment.id) return;

  const confirmed = confirm(`Are you sure you want to delete the payment of ₹${payment.amount.toFixed(2)} to ${payment.expand?.vendor?.name || 'Unknown Vendor'}? This action cannot be undone.`);

  if (!confirmed) return;

  try {
    await paymentService.delete(payment.id);
    success(t('messages.deleteSuccess', { item: t('common.payment') }));

    // Close view modal if it's open for this payment
    if (viewingPayment.value?.id === payment.id) {
      closeModalState('payments-view-modal');
      viewingPayment.value = null;
    }

    // Reload data
    await reloadAllData();
  } catch (err: any) {
    console.error('Error deleting payment:', err);
    error(err.message || t('messages.error'));
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const getCreditNoteDisplay = (creditNoteId: string) => {
  // Try to get credit note from expanded data first
  if (viewingPayment.value?.expand?.credit_notes) {
    const creditNote = viewingPayment.value.expand.credit_notes.find(cn => cn.id === creditNoteId);
    if (creditNote) {
      return creditNote.reference || `CN-${creditNote.id?.slice(-6)}`;
    }
  }
  // Fallback to generic display
  return `CN-${creditNoteId.slice(-6)}`;
};

const getCreditNoteAmount = (creditNoteId: string) => {
  // Try to get credit note from expanded data first
  if (viewingPayment.value?.expand?.credit_notes) {
    const creditNote = viewingPayment.value.expand.credit_notes.find(cn => cn.id === creditNoteId);
    if (creditNote) {
      // For payments, we need to get the used amount from credit note usage
      // For now, we'll show the balance (this could be enhanced later)
      return creditNote.balance?.toFixed(2) || '0.00';
    }
  }
  return '0.00';
};

const handlePaymentModalSubmit = async (data: any) => {
  const { mode, form, payment } = data;

  // Prepare payment data outside try block for error handling access
  const paymentData = mode === 'CREATE' || mode === 'PAY_NOW' ? {
    vendor: form.vendor,
    account: form.account,
    amount: form.amount,
    payment_date: form.transaction_date,
    reference: form.reference,
    notes: form.notes,
    deliveries: form.deliveries,
    service_bookings: form.service_bookings,
    credit_notes: form.credit_notes || [],
    // Include detailed allocation data for proper handling
    delivery_allocations: form.delivery_allocations || {},
    service_booking_allocations: form.service_booking_allocations || {},
    credit_note_allocations: form.credit_note_allocations || {}
  } : null;

  // If payment is fully covered by credit notes, remove account from payment data
  if (paymentData) {
    const totalCreditNoteAmount = Object.values(form.credit_note_allocations || {})
      .reduce((sum: number, allocation: any) => sum + (allocation?.amount || 0), 0);

    if (totalCreditNoteAmount >= form.amount) {
      delete paymentData.account; // Remove account when fully covered by credit notes
    }
  }

  try {
    if (mode === 'CREATE' || mode === 'PAY_NOW') {
      await paymentService.create(paymentData!);
      success(t('messages.createSuccess', { item: t('common.payment') }));
    } else if (mode === 'EDIT') {
      // In EDIT mode, merge existing allocations with new ones from the form
      // Extract existing delivery and service booking IDs from current allocations
      const existingDeliveryIds = currentAllocations.value
        .filter(allocation => allocation.delivery)
        .map(allocation => allocation.delivery!);

      const existingServiceBookingIds = currentAllocations.value
        .filter(allocation => allocation.service_booking)
        .map(allocation => allocation.service_booking!);

      // Combine existing with new (form contains only newly added items in edit mode)
      const allDeliveryIds = [...new Set([...existingDeliveryIds, ...form.deliveries])];
      const allServiceBookingIds = [...new Set([...existingServiceBookingIds, ...form.service_bookings])];

      // Use the service method to add new allocations while preserving existing ones
      await paymentService.updateAllocations(payment.id!, allDeliveryIds, allServiceBookingIds);
      success(t('messages.updateSuccess', { item: t('common.payment') }));
    }

    // Reload data and close modal
    await reloadAllData();
    showPaymentModal.value = false;
  } catch (err: any) {
    console.error('Error saving payment:', err);

    // Check if this is a credit note balance change error
    if (err.message === 'CREDIT_NOTE_BALANCE_CHANGED' && err.details) {
      const details = err.details;
      const shouldProceed = confirm(
        `Credit note ${details.reference} balance has changed:\n\n` +
        `Originally planned: ₹${details.requestedAmount.toFixed(2)}\n` +
        `Currently available: ₹${details.availableAmount.toFixed(2)}\n\n` +
        `Would you like to proceed with:\n` +
        `• Reduced credit note usage: ₹${details.availableAmount.toFixed(2)}\n` +
        `• Increased account payment: ₹${(details.requestedAmount - details.availableAmount).toFixed(2)}\n\n` +
        `Click OK to proceed with adjusted amounts, or Cancel to go back and review.`
      );

      if (shouldProceed) {
        // Retry payment creation with balance adjustment allowed
        const adjustedPaymentData = {
          ...paymentData,
          allowBalanceAdjustment: true
        };

        try {
          await paymentService.create(adjustedPaymentData);
          success(t('messages.createSuccess', { item: t('common.payment') }));

          // Reload data and close modal
          await reloadAllData();
          showPaymentModal.value = false;
        } catch (retryErr: any) {
          console.error('Error saving payment after adjustment:', retryErr);
          error(t('messages.createError', { item: t('common.payment') }));
        }
      }
      // If user cancels, do nothing - they can adjust manually
    } else if (err.message && err.message.includes('Credit note priority violation')) {
      // Credit note priority violation - provide clear guidance
      error(
        'Payment cannot be processed due to credit note usage rules:\n\n' +
        err.message.split(':')[1].trim() + '\n\n' +
        'Please either:\n' +
        '• Use all available credit notes completely before paying from account, or\n' +
        '• Remove unused credit notes from this payment'
      );
    } else if (err.message && (err.message.includes('not available for this amount') ||
      err.message.includes('balance changed during processing') ||
      err.message.includes('Insufficient credit balance'))) {
      // Other credit note balance issues - provide helpful error message
      error(
        'Credit note information has changed since the modal was opened. ' +
        'This can happen if another payment used the same credit note. ' +
        'Please close and reopen the payment modal to get updated credit note balances.\n\n' +
        'Details: ' + err.message.split('\n')[0]
      );
    } else {
      error(t('messages.error'));
    }
  }
};

const handlePaymentModalClose = () => {
  showPaymentModal.value = false;
  paymentModalMode.value = 'CREATE';
  currentPayment.value = null;
  currentAllocations.value = [];
  vendorIdForPayNow.value = '';
  outstandingAmountForPayNow.value = 0;
  closeModalState('payments-add-modal');
  closeModalState('payments-paynow-modal');
  closeModalState('payments-edit-modal');
};

const handleQuickAction = () => {
  handleAddPayment();
};

// Site change is handled automatically by useSiteData

const getPaymentActions = (payment: Payment) => {
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
      hidden: !canPaymentBeEdited(payment, payment.expand?.payment_allocations || [])
    },
    {
      key: 'delete',
      label: t('common.deleteAction'),
      icon: Trash2,
      variant: 'danger' as const,
      hidden: !canPaymentBeDeleted(payment, payment.expand?.payment_allocations || [])
    }
  ];
};

const handlePaymentAction = (payment: Payment, action: string) => {
  switch (action) {
    case 'view':
      viewPayment(payment);
      break;
    case 'edit':
      startEditPayment(payment);
      break;
    case 'delete':
      deletePayment(payment);
      break;
  }
};

// Register keyboard shortcuts
const registerShortcuts = () => {
  registerShortcut({
    key: 'n',
    label: 'New Payment',
    description: 'Create a new payment record',
    action: () => {
      if (canCreatePayment.value) {
        handleAddPayment();
      }
    },
    category: 'action',
    requiresAltShift: true
  });
};

const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  // Close header mobile menu when clicking outside
  if (!target.closest('.header-mobile-menu')) {
    showHeaderMobileMenu.value = false;
  }
};

// Event listeners using @vueuse/core
useEventListener(window, 'show-add-modal', handleQuickAction);
useEventListener(document, 'click', handleClickOutside);

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

  // Register keyboard shortcuts
  registerShortcuts();
});
</script>