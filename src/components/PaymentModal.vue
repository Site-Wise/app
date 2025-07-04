<template>
  <div v-if="isVisible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="handleBackdropClick" @keydown.esc="handleEscape" tabindex="-1">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
      <div class="mt-3">
        <!-- Dynamic Header -->
        <div class="flex items-center mb-4">
          <component :is="modalIcon" class="h-6 w-6 mr-3" :class="modalIconColor" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ modalTitle }}</h3>
        </div>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Payment Info Section -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
            <!-- Vendor Selection (CREATE/PAY_NOW) or Display (EDIT) -->
            <div v-if="mode !== 'EDIT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}</label>
              <select 
                ref="vendorInputRef" 
                v-model="form.vendor" 
                required 
                class="input mt-1" 
                @change="handleVendorChange" 
                :autofocus="mode === 'CREATE'"
              >
                <option value="">{{ t('forms.selectVendor') }}</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
            <div v-else class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}:</span>
              <span class="text-sm text-gray-900 dark:text-white">{{ payment?.expand?.vendor?.name }}</span>
            </div>

            <!-- Account Selection (CREATE/PAY_NOW) or Display (EDIT) -->
            <div v-if="mode !== 'EDIT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentAccount') }}</label>
              <select v-model="form.account" required class="input mt-1">
                <option value="">{{ t('forms.selectAccount') }}</option>
                <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                  {{ account.name }} ({{ account.type.replace('_', ' ') }}) - ₹{{ account.current_balance.toFixed(2) }}
                </option>
              </select>
            </div>
            <div v-else class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentAccount') }}:</span>
              <div class="flex items-center">
                <component :is="getAccountIcon(payment?.expand?.account?.type)" class="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span class="text-sm text-gray-900 dark:text-white">{{ payment?.expand?.account?.name }}</span>
              </div>
            </div>

            <!-- Credit Notes Section (CREATE/PAY_NOW only) -->
            <div v-if="mode !== 'EDIT' && form.vendor && availableCreditNotes.length > 0">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.availableCreditNotes') }}</label>
              <div class="mt-2 space-y-2 max-h-32 overflow-y-auto">
                <div 
                  v-for="creditNote in availableCreditNotes" 
                  :key="creditNote.id"
                  class="flex items-center space-x-3 p-2 border border-gray-200 dark:border-gray-600 rounded-md"
                >
                  <input
                    :id="`credit-note-${creditNote.id}`"
                    v-model="form.credit_notes"
                    :value="creditNote.id"
                    type="checkbox"
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    @change="handleCreditNoteChange"
                  />
                  <label :for="`credit-note-${creditNote.id}`" class="flex-1 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-900 dark:text-white">{{ creditNote.reference || `CN-${creditNote.id?.slice(-6)}` }}</span>
                      <span class="text-green-600 dark:text-green-400 font-medium">₹{{ creditNote.balance.toFixed(2) }}</span>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {{ creditNote.reason }}
                    </div>
                  </label>
                </div>
              </div>
              <div v-if="selectedCreditNoteAmount > 0" class="mt-2 text-sm text-green-600 dark:text-green-400">
                Selected credit notes: ₹{{ selectedCreditNoteAmount.toFixed(2) }}
              </div>
            </div>

            <!-- Payment Date (CREATE/PAY_NOW) or Display (EDIT) -->
            <div v-if="mode !== 'EDIT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentDate') }}</label>
              <input v-model="form.transaction_date" type="date" required class="input mt-1" />
            </div>
            <div v-else class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentDate') }}:</span>
              <span class="text-sm text-gray-900 dark:text-white">{{ formatDate(payment?.payment_date || '') }}</span>
            </div>

            <!-- Amount (CREATE/PAY_NOW) or Display (EDIT) -->
            <div v-if="mode !== 'EDIT'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.amount') }}</label>
              <div class="flex items-center space-x-2">
                <input 
                  v-model.number="form.amount" 
                  type="number" 
                  step="0.01" 
                  required 
                  class="input mt-1 flex-1" 
                  placeholder="0.00" 
                  @input="handleAmountChange" 
                />
                <button 
                  v-if="form.vendor && vendorOutstanding > 0 && form.amount !== vendorOutstanding"
                  type="button"
                  @click="payAllOutstanding"
                  class="mt-1 px-3 py-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 border border-primary-300 dark:border-primary-600 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/20"
                >
                  Pay All (₹{{ vendorOutstanding.toFixed(2) }})
                </button>
              </div>
              <!-- Payment breakdown when credit notes are involved -->
              <div v-if="selectedCreditNoteAmount > 0" class="mt-2 text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <div class="flex justify-between">
                  <span class="text-gray-700 dark:text-gray-300">Account payment:</span>
                  <span :class="accountPaymentAmount >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'">
                    ₹{{ Math.max(0, accountPaymentAmount).toFixed(2) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-700 dark:text-gray-300">Credit notes:</span>
                  <span class="text-green-600 dark:text-green-400">₹{{ Math.min(selectedCreditNoteAmount, form.amount).toFixed(2) }}</span>
                </div>
                <hr class="my-1 border-gray-300 dark:border-gray-600">
                <div class="flex justify-between font-medium">
                  <span class="text-gray-900 dark:text-white">Total payment:</span>
                  <span class="text-gray-900 dark:text-white">₹{{ form.amount.toFixed(2) }}</span>
                </div>
                <!-- Warning if credit notes exceed payment amount -->
                <div v-if="selectedCreditNoteAmount > form.amount" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Credit notes exceed payment amount. Only ₹{{ form.amount.toFixed(2) }} will be used.
                </div>
              </div>
            </div>
            <div v-else class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.amount') }}:</span>
              <span class="text-sm font-semibold text-gray-900 dark:text-white">₹{{ payment?.amount.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Outstanding Amount Alert (CREATE/PAY_NOW) -->
          <div v-if="mode !== 'EDIT' && form.vendor && vendorOutstanding > 0" class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <div>
                <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Outstanding amount for this vendor: <strong>₹{{ vendorOutstanding.toFixed(2) }}</strong>
                </p>
                <p class="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  {{ vendorPendingItems }} pending deliveries/bookings
                </p>
              </div>
            </div>
          </div>

          <!-- Allocation Progress Section (All Modes) -->
          <div v-if="showAllocationProgress" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">{{ t('payments.allocationStatus') }}</h4>
            
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-700 dark:text-gray-300">{{ t('payments.allocated') }}:</span>
                <span class="text-green-600 dark:text-green-400 font-medium">₹{{ allocatedAmount.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-700 dark:text-gray-300">{{ t('payments.unallocated') }}:</span>
                <span class="text-orange-600 dark:text-orange-400 font-medium">₹{{ unallocatedAmount.toFixed(2) }}</span>
              </div>
              
              <!-- Progress bar -->
              <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mt-2 overflow-hidden">
                <div 
                  class="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
                  :style="{ width: `${Math.min(100, allocationPercentage)}%` }"
                ></div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
                {{ allocationPercentage }}% allocated
              </div>
            </div>
          </div>

          <!-- Current Allocations (EDIT mode only) -->
          <div v-if="mode === 'EDIT' && currentAllocations.length > 0" class="space-y-2">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white">{{ t('payments.currentAllocations') }}</h4>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead class="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('common.type') }}</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('common.date') }}</th>
                    <th class="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('common.amount') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
                  <tr v-for="allocation in currentAllocations" :key="allocation.id" class="hover:bg-gray-50 dark:hover:bg-gray-600">
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

          <!-- Allocation Complete Message (EDIT mode when fully allocated) -->
          <div v-if="mode === 'EDIT' && unallocatedAmount <= 0" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <span class="text-sm font-medium text-green-800 dark:text-green-300">{{ t('payments.fullyAllocated') }}</span>
            </div>
            <p class="text-sm text-green-700 dark:text-green-400 mt-1">This payment has been fully allocated to deliveries and service bookings.</p>
          </div>

          <!-- Delivery/Booking Selection -->
          <div v-if="showDeliverySelection" class="space-y-3">
            <div class="flex justify-between items-center">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.selectItemsToPay') }}</label>
              <span v-if="mode === 'EDIT'" class="text-xs text-orange-600 dark:text-orange-400 font-medium">
                Max: ₹{{ unallocatedAmount.toFixed(2) }}
              </span>
            </div>
            
            <!-- Deliveries -->
            <div v-if="selectableDeliveries.length > 0">
              <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{{ t('common.deliveries') }}</h4>
              <div class="space-y-2 max-h-40 overflow-y-auto">
                <label v-for="delivery in selectableDeliveries" :key="delivery.id" class="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :value="delivery.id" 
                    v-model="form.deliveries"
                    @change="handleDeliverySelectionChange"
                    class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <div class="flex-1 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-900 dark:text-white">{{ formatDate(delivery.delivery_date) }}</span>
                      <span class="font-medium text-gray-900 dark:text-white">₹{{ delivery.outstanding.toFixed(2) }}</span>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      Total: ₹{{ delivery.total_amount.toFixed(2) }} | Paid: ₹{{ delivery.paid_amount.toFixed(2) }}
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            <!-- Service Bookings -->
            <div v-if="selectableBookings.length > 0">
              <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{{ t('common.serviceBookings') }}</h4>
              <div class="space-y-2 max-h-40 overflow-y-auto">
                <label v-for="booking in selectableBookings" :key="booking.id" class="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :value="booking.id" 
                    v-model="form.service_bookings"
                    @change="handleDeliverySelectionChange"
                    class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <div class="flex-1 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-900 dark:text-white">{{ booking.expand?.service?.name || 'Service' }}</span>
                      <span class="font-medium text-gray-900 dark:text-white">₹{{ booking.outstanding.toFixed(2) }}</span>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDate(booking.start_date) }} | Total: ₹{{ booking.total_amount.toFixed(2) }}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- No items available message -->
            <div v-if="selectableDeliveries.length === 0 && selectableBookings.length === 0 && form.vendor" class="text-center py-4 text-gray-500 dark:text-gray-400">
              <svg class="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p class="text-sm">{{ mode === 'EDIT' ? 'No additional items available for allocation' : 'No pending deliveries or bookings for this vendor' }}</p>
            </div>
          </div>

          <!-- Additional Fields (CREATE/PAY_NOW only) -->
          <div v-if="mode !== 'EDIT'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
              <input v-model="form.reference" type="text" class="input mt-1" placeholder="Check number, transfer ID, etc." />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" placeholder="Payment notes"></textarea>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex space-x-3 pt-4">
            <button 
              type="submit" 
              :disabled="loading || !isFormValid" 
              :class="[
                isFormValid ? 'btn-primary' : 'btn-disabled',
                'flex-1'
              ]"
            >
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ submitButtonText }}
            </button>
            <button type="button" @click="handleCancel" class="flex-1 btn-outline">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Loader2,
  Banknote,
  Wallet,
  Smartphone,
  Building2
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useToast } from '../composables/useToast';
import type { 
  Payment, 
  PaymentAllocation, 
  Vendor, 
  Account,
  Delivery,
  ServiceBooking,
  VendorCreditNote
} from '../services/pocketbase';
import { vendorCreditNoteService } from '../services/pocketbase';

