<template>
  <div v-if="isVisible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="handleBackdropClick" @keydown.esc="handleEscape" tabindex="-1">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
      <div class="mt-3">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <CreditCard class="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ mode === 'CREATE' ? t('payments.recordPayment') : t('payments.editPayment') }}
            </h3>
          </div>
          <button 
            type="button"
            @click="handleEscape"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="t('common.close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Payment Info Section -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
            <!-- Vendor Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}</label>
              <select 
                ref="vendorInputRef" 
                v-model="form.vendor" 
                required 
                class="input mt-1" 
                @change="handleVendorChange"
                :autofocus="true"
                name="vendor"
              >
                <option value="">{{ t('forms.selectVendor') }}</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>

            <!-- Account Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentAccount') }}</label>
              <select v-model="form.account" required class="input mt-1" name="account">
                <option value="">{{ t('forms.selectAccount') }}</option>
                <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                  {{ account.name }} ({{ account.type.replace('_', ' ') }}) - ₹{{ account.current_balance.toFixed(2) }}
                </option>
              </select>
            </div>

            <!-- Credit Notes Section -->
            <div v-if="form.vendor && availableCreditNotes.length > 0">
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

            <!-- Payment Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('payments.paymentDate') }}</label>
              <input v-model="form.transaction_date" type="date" required class="input mt-1" />
            </div>

            <!-- Amount -->
            <div>
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
                  @focus="isAmountFocused = true"
                  @blur="isAmountFocused = false"
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
              </div>
            </div>
          </div>

          <!-- Outstanding Amount Alert -->
          <div v-if="form.vendor && vendorOutstanding > 0" class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div class="flex items-center">
              <AlertTriangle class="w-5 h-5 text-yellow-500 mr-2" />
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

          <!-- Allocation Progress -->
          <div v-if="form.amount > 0" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">{{ t('payments.allocationStatus') }}</h4>
            
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-700 dark:text-gray-300">{{ t('payments.allocated') }}:</span>
                <span class="text-green-600 dark:text-green-400 font-medium">₹{{ totalAllocatedAmount.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-700 dark:text-gray-300">{{ t('payments.unallocated') }}:</span>
                <span :class="unallocatedAmount >= 0 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'" class="font-medium">
                  ₹{{ Math.abs(unallocatedAmount).toFixed(2) }}
                  <span v-if="unallocatedAmount < 0" class="text-xs">(over)</span>
                </span>
              </div>
              
              <!-- Progress bar -->
              <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mt-2 overflow-hidden">
                <div 
                  class="h-3 rounded-full transition-all duration-300"
                  :class="[
                    isOverAllocated ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-green-600'
                  ]"
                  :style="{ width: `${Math.min(100, Math.max(0, allocationPercentage))}%` }"
                ></div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
                {{ allocationPercentage }}% allocated
                <span v-if="isOverAllocated" class="text-red-600 dark:text-red-400 ml-1">(Over-allocated)</span>
              </div>
            </div>
          </div>

          <!-- Delivery/Booking Selection with Tri-state Checkboxes -->
          <div v-if="form.vendor && form.allocations.length > 0" class="space-y-4">
            <div class="flex justify-between items-center">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">{{ t('payments.selectItemsToPay') }}</h4>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ form.allocations.filter(a => a.allocatedAmount > 0).length }} of {{ form.allocations.length }} selected
              </span>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
              <TriStateCheckbox
                v-for="allocation in form.allocations"
                :key="allocation.id"
                :id="allocation.id"
                :label="getItemLabel(allocation)"
                :secondary-text="getItemSecondaryText(allocation)"
                :state="allocation.state"
                :total-amount="allocation.outstandingAmount"
                :allocated-amount="allocation.allocatedAmount"
                :allow-partial-edit="true"
                @change="(data) => updateAllocationState(allocation.id, data.state, data.allocatedAmount)"
              />
            </div>
          </div>

          <!-- No Items Message -->
          <div v-if="form.vendor && form.allocations.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            <Package class="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p class="text-sm">No pending deliveries or bookings for this vendor</p>
          </div>

          <!-- Additional Fields -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
              <input v-model="form.reference" type="text" class="input mt-1" placeholder="Check number, transfer ID, etc." />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" placeholder="Payment notes"></textarea>
            </div>
          </div>

          <!-- Validation Errors -->
          <div v-if="validationErrors.length > 0" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div class="flex items-center mb-2">
              <AlertCircle class="w-5 h-5 text-red-500 mr-2" />
              <h4 class="text-sm font-medium text-red-800 dark:text-red-300">Please correct the following errors:</h4>
            </div>
            <ul class="text-sm text-red-700 dark:text-red-400 space-y-1">
              <li v-for="error in validationErrors" :key="error" class="flex items-start">
                <span class="mr-2">•</span>
                <span>{{ error }}</span>
              </li>
            </ul>
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
              {{ t('payments.recordPayment') }}
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
import { ref, computed, watch, nextTick } from 'vue';
import { 
  CreditCard, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  Package,
  Loader2
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useToast } from '../composables/useToast';
import { usePaymentPartials } from '../composables/usePaymentPartials';
import TriStateCheckbox from './TriStateCheckbox.vue';
import type { 
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
  mode: 'CREATE' | 'EDIT';
  vendors: Vendor[];
  accounts: Account[];
  deliveries: Delivery[];
  serviceBookings: ServiceBooking[];
  vendorId?: string;
  outstandingAmount?: number;
}

const props = withDefaults(defineProps<Props>(), {
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
const {
  form,
  availableCreditNotes,
  selectedCreditNoteAmount,
  totalAllocatedAmount,
  accountPaymentAmount,
  unallocatedAmount,
  allocationPercentage,
  isFullyAllocated,
  isOverAllocated,
  initializeAllocations,
  updateAllocationState,
  handleAmountChange: handleAmountChangeInternal,
  handleCreditNoteChange: handleCreditNoteChangeInternal,
  payAllOutstanding: payAllOutstandingInternal,
  validateAllocations,
  resetForm,
  getPaymentData
} = usePaymentPartials();

// Refs
const vendorInputRef = ref<HTMLInputElement>();
const loading = ref(false);
const isAmountFocused = ref(false);
const validationErrors = ref<string[]>([]);

// Computed properties
const activeAccounts = computed(() => {
  return props.accounts.filter(account => account.is_active);
});

const vendorOutstanding = computed(() => {
  return form.allocations.reduce((sum, allocation) => sum + allocation.outstandingAmount, 0);
});

const vendorPendingItems = computed(() => {
  return form.allocations.length;
});

const isFormValid = computed(() => {
  return form.vendor && form.account && form.amount > 0 && validationErrors.value.length === 0;
});

// Methods
const getItemLabel = (allocation: any) => {
  if (allocation.type === 'delivery') {
    return `Delivery - ${formatDate(allocation.item.delivery_date)}`;
  } else {
    return `Service - ${allocation.item.expand?.service?.name || 'Unknown Service'}`;
  }
};

const getItemSecondaryText = (allocation: any) => {
  if (allocation.type === 'delivery') {
    return `Total: ₹${allocation.totalAmount.toFixed(2)} | Paid: ₹${allocation.paidAmount.toFixed(2)}`;
  } else {
    return `${formatDate(allocation.item.start_date)} | Total: ₹${allocation.totalAmount.toFixed(2)}`;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const handleVendorChange = async () => {
  if (!form.vendor) return;
  
  initializeAllocations(props.deliveries, props.serviceBookings, form.vendor);
  await loadVendorCreditNotes();
  
  // Auto-fill amount if specified
  if (props.mode === 'CREATE' && props.vendorId === form.vendor && props.outstandingAmount > 0) {
    form.amount = props.outstandingAmount;
    handleAmountChangeInternal(props.outstandingAmount);
  }
};

const handleAmountChange = () => {
  handleAmountChangeInternal(form.amount);
  validateForm();
};

const handleCreditNoteChange = () => {
  handleCreditNoteChangeInternal();
  validateForm();
};

const payAllOutstanding = () => {
  payAllOutstandingInternal();
  validateForm();
};

const loadVendorCreditNotes = async () => {
  if (!form.vendor) {
    availableCreditNotes.value = [];
    return;
  }
  
  try {
    const creditNotes = await vendorCreditNoteService.getByVendor(form.vendor);
    availableCreditNotes.value = creditNotes.filter(cn => 
      cn.status === 'active' && cn.balance > 0
    );
  } catch (err) {
    console.error('Error loading credit notes:', err);
    availableCreditNotes.value = [];
  }
};

const validateForm = () => {
  validationErrors.value = validateAllocations();
};

const handleSubmit = async () => {
  if (!isFormValid.value) return;
  
  loading.value = true;
  try {
    const data = getPaymentData();
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

const initializeForm = () => {
  resetForm();
  
  if (props.vendorId) {
    form.vendor = props.vendorId;
    nextTick(() => {
      handleVendorChange();
    });
  }
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

watch(() => form.allocations, () => {
  validateForm();
}, { deep: true });

watch(() => form.amount, () => {
  validateForm();
});
</script>