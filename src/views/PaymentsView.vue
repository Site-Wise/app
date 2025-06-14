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
          'flex items-center'
        ]"
        :title="!canCreatePayment ? t('subscription.banner.freeTierLimitReached') : ''"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('payments.recordPayment') }}
      </button>
    </div>

    <!-- Payments Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.vendor') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.account') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.amount') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('payments.paymentDate') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.reference') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('payments.itemsAffected') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="payment in payments" :key="payment.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ payment.expand?.vendor?.name || t('common.unknown') + ' ' + t('common.vendor') }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <component :is="getAccountIcon(payment.expand?.account?.type)" class="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <div class="text-sm text-gray-900 dark:text-white">{{ payment.expand?.account?.name || t('common.unknown') + ' ' + t('common.account') }}</div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900 dark:text-white">₹{{ payment.amount.toFixed(2) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ formatDate(payment.payment_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ payment.reference || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ payment.incoming_items?.length || 0 }} {{ t('common.items') }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-2">
                <button @click="viewPayment(payment)" class="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300">
                  <Eye class="h-4 w-4" />
                </button>
                <button 
                  @click="deletePayment(payment.id!)" 
                  :disabled="!canEditDelete"
                  :class="[
                    canEditDelete 
                      ? 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300' 
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  ]"
                >
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

    <!-- Outstanding Amounts by Vendor -->
    <div class="mt-8 card">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Outstanding Amounts by Vendor</h2>
      <div class="space-y-4">
        <div v-for="vendor in vendorsWithOutstanding" :key="vendor.id" class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">{{ vendor.name }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ vendor.pendingItems }} pending deliveries</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-semibold text-gray-900 dark:text-white">₹{{ vendor.outstandingAmount.toFixed(2) }}</p>
            <button 
              @click="quickPayment(vendor)" 
              :disabled="!canCreatePayment"
              :class="[
                canCreatePayment 
                  ? 'text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300' 
                  : 'text-sm text-gray-300 dark:text-gray-600 cursor-not-allowed'
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
    <div v-if="showAddModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Record New Payment</h3>
          
          <form @submit.prevent="savePayment" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}</label>
              <select v-model="form.vendor" required class="input mt-1" @change="loadVendorOutstanding">
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
              <input v-model.number="form.amount" type="number" step="0.01" required class="input mt-1" placeholder="0.00" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentDate') }}</label>
              <input v-model="form.payment_date" type="date" required class="input mt-1" />
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
            <div v-if="viewingPayment.expand?.incoming_items && viewingPayment.expand.incoming_items.length > 0">
              <span class="font-medium text-gray-700 dark:text-gray-300">Items Affected:</span>
              <div class="ml-2 mt-2 space-y-2">
                <div v-for="item in viewingPayment.expand.incoming_items" :key="item.id" class="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ item.expand?.item?.name || 'Unknown Item' }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">{{ item.expand?.vendor?.name || 'Unknown Vendor' }} - ₹{{ item.total_amount.toFixed(2) }}</p>
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
import { 
  CreditCard, 
  Plus, 
  Eye, 
  Trash2, 
  Loader2,
  Banknote,
  Wallet,
  Smartphone,
  Building2
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { 
  paymentService, 
  vendorService,
  accountService,
  incomingItemService,
  serviceBookingService,
  type Payment, 
  type Vendor,
  type Account,
  type IncomingItem,
  type ServiceBooking
} from '../services/pocketbase';

const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error } = useToast();

interface VendorWithOutstanding extends Vendor {
  outstandingAmount: number;
  pendingItems: number;
}

const payments = ref<Payment[]>([]);
const vendors = ref<Vendor[]>([]);
const accounts = ref<Account[]>([]);
const incomingItems = ref<IncomingItem[]>([]);
const serviceBookings = ref<ServiceBooking[]>([]);
const showAddModal = ref(false);
const viewingPayment = ref<Payment | null>(null);
const loading = ref(false);
const vendorOutstanding = ref(0);