// Props
interface Props {
  isVisible: boolean;
  mode: 'CREATE' | 'PAY_NOW' | 'EDIT';
  payment?: Payment | null;
  currentAllocations?: PaymentAllocation[];
  vendors: Vendor[];
  accounts: Account[];
  deliveries: Delivery[];
  serviceBookings: ServiceBooking[];
  vendorId?: string; // For PAY_NOW mode
  outstandingAmount?: number; // For PAY_NOW mode
}

const props = withDefaults(defineProps<Props>(), {
  payment: null,
  currentAllocations: () => [],
  vendorId: '',
  outstandingAmount: 0
});

// Emits
interface Emits {
  (e: 'close'): void;
  (e: 'submit', data: any): void;
}

const emit = defineEmits<Emits>();

// Composables
const { t } = useI18n();
const { error } = useToast();

// Refs
const vendorInputRef = ref<HTMLInputElement>();
const loading = ref(false);

// Form state
const form = reactive({
  vendor: '',
  account: '',
  amount: 0,
  transaction_date: new Date().toISOString().split('T')[0],
  reference: '',
  notes: '',
  deliveries: [] as string[],
  service_bookings: [] as string[],
  credit_notes: [] as string[]
});

// Vendor data
const vendorOutstanding = ref(0);
const vendorPendingItems = ref(0);

