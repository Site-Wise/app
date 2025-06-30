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
            'Unnamed Vendor' }}</h1>
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
              <button @click="exportLedgerPDF(); showExportDropdown = false" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <FileText class="mr-3 h-4 w-4 text-red-600" />
                {{ t('vendors.exportPdf') }}
              </button>
            </div>
          </div>
        </div>
        <button @click="createReturn()" class="btn-outline">
          <RotateCcw class="mr-2 h-4 w-4" />
          Create Return
        </button>
        <button @click="recordPayment()" class="btn-primary">
          <CreditCard class="mr-2 h-4 w-4" />
          Record Payment
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
              Create Return
            </button>
            <button @click="handleMobileAction('recordPayment')" class="flex items-center w-full px-4 py-3 text-sm text-white bg-blue-600 hover:bg-blue-700">
              <CreditCard class="mr-3 h-5 w-5 text-white" />
              Record Payment
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
              <p class="text-sm font-medium text-red-700 dark:text-red-300">Outstanding Amount</p>
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
              <p class="text-sm font-medium text-green-700 dark:text-green-300">Total Paid</p>
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
              <p class="text-sm font-medium text-blue-700 dark:text-blue-300">Total Deliveries</p>
              <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ vendorDeliveries.length }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="mt-6 card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Status Breakdown</h3>
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ pendingDeliveries }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Pending</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{{ partialDeliveries }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Partial</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ paidDeliveries }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Paid</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Transaction History -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Deliveries -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Deliveries</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ vendorDeliveries.length }} total</span>
      </div>
      <div class="space-y-3 max-h-96 overflow-y-auto">
        <div v-for="delivery in vendorDeliveries.slice(0, 10)" :key="delivery.id"
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
            <span class="text-gray-600 dark:text-gray-400">{{ delivery.delivery_reference || 'No reference' }}</span>
            <div class="text-right">
              <p class="font-medium text-gray-900 dark:text-white">₹{{ delivery.total_amount.toFixed(2) }}</p>
              <p v-if="delivery.paid_amount > 0" class="text-green-600 dark:text-green-400">Paid: ₹{{
                delivery.paid_amount.toFixed(2) }}</p>
            </div>
          </div>
        </div>

        <div v-if="vendorDeliveries.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          No deliveries recorded
        </div>
      </div>
    </div>

    <!-- Payments -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Payment History</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ vendorPayments.length }} payments</span>
      </div>
      <div class="space-y-3 max-h-96 overflow-y-auto">
        <div v-for="payment in vendorPayments.slice(0, 10)" :key="payment.id"
          class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">₹{{ payment.amount.toFixed(2) }}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(payment.payment_date) }}</p>
              <div v-if="payment.expand?.account" class="flex items-center mt-1">
                <component :is="getAccountIcon(payment.expand.account.type)"
                  class="mr-1 h-3 w-3 text-gray-500 dark:text-gray-400" />
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ payment.expand.account.name }}</span>
              </div>
            </div>
            <div class="text-right text-sm">
              <p v-if="payment.reference" class="text-gray-600 dark:text-gray-400">Ref: {{ payment.reference }}</p>
            </div>
          </div>
          <p v-if="payment.notes" class="text-sm text-gray-600 dark:text-gray-400">{{ payment.notes }}</p>
        </div>

        <div v-if="vendorPayments.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          No payments recorded
        </div>
      </div>
    </div>

    <!-- Returns -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Returns</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ vendorReturns.length }} returns</span>
      </div>
      <div class="space-y-3 max-h-96 overflow-y-auto">
        <div v-for="returnItem in vendorReturns.slice(0, 10)" :key="returnItem.id"
          class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                Return #{{ returnItem.id?.slice(-6) }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(returnItem.return_date) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ t(`vendors.returnReasons.${returnItem.reason}`) }}
              </p>
            </div>
            <span :class="getReturnStatusClass(returnItem.status)">
              {{ t(`vendors.returnStatuses.${returnItem.status}`) }}
            </span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600 dark:text-gray-400">Return Amount</span>
            <div class="text-right">
              <p class="font-medium text-gray-900 dark:text-white">₹{{ returnItem.total_return_amount.toFixed(2) }}</p>
              <p v-if="returnItem.actual_refund_amount && returnItem.actual_refund_amount > 0" class="text-green-600 dark:text-green-400">
                Refunded: ₹{{ returnItem.actual_refund_amount.toFixed(2) }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="vendorReturns.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          No returns recorded
        </div>
      </div>
    </div>
    </div>

    <!-- Record Payment Modal -->
    <div v-if="showPaymentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Record Payment for {{ vendor?.contact_person || vendor?.name || 'Vendor' }}</h3>

          <form @submit.prevent="savePayment" class="space-y-4">
            <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p class="text-sm text-yellow-800 dark:text-yellow-300">
                Outstanding amount: <strong>₹{{ outstandingAmount.toFixed(2) }}</strong>
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Account</label>
              <select v-model="paymentForm.account" required class="input mt-1">
                <option value="">Select an account</option>
                <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                  {{ account.name }} ({{ account.type.replace('_', ' ') }}) - ₹{{ account.current_balance.toFixed(2) }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
              <input v-model.number="paymentForm.amount" type="number" step="0.01" required class="input mt-1"
                placeholder="0.00" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Date</label>
              <input v-model="paymentForm.payment_date" type="date" required class="input mt-1" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
              <input v-model="paymentForm.reference" type="text" class="input mt-1"
                placeholder="Check number, transfer ID, etc." />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea v-model="paymentForm.notes" class="input mt-1" rows="3" placeholder="Payment notes"></textarea>
            </div>

            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="paymentLoading" class="flex-1 btn-primary">
                <Loader2 v-if="paymentLoading" class="mr-2 h-4 w-4 animate-spin" />
                Record Payment
              </button>
              <button type="button" @click="showPaymentModal = false" class="flex-1 btn-outline">
                Cancel
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
  AlertCircle,
  CheckCircle,
  TruckIcon,
  Loader2,
  Banknote,
  Wallet,
  Smartphone,
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
  accountTransactionService,
  type Vendor,
  type Delivery,
  type Payment,
  type Account,
  type Tag as TagType,
  type VendorReturn,
  type VendorCreditNote,
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
    const [vendorData, allDeliveries, allPayments, allReturns, allCreditNotes, allTransactions, accountsData, allTags] = await Promise.all([
      vendorService.getAll(),
      deliveryService.getAll(),
      paymentService.getAll(),
      vendorReturnService.getByVendor(vendorId),
      vendorCreditNoteService.getByVendor(vendorId),
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
  link.setAttribute('download', `${vendor.value.name}_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportLedgerPDF = () => {
  if (!vendor.value) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 30;
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Vendor Ledger', margin, yPosition);
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vendor: ${vendor.value.name}`, margin, yPosition);
  
  yPosition += 6;
  if (vendor.value.contact_person) {
    doc.text(`Contact: ${vendor.value.contact_person}`, margin, yPosition);
    yPosition += 6;
  }
  
  doc.text(`Generated: ${new Date().toLocaleDateString('en-CA')}`, margin, yPosition);
  
  // yPosition += 6;
  // const outstandingAmount = vendorDeliveries.value.reduce((sum, delivery) => 
  //   delivery.payment_status === 'pending' ? sum + delivery.total_amount : sum, 0) - 
  //   vendorPayments.value.reduce((sum, payment) => sum + payment.amount, 0);
  // doc.text(`Outstanding Balance: ₹${outstandingAmount.toFixed(2)}`, margin, yPosition);
  
  yPosition += 15;
  
  // Table headers
  doc.setFont('helvetica', 'bold');
  const headers = ['Date', 'Description', 'Reference', 'Dues', 'Payments'];
  const colWidths = [25, 70, 25, 25, 25];
  let xPos = margin;
  
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPosition);
    xPos += colWidths[i];
  });
  
  yPosition += 8;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Combine and sort all transactions
  const allTransactions: any[] = [];
  
  vendorDeliveries.value.forEach(delivery => {
    // Create description from delivery items
    let description = '';
    if (delivery.expand?.delivery_items && delivery.expand.delivery_items.length > 0) {
      const itemDescriptions = delivery.expand.delivery_items.map(deliveryItem => {
        const itemName = deliveryItem.expand?.item?.name || 'Unknown Item';
        return `${itemName} (${deliveryItem.quantity} ${deliveryItem.expand?.item?.unit || 'units'})`;
      });
      description = itemDescriptions.join(', ');
    } else {
      description = `Delivery #${delivery.id?.slice(-6) || 'Unknown'}`;
    }
    
    allTransactions.push({
      date: new Date(delivery.delivery_date).toLocaleDateString('en-CA'), // Format as Y-m-d
      description: description,
      reference: delivery.delivery_reference || '',
      dues: delivery.total_amount,
      payments: 0,
      type: 'delivery'
    });
  });
  
  vendorPayments.value.forEach(payment => {
    allTransactions.push({
      date: new Date(payment.payment_date).toLocaleDateString('en-CA'), // Format as Y-m-d
      description: 'Payment received',
      reference: payment.reference || '',
      dues: 0,
      payments: payment.amount,
      type: 'payment'
    });
  });
  
  allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  allTransactions.forEach(transaction => {
    if (yPosition > 260) {
      doc.addPage();
      yPosition = 30;
    }
    
    xPos = margin;
    
    // Handle multi-line description
    const description = transaction.description;
    const maxDescriptionWidth = colWidths[1] - 5; // Description column width minus padding
    const descriptionLines = doc.splitTextToSize(description, maxDescriptionWidth);
    const lineHeight = 4;
    const rowHeight = Math.max(6, descriptionLines.length * lineHeight);
    
    // Check if we need a new page for multi-line content
    if (yPosition + rowHeight > 260) {
      doc.addPage();
      yPosition = 30;
    }
    
    // Draw row data
    const rowData = [
      transaction.date,
      '', // Description handled separately for multi-line
      transaction.reference,
      transaction.dues ? `₹${transaction.dues.toFixed(2)}` : '',
      transaction.payments ? `₹${transaction.payments.toFixed(2)}` : ''
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
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 30;
  }
  
  yPosition += 10;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;
  
  // doc.setFont('helvetica', 'bold');
  // doc.text(`Outstanding Balance: ₹${outstandingAmount.toFixed(2)}`, margin, yPosition);
  
  // Save the PDF
  doc.save(`${vendor.value.name}_ledger_${new Date().toISOString().split('T')[0]}.pdf`);
};

const generateLedgerCSV = () => {
  if (!vendor.value) return '';

  const headers = ['Date', 'Description', 'Reference', 'Dues', 'Payments', 'Notes'];

  const rows: (string | number)[][] = [];

  // Add deliveries
  vendorDeliveries.value.forEach(delivery => {
    rows.push([
      delivery.delivery_date,
      `Delivery #${delivery.id?.slice(-6) || 'Unknown'}`,
      delivery.delivery_reference || '',
      delivery.total_amount, // Dues (deliveries owed)
      '', // Empty payments column
      delivery.notes || ''
    ]);
  });

  // Add payments
  vendorPayments.value.forEach(payment => {
    rows.push([
      payment.payment_date,
      'Payment received',
      payment.reference || '',
      '', // Empty dues column
      payment.amount, // Payments (credits)
      payment.notes || ''
    ]);
  });

  // Sort by date
  rows.sort((a, b) => new Date(a[0] as string).getTime() - new Date(b[0] as string).getTime());

  // Add summary row
  rows.push([
    '',
    'SUMMARY',
    '',
    '',
    '',
    '',
    outstandingAmount.value,
    '',
    '',
    '',
    `Outstanding Balance as of ${new Date().toISOString().split('T')[0]}`
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

// Handle mobile menu actions
const handleMobileAction = (action: string) => {
  // Close the menu first
  showMobileMenu.value = false;
  
  // Then execute the action after a small delay to ensure menu closes
  setTimeout(() => {
    try {
      switch (action) {
        case 'exportCsv':
          exportLedger();
          break;
        case 'exportPdf':
          exportLedgerPDF();
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