<template>
  <div v-if="vendor">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center space-x-4">
        <button @click="$router.back()" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ vendor.name }}</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Vendor Details & Transaction History</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <button @click="exportLedger" class="btn-outline">
          <Download class="mr-2 h-4 w-4" />
          Export Ledger
        </button>
        <button @click="recordPayment" class="btn-primary">
          <CreditCard class="mr-2 h-4 w-4" />
          Record Payment
        </button>
      </div>
    </div>

    <!-- Vendor Info & Financial Summary -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <!-- Vendor Information -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h2>
        <div class="space-y-3">
          <div v-if="vendor.contact_person" class="flex items-center text-sm">
            <User class="mr-3 h-4 w-4 text-gray-400" />
            <span class="text-gray-900 dark:text-white">{{ vendor.contact_person }}</span>
          </div>
          <div v-if="vendor.email" class="flex items-center text-sm">
            <Mail class="mr-3 h-4 w-4 text-gray-400" />
            <a :href="`mailto:${vendor.email}`" class="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300">{{ vendor.email }}</a>
          </div>
          <div v-if="vendor.phone" class="flex items-center text-sm">
            <Phone class="mr-3 h-4 w-4 text-gray-400" />
            <a :href="`tel:${vendor.phone}`" class="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300">{{ vendor.phone }}</a>
          </div>
          <div v-if="vendor.address" class="flex items-start text-sm">
            <MapPin class="mr-3 h-4 w-4 text-gray-400 mt-0.5" />
            <span class="text-gray-900 dark:text-white">{{ vendor.address }}</span>
          </div>
        </div>
        
        <div v-if="vendor.tags && vendor.tags.length > 0" class="mt-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Specialties</h3>
          <div class="flex flex-wrap gap-1">
            <span v-for="tag in vendor.tags" :key="tag" class="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-xs rounded-full">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Financial Summary -->
      <div class="lg:col-span-2">
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
                <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ vendorIncomingItems.length }}</p>
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
    </div>

    <!-- Transaction History -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Deliveries -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Deliveries</h2>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ vendorIncomingItems.length }} total</span>
        </div>
        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div v-for="item in vendorIncomingItems.slice(0, 10)" :key="item.id" class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-medium text-gray-900 dark:text-white">{{ item.expand?.item?.name || 'Unknown Item' }}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(item.delivery_date) }}</p>
              </div>
              <span :class="`status-${item.payment_status}`">
                {{ item.payment_status }}
              </span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-600 dark:text-gray-400">{{ item.quantity }} {{ item.expand?.item?.unit || 'units' }}</span>
              <div class="text-right">
                <p class="font-medium text-gray-900 dark:text-white">₹{{ item.total_amount.toFixed(2) }}</p>
                <p v-if="item.paid_amount > 0" class="text-green-600 dark:text-green-400">Paid: ₹{{ item.paid_amount.toFixed(2) }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="vendorIncomingItems.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
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
          <div v-for="payment in vendorPayments.slice(0, 10)" :key="payment.id" class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-medium text-gray-900 dark:text-white">₹{{ payment.amount.toFixed(2) }}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(payment.payment_date) }}</p>
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
    </div>

    <!-- Record Payment Modal -->
    <div v-if="showPaymentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Record Payment for {{ vendor.name }}</h3>
          
          <form @submit.prevent="savePayment" class="space-y-4">
            <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p class="text-sm text-yellow-800 dark:text-yellow-300">
                Outstanding amount: <strong>₹{{ outstandingAmount.toFixed(2) }}</strong>
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
              <input v-model.number="paymentForm.amount" type="number" step="0.01" required class="input mt-1" placeholder="0.00" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Date</label>
              <input v-model="paymentForm.payment_date" type="date" required class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
              <input v-model="paymentForm.reference" type="text" class="input mt-1" placeholder="Check number, transfer ID, etc." />
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
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
  Loader2
} from 'lucide-vue-next';
import { 
  vendorService, 
  incomingItemService, 
  paymentService,
  type Vendor,
  type IncomingItem,
  type Payment
} from '../services/pocketbase';

const route = useRoute();
const router = useRouter();

const vendor = ref<Vendor | null>(null);
const vendorIncomingItems = ref<IncomingItem[]>([]);
const vendorPayments = ref<Payment[]>([]);
const showPaymentModal = ref(false);
const paymentLoading = ref(false);

const paymentForm = reactive({
  amount: 0,
  payment_date: new Date().toISOString().split('T')[0],
  reference: '',
  notes: ''
});

const outstandingAmount = computed(() => {
  return vendorIncomingItems.value.reduce((sum, item) => sum + (item.total_amount - item.paid_amount), 0);
});

const totalPaid = computed(() => {
  return vendorPayments.value.reduce((sum, payment) => sum + payment.amount, 0);
});

const pendingDeliveries = computed(() => {
  return vendorIncomingItems.value.filter(item => item.payment_status === 'pending').length;
});

const partialDeliveries = computed(() => {
  return vendorIncomingItems.value.filter(item => item.payment_status === 'partial').length;
});

const paidDeliveries = computed(() => {
  return vendorIncomingItems.value.filter(item => item.payment_status === 'paid').length;
});

const loadVendorData = async () => {
  const vendorId = route.params.id as string;
  
  try {
    const [vendorData, allIncoming, allPayments] = await Promise.all([
      vendorService.getAll(),
      incomingItemService.getAll(),
      paymentService.getAll()
    ]);
    
    vendor.value = vendorData.find(v => v.id === vendorId) || null;
    vendorIncomingItems.value = allIncoming
      .filter(item => item.vendor === vendorId)
      .sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
    vendorPayments.value = allPayments
      .filter(payment => payment.vendor === vendorId)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
      
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
      amount: paymentForm.amount,
      payment_date: paymentForm.payment_date,
      reference: paymentForm.reference,
      notes: paymentForm.notes,
      incoming_items: []
    });
    
    await loadVendorData();
    showPaymentModal.value = false;
    
    // Reset form
    Object.assign(paymentForm, {
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

const generateLedgerCSV = () => {
  if (!vendor.value) return '';
  
  const headers = ['Date', 'Type', 'Description', 'Item', 'Quantity', 'Unit Price', 'Amount', 'Payment Status', 'Reference', 'Notes'];
  
  const rows: (string | number)[][] = [];
  
  // Add deliveries
  vendorIncomingItems.value.forEach(item => {
    rows.push([
      item.delivery_date,
      'Delivery',
      `Delivery of ${item.expand?.item?.name || 'Unknown Item'}`,
      item.expand?.item?.name || 'Unknown Item',
      item.quantity,
      item.unit_price,
      item.total_amount,
      item.payment_status,
      '',
      item.notes || ''
    ]);
  });
  
  // Add payments
  vendorPayments.value.forEach(payment => {
    rows.push([
      payment.payment_date,
      'Payment',
      'Payment received',
      '',
      '',
      '',
      -payment.amount, // Negative for payments
      'paid',
      payment.reference || '',
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

onMounted(() => {
  loadVendorData();
});
</script>