// Credit notes data
const availableCreditNotes = ref<VendorCreditNote[]>([]);
const loadingCreditNotes = ref(false);

// Computed properties
const modalTitle = computed(() => {
  switch (props.mode) {
    case 'CREATE': return t('payments.recordPayment');
    case 'PAY_NOW': return `Pay Outstanding Amount`;
    case 'EDIT': return t('payments.editPayment');
    default: return '';
  }
});

const modalIcon = computed(() => {
  switch (props.mode) {
    case 'CREATE': return Plus;
    case 'PAY_NOW': return CreditCard;
    case 'EDIT': return Edit;
    default: return CreditCard;
  }
});

const modalIconColor = computed(() => {
  switch (props.mode) {
    case 'CREATE': return 'text-green-600';
    case 'PAY_NOW': return 'text-blue-600';
    case 'EDIT': return 'text-orange-600';
    default: return 'text-gray-600';
  }
});

const activeAccounts = computed(() => {
  return props.accounts.filter(account => account.is_active);
});

const selectedCreditNoteAmount = computed(() => {
  return form.credit_notes.reduce((total, creditNoteId) => {
    const creditNote = availableCreditNotes.value.find(cn => cn.id === creditNoteId);
    return total + (creditNote?.balance || 0);
  }, 0);
});

