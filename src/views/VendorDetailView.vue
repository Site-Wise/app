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

      <!-- Quick Stats -->
      <div class="mt-6 card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('vendors.paymentStatusBreakdown') }}</h3>
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ pendingDeliveries }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('vendors.pending') }}</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{{ partialDeliveries }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('vendors.partial') }}</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ paidDeliveries }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('vendors.paid') }}</p>
          </div>
        </div>
      </div>
    </div>


    <!-- Quick Summary Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
            <span :class="`status-${delivery.payment_status}`">
              {{ delivery.payment_status }}
            </span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600 dark:text-gray-400">{{ delivery.delivery_reference || t('vendors.noReference') }}</span>
            <div class="text-right">
              <p class="font-medium text-gray-900 dark:text-white">₹{{ delivery.total_amount.toFixed(2) }}</p>
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

    <!-- Record Payment Modal -->
    <div v-if="showPaymentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ t('vendors.recordPaymentFor') }} {{ vendor?.contact_person || vendor?.name || t('vendors.vendor') }}</h3>

          <form @submit.prevent="savePayment" class="space-y-4">
            <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p class="text-sm text-yellow-800 dark:text-yellow-300">
                {{ t('vendors.outstandingAmount') }}: <strong>₹{{ outstandingAmount.toFixed(2) }}</strong>
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.paymentAccount') }}</label>
              <select v-model="paymentForm.account" required class="input mt-1">
                <option value="">{{ t('vendors.selectAccount') }}</option>
                <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                  {{ account.name }} ({{ account.type.replace('_', ' ') }}) - ₹{{ account.current_balance.toFixed(2) }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.amount') }}</label>
              <input v-model.number="paymentForm.amount" type="number" step="0.01" required class="input mt-1"
                placeholder="0.00" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.paymentDate') }}</label>
              <input v-model="paymentForm.payment_date" type="date" required class="input mt-1" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.reference') }}</label>
              <input v-model="paymentForm.reference" type="text" class="input mt-1"
                :placeholder="t('vendors.referencePlaceholder')" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('vendors.notes') }}</label>
              <textarea v-model="paymentForm.notes" class="input mt-1" rows="3" :placeholder="t('vendors.paymentNotesPlaceholder')"></textarea>
            </div>

            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="paymentLoading" class="flex-1 btn-primary">
                <Loader2 v-if="paymentLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ t('vendors.recordPayment') }}
              </button>
              <button type="button" @click="showPaymentModal = false" class="flex-1 btn-outline">
                {{ t('vendors.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center min-h-96">
    <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
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
  MoreVertical
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import {
  vendorService,
  deliveryService,
  paymentService,
  accountService,
  tagService,
  vendorReturnService,
  vendorCreditNoteService,
  creditNoteUsageService,
  accountTransactionService,
  type Vendor,
  type Delivery,
  type Payment,
  type Account,
  type Tag as TagType,
  type VendorReturn,
  type VendorCreditNote,
  type CreditNoteUsage,
  type AccountTransaction
} from '../services/pocketbase';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const vendor = ref<Vendor | null>(null);
const vendorDeliveries = ref<Delivery[]>([]);
const vendorPayments = ref<Payment[]>([]);
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

const paymentForm = reactive({
  account: '',
  amount: 0,
  payment_date: new Date().toISOString().split('T')[0],
  reference: '',
  notes: ''
});

const activeAccounts = computed(() => {
  return accounts.value.filter(account => account.is_active);
});

const outstandingAmount = computed(() => {
  const deliveryOutstanding = vendorDeliveries.value.reduce((sum, delivery) => {
    const outstanding = delivery.total_amount - delivery.paid_amount;
    return sum + (outstanding > 0 ? outstanding : 0);
  }, 0);
  
  const creditBalance = vendorCreditNotes.value.reduce((sum, note) => sum + note.balance, 0);
  return deliveryOutstanding - creditBalance; // Outstanding minus available credit
});

const totalPaid = computed(() => {
  return vendorPayments.value.reduce((sum, payment) => sum + payment.amount, 0);
});

const pendingDeliveries = computed(() => {
  return vendorDeliveries.value.filter(delivery => delivery.payment_status === 'pending').length;
});

const partialDeliveries = computed(() => {
  return vendorDeliveries.value.filter(delivery => delivery.payment_status === 'partial').length;
});

const paidDeliveries = computed(() => {
  return vendorDeliveries.value.filter(delivery => delivery.payment_status === 'paid').length;
});

// Comprehensive ledger entries with running balance
const ledgerEntries = computed(() => {
  const entries: Array<{
    id: string;
    type: 'delivery' | 'payment' | 'credit_note' | 'refund';
    date: string;
    description: string;
    details?: string;
    reference: string;
    dues: number;
    payments: number;
    runningBalance: number;
  }> = [];

  // Add delivery entries (dues)
  vendorDeliveries.value.forEach(delivery => {
    let description = `${t('vendors.delivery')} #${delivery.id?.slice(-6) || t('vendors.unknown')}`;
    let details = '';
    
    // Create description from delivery items if available
    if (delivery.expand?.delivery_items && delivery.expand.delivery_items.length > 0) {
      const itemNames = delivery.expand.delivery_items.map((deliveryItem) => {
        const itemName = deliveryItem.expand?.item?.name || t('vendors.unknownItem');
        const quantity = deliveryItem.quantity || 0;
        const unit = deliveryItem.expand?.item?.unit || t('vendors.units');
        return `${itemName} (${quantity} ${unit})`;
      });
      details = `${t('vendors.received')}: ${itemNames.join(', ')}`;
    }

    entries.push({
      id: delivery.id || '',
      type: 'delivery',
      date: delivery.delivery_date,
      description,
      details,
      reference: delivery.delivery_reference || '',
      dues: delivery.total_amount,
      payments: 0,
      runningBalance: 0 // Will be calculated below
    });
  });

  // Add payment entries (credits)
  vendorPayments.value.forEach(payment => {
    entries.push({
      id: payment.id || '',
      type: 'payment',
      date: payment.payment_date,
      description: t('vendors.paymentReceived'),
      details: payment.notes || '',
      reference: payment.reference || '',
      dues: 0,
      payments: payment.amount,
      runningBalance: 0 // Will be calculated below
    });
  });

  // Add credit note entries (credits) - only show current available balance
  vendorCreditNotes.value.forEach(creditNote => {
    // Only show credit notes that have been issued and show the original amount
    if (creditNote.credit_amount > 0) {
      let details = '';
      if (creditNote.reason) {
        details = creditNote.reason;
      }

      entries.push({
        id: creditNote.id || '',
        type: 'credit_note',
        date: creditNote.issue_date,
        description: t('vendors.creditNoteIssued'),
        details,
        reference: creditNote.reference || `CN-${creditNote.id?.slice(-6)}`,
        dues: 0,
        payments: creditNote.credit_amount,
        runningBalance: 0 // Will be calculated below
      });
    }
  });

  // Add credit note usage entries (debits) - these reduce the vendor balance
  vendorCreditNoteUsages.value.forEach(usage => {
    let details = `Applied to payment`;
    if (usage.expand?.payment?.reference) {
      details += ` ${usage.expand.payment.reference}`;
    }
    if (usage.description) {
      details = usage.description;
    }

    entries.push({
      id: usage.id || '',
      type: 'credit_note',
      date: usage.used_date,
      description: t('vendors.creditNoteUsed'),
      details,
      reference: usage.expand?.credit_note?.reference || `CN-${usage.credit_note?.slice(-6)}`,
      dues: usage.used_amount, // Credit note usage is a debit to vendor balance
      payments: 0,
      runningBalance: 0 // Will be calculated below
    });
  });

  // Add refund entries (credits) - from processed returns
  vendorReturns.value.forEach(returnItem => {
    if (returnItem.status === 'refunded' && returnItem.actual_refund_amount && returnItem.actual_refund_amount > 0) {
      let details = '';
      
      // Try to get delivery and item details  
      details = `${t('vendors.refundForReturn')} #${returnItem.id?.slice(-6)}`;
      if (returnItem.reason) {
        details += ` - ${t(`vendors.returnReasons.${returnItem.reason}`)}`;
      }

      entries.push({
        id: returnItem.id || '',
        type: 'refund',
        date: returnItem.completion_date || returnItem.return_date,
        description: t('vendors.refundProcessed'),
        details,
        reference: `REF-${returnItem.id?.slice(-6)}`,
        dues: 0,
        payments: returnItem.actual_refund_amount,
        runningBalance: 0 // Will be calculated below
      });
    }
  });

  // Sort entries by date
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance
  let runningBalance = 0;
  entries.forEach(entry => {
    runningBalance += entry.dues - entry.payments;
    entry.runningBalance = runningBalance;
  });

  return entries;
});

// Calculate totals for the ledger
const totalDues = computed(() => {
  return ledgerEntries.value.reduce((sum, entry) => sum + entry.dues, 0);
});

const totalPayments = computed(() => {
  return ledgerEntries.value.reduce((sum, entry) => sum + entry.payments, 0);
});

const finalBalance = computed(() => {
  return totalDues.value - totalPayments.value;
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
    const [vendorData, allDeliveries, allPayments, allReturns, allCreditNotes, allCreditNoteUsages, allTransactions, accountsData, allTags] = await Promise.all([
      vendorService.getAll(),
      deliveryService.getAll(),
      paymentService.getAll(),
      vendorReturnService.getByVendor(vendorId),
      vendorCreditNoteService.getByVendor(vendorId),
      creditNoteUsageService.getByVendor(vendorId),
      accountTransactionService.getAll(),
      accountService.getAll(),
      tagService.getAll()
    ]);

    vendor.value = vendorData.find(v => v.id === vendorId) || null;
    vendorDeliveries.value = allDeliveries
      .filter(delivery => delivery.vendor === vendorId)
      .sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
    vendorPayments.value = allPayments
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
  paymentForm.amount = outstandingAmount.value;
  showPaymentModal.value = true;
};

const savePayment = async () => {
  if (!vendor.value) return;

  paymentLoading.value = true;
  try {
    await paymentService.create({
      vendor: vendor.value.id!,
      account: paymentForm.account,
      amount: paymentForm.amount,
      payment_date: paymentForm.payment_date,
      reference: paymentForm.reference,
      notes: paymentForm.notes,
      deliveries: [],
      service_bookings: [],
    });

    await loadVendorData();
    showPaymentModal.value = false;

    // Reset form
    Object.assign(paymentForm, {
      account: '',
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: ''
    });
  } catch (error) {
    console.error('Error saving payment:', error);
  } finally {
    paymentLoading.value = false;
  }
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
  
  // yPosition += 6;
  // const outstandingAmount = vendorDeliveries.value.reduce((sum, delivery) => 
  //   delivery.payment_status === 'pending' ? sum + delivery.total_amount : sum, 0) - 
  //   vendorPayments.value.reduce((sum, payment) => sum + payment.amount, 0);
  // doc.text(`Outstanding Balance: ₹${outstandingAmount.toFixed(2)}`, margin, yPosition);
  
  yPosition += 15;
  
  // Table headers
  doc.setFont("helvetica", "bold");
  const headers = [t('vendors.date'), t('vendors.description'), t('vendors.reference'), t('vendors.dues'), t('vendors.payments'), t('vendors.balance')];
  const colWidths = [22, 60, 22, 22, 22, 22];
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
  
  // Use comprehensive ledger entries
  ledgerEntries.value.forEach(entry => {
    if (yPosition > 240) { // Leave more space for footer
      doc.addPage();
      yPosition = 30;
    }
    
    xPos = margin;
    
    // Create description with details if available
    let fullDescription = entry.description;
    if (entry.details) {
      fullDescription += ` - ${entry.details}`;
    }
    
    // Handle multi-line description
    const maxDescriptionWidth = colWidths[1] - 5; // Description column width minus padding
    const descriptionLines = doc.splitTextToSize(fullDescription, maxDescriptionWidth);
    const lineHeight = 4;
    const rowHeight = Math.max(6, descriptionLines.length * lineHeight);
    
    // Check if we need a new page for multi-line content
    if (yPosition + rowHeight > 240) { // Leave more space for footer
      doc.addPage();
      yPosition = 30;
    }
    
    // Draw row data
    const rowData = [
      new Date(entry.date).toLocaleDateString('en-CA'),
      '', // Description handled separately for multi-line
      entry.reference || '',
      entry.dues > 0 ? entry.dues.toFixed(0) : '',
      entry.payments > 0 ? entry.payments.toFixed(0) : '',
      Math.abs(entry.runningBalance).toFixed(0) + (entry.runningBalance >= 0 ? ' Dr' : ' Cr')
    ];
    
    // Draw non-description columns
    rowData.forEach((data, i) => {
      if (i !== 1) { // Skip description column
        doc.text(data, xPos, yPosition);
      }
      xPos += colWidths[i];
    });
    
    // Draw multi-line description
    const descriptionX = margin + colWidths[0];
    descriptionLines.forEach((line: string, lineIndex: number) => {
      doc.text(line, descriptionX, yPosition + (lineIndex * lineHeight));
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
    totalDues.value.toFixed(0),
    totalPayments.value.toFixed(0),
    Math.abs(finalBalance.value).toFixed(0) + (finalBalance.value >= 0 ? ' Dr' : ' Cr')
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
    ? `${t('vendors.totalOutstanding')}: ${finalBalance.value.toFixed(0)}`
    : `${t('vendors.creditBalance')}: ${Math.abs(finalBalance.value).toFixed(0)}`;
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
    t('vendors.description'), 
    t('vendors.details'),
    t('vendors.reference'), 
    t('vendors.dues'), 
    t('vendors.payments'),
    t('vendors.runningBalance')
  ];

  const rows: (string | number)[][] = [];

  // Use the comprehensive ledger entries
  ledgerEntries.value.forEach(entry => {
    rows.push([
      entry.date,
      entry.description,
      entry.details || '',
      entry.reference || '',
      entry.dues > 0 ? entry.dues : '',
      entry.payments > 0 ? entry.payments : '',
      entry.runningBalance
    ]);
  });

  // Add totals row
  rows.push([
    '',
    t('vendors.totals'),
    '',
    '',
    totalDues.value,
    totalPayments.value,
    finalBalance.value
  ]);

  // Add summary information
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ]);

  rows.push([
    t('vendors.generated'),
    new Date().toISOString().split('T')[0],
    '',
    '',
    '',
    '',
    ''
  ]);

  const balanceStatus = finalBalance.value >= 0 ? t('vendors.outstanding') : t('vendors.creditBalance');
  rows.push([
    t('vendors.finalBalance'),
    `₹${Math.abs(finalBalance.value).toFixed(2)} (${balanceStatus})`,
    '',
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

onMounted(() => {
  loadVendorData();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>