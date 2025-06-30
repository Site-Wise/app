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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('payments.itemsAffected') }}</th>
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
              {{ formatDate(payment.transaction_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              {{ payment.reference || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
              {{ getRelatedItemsCount() }} {{ t('common.items') }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium hidden lg:table-cell">
              <div class="flex items-center space-x-2">
                <button @click="viewPayment(payment)" class="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300" :title="t('common.view')">
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
                  :title="t('common.delete')"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>

            <!-- Mobile Row -->
            <td class="px-4 py-4 lg:hidden">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ payment.expand?.vendor?.name || t('common.unknown') + ' ' + t('common.vendor') }}</div>
              <div class="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                {{ formatDate(payment.transaction_date) }}
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
                    <button 
                      @click="deletePayment(payment.id!); closeMobileMenu()"
                      :disabled="!canEditDelete"
                      :class="[
                        canEditDelete 
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                          : 'text-gray-400 dark:text-gray-600 cursor-not-allowed',
                        'w-full flex items-center px-3 py-2 text-sm transition-colors duration-150'
                      ]"
                    >
                      <Trash2 class="h-4 w-4 mr-2" />
                      {{ t('common.delete') }}
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
              <select v-model="form.vendor" required class="input mt-1" @change="loadVendorOutstanding" autofocus>
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
              <span class="ml-2 text-gray-900 dark:text-white">{{ formatDate(viewingPayment.transaction_date) }}</span>
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
import { useRoute } from 'vue-router';
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
  accountTransactionService,
  vendorService,
  accountService,
  deliveryService,
  serviceBookingService,
  type AccountTransaction, 
  type Vendor,
  type Account,
  type Delivery,
  type ServiceBooking
} from '../services/pocketbase';

const route = useRoute();
const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error } = useToast();

interface VendorWithOutstanding extends Vendor {
  outstandingAmount: number;
  pendingItems: number;
}

const payments = ref<AccountTransaction[]>([]);
const vendors = ref<Vendor[]>([]);
const accounts = ref<Account[]>([]);
const deliveries = ref<Delivery[]>([]);
const serviceBookings = ref<ServiceBooking[]>([]);
const showAddModal = ref(false);
const viewingPayment = ref<AccountTransaction | null>(null);
const loading = ref(false);
const vendorOutstanding = ref(0);
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

const canEditDelete = computed(() => {
  return !isReadOnly.value;
});

const activeAccounts = computed(() => {
  return accounts.value.filter(account => account.is_active);
});

const vendorsWithOutstanding = computed(() => {
  return vendors.value.map(vendor => {
    // Calculate outstanding from deliveries
    const vendorDeliveries = deliveries.value.filter(delivery => 
      delivery.vendor === vendor.id && delivery.payment_status !== 'paid'
    );
    const deliveryOutstanding = vendorDeliveries.reduce((sum, delivery) => 
      sum + (delivery.total_amount - delivery.paid_amount), 0
    );
    
    // Calculate outstanding from service bookings
    const vendorBookings = serviceBookings.value.filter(booking => 
      booking.vendor === vendor.id && booking.payment_status !== 'paid'
    );
    const serviceOutstanding = vendorBookings.reduce((sum, booking) => 
      sum + (booking.total_amount - booking.paid_amount), 0
    );
    
    const outstandingAmount = deliveryOutstanding + serviceOutstanding;
    const pendingItems = vendorDeliveries.length + vendorBookings.length;
    
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

const getRelatedItemsCount = () => {
  // For now, return 0 since we don't have direct relationship
  // In the future, this could be calculated based on vendor and date range
  return 0;
};

const loadData = async () => {
  try {
    const [transactionsData, vendorsData, accountsData, deliveryData, serviceBookingsData] = await Promise.all([
      accountTransactionService.getAll(),
      vendorService.getAll(),
      accountService.getAll(),
      deliveryService.getAll(),
      serviceBookingService.getAll()
    ]);
    
    // Filter to show only debit transactions with vendors (payments)
    payments.value = transactionsData.filter(transaction => 
      transaction.type === 'debit' && transaction.vendor
    );
    vendors.value = vendorsData;
    accounts.value = accountsData;
    deliveries.value = deliveryData;
    serviceBookings.value = serviceBookingsData;
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const loadVendorOutstanding = () => {
  if (form.vendor) {
    // Calculate outstanding from deliveries
    const vendorDeliveries = deliveries.value.filter(delivery => 
      delivery.vendor === form.vendor && delivery.payment_status !== 'paid'
    );
    const deliveryOutstanding = vendorDeliveries.reduce((sum, delivery) => 
      sum + (delivery.total_amount - delivery.paid_amount), 0
    );
    
    // Calculate outstanding from service bookings
    const vendorBookings = serviceBookings.value.filter(booking => 
      booking.vendor === form.vendor && booking.payment_status !== 'paid'
    );
    const serviceOutstanding = vendorBookings.reduce((sum, booking) => 
      sum + (booking.total_amount - booking.paid_amount), 0
    );
    
    vendorOutstanding.value = deliveryOutstanding + serviceOutstanding;
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

const viewPayment = (payment: AccountTransaction) => {
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
      // await paymentService.delete(paymentId);
      // Usage is automatically decremented by PocketBase hooks
      // await loadData();
      alert(`Payment deletion is not implemented yet. You would need to manually adjust affected items. Payment ID: ${paymentId}`);
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  }
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
};

const handleSiteChange = () => {
  loadData();
};

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    if (canCreatePayment.value) {
      showAddModal.value = true;
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
  await loadData();
  
  // Check for paymentId query parameter and auto-open payment modal
  const paymentId = route.query.paymentId as string;
  if (paymentId) {
    const payment = payments.value.find(p => p.id === paymentId);
    if (payment) {
      viewingPayment.value = payment;
    }
  }
  
  window.addEventListener('show-add-modal', handleQuickAction);
  window.addEventListener('site-changed', handleSiteChange);
  window.addEventListener('keydown', handleKeyboardShortcut);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
  window.removeEventListener('site-changed', handleSiteChange);
  window.removeEventListener('keydown', handleKeyboardShortcut);
  document.removeEventListener('click', handleClickOutside);
});
</script>