const accountPaymentAmount = computed(() => {
  return form.amount - selectedCreditNoteAmount.value;
});

const allocatedAmount = computed((): number => {
  if (props.mode === 'EDIT' && props.payment) {
    const currentlyAllocated = props.currentAllocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
    return currentlyAllocated;
  }
  
  // For CREATE/PAY_NOW, calculate from selected items
  let total = 0;
  form.deliveries.forEach(deliveryId => {
    const delivery = selectableDeliveries.value.find(d => d.id === deliveryId);
    if (delivery) total += delivery.outstanding;
  });
  form.service_bookings.forEach(bookingId => {
    const booking = selectableBookings.value.find(b => b.id === bookingId);
    if (booking) total += booking.outstanding;
  });
  return total;
});

const unallocatedAmount = computed((): number => {
  if (props.mode === 'EDIT' && props.payment) {
    return props.payment.amount - allocatedAmount.value;
  }
  
  // For CREATE/PAY_NOW
  return Math.max(0, form.amount - allocatedAmount.value);
});

const allocationPercentage = computed(() => {
  const total = props.mode === 'EDIT' ? props.payment?.amount || 0 : form.amount;
  if (total === 0) return 0;
  return Math.round((allocatedAmount.value / total) * 100);
});

const showAllocationProgress = computed(() => {
  return (form.amount > 0 && allocatedAmount.value > 0) || (props.mode === 'EDIT' && props.payment);
});

const showDeliverySelection = computed(() => {
  return form.vendor && (
    (props.mode !== 'EDIT' && form.amount > 0) || 
    (props.mode === 'EDIT' && unallocatedAmount.value > 0)
  ) && (selectableDeliveries.value.length > 0 || selectableBookings.value.length > 0);
});

const selectableDeliveries = computed(() => {
  if (!form.vendor) return [];
  
  const vendorDeliveries = props.deliveries.filter(delivery => 
    delivery.vendor === form.vendor && delivery.payment_status !== 'paid'
  );
  
  if (props.mode === 'EDIT') {
    // In edit mode, exclude deliveries that are already allocated to this payment
    const allocatedDeliveryIds = props.currentAllocations
      .filter(allocation => allocation.delivery)
      .map(allocation => allocation.delivery);
    
    return vendorDeliveries
      .filter(delivery => !allocatedDeliveryIds.includes(delivery.id!))
      .map(delivery => ({
        id: delivery.id!,
        delivery_date: delivery.delivery_date,
        total_amount: delivery.total_amount,
        paid_amount: delivery.paid_amount,
        outstanding: delivery.total_amount - delivery.paid_amount
      }))
      .filter(d => d.outstanding > 0);
  }
  
  return vendorDeliveries.map(delivery => ({
    id: delivery.id!,
    delivery_date: delivery.delivery_date,
    total_amount: delivery.total_amount,
    paid_amount: delivery.paid_amount,
    outstanding: delivery.total_amount - delivery.paid_amount
  })).filter(d => d.outstanding > 0);
});

