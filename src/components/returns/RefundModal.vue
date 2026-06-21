<template>
  <!-- Overlay: bottom-sheet on mobile, centered dialog on desktop -->
  <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm">
    <!-- Panel -->
    <div
      class="w-full sm:max-w-lg bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      @click.stop
    >
      <!-- Grab handle (mobile only) -->
      <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden flex-shrink-0" />

      <!-- Sticky header -->
      <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div class="flex-1 min-w-0">
          <h3 class="font-display text-lg font-semibold text-ink dark:text-cream truncate">
            {{ t('vendors.processRefund') }}
          </h3>
        </div>
        <button
          @click="$emit('close')"
          class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors flex-shrink-0 active:scale-[0.98]"
          :aria-label="t('common.close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Scrollable body -->
      <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto overscroll-contain scroll-smooth-touch">
        <div class="px-5 sm:px-6 py-5 space-y-5">
          <!-- Return Summary -->
          <div class="bg-cream-2 dark:bg-ink-2 rounded-xl p-4">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
              {{ t('vendors.returnSummary') }}
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-stone-500 dark:text-stone-400">{{ t('vendors.returnId') }}</span>
                <span class="text-ink dark:text-cream font-mono sw-tabular">#{{ returnData?.id?.slice(-6) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-stone-500 dark:text-stone-400">{{ t('common.vendor') }}</span>
                <span class="text-ink dark:text-cream font-medium">
                  {{ returnData?.expand?.vendor?.contact_person || returnData?.expand?.vendor?.name || t('common.unknownVendor') }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-stone-500 dark:text-stone-400">{{ t('vendors.returnAmount') }}</span>
                <span class="text-ink dark:text-cream font-mono sw-tabular font-semibold">
                  ₹{{ returnData?.total_return_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </span>
              </div>
              <div v-if="returnData?.actual_refund_amount" class="flex justify-between items-center">
                <span class="text-stone-500 dark:text-stone-400">{{ t('vendors.alreadyRefunded') }}</span>
                <span class="text-forest-600 dark:text-forest-400 font-mono sw-tabular font-semibold">
                  ₹{{ returnData.actual_refund_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Processing Option Choice -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
              {{ t('vendors.processingOption') }} *
            </label>
            <div class="space-y-3">
              <div class="flex items-start space-x-3">
                <input
                  id="credit_note"
                  v-model="form.processing_option"
                  type="radio"
                  value="credit_note"
                  required
                  class="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-stone-300 dark:border-ink-4"
                />
                <label for="credit_note" class="flex-1 cursor-pointer">
                  <div class="text-sm font-medium text-ink dark:text-cream">
                    {{ t('vendors.processingOptions.creditNote') }}
                  </div>
                  <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {{ t('vendors.processingOptions.creditNoteDesc') }}
                  </div>
                </label>
              </div>
              <div class="flex items-start space-x-3">
                <input
                  id="refund"
                  v-model="form.processing_option"
                  type="radio"
                  value="refund"
                  required
                  class="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-stone-300 dark:border-ink-4"
                />
                <label for="refund" class="flex-1 cursor-pointer">
                  <div class="text-sm font-medium text-ink dark:text-cream">
                    {{ t('vendors.processingOptions.directRefund') }}
                  </div>
                  <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {{ t('vendors.processingOptions.directRefundDesc') }}
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Refund Amount (always shown) -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ form.processing_option === 'credit_note' ? t('vendors.creditAmount') : t('vendors.refundAmount') }} *
            </label>
            <input
              v-model.number="form.refund_amount"
              type="number"
              step="0.01"
              :max="maxRefundAmount"
              required
              class="input mt-1 font-mono sw-tabular min-h-[44px]"
              placeholder="0.00"
            />
            <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {{ form.processing_option === 'credit_note' ? t('vendors.maximumCredit') : t('vendors.maximumRefundable') }}: <span class="font-mono sw-tabular">₹{{ maxRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
            </p>
          </div>

          <!-- Credit Note Fields (only for credit_note option) -->
          <div v-if="form.processing_option === 'credit_note'" class="space-y-4">
            <!-- Credit Note Expiry -->
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('vendors.creditNoteExpiry') }}
              </label>
              <input v-model="form.expiry_date" type="date" class="input mt-1 min-h-[44px]" />
              <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {{ t('vendors.leaveEmptyNoExpiry') }}
              </p>
            </div>

            <!-- Credit Note Reference -->
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('vendors.creditNoteReference') }}
              </label>
              <input
                v-model="form.credit_reference"
                type="text"
                class="input mt-1 min-h-[44px]"
                placeholder="CN-2024-001"
              />
              <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {{ t('vendors.autoGeneratedIfEmpty') }}
              </p>
            </div>
          </div>

          <!-- Refund Fields (only for refund option) -->
          <div v-if="form.processing_option === 'refund'" class="space-y-4">
            <!-- Refund Date -->
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('vendors.refundDate') }} *
              </label>
              <input v-model="form.refund_date" type="date" :required="form.processing_option === 'refund'" class="input mt-1 min-h-[44px]" />
            </div>

            <!-- Payment Account -->
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('vendors.refundAccount') }} *
              </label>
              <select v-model="form.account" :required="form.processing_option === 'refund'" class="input mt-1 min-h-[44px]">
                <option value="">{{ t('common.select') }}</option>
                <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                  {{ account.name }} ({{ account.type.replace('_', ' ') }}) - ₹{{ account.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </option>
              </select>
              <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {{ t('vendors.accountBalanceCredited') }}
              </p>
            </div>

            <!-- Refund Method -->
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {{ t('vendors.refundMethod') }} *
              </label>
              <select v-model="form.refund_method" :required="form.processing_option === 'refund'" class="input mt-1 min-h-[44px]">
                <option value="">{{ t('common.select') }}</option>
                <option value="cash">{{ t('vendors.refundMethods.cash') }}</option>
                <option value="bank_transfer">{{ t('vendors.refundMethods.bank_transfer') }}</option>
                <option value="cheque">{{ t('vendors.refundMethods.cheque') }}</option>
                <option value="adjustment">{{ t('vendors.refundMethods.adjustment') }}</option>
                <option value="other">{{ t('vendors.refundMethods.other') }}</option>
              </select>
            </div>
          </div>

          <!-- Reference -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ t('common.reference') }}
            </label>
            <input
              v-model="form.reference"
              type="text"
              class="input mt-1 min-h-[44px]"
              :placeholder="t('vendors.refundTransactionPlaceholder')"
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ t('common.notes') }}
            </label>
            <textarea
              v-model="form.notes"
              class="input mt-1"
              rows="3"
              :placeholder="t('vendors.additionalRefundNotes')"
            ></textarea>
          </div>

          <!-- Confirmation banner -->
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <div class="flex gap-3">
              <AlertTriangle class="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div class="text-sm min-w-0">
                <h4 class="font-medium text-amber-800 dark:text-amber-300 mb-1">
                  {{ form.processing_option === 'credit_note' ? t('vendors.confirmCreditNoteTitle') : t('vendors.confirmRefundTitle') }}
                </h4>
                <p class="text-amber-700 dark:text-amber-400">
                  <span v-if="form.processing_option === 'credit_note'">
                    {{ t('vendors.confirmCreditNoteBody', { amount: form.refund_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }) }}
                  </span>
                  <span v-else>
                    {{ t('vendors.confirmRefundBody', { amount: form.refund_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }) }}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      <!-- Sticky footer -->
      <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex-shrink-0">
        <button
          type="button"
          @click="$emit('close')"
          class="btn-outline min-h-[44px] active:scale-[0.98]"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          :disabled="loading || form.refund_amount <= 0 || form.refund_amount > maxRefundAmount"
          class="flex-1 btn-primary min-h-[44px] active:scale-[0.98]"
          @click.prevent="handleSubmit"
        >
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          <DollarSign v-else class="mr-2 h-4 w-4" />
          {{ form.processing_option === 'credit_note' ? t('vendors.createCreditNote') : t('vendors.processRefund') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { X, DollarSign, AlertTriangle, Loader2 } from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import { useModalEscape } from '../../composables/useModalEscape';
import {
  vendorRefundService,
  vendorCreditNoteService,
  vendorReturnService,
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

// ESC key handling for modal
useModalEscape(() => emit('close'))

// Form data
const form = reactive({
  processing_option: 'refund' as 'refund' | 'credit_note', // Default to refund option
  refund_amount: 0,
  refund_date: new Date().toISOString().split('T')[0],
  refund_method: '',
  account: '',
  reference: '',
  notes: '',
  // Credit note specific fields
  expiry_date: '',
  credit_reference: ''
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
    if (form.processing_option === 'credit_note') {
      // Create credit note
      await vendorCreditNoteService.create({
        vendor: props.returnData.vendor,
        credit_amount: form.refund_amount,
        balance: form.refund_amount, // Initial balance equals credit amount
        issue_date: new Date().toISOString(),
        expiry_date: form.expiry_date || undefined,
        reference: form.credit_reference || undefined,
        reason: `Credit for return #${props.returnData.id?.slice(-6)}`,
        return_id: props.returnData.id,
        status: 'active'
      });
    } else {
      // If switching to refund and a credit note was previously created, delete it
      if (props.returnData.processing_option === 'credit_note') {
        try {
          // Find and delete any existing credit note for this return
          const existingCreditNotes = await vendorCreditNoteService.getByReturn(props.returnData.id);
          for (const creditNote of existingCreditNotes) {
            // Only delete if the credit note hasn't been used (balance equals original amount)
            if (creditNote.balance === creditNote.credit_amount) {
              await vendorCreditNoteService.delete(creditNote.id!);
            }
          }
        } catch (error) {
          console.warn('Error checking/deleting existing credit notes:', error);
          // Continue with refund processing even if credit note deletion fails
        }
      }

      // Create refund record
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
    }

    // Update return record with processing option and completion status
    await vendorReturnService.update(props.returnData.id, {
      processing_option: form.processing_option,
      actual_refund_amount: form.refund_amount,
      status: form.processing_option === 'credit_note' ? 'completed' : 'refunded',
      completion_date: new Date().toISOString()
    });

    emit('save');
  } catch (error) {
    console.error('Error processing return:', error);
  } finally {
    loading.value = false;
  }
};
</script>
