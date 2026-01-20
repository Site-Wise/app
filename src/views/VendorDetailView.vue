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
        <div class="relative export-dropdown">
          <button @click="showExportDropdown = !showExportDropdown" class="btn-outline flex items-center">
            <Download class="mr-2 h-4 w-4" />
            {{ t('vendors.exportLedger') }}
            <ChevronDown class="ml-2 h-4 w-4" />
          </button>
          
          <!-- Export Dropdown Menu -->
          <div v-if="showExportDropdown" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
            <div class="py-1">
              <button @click="exportLedger(); showExportDropdown = false" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <FileSpreadsheet class="mr-3 h-4 w-4 text-green-600" />
                {{ t('vendors.exportCsv') }}
              </button>
              <button @click="handleExportPdf(); showExportDropdown = false" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <FileText class="mr-3 h-4 w-4 text-red-600" />
                {{ t('vendors.exportPdf') }}
              </button>
              <button @click="exportTallyXml(); showExportDropdown = false" class="relative flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <FileText class="mr-3 h-4 w-4 text-blue-600" />
                {{ t('vendors.exportTallyXml') }}
                <StatusBadge type="beta" position="absolute" />
              </button>
            </div>
          </div>
        </div>
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
            <!-- Export Options -->
            <div class="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              {{ t('vendors.exportLedger') }}
            </div>
            <button @click="handleMobileAction('exportCsv')" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <FileSpreadsheet class="mr-3 h-5 w-5 text-green-600" />
              {{ t('vendors.exportCsv') }}
            </button>
            <button @click="handleMobileAction('exportPdf')" class="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <FileText class="mr-3 h-5 w-5 text-red-600" />
              {{ t('vendors.exportPdf') }}
            </button>
            <button @click="handleMobileAction('exportTallyXml')" class="relative flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <FileText class="mr-3 h-5 w-5 text-blue-600" />
              {{ t('vendors.exportTallyXml') }}
              <StatusBadge type="beta" position="absolute" />
            </button>
            
            <!-- Divider -->
            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            
            <!-- Other Actions -->
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

    <!-- Ledger Section -->
    <div class="card mb-8">
      <!-- Ledger Header with Filter Toggle -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('vendors.vendorLedger') }}</h2>
        <div class="flex items-center gap-2">
          <button
            @click="showLedgerFilters = !showLedgerFilters"
            class="btn-outline text-sm flex items-center"
            :class="{ 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700': hasActiveFilters }"
          >
            <Filter class="h-4 w-4 mr-2" />
            {{ t('common.filter') }}
            <span v-if="hasActiveFilters" class="ml-2 px-1.5 py-0.5 bg-primary-500 text-white text-xs rounded-full">
              {{ (ledgerFilterFromDate ? 1 : 0) + (ledgerFilterToDate ? 1 : 0) }}
            </span>
          </button>
          <button
            v-if="hasActiveFilters"
            @click="clearLedgerFilters"
            class="btn-outline text-sm flex items-center text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
          >
            <X class="h-4 w-4 mr-1" />
            {{ t('common.clearFilters') }}
          </button>
        </div>
      </div>

      <!-- Filter Panel -->
      <div v-if="showLedgerFilters" class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Calendar class="inline h-4 w-4 mr-1" />
              {{ t('vendors.filterFromDate') }}
            </label>
            <input
              v-model="ledgerFilterFromDate"
              type="date"
              class="input w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Calendar class="inline h-4 w-4 mr-1" />
              {{ t('vendors.filterToDate') }}
            </label>
            <input
              v-model="ledgerFilterToDate"
              type="date"
              class="input w-full"
            />
          </div>
        </div>
      </div>

      <!-- Ledger Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                {{ t('vendors.date') }}
              </th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ t('vendors.particulars') }}
              </th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell w-28">
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
            <!-- Opening Balance Row (when filtering) -->
            <tr v-if="filteredLedgerEntries.hasOpeningBalance" class="bg-blue-50 dark:bg-blue-900/20">
              <td class="px-3 py-2 text-gray-900 dark:text-white">
                {{ ledgerFilterFromDate }}
              </td>
              <td class="px-3 py-2 text-gray-900 dark:text-white font-medium ledger-particulars">
                {{ t('vendors.openingBalance') }}
              </td>
              <td class="px-3 py-2 text-gray-500 dark:text-gray-400 hidden md:table-cell">-</td>
              <td class="px-3 py-2 text-right text-gray-900 dark:text-white">-</td>
              <td class="px-3 py-2 text-right text-gray-900 dark:text-white">-</td>
              <td class="px-3 py-2 text-right font-medium" :class="filteredLedgerEntries.openingBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
                ₹{{ Math.abs(filteredLedgerEntries.openingBalance).toFixed(2) }}
                <span class="text-xs ml-1">{{ filteredLedgerEntries.openingBalance >= 0 ? 'Cr' : 'Dr' }}</span>
              </td>
            </tr>

            <!-- Ledger Entries -->
            <tr v-for="entry in filteredLedgerEntries.entries" :key="entry.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-3 py-2 text-gray-900 dark:text-white whitespace-nowrap">
                {{ formatDate(entry.date) }}
              </td>
              <td class="px-3 py-2 text-gray-900 dark:text-white ledger-particulars">
                <div class="ledger-particulars-text">{{ entry.particulars }}</div>
                <div v-if="entry.details" class="text-xs text-gray-500 dark:text-gray-400 mt-1 ledger-details-text">
                  {{ entry.details }}
                </div>
              </td>
              <td class="px-3 py-2 text-gray-500 dark:text-gray-400 hidden md:table-cell ledger-reference">
                {{ entry.reference || '-' }}
              </td>
              <td class="px-3 py-2 text-right">
                <span v-if="entry.debit > 0" class="text-green-600 dark:text-green-400 font-medium">
                  ₹{{ entry.debit.toFixed(2) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-3 py-2 text-right">
                <span v-if="entry.credit > 0" class="text-red-600 dark:text-red-400 font-medium">
                  ₹{{ entry.credit.toFixed(2) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-3 py-2 text-right font-medium" :class="entry.runningBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
                ₹{{ Math.abs(entry.runningBalance).toFixed(2) }}
                <span class="text-xs ml-1">{{ entry.runningBalance >= 0 ? 'Cr' : 'Dr' }}</span>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="filteredLedgerEntries.entries.length === 0 && !filteredLedgerEntries.hasOpeningBalance">
              <td colspan="6" class="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                {{ hasActiveFilters ? t('vendors.noEntriesInRange') : t('vendors.noLedgerEntries') }}
              </td>
            </tr>

            <!-- Totals Row -->
            <tr v-if="filteredLedgerEntries.entries.length > 0 || filteredLedgerEntries.hasOpeningBalance" class="bg-gray-100 dark:bg-gray-700 font-medium">
              <td class="px-3 py-2 text-gray-900 dark:text-white" colspan="2">
                {{ t('vendors.totals') }}
              </td>
              <td class="px-3 py-2 hidden md:table-cell"></td>
              <td class="px-3 py-2 text-right text-green-600 dark:text-green-400">
                ₹{{ totalDebits.toFixed(2) }}
              </td>
              <td class="px-3 py-2 text-right text-red-600 dark:text-red-400">
                ₹{{ totalCredits.toFixed(2) }}
              </td>
              <td class="px-3 py-2 text-right" :class="finalBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
                ₹{{ Math.abs(finalBalance).toFixed(2) }}
                <span class="text-xs ml-1">{{ finalBalance >= 0 ? 'Cr' : 'Dr' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Ledger Summary -->
      <div v-if="filteredLedgerEntries.entries.length > 0 || filteredLedgerEntries.hasOpeningBalance" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <span v-if="hasActiveFilters">
              {{ t('vendors.showingEntriesFrom') }} {{ ledgerFilterFromDate || t('vendors.beginning') }}
              {{ t('vendors.to') }} {{ ledgerFilterToDate || t('vendors.today') }}
            </span>
            <span v-else>
              {{ t('vendors.showingAllEntries') }} ({{ filteredLedgerEntries.entries.length }} {{ t('vendors.entries') }})
            </span>
          </div>
          <div class="text-lg font-semibold" :class="finalBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
            {{ finalBalance >= 0 ? t('vendors.totalOutstanding') : t('vendors.creditBalance') }}: ₹{{ Math.abs(finalBalance).toFixed(2) }}
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
  Filter,
  X,
  Calendar
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

// Ledger filter state
const ledgerFilterFromDate = ref<string>('');
const ledgerFilterToDate = ref<string>('');
const showLedgerFilters = ref(false);


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

// Filtered ledger entries with opening balance calculation
const filteredLedgerEntries = computed(() => {
  const allEntries = ledgerEntries.value;
  const fromDate = ledgerFilterFromDate.value ? new Date(ledgerFilterFromDate.value) : null;
  const toDate = ledgerFilterToDate.value ? new Date(ledgerFilterToDate.value) : null;

  // If no filters, return all entries
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

// Check if filters are active
const hasActiveFilters = computed(() => {
  return ledgerFilterFromDate.value !== '' || ledgerFilterToDate.value !== '';
});

// Clear ledger filters
const clearLedgerFilters = () => {
  ledgerFilterFromDate.value = '';
  ledgerFilterToDate.value = '';
};

// Calculate totals for the ledger (uses filtered entries when filters are active)
const totalDebits = computed(() => {
  return filteredLedgerEntries.value.entries.reduce((sum, entry) => sum + entry.debit, 0);
});

const totalCredits = computed(() => {
  return filteredLedgerEntries.value.entries.reduce((sum, entry) => sum + entry.credit, 0);
});

// Final balance: Opening Balance + Credits - Debits
const finalBalance = computed(() => {
  const opening = filteredLedgerEntries.value.openingBalance;
  return opening + totalCredits.value - totalDebits.value;
});




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
  const margin = 20;
  let yPosition = 25;
  const filtered = filteredLedgerEntries.value;

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
  if (hasActiveFilters.value) {
    yPosition += 6;
    const periodText = `${t('vendors.filterPeriod')}: ${ledgerFilterFromDate.value || t('vendors.beginning')} - ${ledgerFilterToDate.value || t('vendors.today')}`;
    doc.text(periodText, margin, yPosition);
  }

  yPosition += 15;

  // Table headers
  doc.setFont("helvetica", "bold");
  const headers = [t('vendors.date'), t('vendors.particulars'), t('vendors.reference'), t('vendors.debit'), t('vendors.credit'), t('vendors.balance')];
  const colWidths = [20, 65, 20, 20, 20, 25];
  let xPos = margin;

  headers.forEach((header, i) => {
    doc.text(header, xPos, yPosition);
    xPos += colWidths[i];
  });

  yPosition += 8;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Add opening balance row if filtering
  if (filtered.hasOpeningBalance) {
    xPos = margin;

    const openingBalanceDisplay = filtered.openingBalance >= 0
      ? `${Math.abs(filtered.openingBalance).toFixed(0)} Cr`
      : `${Math.abs(filtered.openingBalance).toFixed(0)} Dr`;

    const openingRowData = [
      ledgerFilterFromDate.value,
      t('vendors.openingBalance'),
      '',
      '',
      '',
      openingBalanceDisplay
    ];

    openingRowData.forEach((data, i) => {
      doc.text(data, xPos, yPosition);
      xPos += colWidths[i];
    });

    yPosition += 6;
  }

  // Use filtered ledger entries
  filtered.entries.forEach(entry => {
    if (yPosition > 240) { // Leave more space for footer
      doc.addPage();
      yPosition = 30;
    }

    xPos = margin;

    // Handle multi-line particulars
    const maxParticularsWidth = colWidths[1] - 5; // Particulars column width minus padding
    const particularsLines = doc.splitTextToSize(entry.particulars, maxParticularsWidth);
    const lineHeight = 4;
    const rowHeight = Math.max(6, particularsLines.length * lineHeight);

    // Check if we need a new page for multi-line content
    if (yPosition + rowHeight > 240) { // Leave more space for footer
      doc.addPage();
      yPosition = 30;
    }

    // Balance display with Cr/Dr notation (positive = Cr = we owe, negative = Dr = credit balance)
    const balanceDisplay = entry.runningBalance >= 0
      ? `${Math.abs(entry.runningBalance).toFixed(0)} Cr`
      : `${Math.abs(entry.runningBalance).toFixed(0)} Dr`;

    // Draw row data
    const rowData = [
      new Date(entry.date).toLocaleDateString('en-CA'),
      '', // Particulars handled separately for multi-line
      entry.reference || '',
      entry.debit > 0 ? entry.debit.toFixed(0) : '',
      entry.credit > 0 ? entry.credit.toFixed(0) : '',
      balanceDisplay
    ];

    // Draw non-particulars columns
    rowData.forEach((data, i) => {
      if (i !== 1) { // Skip particulars column
        doc.text(data, xPos, yPosition);
      }
      xPos += colWidths[i];
    });

    // Draw multi-line particulars
    const particularsX = margin + colWidths[0];
    particularsLines.forEach((line: string, lineIndex: number) => {
      doc.text(line, particularsX, yPosition + (lineIndex * lineHeight));
    });

    yPosition += rowHeight;
  });

  // Summary
  if (yPosition > 200) { // Leave more space for footer
    doc.addPage();
    yPosition = 30;
  }

  yPosition += 10;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Add totals
  doc.setFont('helvetica', 'bold');
  doc.text(t('vendors.totals'), margin, yPosition);

  xPos = margin;
  const totalsData = [
    '',
    '',
    '',
    totalDebits.value.toFixed(0),
    totalCredits.value.toFixed(0),
    Math.abs(finalBalance.value).toFixed(0) + (finalBalance.value >= 0 ? ' Cr' : ' Dr')
  ];

  totalsData.forEach((data, i) => {
    if (i >= 3) { // Only show financial columns
      doc.text(data, xPos, yPosition);
    }
    xPos += colWidths[i];
  });

  yPosition += 10;

  // Final balance summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const balanceText = finalBalance.value >= 0
    ? `${t('vendors.totalOutstanding')}: ₹${finalBalance.value.toFixed(0)}`
    : `${t('vendors.creditBalance')}: ₹${Math.abs(finalBalance.value).toFixed(0)}`;
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
  const filtered = filteredLedgerEntries.value;

  // Add opening balance row if filtering
  if (filtered.hasOpeningBalance) {
    const openingBalanceDisplay = filtered.openingBalance >= 0
      ? `${filtered.openingBalance.toFixed(2)} Cr`
      : `${Math.abs(filtered.openingBalance).toFixed(2)} Dr`;

    rows.push([
      ledgerFilterFromDate.value,
      t('vendors.openingBalance'),
      '',
      '',
      '',
      openingBalanceDisplay
    ]);
  }

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
  });

  // Add totals row
  rows.push([
    '',
    t('vendors.totals'),
    '',
    totalDebits.value.toFixed(2),
    totalCredits.value.toFixed(2),
    ''
  ]);

  // Add summary information
  rows.push(['', '', '', '', '', '']);

  // Add filter info if active
  if (hasActiveFilters.value) {
    rows.push([
      t('vendors.filterPeriod'),
      `${ledgerFilterFromDate.value || t('vendors.beginning')} - ${ledgerFilterToDate.value || t('vendors.today')}`,
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

  const balanceStatus = finalBalance.value >= 0 ? t('vendors.outstanding') : t('vendors.creditBalance');
  const finalBalanceDisplay = finalBalance.value >= 0
    ? `₹${finalBalance.value.toFixed(2)} Cr (${balanceStatus})`
    : `₹${Math.abs(finalBalance.value).toFixed(2)} Dr (${balanceStatus})`;

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

// Handle async PDF export
const handleExportPdf = async () => {
  try {
    await exportLedgerPDF();
  } catch (error) {
    console.error('Error exporting PDF:', error);
  }
};

// Handle mobile menu actions
const handleMobileAction = async (action: string) => {
  // Close the menu first
  showMobileMenu.value = false;
  
  // Then execute the action after a small delay to ensure menu closes
  setTimeout(async () => {
    try {
      switch (action) {
        case 'exportCsv':
          exportLedger();
          break;
        case 'exportPdf':
          await exportLedgerPDF();
          break;
        case 'exportTallyXml':
          exportTallyXml();
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

// Event listeners using @vueuse/core
useEventListener(document, 'click', handleClickOutside);

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