const selectableBookings = computed(() => {
  if (!form.vendor) return [];
  
  const vendorBookings = props.serviceBookings.filter(booking => 
    booking.vendor === form.vendor && booking.payment_status !== 'paid'
  );
  
  if (props.mode === 'EDIT') {
    // In edit mode, exclude bookings that are already allocated to this payment
    const allocatedBookingIds = props.currentAllocations
      .filter(allocation => allocation.service_booking)
      .map(allocation => allocation.service_booking);
    
    return vendorBookings
      .filter(booking => !allocatedBookingIds.includes(booking.id!))
      .map(booking => ({
        id: booking.id!,
        start_date: booking.start_date,
        total_amount: booking.total_amount,
        paid_amount: booking.paid_amount,
        outstanding: booking.total_amount - booking.paid_amount,
        expand: booking.expand
      }))
      .filter(b => b.outstanding > 0);
  }
  
  return vendorBookings.map(booking => ({
    id: booking.id!,
    start_date: booking.start_date,
    total_amount: booking.total_amount,
    paid_amount: booking.paid_amount,
    outstanding: booking.total_amount - booking.paid_amount,
    expand: booking.expand
  })).filter(b => b.outstanding > 0);
});

const submitButtonText = computed(() => {
  switch (props.mode) {
    case 'CREATE': return t('payments.recordPayment');
    case 'PAY_NOW': return `Pay ₹${form.amount.toFixed(2)}`;
    case 'EDIT': return t('payments.updatePayment');
    default: return t('common.submit');
  }
});

const isFormValid = computed(() => {
  if (props.mode === 'EDIT') {
    return form.deliveries.length > 0 || form.service_bookings.length > 0 || unallocatedAmount.value <= 0;
  }
  
  return form.vendor && form.account && form.amount > 0;
});

// Methods
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const calculateVendorOutstanding = () => {
  if (!form.vendor) {
    vendorOutstanding.value = 0;
    vendorPendingItems.value = 0;
    return;
  }
  
  // Calculate outstanding from deliveries
  const vendorDeliveries = props.deliveries.filter(delivery => 
    delivery.vendor === form.vendor
  );
  const deliveryOutstanding = vendorDeliveries.reduce((sum, delivery) => {
    const outstanding = delivery.total_amount - delivery.paid_amount;
    return sum + (outstanding > 0 ? outstanding : 0);
  }, 0);
  
  // Calculate outstanding from service bookings
  const vendorBookings = props.serviceBookings.filter(booking => 
    booking.vendor === form.vendor
  );
  const serviceOutstanding = vendorBookings.reduce((sum, booking) => {
    const outstanding = booking.total_amount - booking.paid_amount;
    return sum + (outstanding > 0 ? outstanding : 0);
  }, 0);
  
  // Total outstanding before credit notes
  const totalOutstanding = deliveryOutstanding + serviceOutstanding;
  
  // Note: Don't automatically subtract all available credit notes from outstanding
  // as user should explicitly choose which credit notes to use
  vendorOutstanding.value = totalOutstanding;
  vendorPendingItems.value = vendorDeliveries.filter(d => d.payment_status !== 'paid').length + 
                            vendorBookings.filter(b => b.payment_status !== 'paid').length;
};

const handleVendorChange = () => {
  calculateVendorOutstanding();
  loadVendorCreditNotes();
  
  // For PAY_NOW mode or when suggested, auto-fill the amount
  if (props.mode === 'PAY_NOW' || (props.mode === 'CREATE' && form.amount === 0)) {
    form.amount = vendorOutstanding.value;
  }
  
  // Clear selections when vendor changes
  form.deliveries = [];
  form.service_bookings = [];
  form.credit_notes = [];
};

const handleAmountChange = () => {
  // Update delivery selection based on amount
  updateDeliverySelectionFromAmount();
};

const updateDeliverySelectionFromAmount = () => {
  if (props.mode === 'PAY_NOW' && form.amount > 0) {
    // Auto-select deliveries up to the amount
    let remainingAmount = form.amount;
    const selectedDeliveries: string[] = [];
    const selectedBookings: string[] = [];
    
    // Select deliveries first (by date)
    const sortedDeliveries = [...selectableDeliveries.value].sort((a, b) => 
      new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
    );
    
    for (const delivery of sortedDeliveries) {
      if (remainingAmount <= 0) break;
      if (delivery.outstanding <= remainingAmount) {
        selectedDeliveries.push(delivery.id);
        remainingAmount -= delivery.outstanding;
      }
    }
    
    // Then select bookings
    const sortedBookings = [...selectableBookings.value].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    
    for (const booking of sortedBookings) {
      if (remainingAmount <= 0) break;
      if (booking.outstanding <= remainingAmount) {
        selectedBookings.push(booking.id);
        remainingAmount -= booking.outstanding;
      }
    }
    
    form.deliveries = selectedDeliveries;
    form.service_bookings = selectedBookings;
  }
};

