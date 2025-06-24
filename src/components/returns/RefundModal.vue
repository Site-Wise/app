<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ t('vendors.processRefund') }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Return Summary -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 dark:text-white mb-2">Return Summary</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Return ID:</span>
                <span class="text-gray-900 dark:text-white">#{{ returnData?.id?.slice(-6) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Vendor:</span>
                <span class="text-gray-900 dark:text-white">
                  {{ returnData?.expand?.vendor?.name || returnData?.expand?.vendor?.contact_person || 'Unknown Vendor' }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Return Amount:</span>
                <span class="text-gray-900 dark:text-white font-medium">
                  ₹{{ returnData?.total_return_amount?.toFixed(2) }}
                </span>
              </div>
              <div v-if="returnData?.actual_refund_amount" class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Already Refunded:</span>
                <span class="text-green-600 dark:text-green-400 font-medium">
                  ₹{{ returnData.actual_refund_amount.toFixed(2) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Refund Amount -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('vendors.refundAmount') }} *
            </label>
            <input 
              v-model.number="form.refund_amount" 
              type="number" 
              step="0.01" 
              :max="maxRefundAmount"
              required 
              class="input mt-1"
              placeholder="0.00"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum refundable: ₹{{ maxRefundAmount.toFixed(2) }}
            </p>
          </div>

          <!-- Refund Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('vendors.refundDate') }} *
            </label>
            <input v-model="form.refund_date" type="date" required class="input mt-1" />
          </div>

          <!-- Payment Account -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Refund Account *
            </label>
            <select v-model="form.account" required class="input mt-1">
              <option value="">Select an account</option>
              <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                {{ account.name }} ({{ account.type.replace('_', ' ') }}) - ₹{{ account.current_balance.toFixed(2) }}
              </option>
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Account balance will be credited with the refund amount
            </p>
          </div>

          <!-- Refund Method -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('vendors.refundMethod') }} *
            </label>
            <select v-model="form.refund_method" required class="input mt-1">
              <option value="">Select method</option>
              <option value="cash">{{ t('vendors.refundMethods.cash') }}</option>
              <option value="bank_transfer">{{ t('vendors.refundMethods.bank_transfer') }}</option>
              <option value="cheque">{{ t('vendors.refundMethods.cheque') }}</option>
              <option value="adjustment">{{ t('vendors.refundMethods.adjustment') }}</option>
              <option value="other">{{ t('vendors.refundMethods.other') }}</option>
            </select>
          </div>

          <!-- Reference -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('common.reference') }}
            </label>
            <input 
              v-model="form.reference" 
              type="text" 
              class="input mt-1"
              placeholder="Transaction reference, check number, etc."
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('common.notes') }}
            </label>
            <textarea 
              v-model="form.notes" 
              class="input mt-1" 
              rows="3" 
              placeholder="Additional notes about this refund..."
            ></textarea>
          </div>

          <!-- Confirmation -->
          <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <div class="flex">
              <AlertTriangle class="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
              <div class="text-sm">
                <h4 class="font-medium text-yellow-800 dark:text-yellow-300">Confirm Refund</h4>
                <p class="text-yellow-700 dark:text-yellow-400 mt-1">
                  This will process a refund of ₹{{ form.refund_amount.toFixed(2) }} and update the account balance. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex space-x-3 pt-4">
            <button 
              type="submit" 
              :disabled="loading || form.refund_amount <= 0 || form.refund_amount > maxRefundAmount" 
              class="flex-1 btn-primary bg-purple-600 hover:bg-purple-700"
            >
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              <DollarSign v-else class="mr-2 h-4 w-4" />
              Process Refund
            </button>
            <button type="button" @click="$emit('close')" class="flex-1 btn-outline">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { X, DollarSign, AlertTriangle, Loader2 } from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import {
  vendorRefundService,
  type VendorReturn,
  type Account
} from '../../services/pocketbase';

interface Props {
  returnData?: VendorReturn | null;
  accounts: Account[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  save: [];
}>();

const { t } = useI18n();

// Form data
const form = reactive({
  refund_amount: 0,
  refund_date: new Date().toISOString().split('T')[0],
  refund_method: '',
  account: '',
  reference: '',
  notes: ''
});

const loading = ref(false);

// Computed properties
const activeAccounts = computed(() => {
  return props.accounts.filter(account => account.is_active);
});

const maxRefundAmount = computed(() => {
  if (!props.returnData) return 0;
  const totalReturn = props.returnData.total_return_amount || 0;
  const alreadyRefunded = props.returnData.actual_refund_amount || 0;
  return totalReturn - alreadyRefunded;
});

// Initialize form
onMounted(() => {
  form.refund_amount = maxRefundAmount.value;
});

// Methods
const handleSubmit = async () => {
  if (!props.returnData?.id) return;

  loading.value = true;
  try {
    await vendorRefundService.create({
      vendor_return: props.returnData.id,
      vendor: props.returnData.vendor,
      account: form.account,
      refund_amount: form.refund_amount,
      refund_date: form.refund_date,
      refund_method: form.refund_method as 'cash' | 'bank_transfer' | 'cheque' | 'adjustment' | 'other',
      reference: form.reference,
      notes: form.notes
    });

    emit('save');
  } catch (error) {
    console.error('Error processing refund:', error);
  } finally {
    loading.value = false;
  }
};
</script>