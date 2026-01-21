<template>
  <div v-if="vendor">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center space-x-4">
        <button @click="goBack" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ vendor.contact_person || vendor.name ||
            t('vendors.unnamedVendor') }}</h1>
          <p v-if="vendor.name && vendor.contact_person" class="text-lg text-gray-700 dark:text-gray-300">{{ vendor.name
            }}</p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ t('vendors.vendorDetails') }}</p>
        </div>
      </div>
      <!-- Desktop Actions -->
      <div class="hidden md:flex items-center space-x-3">
        <button @click="openLedgerModal()" class="btn-outline flex items-center">
          <BookOpen class="mr-2 h-4 w-4" />
          {{ t('vendors.viewLedger') }}
        </button>
        <button @click="createReturn()" class="btn-outline">
          <RotateCcw class="mr-2 h-4 w-4" />
          {{ t('vendors.createReturn') }}
        </button>
        <button @click="recordPayment()" class="btn-primary">
          <CreditCard class="mr-2 h-4 w-4" />
          {{ t('vendors.recordPayment') }}
        </button>
      </div>

      <!-- Mobile Menu -->
      <div class="md:hidden relative mobile-menu">
        <button @click="showMobileMenu = !showMobileMenu" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <MoreVertical class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        
        <!-- Mobile Dropdown Menu -->
        <div v-if="showMobileMenu" class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
          <div class="py-1">
            <button @click="handleMobileAction('viewLedger')" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <BookOpen class="mr-3 h-5 w-5 text-gray-600" />
              {{ t('vendors.viewLedger') }}
            </button>
            <button @click="handleMobileAction('createReturn')" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <RotateCcw class="mr-3 h-5 w-5 text-gray-600" />
              {{ t('vendors.createReturn') }}
            </button>
            <button @click="handleMobileAction('recordPayment')" class="flex items-center w-full px-4 py-3 text-sm text-white bg-blue-600 hover:bg-blue-700">
              <CreditCard class="mr-3 h-5 w-5 text-white" />
              {{ t('vendors.recordPayment') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vendor Info & Payment Information -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <!-- Vendor Information -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('vendors.contactInformation') }}</h2>
        <div class="space-y-3">
          <div v-if="vendor.contact_person" class="flex items-center text-sm">
            <User class="mr-3 h-4 w-4 text-gray-400" />
            <span class="text-gray-900 dark:text-white">{{ vendor.contact_person }}</span>
          </div>
          <div v-if="vendor.name" class="flex items-center text-sm">
            <Building2 class="mr-3 h-4 w-4 text-gray-400" />
            <span class="text-gray-900 dark:text-white">{{ vendor.name }}</span>
          </div>
          <div v-if="vendor.email" class="flex items-center text-sm">
            <Mail class="mr-3 h-4 w-4 text-gray-400" />
            <a :href="`mailto:${vendor.email}`"
              class="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300">{{
              vendor.email }}</a>
          </div>
          <div v-if="vendor.phone" class="flex items-center text-sm">
            <Phone class="mr-3 h-4 w-4 text-gray-400" />
            <a :href="`tel:${vendor.phone}`"
              class="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300">{{
              vendor.phone }}</a>
          </div>
          <div v-if="vendor.address" class="flex items-start text-sm">
            <MapPin class="mr-3 h-4 w-4 text-gray-400 mt-0.5" />
            <span class="text-gray-900 dark:text-white">{{ vendor.address }}</span>
          </div>
        </div>

        <div v-if="vendorTags.length > 0" class="mt-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('vendors.specialties') }}</h3>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="tag in vendorTags"
              :key="tag.id"
              class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white"
              :style="{ backgroundColor: tag.color }"
            >
              {{ tag.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Payment Information -->
      <div v-if="vendor.payment_details" class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('vendors.paymentInformation') }}</h2>
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <pre
            class="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-sans">{{ vendor.payment_details }}</pre>
        </div>
      </div>
    </div>

    <!-- Financial Summary -->
    <div class="mb-8">

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
          <div class="flex items-center">
            <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle class="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-red-700 dark:text-red-300">{{ t('vendors.outstandingAmount') }}</p>
              <p class="text-2xl font-bold text-red-900 dark:text-red-100">₹{{ outstandingAmount.toFixed(2) }}</p>
            </div>
          </div>
        </div>

        <div class="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle class="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-700 dark:text-green-300">{{ t('vendors.totalPaid') }}</p>
              <p class="text-2xl font-bold text-green-900 dark:text-green-100">₹{{ totalPaid.toFixed(2) }}</p>
            </div>
          </div>
        </div>

        <div class="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TruckIcon class="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-blue-700 dark:text-blue-300">{{ t('vendors.totalDeliveries') }}</p>
              <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ vendorDeliveries.length }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- Quick Summary Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
    <!-- Deliveries Summary -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('vendors.recentDeliveries') }}</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ vendorDeliveries.length }} {{ t('vendors.total') }}</span>
      </div>
      <div class="space-y-3 max-h-96 overflow-y-auto">
        <div v-for="delivery in vendorDeliveries.slice(0, 5)" :key="delivery.id"
          class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">Delivery #{{ delivery.id?.slice(-6) }}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(delivery.delivery_date) }}</p>
            </div>
            <span :class="DeliveryPaymentCalculator.getPaymentStatusClass(delivery.payment_status)">
              {{ t(DeliveryPaymentCalculator.getPaymentStatusTextKey(delivery.payment_status)) }}
            </span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600 dark:text-gray-400">{{ delivery.delivery_reference || t('vendors.noReference') }}</span>
            <div class="text-right">
              <p class="font-medium text-gray-900 dark:text-white">₹{{ delivery.total_amount.toFixed(2) }}</p>
              <p v-if="delivery.outstanding > 0" class="text-xs text-orange-600 dark:text-orange-400">
                Outstanding: ₹{{ delivery.outstanding.toFixed(2) }}
              </p>
              <p v-else-if="delivery.paid_amount > 0" class="text-xs text-green-600 dark:text-green-400">
                Fully Paid
              </p>
            </div>
          </div>
        </div>

        <div v-if="vendorDeliveries.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          {{ t('vendors.noDeliveriesRecorded') }}
        </div>
      </div>
    </div>

    <!-- Payments Summary -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('vendors.paymentHistory') }}</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ vendorPayments.length }} {{ t('vendors.payments') }}</span>
      </div>
      <div class="space-y-3 max-h-96 overflow-y-auto">
        <div v-for="payment in vendorPayments.slice(0, 5)" :key="payment.id"
          class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">₹{{ payment.amount.toFixed(2) }}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(payment.payment_date) }}</p>
            </div>
            <div class="text-right text-sm">
              <p v-if="payment.reference" class="text-gray-600 dark:text-gray-400">{{ payment.reference }}</p>
            </div>
          </div>
        </div>

        <div v-if="vendorPayments.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          {{ t('vendors.noPaymentsRecorded') }}
        </div>
      </div>
    </div>

    <!-- Returns Summary -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('vendors.recentReturns') }}</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ vendorReturns.length }} {{ t('vendors.returns') }}</span>
      </div>
      <div class="space-y-3 max-h-96 overflow-y-auto">
        <div v-for="returnItem in vendorReturns.slice(0, 5)" :key="returnItem.id"
          class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                Return #{{ returnItem.id?.slice(-6) }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(returnItem.return_date) }}</p>
            </div>
            <span :class="getReturnStatusClass(returnItem.status)">
              {{ t(`vendors.returnStatuses.${returnItem.status}`) }}
            </span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600 dark:text-gray-400">{{ t('vendors.returnAmount') }}</span>
            <div class="text-right">
              <p class="font-medium text-gray-900 dark:text-white">₹{{ returnItem.total_return_amount.toFixed(2) }}</p>
            </div>
          </div>
        </div>

        <div v-if="vendorReturns.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          {{ t('vendors.noReturnsRecorded') }}
        </div>
      </div>
    </div>
    </div>


    <!-- Payment Modal -->
    <PaymentModal
      :is-visible="showPaymentModal"
      :mode="paymentModalMode"
      :payment="currentPayment"
      :current-allocations="currentAllocations"
      :vendors="allVendors"
      :accounts="accounts"
      :deliveries="allDeliveries"
      :service-bookings="allServiceBookings"
      :payments="allPayments"
      :vendor-id="vendor?.id"
      :outstanding-amount="outstandingAmount"
      @submit="handlePaymentModalSubmit"
      @close="handlePaymentModalClose"
    />

    <!-- Ledger Modal -->
    <div v-if="showLedgerModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-full items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="closeLedgerModal"></div>

        <!-- Modal Panel -->
        <div class="relative w-full max-w-5xl transform rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all max-h-[90vh] flex flex-col">
          <!-- Header -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 border-b border-gray-200 dark:border-gray-700 gap-4">
            <div class="flex-shrink-0">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t('vendors.vendorLedger') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ vendor?.name || vendor?.contact_person }}
              </p>
            </div>

            <!-- Date Filter Section -->
            <div class="flex flex-wrap items-center gap-2 sm:gap-3">
              <div class="flex items-center gap-2">
                <label class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{{ t('vendors.from') }}:</label>
                <input
                  v-model="ledgerFromDate"
                  type="date"
                  class="input text-sm py-1.5 px-2 w-32"
                  :placeholder="t('vendors.beginning')"
                />
              </div>
              <div class="flex items-center gap-2">
                <label class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{{ t('vendors.to') }}:</label>
                <input
                  v-model="ledgerToDate"
                  type="date"
                  class="input text-sm py-1.5 px-2 w-32"
                />
              </div>
              <button
                v-if="isDateFilterActive"
                @click="resetDateFilter"
                class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1"
                :title="t('vendors.resetDateFilter')"
              >
                <RotateCcw class="h-4 w-4" />
                <span class="hidden sm:inline">{{ t('vendors.reset') }}</span>
              </button>
            </div>

            <div class="flex items-center gap-3 flex-shrink-0">
              <!-- Export Dropdown -->
              <div class="relative export-dropdown">
                <button @click="showExportDropdown = !showExportDropdown" class="btn-outline flex items-center text-sm">
                  <Download class="mr-2 h-4 w-4" />
                  {{ t('vendors.exportLedger') }}
                  <ChevronDown class="ml-2 h-4 w-4" />
                </button>

                <!-- Export Dropdown Menu -->
                <div v-if="showExportDropdown" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                  <div class="py-1">
                    <button @click="openExportModal('csv'); showExportDropdown = false" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <FileSpreadsheet class="mr-3 h-4 w-4 text-green-600" />
                      {{ t('vendors.exportCsv') }}
                    </button>
                    <button @click="openExportModal('pdf'); showExportDropdown = false" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <FileText class="mr-3 h-4 w-4 text-red-600" />
                      {{ t('vendors.exportPdf') }}
                    </button>
                    <button @click="openExportModal('tally'); showExportDropdown = false" class="relative flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <FileText class="mr-3 h-4 w-4 text-blue-600" />
                      {{ t('vendors.exportTallyXml') }}
                      <StatusBadge type="beta" position="absolute" />
                    </button>
                  </div>
                </div>
              </div>
              <button @click="closeLedgerModal" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Mobile Rotate Hint (only shows on small screens in portrait) -->
          <div
            v-if="!rotateHintDismissed"
            class="sm:hidden flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800"
          >
            <div class="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Smartphone class="h-4 w-4 rotate-90" />
              <span>{{ t('vendors.rotateForBetterView') }}</span>
            </div>
            <button
              @click="dismissRotateHint"
              class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Ledger Table -->
          <div class="flex-1 overflow-auto p-6">
            <div class="overflow-x-auto">
              <table class="w-full text-sm table-fixed min-w-[600px]">
                <thead class="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      {{ t('vendors.date') }}
                    </th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-auto">
                      {{ t('vendors.particulars') }}
                    </th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                      {{ t('vendors.reference') }}
                    </th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      {{ t('vendors.debit') }}
                    </th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      {{ t('vendors.credit') }}
                    </th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                      {{ t('vendors.balance') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
                  <!-- Opening Balance Row (shown when date filter is active) -->
                  <tr v-if="hasLedgerOpeningBalance" class="bg-blue-50 dark:bg-blue-900/20">
                    <td class="px-3 py-2 text-gray-900 dark:text-white whitespace-nowrap">
                      {{ ledgerFromDate }}
                    </td>
                    <td class="px-3 py-2 text-gray-900 dark:text-white font-medium">
                      {{ t('vendors.openingBalance') }}
                    </td>
                    <td class="px-3 py-2 text-gray-500 dark:text-gray-400">-</td>
                    <td class="px-3 py-2 text-right text-gray-400">-</td>
                    <td class="px-3 py-2 text-right text-gray-400">-</td>
                    <td class="px-3 py-2 text-right font-medium whitespace-nowrap" :class="ledgerOpeningBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
                      ₹{{ Math.abs(ledgerOpeningBalance).toFixed(2) }}
                      <span class="text-xs ml-1">{{ ledgerOpeningBalance >= 0 ? 'Cr' : 'Dr' }}</span>
                    </td>
                  </tr>

                  <!-- Ledger Entries -->
                  <tr
                    v-for="entry in displayedLedgerEntries"
                    :key="entry.id"
                    :class="[
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      isEntryClickable(entry) ? 'cursor-pointer' : ''
                    ]"
                    @click="isEntryClickable(entry) && openEntryDetail(entry)"
                  >
                    <td class="px-3 py-2 text-gray-900 dark:text-white whitespace-nowrap">
                      {{ formatDate(entry.date) }}
                    </td>
                    <td class="px-3 py-2 text-gray-900 dark:text-white">
                      <div class="flex items-center gap-1">
                        <span class="truncate" :title="entry.particulars">{{ entry.particulars }}</span>
                        <ExternalLink v-if="isEntryClickable(entry)" class="h-3 w-3 text-gray-400 flex-shrink-0" />
                      </div>
                      <div v-if="entry.details" class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" :title="entry.details">
                        {{ entry.details }}
                      </div>
                    </td>
                    <td class="px-3 py-2 text-gray-500 dark:text-gray-400 truncate" :title="entry.reference">
                      {{ entry.reference || '-' }}
                    </td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">
                      <span v-if="entry.debit > 0" class="text-green-600 dark:text-green-400 font-medium">
                        ₹{{ entry.debit.toFixed(2) }}
                      </span>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">
                      <span v-if="entry.credit > 0" class="text-red-600 dark:text-red-400 font-medium">
                        ₹{{ entry.credit.toFixed(2) }}
                      </span>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="px-3 py-2 text-right font-medium whitespace-nowrap" :class="entry.runningBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
                      ₹{{ Math.abs(entry.runningBalance).toFixed(2) }}
                      <span class="text-xs ml-1">{{ entry.runningBalance >= 0 ? 'Cr' : 'Dr' }}</span>
                    </td>
                  </tr>

                  <!-- Empty State -->
                  <tr v-if="displayedLedgerEntries.length === 0 && !hasLedgerOpeningBalance">
                    <td colspan="6" class="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                      {{ t('vendors.noLedgerEntries') }}
                    </td>
                  </tr>

                  <!-- Totals Row -->
                  <tr v-if="displayedLedgerEntries.length > 0 || hasLedgerOpeningBalance" class="bg-gray-100 dark:bg-gray-700 font-medium">
                    <td class="px-3 py-2 text-gray-900 dark:text-white" colspan="3">
                      {{ t('vendors.totals') }}
                    </td>
                    <td class="px-3 py-2 text-right text-green-600 dark:text-green-400 whitespace-nowrap">
                      ₹{{ totalDebits.toFixed(2) }}
                    </td>
                    <td class="px-3 py-2 text-right text-red-600 dark:text-red-400 whitespace-nowrap">
                      ₹{{ totalCredits.toFixed(2) }}
                    </td>
                    <td class="px-3 py-2 text-right whitespace-nowrap" :class="finalBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
                      ₹{{ Math.abs(finalBalance).toFixed(2) }}
                      <span class="text-xs ml-1">{{ finalBalance >= 0 ? 'Cr' : 'Dr' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Footer Summary -->
          <div v-if="displayedLedgerEntries.length > 0 || hasLedgerOpeningBalance" class="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div class="text-sm text-gray-600 dark:text-gray-400">
                <span v-if="isDateFilterActive">
                  {{ t('vendors.showingFilteredEntries', { count: displayedLedgerEntries.length, total: ledgerEntries.length }) }}
                </span>
                <span v-else>
                  {{ t('vendors.showingAllEntries') }} ({{ displayedLedgerEntries.length }} {{ t('vendors.entries') }})
                </span>
              </div>
              <div class="text-lg font-semibold" :class="finalBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
                {{ finalBalance >= 0 ? t('vendors.totalOutstanding') : t('vendors.creditBalance') }}: ₹{{ Math.abs(finalBalance).toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Confirmation Modal -->
    <div v-if="showExportModal" class="fixed inset-0 z-[60] overflow-y-auto">
      <div class="flex min-h-full items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="closeExportModal"></div>

        <!-- Modal Panel -->
        <div class="relative w-full max-w-md transform rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('vendors.exportLedger') }}
            </h3>
            <button @click="closeExportModal" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Export Format Display -->
          <div class="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center">
              <FileSpreadsheet v-if="exportFormat === 'csv'" class="h-5 w-5 text-green-600 mr-2" />
              <FileText v-else-if="exportFormat === 'pdf'" class="h-5 w-5 text-red-600 mr-2" />
              <FileText v-else class="h-5 w-5 text-blue-600 mr-2" />
              <span class="font-medium text-gray-900 dark:text-white">
                {{ exportFormat === 'csv' ? t('vendors.exportCsv') : exportFormat === 'pdf' ? t('vendors.exportPdf') : t('vendors.exportTallyXml') }}
              </span>
            </div>
          </div>

          <!-- Export Info -->
          <div class="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
            <p class="text-blue-700 dark:text-blue-300">
              <span v-if="isDateFilterActive">
                {{ t('vendors.exportingFilteredEntries', { count: displayedLedgerEntries.length }) }}
                <span v-if="hasLedgerOpeningBalance" class="block mt-1">
                  {{ t('vendors.openingBalance') }}: ₹{{ Math.abs(ledgerOpeningBalance).toFixed(2) }} {{ ledgerOpeningBalance >= 0 ? 'Cr' : 'Dr' }}
                </span>
              </span>
              <span v-else>
                {{ t('vendors.exportingAllEntries', { count: ledgerEntries.length }) }}
              </span>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3">
            <button @click="closeExportModal" class="btn-outline">
              {{ t('common.cancel') }}
            </button>
            <button @click="executeExport" class="btn-primary">
              <Download class="h-4 w-4 mr-2" />
              {{ t('common.export') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Entry Detail Modal -->
    <div v-if="showEntryDetailModal && selectedEntry" class="fixed inset-0 z-[70] overflow-y-auto">
      <div class="flex min-h-full items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="closeEntryDetail"></div>

        <!-- Modal Panel -->
        <div class="relative w-full max-w-lg transform rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all">
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedEntry.type === 'delivery' ? t('vendors.deliveryDetails') : t('vendors.paymentDetails') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ formatDate(selectedEntry.date) }}
              </p>
            </div>
            <button @click="closeEntryDetail" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-4">
            <!-- Delivery Details -->
            <template v-if="selectedEntry.type === 'delivery' && selectedDelivery">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.reference') }}</label>
                  <p class="mt-1 text-gray-900 dark:text-white">{{ selectedDelivery.delivery_reference || '-' }}</p>
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.status') }}</label>
                  <p class="mt-1">
                    <span :class="DeliveryPaymentCalculator.getPaymentStatusClass(selectedDelivery.payment_status)">
                      {{ t(DeliveryPaymentCalculator.getPaymentStatusTextKey(selectedDelivery.payment_status)) }}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.amount') }}</label>
                <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">₹{{ selectedDelivery.total_amount.toFixed(2) }}</p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.paid') }}</label>
                  <p class="mt-1 text-green-600 dark:text-green-400 font-medium">₹{{ (selectedDelivery.paid_amount || 0).toFixed(2) }}</p>
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.outstanding') }}</label>
                  <p class="mt-1 text-red-600 dark:text-red-400 font-medium">₹{{ (selectedDelivery.outstanding || 0).toFixed(2) }}</p>
                </div>
              </div>

              <!-- Delivery Items -->
              <div v-if="selectedDelivery.expand?.delivery_items && selectedDelivery.expand.delivery_items.length > 0">
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.items') }}</label>
                <div class="mt-2 space-y-2">
                  <div
                    v-for="item in selectedDelivery.expand.delivery_items"
                    :key="item.id"
                    class="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">{{ item.expand?.item?.name || t('vendors.unknownItem') }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.quantity }} {{ item.expand?.item?.unit || t('vendors.units') }} × ₹{{ item.unit_price?.toFixed(2) || '0.00' }}</p>
                    </div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">₹{{ (item.quantity * (item.unit_price || 0)).toFixed(2) }}</p>
                  </div>
                </div>
              </div>
            </template>

            <!-- Payment Details -->
            <template v-else-if="selectedEntry.type === 'payment' && selectedPayment">
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.amount') }}</label>
                <p class="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">₹{{ selectedPayment.amount.toFixed(2) }}</p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.reference') }}</label>
                  <p class="mt-1 text-gray-900 dark:text-white">{{ selectedPayment.reference || '-' }}</p>
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.date') }}</label>
                  <p class="mt-1 text-gray-900 dark:text-white">{{ formatDate(selectedPayment.payment_date) }}</p>
                </div>
              </div>

              <div v-if="selectedPayment.notes">
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.notes') }}</label>
                <p class="mt-1 text-gray-900 dark:text-white">{{ selectedPayment.notes }}</p>
              </div>

              <!-- Payment Account -->
              <div v-if="selectedPayment.expand?.account">
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('vendors.paymentAccount') }}</label>
                <p class="mt-1 text-gray-900 dark:text-white">{{ selectedPayment.expand.account.name }}</p>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <button @click="closeEntryDetail" class="w-full btn-outline">
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center min-h-96">
    <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { jsPDF } from 'jspdf';
import {
  ArrowLeft,
  Download,
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  TruckIcon,
  Loader2,
  Building2,
  RotateCcw,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  X,
  BookOpen,
  Smartphone,
  ExternalLink
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useToast } from '../composables/useToast';
import { useModalState } from '../composables/useModalState';
import StatusBadge from '../components/StatusBadge.vue';
import PaymentModal from '../components/PaymentModal.vue';
import {
  vendorService,
  deliveryService,
  paymentService,
  paymentAllocationService,
  accountService,
  tagService,
  vendorReturnService,
  vendorCreditNoteService,
  creditNoteUsageService,
  accountTransactionService,
  serviceBookingService,
  VendorService,
  type Vendor,
  type Delivery,
  type Payment,
  type PaymentAllocation,
  type Account,
  type ServiceBooking,
  type Tag as TagType,
  type VendorReturn,
  type VendorCreditNote,
  type CreditNoteUsage,
  type AccountTransaction
} from '../services/pocketbase';
import { DeliveryPaymentCalculator, type DeliveryWithPaymentStatus } from '../services/deliveryUtils';
import { TallyXmlExporter } from '../utils/tallyXmlExport';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { success, error } = useToast();
const { openModal, closeModal: closeModalState } = useModalState();

const vendor = ref<Vendor | null>(null);
const vendorDeliveries = ref<DeliveryWithPaymentStatus[]>([]);
const vendorServiceBookings = ref<ServiceBooking[]>([]);
const vendorPayments = ref<Payment[]>([]);
const allPayments = ref<Payment[]>([]);
const allVendors = ref<Vendor[]>([]);
const allDeliveries = ref<Delivery[]>([]);
const allServiceBookings = ref<ServiceBooking[]>([]);
const paymentAllocations = ref<PaymentAllocation[]>([]);
const vendorReturns = ref<VendorReturn[]>([]);
const vendorCreditNotes = ref<VendorCreditNote[]>([]);
const vendorCreditNoteUsages = ref<CreditNoteUsage[]>([]);
const vendorRefunds = ref<AccountTransaction[]>([]);
const accounts = ref<Account[]>([]);
const vendorTags = ref<TagType[]>([]);
const showPaymentModal = ref(false);
const paymentLoading = ref(false);
const showExportDropdown = ref(false);
const showMobileMenu = ref(false);

// Payment modal state
const paymentModalMode = ref<'CREATE' | 'PAY_NOW' | 'EDIT'>('PAY_NOW');
const currentPayment = ref<Payment | null>(null);
const currentAllocations = ref<PaymentAllocation[]>([]);

// Ledger modal state
const showLedgerModal = ref(false);
const ledgerFromDate = ref<string>('');
const ledgerToDate = ref<string>(new Date().toISOString().split('T')[0]);
const rotateHintDismissed = ref(false);

// Entry detail modal state
const showEntryDetailModal = ref(false);
const selectedEntry = ref<{
  id: string;
  type: 'delivery' | 'payment' | 'credit_note' | 'refund' | 'opening_balance';
  date: string;
  particulars: string;
  details?: string;
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
} | null>(null);

// Export modal state
const showExportModal = ref(false);
const exportFormat = ref<'csv' | 'pdf' | 'tally'>('csv');


const outstandingAmount = computed(() => {
  if (!vendor.value) return 0;
  
  // Use centralized calculation that considers total payments made to vendor
  const outstanding = VendorService.calculateOutstandingFromData(
    vendor.value.id!,
    vendorDeliveries.value,
    vendorServiceBookings.value,
    vendorPayments.value
  );
  
  const creditBalance = vendorCreditNotes.value.reduce((sum, note) => sum + note.balance, 0);
  return outstanding - creditBalance; // Outstanding minus available credit
});

const totalPaid = computed(() => {
  return vendorPayments.value.reduce((sum, payment) => sum + payment.amount, 0);
});

// These computed properties are deprecated as we're moving away from payment_status field
// const pendingDeliveries = computed(() => {
//   return vendorDeliveries.value.filter(delivery => delivery.payment_status === 'pending').length;
// });

// const partialDeliveries = computed(() => {
//   return vendorDeliveries.value.filter(delivery => delivery.payment_status === 'partial').length;
// });

// const paidDeliveries = computed(() => {
//   return vendorDeliveries.value.filter(delivery => delivery.payment_status === 'paid').length;
// });

// Comprehensive ledger entries with proper accounting principles
// From buyer's perspective (Accounts Payable):
// - Credit = increases liability (deliveries received)
// - Debit = decreases liability (payments made, refunds received)
const ledgerEntries = computed(() => {
  const entries: Array<{
    id: string;
    type: 'opening_balance' | 'delivery' | 'payment' | 'credit_note' | 'refund';
    date: string;
    description: string;
    details?: string;
    reference: string;
    particulars: string;
    debit: number;  // Payments, refunds (decreases liability)
    credit: number; // Purchases on credit (increases liability)
    runningBalance: number;
  }> = [];

  // 1️⃣ Add opening balance if there are previous transactions
  // For now, we'll start fresh, but this can be extended for previous period balances

  // 2️⃣ Add delivery entries (credits - purchases increase liability)
  vendorDeliveries.value.forEach(delivery => {
    let description = `${t('vendors.delivery')} #${delivery.id?.slice(-6) || t('vendors.unknown')}`;
    let details = '';
    let particulars = `Invoice: ${delivery.delivery_reference || delivery.id?.slice(-6) || 'N/A'}`;

    // Create description from delivery items if available
    if (delivery.expand?.delivery_items && delivery.expand.delivery_items.length > 0) {
      const itemNames = delivery.expand.delivery_items.map((deliveryItem) => {
        const itemName = deliveryItem.expand?.item?.name || t('vendors.unknownItem');
        const quantity = deliveryItem.quantity || 0;
        const unit = deliveryItem.expand?.item?.unit || t('vendors.units');
        return `${itemName} (${quantity} ${unit})`;
      });
      details = `${t('vendors.received')}: ${itemNames.join(', ')}`;
      particulars = `Invoice: ${delivery.delivery_reference || delivery.id?.slice(-6) || 'N/A'} - ${itemNames.slice(0, 2).map(item => item.split('(')[0].trim()).join(', ')}`;
      if (itemNames.length > 2) particulars += ` +${itemNames.length - 2} more`;
    }

    entries.push({
      id: delivery.id || '',
      type: 'delivery',
      date: delivery.delivery_date,
      description,
      details,
      reference: delivery.delivery_reference || '',
      particulars,
      debit: 0,
      credit: delivery.total_amount,  // Credit increases liability (what we owe)
      runningBalance: 0 // Will be calculated below
    });
  });

  // 3️⃣ Add return entries
  vendorReturns.value.forEach(returnItem => {
    if (returnItem.status === 'completed' || returnItem.status === 'refunded') {
      if (returnItem.processing_option === 'credit_note') {
        // CREDIT NOTE SCENARIO: Return processed as credit note
        // Shows ONLY in debit column - reduces liability
        const relatedCreditNote = vendorCreditNotes.value.find(cn =>
          cn.reason === returnItem.reason &&
          cn.credit_amount === returnItem.total_return_amount
        );

        let details = `Return processed as credit note`;
        let particulars = `Credit Note: ${relatedCreditNote?.reference || `Return #${returnItem.id?.slice(-6)}`}`;

        if (returnItem.reason) {
          details += ` - ${returnItem.reason}`;
          particulars += ` - ${returnItem.reason}`;
        }

        entries.push({
          id: returnItem.id || '',
          type: 'credit_note',
          date: returnItem.completion_date || returnItem.return_date,
          description: 'Credit Note for Return',
          details,
          reference: relatedCreditNote?.reference || `RET-${returnItem.id?.slice(-6)}`,
          particulars,
          debit: returnItem.total_return_amount,  // Debit: reduces liability
          credit: 0,
          runningBalance: 0 // Will be calculated below
        });

      } else if (returnItem.processing_option === 'refund') {
        // REFUND SCENARIO: Return processed as refund (TWO ENTRIES)

        // 1. Return entry - DEBIT column (reduces liability for returned goods)
        let returnDetails = `Goods returned for refund`;
        let returnParticulars = `Return: Return #${returnItem.id?.slice(-6)}`;

        if (returnItem.reason) {
          returnDetails += ` - ${returnItem.reason}`;
          returnParticulars += ` - ${returnItem.reason}`;
        }

        entries.push({
          id: `${returnItem.id}_return` || '',
          type: 'credit_note',
          date: returnItem.completion_date || returnItem.return_date,
          description: 'Goods Returned',
          details: returnDetails,
          reference: `RET-${returnItem.id?.slice(-6)}`,
          particulars: returnParticulars,
          debit: returnItem.total_return_amount,  // Debit: reduces liability for returned goods
          credit: 0,
          runningBalance: 0 // Will be calculated below
        });

        // 2. Refund transaction entry - also DEBIT (vendor gave us money back)
        if (returnItem.actual_refund_amount && returnItem.actual_refund_amount > 0) {
          let refundDetails = `Refund received for returned goods`;
          let refundParticulars = `Refund Received: Return #${returnItem.id?.slice(-6)}`;

          if (returnItem.reason) {
            refundDetails += ` - ${returnItem.reason}`;
            refundParticulars += ` - ${returnItem.reason}`;
          }

          entries.push({
            id: `${returnItem.id}_refund` || '',
            type: 'refund',
            date: returnItem.completion_date || returnItem.return_date,
            description: 'Refund Transaction',
            details: refundDetails,
            reference: `REF-${returnItem.id?.slice(-6)}`,
            particulars: refundParticulars,
            debit: returnItem.actual_refund_amount,  // Debit: refund received reduces liability
            credit: 0,
            runningBalance: 0 // Will be calculated below
          });
        }
      }
    }
  });

  // Also add standalone credit notes (not related to returns)
  vendorCreditNotes.value.forEach(creditNote => {
    // Only show credit notes that are not already processed above via returns
    const isReturnRelated = vendorReturns.value.some(returnItem =>
      returnItem.processing_option === 'credit_note' &&
      returnItem.reason === creditNote.reason &&
      returnItem.total_return_amount === creditNote.credit_amount
    );

    if (creditNote.credit_amount > 0 && !isReturnRelated) {
      let details = '';
      let particulars = `Credit Note: ${creditNote.reference || `CN-${creditNote.id?.slice(-6)}`}`;

      if (creditNote.reason) {
        details = creditNote.reason;
        particulars += ` - ${creditNote.reason}`;
      }

      entries.push({
        id: creditNote.id || '',
        type: 'credit_note',
        date: creditNote.issue_date,
        description: t('vendors.creditNoteIssued'),
        details,
        reference: creditNote.reference || `CN-${creditNote.id?.slice(-6)}`,
        particulars,
        debit: creditNote.credit_amount,  // Debit reduces liability
        credit: 0,
        runningBalance: 0 // Will be calculated below
      });
    }
  });

  // Note: Credit note usage should NOT appear as a separate entry in the ledger
  // The credit note already reduced our liability when issued
  // Usage is just internal tracking of which payments utilized the credit

  // 4️⃣ Add payment entries (debits - reduces what we owe)
  vendorPayments.value.forEach(payment => {
    let particulars = `Payment: ${payment.reference || 'Bank Transfer'}`;
    if (payment.notes) {
      particulars += ` - ${payment.notes}`;
    }

    entries.push({
      id: payment.id || '',
      type: 'payment',
      date: payment.payment_date,
      description: t('vendors.paymentMade'),
      details: payment.notes || '',
      reference: payment.reference || '',
      particulars,
      debit: payment.amount,  // Debit reduces liability (what we paid)
      credit: 0,
      runningBalance: 0 // Will be calculated below
    });
  });

  // Additional refund entries from account transactions (if any)
  // These would be standalone refunds not related to returns
  vendorRefunds.value.forEach(refund => {
    let details = refund.description || '';
    let particulars = `Refund Received`;

    if (refund.reference) {
      particulars += `: ${refund.reference}`;
    }
    if (refund.expand?.account?.name) {
      details += details ? ` - ` : '';
      details += `To ${refund.expand.account.name}`;
    }

    entries.push({
      id: refund.id || '',
      type: 'refund',
      date: refund.transaction_date,
      description: 'Standalone Refund Received',
      details,
      reference: refund.reference || '',
      particulars,
      debit: refund.amount,  // Debit reduces liability
      credit: 0,
      runningBalance: 0 // Will be calculated below
    });
  });

  // Sort entries by date
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 5️⃣ Calculate running balance (Credit increases balance, Debit decreases balance)
  let runningBalance = 0;
  entries.forEach(entry => {
    runningBalance += entry.credit - entry.debit;  // Proper accounting: Cr (+), Dr (-)
    entry.runningBalance = runningBalance;
  });

  return entries;
});

// Filter ledger entries based on date range
const filteredLedgerData = computed(() => {
  const allEntries = ledgerEntries.value;
  const fromDate = ledgerFromDate.value ? new Date(ledgerFromDate.value) : null;
  const toDate = ledgerToDate.value ? new Date(ledgerToDate.value) : null;

  // If no filters set, return all entries
  if (!fromDate && !toDate) {
    return { entries: allEntries, openingBalance: 0, hasOpeningBalance: false };
  }

  // Calculate opening balance from entries before the from date
  let openingBalance = 0;
  const filteredEntries: typeof allEntries = [];

  allEntries.forEach(entry => {
    const entryDate = new Date(entry.date);

    // Check if entry is before fromDate (for opening balance)
    if (fromDate && entryDate < fromDate) {
      openingBalance += entry.credit - entry.debit;
      return;
    }

    // Check if entry is after toDate (exclude)
    if (toDate) {
      const toDateEnd = new Date(toDate);
      toDateEnd.setHours(23, 59, 59, 999);
      if (entryDate > toDateEnd) {
        return;
      }
    }

    // Entry is within range
    filteredEntries.push({ ...entry });
  });

  // Recalculate running balance starting from opening balance
  let runningBalance = openingBalance;
  filteredEntries.forEach(entry => {
    runningBalance += entry.credit - entry.debit;
    entry.runningBalance = runningBalance;
  });

  return {
    entries: filteredEntries,
    openingBalance,
    hasOpeningBalance: fromDate !== null && openingBalance !== 0
  };
});

// Filtered entries for display
const displayedLedgerEntries = computed(() => filteredLedgerData.value.entries);
const ledgerOpeningBalance = computed(() => filteredLedgerData.value.openingBalance);
const hasLedgerOpeningBalance = computed(() => filteredLedgerData.value.hasOpeningBalance);

// Calculate totals for the ledger (uses filtered entries for display)
const totalDebits = computed(() => {
  return displayedLedgerEntries.value.reduce((sum, entry) => sum + entry.debit, 0);
});

const totalCredits = computed(() => {
  return displayedLedgerEntries.value.reduce((sum, entry) => sum + entry.credit, 0);
});

// Final balance: Credits - Debits (including opening balance)
const finalBalance = computed(() => {
  return ledgerOpeningBalance.value + totalCredits.value - totalDebits.value;
});

// Check if date filter is active
const isDateFilterActive = computed(() => {
  return ledgerFromDate.value !== '' || ledgerToDate.value !== new Date().toISOString().split('T')[0];
});

// Export uses the current filtered data from ledger modal
const getFilteredEntriesForExport = () => {
  return filteredLedgerData.value;
};

// Ledger modal functions
const openLedgerModal = () => {
  showLedgerModal.value = true;
};

const closeLedgerModal = () => {
  showLedgerModal.value = false;
  showExportDropdown.value = false;
};

// Reset date filter to full range (empty from date, today as to date)
const resetDateFilter = () => {
  ledgerFromDate.value = '';
  ledgerToDate.value = new Date().toISOString().split('T')[0];
};

// Dismiss rotate hint
const dismissRotateHint = () => {
  rotateHintDismissed.value = true;
};

// Check if entry is clickable (has associated detail)
const isEntryClickable = (entry: { type: string }) => {
  return entry.type === 'delivery' || entry.type === 'payment';
};

// Open entry detail modal
const openEntryDetail = (entry: typeof selectedEntry.value) => {
  if (!entry || !isEntryClickable(entry)) return;
  selectedEntry.value = entry;
  showEntryDetailModal.value = true;
};

// Close entry detail modal
const closeEntryDetail = () => {
  showEntryDetailModal.value = false;
  selectedEntry.value = null;
};

// Get delivery details for selected entry
const selectedDelivery = computed(() => {
  if (!selectedEntry.value || selectedEntry.value.type !== 'delivery') return null;
  return vendorDeliveries.value.find(d => d.id === selectedEntry.value?.id) || null;
});

// Get payment details for selected entry
const selectedPayment = computed(() => {
  if (!selectedEntry.value || selectedEntry.value.type !== 'payment') return null;
  return vendorPayments.value.find(p => p.id === selectedEntry.value?.id) || null;
});

// Export modal functions
const openExportModal = (format: 'csv' | 'pdf' | 'tally') => {
  exportFormat.value = format;
  showExportModal.value = true;
};

const closeExportModal = () => {
  showExportModal.value = false;
};

const executeExport = async () => {
  try {
    switch (exportFormat.value) {
      case 'csv':
        exportLedger();
        break;
      case 'pdf':
        await exportLedgerPDF();
        break;
      case 'tally':
        exportTallyXml();
        break;
    }
    closeExportModal();
  } catch (err) {
    console.error('Export error:', err);
  }
};




const goBack = () => {
  try {
    router.back();
  } catch (error) {
    console.error('Navigation error:', error);
    router.push('/vendors');
  }
};

const loadVendorData = async () => {
  const vendorId = route.params.id as string;

  try {
    const [vendorData, allDeliveriesData, allServiceBookingsData, allPaymentsData, allPaymentAllocationsData, allReturns, allCreditNotes, allCreditNoteUsages, allTransactions, accountsData, allTags] = await Promise.all([
      vendorService.getAll(),
      deliveryService.getAll(),
      serviceBookingService.getAll(),
      paymentService.getAll(),
      paymentAllocationService.getAll(),
      vendorReturnService.getByVendor(vendorId),
      vendorCreditNoteService.getByVendor(vendorId),
      creditNoteUsageService.getByVendor(vendorId),
      accountTransactionService.getAll(),
      accountService.getAll(),
      tagService.getAll()
    ]);

    allVendors.value = vendorData;
    allDeliveries.value = allDeliveriesData;
    allServiceBookings.value = allServiceBookingsData;
    paymentAllocations.value = allPaymentAllocationsData;
    vendor.value = vendorData.find(v => v.id === vendorId) || null;
    
    // Filter vendor deliveries and enhance with payment status
    const filteredDeliveries = allDeliveriesData
      .filter(delivery => delivery.vendor === vendorId)
      .sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
    
    vendorDeliveries.value = DeliveryPaymentCalculator.enhanceDeliveriesWithPaymentStatus(
      filteredDeliveries,
      allPaymentAllocationsData
    );
    vendorServiceBookings.value = allServiceBookingsData
      .filter(booking => booking.vendor === vendorId)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    allPayments.value = allPaymentsData;
    vendorPayments.value = allPaymentsData
      .filter(payment => payment.vendor === vendorId)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    vendorReturns.value = allReturns;
    vendorCreditNotes.value = allCreditNotes;
    vendorCreditNoteUsages.value = allCreditNoteUsages;
    // Filter refund transactions (credit transactions with vendor)
    vendorRefunds.value = allTransactions
      .filter(transaction => transaction.type === 'credit' && transaction.vendor === vendorId)
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
    accounts.value = accountsData;

    // Map tags for the vendor
    if (vendor.value && vendor.value.tags && vendor.value.tags.length > 0) {
      vendorTags.value = allTags.filter(tag => vendor.value!.tags!.includes(tag.id!));
    } else {
      vendorTags.value = [];
    }

    if (!vendor.value) {
      router.push('/vendors');
    }
  } catch (error) {
    console.error('Error loading vendor data:', error);
    router.push('/vendors');
  }
};

const recordPayment = () => {
  paymentModalMode.value = 'PAY_NOW';
  currentPayment.value = null;
  currentAllocations.value = [];
  showPaymentModal.value = true;
  openModal('vendor-detail-payment-modal');
};

const handlePaymentModalSubmit = async (data: any) => {
  const { form } = data;
  
  paymentLoading.value = true;
  try {
    // Prepare payment data
    const paymentData = {
      vendor: form.vendor,
      account: form.account,
      amount: form.amount,
      payment_date: form.transaction_date,
      reference: form.reference,
      notes: form.notes,
      deliveries: form.deliveries,
      service_bookings: form.service_bookings,
      credit_notes: form.credit_notes || [],
      delivery_allocations: form.delivery_allocations || {},
      service_booking_allocations: form.service_booking_allocations || {},
      credit_note_allocations: form.credit_note_allocations || {}
    };

    // If payment is fully covered by credit notes, remove account from payment data
    const totalCreditNoteAmount = Object.values(form.credit_note_allocations || {})
      .reduce((sum: number, allocation: any) => sum + (allocation?.amount || 0), 0);
    
    if (totalCreditNoteAmount >= form.amount) {
      delete paymentData.account;
    }

    await paymentService.create(paymentData);
    success(t('messages.createSuccess', { item: t('common.payment') }));
    await loadVendorData();
    showPaymentModal.value = false;
    closeModalState('vendor-detail-payment-modal');
  } catch (err: any) {
    console.error('Error saving payment:', err);
    error(t('messages.createError', { item: t('common.payment') }));
  } finally {
    paymentLoading.value = false;
  }
};

const handlePaymentModalClose = () => {
  showPaymentModal.value = false;
  paymentModalMode.value = 'PAY_NOW';
  currentPayment.value = null;
  currentAllocations.value = [];
  closeModalState('vendor-detail-payment-modal');
};

const exportLedger = () => {
  if (!vendor.value) return;

  // Create CSV content
  const csvContent = generateLedgerCSV();

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${vendor.value.name}_${t('vendors.ledger')}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const addFooter = (doc: any, pageWidth: number, pageHeight: number, margin: number) => {
  const footerY = pageHeight - 15;
  
  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  // Footer text
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128); // Gray color
  doc.text('Generated with SiteWise - One stop solution for construction site management', margin, footerY);
  
  // Page number (right aligned)
  const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
  doc.text(`Page ${pageNum}`, pageWidth - margin - 15, footerY);
};

const exportLedgerPDF = async () => {
  if (!vendor.value) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  let yPosition = 25;
  const filtered = getFilteredEntriesForExport();
  const hasDateFilter = isDateFilterActive.value;

  // Load and add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
      logoImg.src = '/logo.png';
    });

    // Add logo to the right side of header with proper aspect ratio
    const maxLogoWidth = 25;
    const maxLogoHeight = 15;

    // Calculate aspect ratio and fit within bounds
    const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
    let logoWidth = maxLogoWidth;
    let logoHeight = maxLogoWidth / aspectRatio;

    // If height exceeds max, scale by height instead
    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = maxLogoHeight * aspectRatio;
    }

    const logoX = pageWidth - margin - logoWidth;
    const logoY = yPosition - 5;

    doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    // Continue without logo if it fails to load
  }

  // Document title (no SiteWise text in header, just logo)
  yPosition += 10;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0); // Black for main content
  doc.text(t('vendors.vendorLedger'), margin, yPosition);

  // Vendor information
  yPosition += 12;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`${t('vendors.vendor')}: ${vendor.value.name}`, margin, yPosition);

  yPosition += 6;
  if (vendor.value.contact_person) {
    doc.text(`${t('vendors.contact')}: ${vendor.value.contact_person}`, margin, yPosition);
    yPosition += 6;
  }

  doc.text(`${t('vendors.generated')}: ${new Date().toLocaleDateString('en-CA')}`, margin, yPosition);

  // Show filter period if active
  if (hasDateFilter) {
    yPosition += 6;
    const periodText = `${t('vendors.filterPeriod')}: ${ledgerFromDate.value || t('vendors.beginning')} - ${ledgerToDate.value || t('vendors.today')}`;
    doc.text(periodText, margin, yPosition);
  }

  yPosition += 15;

  // Table headers with adjusted column widths for better text fitting
  // Total usable width: pageWidth - 2*margin = 210 - 28 = 182mm
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const headers = [t('vendors.date'), t('vendors.particulars'), t('vendors.reference'), t('vendors.debit'), t('vendors.credit'), t('vendors.balance')];
  // Adjusted widths: date=22, particulars=70, reference=25, debit=22, credit=22, balance=22 = 183 (close enough)
  const colWidths = [22, 70, 25, 22, 22, 22];
  let xPos = margin;

  headers.forEach((header, i) => {
    doc.text(header, xPos, yPosition);
    xPos += colWidths[i];
  });

  yPosition += 6;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  // Add opening balance row if filtering
  if (filtered.hasOpeningBalance) {
    xPos = margin;

    const openingBalanceDisplay = filtered.openingBalance >= 0
      ? `${Math.abs(filtered.openingBalance).toFixed(0)} Cr`
      : `${Math.abs(filtered.openingBalance).toFixed(0)} Dr`;

    doc.text(ledgerFromDate.value || '', xPos, yPosition);
    xPos += colWidths[0];
    doc.text(t('vendors.openingBalance'), xPos, yPosition);
    xPos += colWidths[1];
    doc.text('', xPos, yPosition);
    xPos += colWidths[2];
    doc.text('', xPos, yPosition);
    xPos += colWidths[3];
    doc.text('', xPos, yPosition);
    xPos += colWidths[4];
    doc.text(openingBalanceDisplay, xPos, yPosition);

    yPosition += 5;
  }

  // Calculate export totals
  let exportTotalDebits = 0;
  let exportTotalCredits = 0;

  // Use filtered ledger entries
  filtered.entries.forEach(entry => {
    if (yPosition > 245) { // Leave more space for footer
      doc.addPage();
      yPosition = 25;
    }

    xPos = margin;

    // Truncate particulars to fit in column instead of wrapping
    const maxParticularsWidth = colWidths[1] - 2;
    let particularsText = entry.particulars;
    while (doc.getTextWidth(particularsText) > maxParticularsWidth && particularsText.length > 3) {
      particularsText = particularsText.slice(0, -4) + '...';
    }

    // Truncate reference similarly
    const maxRefWidth = colWidths[2] - 2;
    let refText = entry.reference || '-';
    while (doc.getTextWidth(refText) > maxRefWidth && refText.length > 3) {
      refText = refText.slice(0, -4) + '...';
    }

    // Balance display with Cr/Dr notation
    const balanceDisplay = entry.runningBalance >= 0
      ? `${Math.abs(entry.runningBalance).toFixed(0)} Cr`
      : `${Math.abs(entry.runningBalance).toFixed(0)} Dr`;

    // Draw each column
    doc.text(new Date(entry.date).toLocaleDateString('en-CA'), xPos, yPosition);
    xPos += colWidths[0];

    doc.text(particularsText, xPos, yPosition);
    xPos += colWidths[1];

    doc.text(refText, xPos, yPosition);
    xPos += colWidths[2];

    doc.text(entry.debit > 0 ? entry.debit.toFixed(0) : '-', xPos, yPosition);
    xPos += colWidths[3];

    doc.text(entry.credit > 0 ? entry.credit.toFixed(0) : '-', xPos, yPosition);
    xPos += colWidths[4];

    doc.text(balanceDisplay, xPos, yPosition);

    exportTotalDebits += entry.debit;
    exportTotalCredits += entry.credit;

    yPosition += 5;
  });

  // Summary
  if (yPosition > 210) { // Leave more space for footer
    doc.addPage();
    yPosition = 25;
  }

  yPosition += 8;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // Add totals
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  xPos = margin;

  doc.text(t('vendors.totals'), xPos, yPosition);
  xPos += colWidths[0] + colWidths[1] + colWidths[2];

  doc.text(exportTotalDebits.toFixed(0), xPos, yPosition);
  xPos += colWidths[3];

  doc.text(exportTotalCredits.toFixed(0), xPos, yPosition);
  xPos += colWidths[4];

  const exportFinalBalance = filtered.openingBalance + exportTotalCredits - exportTotalDebits;
  const finalBalanceDisplay = exportFinalBalance >= 0
    ? `${Math.abs(exportFinalBalance).toFixed(0)} Cr`
    : `${Math.abs(exportFinalBalance).toFixed(0)} Dr`;
  doc.text(finalBalanceDisplay, xPos, yPosition);

  yPosition += 8;

  // Final balance summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const balanceText = exportFinalBalance >= 0
    ? `${t('vendors.totalOutstanding')}: ₹${exportFinalBalance.toFixed(0)}`
    : `${t('vendors.creditBalance')}: ₹${Math.abs(exportFinalBalance).toFixed(0)}`;
  doc.text(balanceText, margin, yPosition);

  // Add footer to all pages
  const totalPages = doc.internal.pages.length - 1; // Subtract 1 because pages array includes a null first element
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, pageWidth, pageHeight, margin);
  }

  // Save the PDF
  doc.save(`${vendor.value.name}_${t('vendors.ledger')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

const generateLedgerCSV = () => {
  if (!vendor.value) return '';

  const headers = [
    t('vendors.date'),
    t('vendors.particulars'),
    t('vendors.reference'),
    t('vendors.debit'),
    t('vendors.credit'),
    t('vendors.balance')
  ];

  const rows: (string | number)[][] = [];
  const filtered = getFilteredEntriesForExport();
  const hasDateFilter = isDateFilterActive.value;

  // Add opening balance row if filtering
  if (filtered.hasOpeningBalance) {
    const openingBalanceDisplay = filtered.openingBalance >= 0
      ? `${filtered.openingBalance.toFixed(2)} Cr`
      : `${Math.abs(filtered.openingBalance).toFixed(2)} Dr`;

    rows.push([
      ledgerFromDate.value,
      t('vendors.openingBalance'),
      '',
      '',
      '',
      openingBalanceDisplay
    ]);
  }

  // Calculate export totals
  let exportTotalDebits = 0;
  let exportTotalCredits = 0;

  // Use the filtered ledger entries
  filtered.entries.forEach(entry => {
    const balanceDisplay = entry.runningBalance >= 0
      ? `${entry.runningBalance.toFixed(2)} Cr`
      : `${Math.abs(entry.runningBalance).toFixed(2)} Dr`;

    rows.push([
      new Date(entry.date).toLocaleDateString('en-CA'),
      entry.particulars,
      entry.reference || '',
      entry.debit > 0 ? entry.debit.toFixed(2) : '',
      entry.credit > 0 ? entry.credit.toFixed(2) : '',
      balanceDisplay
    ]);

    exportTotalDebits += entry.debit;
    exportTotalCredits += entry.credit;
  });

  // Add totals row
  rows.push([
    '',
    t('vendors.totals'),
    '',
    exportTotalDebits.toFixed(2),
    exportTotalCredits.toFixed(2),
    ''
  ]);

  // Add summary information
  rows.push(['', '', '', '', '', '']);

  // Add filter info if active
  if (hasDateFilter) {
    rows.push([
      t('vendors.filterPeriod'),
      `${ledgerFromDate.value || t('vendors.beginning')} - ${ledgerToDate.value || t('vendors.today')}`,
      '',
      '',
      '',
      ''
    ]);
  }

  rows.push([
    t('vendors.generated'),
    new Date().toISOString().split('T')[0],
    '',
    '',
    '',
    ''
  ]);

  const exportFinalBalance = filtered.openingBalance + exportTotalCredits - exportTotalDebits;
  const balanceStatus = exportFinalBalance >= 0 ? t('vendors.outstanding') : t('vendors.creditBalance');
  const finalBalanceDisplay = exportFinalBalance >= 0
    ? `₹${exportFinalBalance.toFixed(2)} Cr (${balanceStatus})`
    : `₹${Math.abs(exportFinalBalance).toFixed(2)} Dr (${balanceStatus})`;

  rows.push([
    t('vendors.finalBalance'),
    finalBalanceDisplay,
    '',
    '',
    '',
    ''
  ]);

  // Convert to CSV
  const csvRows = [headers, ...rows];
  return csvRows.map(row =>
    row.map(field =>
      typeof field === 'string' && field.includes(',') ? `"${field}"` : field
    ).join(',')
  ).join('\n');
};

const exportTallyXml = () => {
  if (!vendor.value) return;

  try {
    // Prepare ledger data for Tally XML export
    const ledgerData = TallyXmlExporter.prepareLedgerData(
      vendor.value,
      vendorDeliveries.value,
      vendorPayments.value,
      vendorCreditNotes.value,
      vendorCreditNoteUsages.value,
      vendorReturns.value
    );

    // Export options
    const exportOptions = {
      companyName: 'SiteWise Construction', // You can make this configurable
      periodFrom: '01-04-2024', // Financial year start
      periodTo: '31-03-2025',   // Financial year end
      includeNarration: true,
      includeVoucherNumber: true
    };

    // Generate XML content
    const xmlContent = TallyXmlExporter.generateVendorLedgerXml(ledgerData, exportOptions);

    // Download the XML file
    const filename = `${vendor.value.name || 'Vendor'}_Tally_${new Date().toISOString().split('T')[0]}.xml`;
    TallyXmlExporter.downloadXmlFile(xmlContent, filename);
  } catch (error) {
    console.error('Error exporting Tally XML:', error);
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const getReturnStatusClass = (status: string) => {
  const classes = {
    initiated: 'status-pending',
    approved: 'status-approved', 
    rejected: 'status-rejected',
    completed: 'status-completed',
    refunded: 'status-paid'
  };
  return classes[status as keyof typeof classes] || 'status-pending';
};

const createReturn = () => {
  router.push({
    path: '/vendor-returns',
    query: { vendor: vendor.value?.id }
  });
};

// Handle mobile menu actions
const handleMobileAction = async (action: string) => {
  // Close the menu first
  showMobileMenu.value = false;

  // Then execute the action after a small delay to ensure menu closes
  setTimeout(async () => {
    try {
      switch (action) {
        case 'viewLedger':
          openLedgerModal();
          break;
        case 'createReturn':
          createReturn();
          break;
        case 'recordPayment':
          recordPayment();
          break;
        default:
          console.warn('Unknown mobile action:', action);
      }
    } catch (error) {
      console.error('Error executing mobile action:', action, error);
    }
  }, 100);
};

// Click outside handler for dropdowns
const handleClickOutside = (event: Event) => {
  const exportDropdown = document.querySelector('.export-dropdown');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (exportDropdown && !exportDropdown.contains(event.target as Node)) {
    showExportDropdown.value = false;
  }
  
  if (mobileMenu && !mobileMenu.contains(event.target as Node)) {
    showMobileMenu.value = false;
  }
};

// Handle ESC key for closing modals
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (showExportModal.value) {
      closeExportModal();
    } else if (showLedgerModal.value) {
      closeLedgerModal();
    }
  }
};

// Event listeners using @vueuse/core
useEventListener(document, 'click', handleClickOutside);
useEventListener(document, 'keydown', handleKeydown);

onMounted(() => {
  loadVendorData();
});
</script>

<style scoped>
.status-pending {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300;
}

.status-partial {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300;
}

.status-paid {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300;
}

/* Ledger table text wrapping */
.ledger-particulars {
  @apply max-w-xs md:max-w-sm lg:max-w-md;
}

.ledger-particulars-text {
  @apply break-words whitespace-normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.ledger-details-text {
  @apply break-words whitespace-normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.ledger-reference {
  @apply max-w-[7rem] break-words whitespace-normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
</style>