const handleDeliverySelectionChange = () => {
  if (props.mode === 'CREATE') {
    // Update amount based on selected deliveries
    let totalAmount = 0;
    
    form.deliveries.forEach(deliveryId => {
      const delivery = selectableDeliveries.value.find(d => d.id === deliveryId);
      if (delivery) totalAmount += delivery.outstanding;
    });
    
    form.service_bookings.forEach(bookingId => {
      const booking = selectableBookings.value.find(b => b.id === bookingId);
      if (booking) totalAmount += booking.outstanding;
    });
    
    if (totalAmount > 0) {
      form.amount = totalAmount;
    }
  } else if (props.mode === 'EDIT') {
    // Validate that we don't exceed unallocated amount
    const selectedAmount = allocatedAmount.value;
    if (selectedAmount > unallocatedAmount.value) {
      error('Cannot allocate more than the unallocated amount');
      // Remove the last selected item
      // This is a simple approach - in production you might want more sophisticated handling
    }
  }
};

const loadVendorCreditNotes = async () => {
  if (!form.vendor) {
    availableCreditNotes.value = [];
    calculateVendorOutstanding(); // Recalculate without credit notes
    return;
  }
  
  try {
    loadingCreditNotes.value = true;
    const creditNotes = await vendorCreditNoteService.getByVendor(form.vendor);
    // Only show active credit notes with balance > 0
    availableCreditNotes.value = creditNotes.filter(cn => 
      cn.status === 'active' && cn.balance > 0
    );
    // Recalculate outstanding after loading credit notes
    calculateVendorOutstanding();
  } catch (err) {
    console.error('Error loading credit notes:', err);
    availableCreditNotes.value = [];
    calculateVendorOutstanding(); // Recalculate without credit notes
  } finally {
    loadingCreditNotes.value = false;
  }
};

const handleCreditNoteChange = () => {
  // When credit notes are selected/deselected, recalculate if needed
  calculateVendorOutstanding();
  
  // In CREATE mode, if the current amount was auto-set to outstanding,
  // keep it synchronized with the vendor outstanding
  if (props.mode === 'CREATE' && form.amount === vendorOutstanding.value) {
    // Keep amount in sync with outstanding if it was auto-set
    form.amount = vendorOutstanding.value;
  }
};

const payAllOutstanding = () => {
  // Calculate total payment needed
  const totalPaymentNeeded = vendorOutstanding.value;
  
  // The form amount should be the total needed payment
  form.amount = totalPaymentNeeded;
  
  // Auto-select all available credit notes if not already selected
  if (availableCreditNotes.value.length > 0 && form.credit_notes.length === 0) {
    form.credit_notes = availableCreditNotes.value.map(cn => cn.id!);
  }
  
  updateDeliverySelectionFromAmount();
};

const initializeForm = () => {
  // Reset form
  Object.assign(form, {
    vendor: '',
    account: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    deliveries: [],
    service_bookings: [],
    credit_notes: []
  });
  
  // Initialize based on mode and props
  if (props.mode === 'PAY_NOW' && props.vendorId) {
    form.vendor = props.vendorId;
    nextTick(() => {
      calculateVendorOutstanding();
      form.amount = props.outstandingAmount || vendorOutstanding.value;
      updateDeliverySelectionFromAmount();
    });
  } else if (props.mode === 'EDIT' && props.payment) {
    form.vendor = props.payment.vendor;
    form.account = props.payment.account;
    form.amount = props.payment.amount;
    form.transaction_date = props.payment.payment_date;
    form.reference = props.payment.reference || '';
    form.notes = props.payment.notes || '';
    // Don't pre-fill deliveries/bookings for edit mode
    calculateVendorOutstanding();
  }
};

const handleSubmit = async () => {
  if (!isFormValid.value) return;
  
  loading.value = true;
  try {
    const data = {
      mode: props.mode,
      form: { ...form },
      payment: props.payment
    };
    
    emit('submit', data);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  emit('close');
};

const handleBackdropClick = () => {
  emit('close');
};

const handleEscape = () => {
  emit('close');
};

// Watchers
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    initializeForm();
    nextTick(() => {
      vendorInputRef.value?.focus();
    });
  }
});

watch(() => props.mode, () => {
  if (props.isVisible) {
    initializeForm();
  }
});
</script>