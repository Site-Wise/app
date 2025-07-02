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
              <div class="flex items-center">
                <div class="text-sm font-medium text-gray-900 dark:text-white">₹{{ payment.amount.toFixed(2) }}</div>
                <!-- Allocation Status Indicator -->
                <div v-if="payment.expand?.payment_allocations" class="ml-2">
                  <span 
                    v-if="getUnallocatedAmount(payment, payment.expand.payment_allocations) === 0"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    :title="t('payments.fullyAllocated')"
                  >
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    Allocated
                  </span>
                  <span 
                    v-else-if="getUnallocatedAmount(payment, payment.expand.payment_allocations) < payment.amount"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                    :title="`${t('payments.partiallyAllocated')}: ₹${getUnallocatedAmount(payment, payment.expand.payment_allocations).toFixed(2)} remaining`"
                  >
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                    </svg>
                    Partial
                  </span>
                  <span 
                    v-else
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                    :title="t('payments.unallocated')"
                  >
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    Unallocated
                  </span>
                </div>
              </div>
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
                <button 
                  v-if="canPaymentBeEdited(payment, payment.expand?.payment_allocations || [])" 
                  @click="startEditPayment(payment)" 
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300" 
                  :title="t('common.edit')"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
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
                <div class="flex items-center justify-end">
                  <div class="text-sm font-semibold text-green-600 dark:text-green-400">₹{{ payment.amount.toFixed(2) }}</div>
                  <!-- Mobile Allocation Status Indicator -->
                  <div v-if="payment.expand?.payment_allocations" class="ml-2">
                    <span 
                      v-if="getUnallocatedAmount(payment, payment.expand.payment_allocations) === 0"
                      class="inline-flex w-2 h-2 bg-green-500 rounded-full"
                      :title="t('payments.fullyAllocated')"
                    ></span>
                    <span 
                      v-else-if="getUnallocatedAmount(payment, payment.expand.payment_allocations) < payment.amount"
                      class="inline-flex w-2 h-2 bg-yellow-500 rounded-full"
                      :title="t('payments.partiallyAllocated')"
                    ></span>
                    <span 
                      v-else
                      class="inline-flex w-2 h-2 bg-orange-500 rounded-full"
                      :title="t('payments.unallocated')"
                    ></span>
                  </div>
                </div>
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
                      v-if="canPaymentBeEdited(payment, payment.expand?.payment_allocations || [])"
                      @click="startEditPayment(payment); closeMobileMenu()"
                      class="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                      {{ t('common.edit') }}
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

    <!-- Unified Payment Modal -->
    <PaymentModal
      :is-visible="showPaymentModal"
      :mode="paymentModalMode"
      :payment="currentPayment"
      :current-allocations="currentAllocations"
      :vendors="vendors"
      :accounts="accounts"
      :deliveries="deliveries"
      :service-bookings="serviceBookings"
      :vendor-id="vendorIdForPayNow"
      :outstanding-amount="outstandingAmountForPayNow"
      @submit="handlePaymentModalSubmit"
      @close="handlePaymentModalClose"
    />

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
            <div v-if="(viewingPayment.expand as any)?.related_return">
              <span class="font-medium text-gray-700 dark:text-gray-300">Related Return:</span>
              <div class="ml-2 mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <p class="text-sm font-medium text-gray-900 dark:text-white">Return Date: {{ formatDate((viewingPayment.expand as any).related_return.return_date) }}</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">Amount: ₹{{ (viewingPayment.expand as any).related_return.total_return_amount.toFixed(2) }}</p>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
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
import PaymentModal from '../components/PaymentModal.vue';
import { 
  paymentService, 
  paymentAllocationService,
  vendorService,
  accountService,
  deliveryService,
  serviceBookingService,
  getCurrentUserRole,
  getCurrentSiteId,
  pb,
  type Payment,
 
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

const openMobileMenuId = ref<string | null>(null);

const canCreatePayment = computed(() => {
  return !isReadOnly && checkCreateLimit('payments');
});

const canEditPayment = computed(() => {
  return !isReadOnly && getCurrentUserRole() === 'owner';
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


const handleAddPayment = () => {
  if (!canCreatePayment) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  paymentModalMode.value = 'CREATE';
  currentPayment.value = null;
  currentAllocations.value = [];
  showPaymentModal.value = true;
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
};

const viewPayment = async (payment: Payment) => {
  viewingPayment.value = payment;
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
  viewingPayment.value = null;
  showPaymentModal.value = true;
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

const handlePaymentModalSubmit = async (data: any) => {
  const { mode, form, payment } = data;
  
  try {
    if (mode === 'CREATE' || mode === 'PAY_NOW') {
      // Create new payment
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
    } else if (mode === 'EDIT') {
      // Update payment allocations
      const unallocatedAmount = getUnallocatedAmount(payment, currentAllocations.value);
      let remainingAmount = unallocatedAmount;
      
      // Handle delivery allocations
      for (const deliveryId of form.deliveries) {
        if (remainingAmount <= 0) break;
        
        const delivery = deliveries.value.find(d => d.id === deliveryId);
        if (!delivery) continue;
        
        const outstanding = delivery.total_amount - delivery.paid_amount;
        const allocatedAmount = Math.min(remainingAmount, outstanding);
        
        // Create payment allocation record
        await paymentAllocationService.create({
          payment: payment.id!,
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
        
        const booking = serviceBookings.value.find(b => b.id === bookingId);
        if (!booking) continue;
        
        const outstanding = booking.total_amount - booking.paid_amount;
        const allocatedAmount = Math.min(remainingAmount, outstanding);
        
        // Create payment allocation record
        await paymentAllocationService.create({
          payment: payment.id!,
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
    }
    
    // Reload data and close modal
    await reloadAllData();
    showPaymentModal.value = false;
  } catch (err) {
    console.error('Error saving payment:', err);
    error(t('messages.error'));
  }
};

const handlePaymentModalClose = () => {
  showPaymentModal.value = false;
  paymentModalMode.value = 'CREATE';
  currentPayment.value = null;
  currentAllocations.value = [];
  vendorIdForPayNow.value = '';
  outstandingAmountForPayNow.value = 0;
};

const handleQuickAction = () => {
  handleAddPayment();
};

// Site change is handled automatically by useSiteData

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    if (canCreatePayment) {
      handleAddPayment();
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