const form = reactive({
  vendor: '',
  account: '',
  amount: 0,
  payment_date: new Date().toISOString().split('T')[0],
  reference: '',
  notes: '',
  incoming_items: [] as string[],
  service_bookings: [] as string[]
});

const canCreatePayment = computed(() => {
  return !isReadOnly.value && checkCreateLimit('payments');
});

const canEditDelete = computed(() => {
  return !isReadOnly.value;
});

const activeAccounts = computed(() => {
  return accounts.value.filter(account => account.is_active);
});

const vendorsWithOutstanding = computed(() => {
  return vendors.value.map(vendor => {
    // Calculate outstanding from incoming items
    const vendorItems = incomingItems.value.filter(item => 
      item.vendor === vendor.id && item.payment_status !== 'paid'
    );
    const incomingOutstanding = vendorItems.reduce((sum, item) => 
      sum + (item.total_amount - item.paid_amount), 0
    );
    
    // Calculate outstanding from service bookings
    const vendorBookings = serviceBookings.value.filter(booking => 
      booking.vendor === vendor.id && booking.payment_status !== 'paid'
    );
    const serviceOutstanding = vendorBookings.reduce((sum, booking) => 
      sum + (booking.total_amount - booking.paid_amount), 0
    );
    
    const outstandingAmount = incomingOutstanding + serviceOutstanding;
    const pendingItems = vendorItems.length + vendorBookings.length;
    
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

const loadData = async () => {
  try {
    const [paymentsData, vendorsData, accountsData, incomingData, serviceBookingsData] = await Promise.all([
      paymentService.getAll(),
      vendorService.getAll(),
      accountService.getAll(),
      incomingItemService.getAll(),
      serviceBookingService.getAll()
    ]);
    
    payments.value = paymentsData;
    vendors.value = vendorsData;
    accounts.value = accountsData;
    incomingItems.value = incomingData;
    serviceBookings.value = serviceBookingsData;
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const loadVendorOutstanding = () => {
  if (form.vendor) {
    // Calculate outstanding from incoming items
    const vendorItems = incomingItems.value.filter(item => 
      item.vendor === form.vendor && item.payment_status !== 'paid'
    );
    const incomingOutstanding = vendorItems.reduce((sum, item) => 
      sum + (item.total_amount - item.paid_amount), 0
    );
    
    // Calculate outstanding from service bookings
    const vendorBookings = serviceBookings.value.filter(booking => 
      booking.vendor === form.vendor && booking.payment_status !== 'paid'
    );
    const serviceOutstanding = vendorBookings.reduce((sum, booking) => 
      sum + (booking.total_amount - booking.paid_amount), 0
    );
    
    vendorOutstanding.value = incomingOutstanding + serviceOutstanding;
  }
};

const handleAddPayment = () => {
  if (!canCreatePayment.value) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  showAddModal.value = true;
};

const savePayment = async () => {
  if (!checkCreateLimit('payments')) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  loading.value = true;
  try {
    await paymentService.create(form);
    success(t('messages.createSuccess', { item: t('common.payment') }));
    // Usage is automatically incremented by PocketBase hooks
    await loadData();
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
};

const viewPayment = (payment: Payment) => {
  viewingPayment.value = payment;
};

const deletePayment = async (paymentId: string) => {
  if (!canEditDelete.value) {
    alert(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  if (confirm('Are you sure you want to delete this payment record? This cannot be undone and may affect item payment status.')) {
    try {
      // Note: In a real implementation, you'd also need to reverse the payment status updates
      // For now, we'll just delete the payment record
      console.log('Would delete payment with ID:', paymentId);
      // await paymentService.delete(paymentId);
      // Usage is automatically decremented by PocketBase hooks
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
    account: '',
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

const handleSiteChange = () => {
  loadData();
};

onMounted(() => {
  loadData();
  window.addEventListener('show-add-modal', handleQuickAction);
  window.addEventListener('site-changed', handleSiteChange);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
  window.removeEventListener('site-changed', handleSiteChange);
});
</script>