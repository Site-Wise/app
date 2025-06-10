<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Payments</h1>
        <p class="mt-1 text-sm text-gray-600">
          Track payments to vendors and manage payment status
        </p>
      </div>
      <button @click="showAddModal = true" class="btn-primary">
        <Plus class="mr-2 h-4 w-4" />
        Record Payment
      </button>
    </div>

    <!-- Payments Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Affected</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="payment in payments" :key="payment.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ payment.expand?.vendor?.name || 'Unknown Vendor' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">₹{{ payment.amount.toFixed(2) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatDate(payment.payment_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ payment.reference || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ payment.incoming_items?.length || 0 }} items
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-2">
                <button @click="viewPayment(payment)" class="text-primary-600 hover:text-primary-900">
                  <Eye class="h-4 w-4" />
                </button>
                <button @click="deletePayment(payment.id!)" class="text-red-600 hover:text-red-900">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="payments.length === 0" class="text-center py-12">
        <CreditCard class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No payments recorded</h3>
        <p class="mt-1 text-sm text-gray-500">Start tracking by recording a payment.</p>
      </div>
    </div>

    <!-- Outstanding Amounts by Vendor -->
    <div class="mt-8 card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Outstanding Amounts by Vendor</h2>
      <div class="space-y-4">
        <div v-for="vendor in vendorsWithOutstanding" :key="vendor.id" class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 class="font-medium text-gray-900">{{ vendor.name }}</h3>
            <p class="text-sm text-gray-600">{{ vendor.pendingItems }} pending deliveries</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-semibold text-gray-900">₹{{ vendor.outstandingAmount.toFixed(2) }}</p>
            <button @click="quickPayment(vendor)" class="text-sm text-primary-600 hover:text-primary-500">
              Pay Now
            </button>
          </div>
        </div>
        
        <div v-if="vendorsWithOutstanding.length === 0" class="text-center py-8 text-gray-500">
          No outstanding amounts
        </div>
      </div>
    </div>

    <!-- Add Payment Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Record New Payment</h3>
          
          <form @submit.prevent="savePayment" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Vendor</label>
              <select v-model="form.vendor" required class="input mt-1" @change="loadVendorOutstanding">
                <option value="">Select a vendor</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
            
            <div v-if="form.vendor && vendorOutstanding > 0" class="p-3 bg-yellow-50 rounded-lg">
              <p class="text-sm text-yellow-800">
                Outstanding amount for this vendor: <strong>₹{{ vendorOutstanding.toFixed(2) }}</strong>
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Amount</label>
              <input v-model.number="form.amount" type="number" step="0.01" required class="input mt-1" placeholder="0.00" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Payment Date</label>
              <input v-model="form.payment_date" type="date" required class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Reference</label>
              <input v-model="form.reference" type="text" class="input mt-1" placeholder="Check number, transfer ID, etc." />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Notes</label>
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
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
          
          <div class="space-y-4">
            <div>
              <span class="font-medium text-gray-700">Vendor:</span>
              <span class="ml-2">{{ viewingPayment.expand?.vendor?.name || 'Unknown Vendor' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Amount:</span>
              <span class="ml-2">₹{{ viewingPayment.amount.toFixed(2) }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Payment Date:</span>
              <span class="ml-2">{{ formatDate(viewingPayment.payment_date) }}</span>
            </div>
            <div v-if="viewingPayment.reference">
              <span class="font-medium text-gray-700">Reference:</span>
              <span class="ml-2">{{ viewingPayment.reference }}</span>
            </div>
            <div v-if="viewingPayment.notes">
              <span class="font-medium text-gray-700">Notes:</span>
              <p class="ml-2 text-gray-600">{{ viewingPayment.notes }}</p>
            </div>
            <div v-if="viewingPayment.expand?.incoming_items && viewingPayment.expand.incoming_items.length > 0">
              <span class="font-medium text-gray-700">Items Affected:</span>
              <div class="ml-2 mt-2 space-y-2">
                <div v-for="item in viewingPayment.expand.incoming_items" :key="item.id" class="p-2 bg-gray-50 rounded">
                  <p class="text-sm font-medium">{{ item.expand?.item?.name || 'Unknown Item' }}</p>
                  <p class="text-xs text-gray-600">{{ item.expand?.vendor?.name || 'Unknown Vendor' }} - ${{ item.total_amount.toFixed(2) }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mt-6">
            <button @click="viewingPayment = null" class="w-full btn-outline">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { CreditCard, Plus, Eye, Trash2, Loader2 } from 'lucide-vue-next';
import { 
  paymentService, 
  vendorService,
  incomingItemService,
  type Payment, 
  type Vendor,
  type IncomingItem
} from '../services/pocketbase';

interface VendorWithOutstanding extends Vendor {
  outstandingAmount: number;
  pendingItems: number;
}

const payments = ref<Payment[]>([]);
const vendors = ref<Vendor[]>([]);
const incomingItems = ref<IncomingItem[]>([]);
const showAddModal = ref(false);
const viewingPayment = ref<Payment | null>(null);
const loading = ref(false);
const vendorOutstanding = ref(0);

const form = reactive({
  vendor: '',
  amount: 0,
  payment_date: new Date().toISOString().split('T')[0],
  reference: '',
  notes: '',
  incoming_items: [] as string[]
});

const vendorsWithOutstanding = computed(() => {
  return vendors.value.map(vendor => {
    const vendorItems = incomingItems.value.filter(item => 
      item.vendor === vendor.id && item.payment_status !== 'paid'
    );
    const outstandingAmount = vendorItems.reduce((sum, item) => 
      sum + (item.total_amount - item.paid_amount), 0
    );
    
    return {
      ...vendor,
      outstandingAmount,
      pendingItems: vendorItems.length
    } as VendorWithOutstanding;
  }).filter(vendor => vendor.outstandingAmount > 0);
});

const loadData = async () => {
  try {
    const [paymentsData, vendorsData, incomingData] = await Promise.all([
      paymentService.getAll(),
      vendorService.getAll(),
      incomingItemService.getAll()
    ]);
    
    payments.value = paymentsData;
    vendors.value = vendorsData;
    incomingItems.value = incomingData;
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const loadVendorOutstanding = () => {
  if (form.vendor) {
    const vendorItems = incomingItems.value.filter(item => 
      item.vendor === form.vendor && item.payment_status !== 'paid'
    );
    vendorOutstanding.value = vendorItems.reduce((sum, item) => 
      sum + (item.total_amount - item.paid_amount), 0
    );
  }
};

const savePayment = async () => {
  loading.value = true;
  try {
    await paymentService.create(form);
    await loadData();
    closeModal();
  } catch (error) {
    console.error('Error saving payment:', error);
  } finally {
    loading.value = false;
  }
};

const quickPayment = (vendor: VendorWithOutstanding) => {
  form.vendor = vendor.id!;
  form.amount = vendor.outstandingAmount;
  loadVendorOutstanding();
  showAddModal.value = true;
};

const viewPayment = (payment: Payment) => {
  viewingPayment.value = payment;
};

const deletePayment = async (paymentId: string) => {
  if (confirm('Are you sure you want to delete this payment record? This cannot be undone and may affect item payment status.')) {
    try {
      // Note: In a real implementation, you'd also need to reverse the payment status updates
      // For now, we'll just delete the payment record
      console.log('Would delete payment with ID:', paymentId);
      // await paymentService.delete(paymentId);
      // await loadData();
      alert('Payment deletion is not implemented yet. You would need to manually adjust affected items.');
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const closeModal = () => {
  showAddModal.value = false;
  Object.assign(form, {
    vendor: '',
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    incoming_items: []
  });
  vendorOutstanding.value = 0;
};

const handleQuickAction = () => {
  showAddModal.value = true;
};

onMounted(() => {
  loadData();
  window.addEventListener('show-add-modal', handleQuickAction);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
});
</script>