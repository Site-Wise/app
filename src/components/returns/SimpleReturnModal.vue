<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div class="mt-3">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ t('returns.createReturn') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('returns.createReturnSubtitle') }}
            </p>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-center space-x-4">
            <div v-for="(step, index) in steps" :key="index" class="flex items-center">
              <div 
                :class="[
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                  currentStep > index 
                    ? 'bg-green-500 text-white' 
                    : currentStep === index 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                ]"
              >
                {{ index + 1 }}
              </div>
              <span 
                :class="[
                  'ml-2 text-sm font-medium',
                  currentStep >= index 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400'
                ]"
              >
                {{ step }}
              </span>
              <div v-if="index < steps.length - 1" class="ml-4 h-px w-8 bg-gray-200 dark:bg-gray-600"></div>
            </div>
          </div>
        </div>

        <!-- Step Content -->
        <div class="min-h-96">
          <!-- Step 1: Select Items -->
          <div v-if="currentStep === 0" class="space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('returns.selectItems') }}</h4>
            
            <div v-if="availableItems.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
              {{ t('returns.noItemsAvailable') }}
            </div>

            <div v-else class="space-y-3 max-h-80 overflow-y-auto">
              <div 
                v-for="item in availableItems" 
                :key="item.id"
                class="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                      <input 
                        type="checkbox" 
                        :id="`item-${item.id}`"
                        v-model="selectedItems[item.id!]"
                        @change="onItemSelectionChange(item)"
                        class="rounded border-gray-300 dark:border-gray-600"
                      />
                      <label :for="`item-${item.id}`" class="font-medium text-gray-900 dark:text-white">
                        {{ item.expand?.item?.name || 'Unknown Item' }}
                      </label>
                    </div>
                    
                    <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>{{ t('common.vendor') }}: {{ item.expand?.delivery?.expand?.vendor?.name || 'Unknown Vendor' }}</div>
                      <div>{{ t('delivery.deliveryDate') }}: {{ formatDate(item.expand?.delivery?.delivery_date || '') }}</div>
                      <div>{{ t('common.quantity') }}: {{ item.quantity }} {{ getUnitDisplay(item.expand?.item?.unit || 'units') }}</div>
                      <div>{{ t('common.total') }}: ₹{{ item.total_amount.toFixed(2) }}</div>
                    </div>

                    <!-- Quantity to Return -->
                    <div v-if="selectedItems[item.id!]" class="mt-3 bg-gray-50 dark:bg-gray-700 rounded p-3">
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ t('returns.quantityToReturn') }}
                      </label>
                      <input 
                        type="number" 
                        :min="0" 
                        :max="getAvailableQuantity(item.id!)"
                        v-model.number="returnQuantities[item.id!]"
                        class="input w-32"
                        :placeholder="getAvailableQuantity(item.id!).toString()"
                        @input="validateReturnQuantity(item.id!)"
                      />
                      <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        / {{ getAvailableQuantity(item.id!) }} {{ getUnitDisplay(item.expand?.item?.unit || 'units') }} available
                      </span>
                      <div v-if="returnedQuantities[item.id!] > 0" class="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {{ returnedQuantities[item.id!] }} {{ getUnitDisplay(item.expand?.item?.unit || 'units') }} already returned
                      </div>
                      <div v-if="returnValidationMessages[item.id!]" class="text-xs text-red-600 dark:text-red-400 mt-1">
                        {{ returnValidationMessages[item.id!] }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Return Details -->
          <div v-if="currentStep === 1" class="space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('returns.returnDetails') }}</h4>

            <!-- Reason -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('returns.reason') }} *
              </label>
              <select v-model="returnForm.reason" required class="input" autofocus>
                <option value="">{{ t('returns.selectReason') }}</option>
                <option value="damaged">{{ t('returns.reasons.damaged') }}</option>
                <option value="wrong_item">{{ t('returns.reasons.wrong_item') }}</option>
                <option value="excess_delivery">{{ t('returns.reasons.excess_delivery') }}</option>
                <option value="quality_issue">{{ t('returns.reasons.quality_issue') }}</option>
                <option value="specification_mismatch">{{ t('returns.reasons.specification_mismatch') }}</option>
                <option value="other">{{ t('returns.reasons.other') }}</option>
              </select>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('common.notes') }}
              </label>
              <textarea 
                v-model="returnForm.notes" 
                class="input" 
                rows="3" 
                :placeholder="t('returns.notesPlaceholder')"
              ></textarea>
            </div>

            <!-- Photos -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('returns.evidencePhotos') }}
              </label>
              <FileUploadComponent 
                v-model="returnForm.photos"
                :multiple="true"
                accept="image/*"
                capture="environment"
                :max-files="5"
                class="mt-2"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ t('returns.photosHelp') }}
              </p>
            </div>
          </div>

          <!-- Step 3: Refund Type -->
          <div v-if="currentStep === 2" class="space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('returns.refundType') }}</h4>

            <!-- Return Summary -->
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h5 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('returns.returnSummary') }}</h5>
              <div class="space-y-2 text-sm">
                <div v-for="item in selectedItemsForReturn" :key="item.id" class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">
                    {{ item.expand?.item?.name }} ({{ returnQuantities[item.id!] }} {{ getUnitDisplay(item.expand?.item?.unit || 'units') }})
                  </span>
                  <span class="text-gray-900 dark:text-white font-medium">
                    ₹{{ ((item.unit_price * returnQuantities[item.id!]) || 0).toFixed(2) }}
                  </span>
                </div>
                <div class="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                  <div class="flex justify-between font-medium">
                    <span class="text-gray-900 dark:text-white">{{ t('common.total') }}:</span>
                    <span class="text-gray-900 dark:text-white">₹{{ totalReturnAmount.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Refund Options -->
            <div class="space-y-4">
              <div 
                v-for="option in refundOptions" 
                :key="option.value"
                :class="[
                  'border rounded-lg p-4 cursor-pointer transition-colors',
                  returnForm.refundType === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                ]"
                @click="returnForm.refundType = option.value"
              >
                <div class="flex items-start space-x-3">
                  <input 
                    type="radio" 
                    :value="option.value"
                    v-model="returnForm.refundType"
                    :id="`refund-${option.value}`"
                    class="mt-1"
                  />
                  <div class="flex-1">
                    <label :for="`refund-${option.value}`" class="font-medium text-gray-900 dark:text-white cursor-pointer">
                      {{ option.label }}
                    </label>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {{ option.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Split Refund Options -->
            <div v-if="returnForm.refundType === 'split'" class="mt-4 space-y-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h6 class="font-medium text-gray-900 dark:text-white">{{ t('returns.splitRefundDetails') }}</h6>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ t('returns.monetaryAmount') }}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    :max="totalReturnAmount"
                    v-model.number="returnForm.monetaryAmount"
                    class="input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ t('returns.creditAmount') }}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    :value="creditAmount"
                    readonly
                    class="input bg-gray-100 dark:bg-gray-600"
                  />
                </div>
              </div>
            </div>

            <!-- Account Selection for Monetary Refunds -->
            <div v-if="returnForm.refundType === 'monetary' || returnForm.refundType === 'split'" class="mt-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('returns.refundAccount') }} *
              </label>
              <select v-model="returnForm.account" required class="input">
                <option value="">{{ t('returns.selectAccount') }}</option>
                <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                  {{ account.name }} ({{ account.type.replace('_', ' ') }}) - ₹{{ account.current_balance.toFixed(2) }}
                </option>
              </select>
            </div>
          </div>

          <!-- Step 4: Confirmation -->
          <div v-if="currentStep === 3" class="space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('returns.confirmReturn') }}</h4>

            <!-- Confirmation Details -->
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <div class="flex">
                <AlertTriangle class="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                <div class="text-sm">
                  <h5 class="font-medium text-yellow-800 dark:text-yellow-300">{{ t('returns.confirmationWarning') }}</h5>
                  <p class="text-yellow-700 dark:text-yellow-400 mt-1">
                    {{ t('returns.confirmationDescription') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Summary -->
            <div class="space-y-4">
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h6 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('returns.returnSummary') }}</h6>
                <div class="space-y-2 text-sm">
                  <div><strong>{{ t('returns.reason') }}:</strong> {{ t(`returns.reasons.${returnForm.reason}`) }}</div>
                  <div><strong>{{ t('returns.refundType') }}:</strong> {{ getRefundTypeLabel(returnForm.refundType) }}</div>
                  <div><strong>{{ t('returns.totalAmount') }}:</strong> ₹{{ totalReturnAmount.toFixed(2) }}</div>
                  
                  <div v-if="returnForm.refundType === 'monetary' || returnForm.refundType === 'split'">
                    <strong>{{ t('returns.refundAccount') }}:</strong> {{ selectedAccount?.name }}
                  </div>
                  
                  <div v-if="returnForm.refundType === 'split'">
                    <strong>{{ t('returns.monetaryAmount') }}:</strong> ₹{{ returnForm.monetaryAmount.toFixed(2) }}
                  </div>
                  
                  <div v-if="returnForm.refundType === 'split'">
                    <strong>{{ t('returns.creditAmount') }}:</strong> ₹{{ creditAmount.toFixed(2) }}
                  </div>
                  
                  <div v-if="returnForm.notes">
                    <strong>{{ t('common.notes') }}:</strong> {{ returnForm.notes }}
                  </div>
                </div>
              </div>

              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h6 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('returns.itemsToReturn') }}</h6>
                <div class="space-y-2 text-sm">
                  <div v-for="item in selectedItemsForReturn" :key="item.id" class="flex justify-between">
                    <span>{{ item.expand?.item?.name }} ({{ returnQuantities[item.id!] }} {{ getUnitDisplay(item.expand?.item?.unit || 'units') }})</span>
                    <span>₹{{ ((item.unit_price * returnQuantities[item.id!]) || 0).toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-600">
          <button 
            v-if="currentStep > 0" 
            @click="currentStep--" 
            class="btn-outline"
            :disabled="loading"
          >
            <ArrowLeft class="mr-2 h-4 w-4" />
            {{ t('common.back') }}
          </button>
          <div v-else></div>

          <div class="flex space-x-3">
            <button @click="$emit('close')" class="btn-outline" :disabled="loading">
              {{ t('common.cancel') }}
            </button>
            
            <button 
              v-if="currentStep < steps.length - 1"
              @click="nextStep" 
              :disabled="!canProceedToNextStep || loading"
              class="btn-primary"
            >
              {{ t('common.next') }}
              <ArrowRight class="ml-2 h-4 w-4" />
            </button>
            
            <button 
              v-else
              @click="processReturn" 
              :disabled="loading || !canSubmit"
              class="btn-primary bg-green-600 hover:bg-green-700"
            >
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              <CheckCircle v-else class="mr-2 h-4 w-4" />
              {{ t('returns.processReturn') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { 
  X, ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Loader2 
} from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import { useToast } from '../../composables/useToast';
import FileUploadComponent from '../FileUploadComponent.vue';
import {
  vendorReturnService,
  vendorReturnItemService,
  vendorCreditNoteService,
  accountTransactionService,
  accountService,
  type DeliveryItem,
  type Account,
  type VendorReturn
} from '../../services/pocketbase';

interface Props {
  deliveryItems: DeliveryItem[];
  preselectedItemId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [returnData: VendorReturn];
}>();

const { t } = useI18n();
const { success, error } = useToast();

// Component state
const currentStep = ref(0);
const loading = ref(false);
const accounts = ref<Account[]>([]);
const returnedQuantities = reactive<Record<string, number>>({});
const returnValidationMessages = reactive<Record<string, string>>({});

// Steps
const steps = [
  t('returns.steps.selectItems'),
  t('returns.steps.details'),
  t('returns.steps.refundType'),
  t('returns.steps.confirm')
];

// Form data
const selectedItems = reactive<Record<string, boolean>>({});
const returnQuantities = reactive<Record<string, number>>({});

const returnForm = reactive({
  reason: '',
  notes: '',
  photos: [] as File[],
  refundType: 'monetary' as 'monetary' | 'credit' | 'split',
  account: '',
  monetaryAmount: 0
});

// Computed properties
const availableItems = computed(() => {
  return props.deliveryItems.filter(item => 
    item.expand?.delivery?.payment_status !== 'pending' && item.total_amount > 0
  );
});

const selectedItemsForReturn = computed(() => {
  return availableItems.value.filter(item => selectedItems[item.id!]);
});

const totalReturnAmount = computed(() => {
  return selectedItemsForReturn.value.reduce((total, item) => {
    const quantity = returnQuantities[item.id!] || 0;
    return total + (item.unit_price * quantity);
  }, 0);
});

const creditAmount = computed(() => {
  return totalReturnAmount.value - (returnForm.monetaryAmount || 0);
});

const activeAccounts = computed(() => {
  return accounts.value.filter(account => account.is_active);
});

const selectedAccount = computed(() => {
  return activeAccounts.value.find(account => account.id === returnForm.account);
});

const refundOptions = computed(() => [
  {
    value: 'monetary' as const,
    label: t('returns.refundTypes.monetary'),
    description: t('returns.refundTypes.monetaryDesc')
  },
  {
    value: 'credit' as const,
    label: t('returns.refundTypes.credit'),
    description: t('returns.refundTypes.creditDesc')
  },
  {
    value: 'split' as const,
    label: t('returns.refundTypes.split'),
    description: t('returns.refundTypes.splitDesc')
  }
]);

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 0: // Select Items
      return selectedItemsForReturn.value.length > 0 && 
             selectedItemsForReturn.value.every(item => {
               const quantity = returnQuantities[item.id!] || 0;
               const availableQuantity = getAvailableQuantity(item.id!);
               return quantity > 0 && quantity <= availableQuantity && !returnValidationMessages[item.id!];
             });
    case 1: // Return Details
      return returnForm.reason !== '';
    case 2: // Refund Type
      return (returnForm.refundType === 'credit' || 
              (returnForm.refundType === 'monetary' && returnForm.account !== '') ||
              (returnForm.refundType === 'split' && returnForm.account !== '' && returnForm.monetaryAmount >= 0));
    default:
      return true;
  }
});

const canSubmit = computed(() => {
  return canProceedToNextStep.value && totalReturnAmount.value > 0;
});

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const getUnitDisplay = (unit: string) => {
  const unitMap: Record<string, string> = {
    'pieces': t('units.pieces'),
    'kg': t('units.kg'),
    'tons': t('units.tons'),
    'liters': t('units.liters'),
    'meters': t('units.meters'),
    'feet': t('units.feet'),
    'units': t('units.units')
  };
  return unitMap[unit] || unit;
};

const getRefundTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'monetary': t('returns.refundTypes.monetary'),
    'credit': t('returns.refundTypes.credit'),
    'split': t('returns.refundTypes.split')
  };
  return typeMap[type] || type;
};

const getAvailableQuantity = (itemId: string): number => {
  const item = availableItems.value.find(item => item.id === itemId);
  if (!item) return 0;
  
  const originalQuantity = item.quantity;
  const alreadyReturned = returnedQuantities[itemId] || 0;
  return Math.max(0, originalQuantity - alreadyReturned);
};

const validateReturnQuantity = async (itemId: string) => {
  const requestedQuantity = returnQuantities[itemId] || 0;
  const availableQuantity = getAvailableQuantity(itemId);
  
  if (requestedQuantity <= 0) {
    returnValidationMessages[itemId] = 'Quantity must be greater than 0';
    return;
  }
  
  if (requestedQuantity > availableQuantity) {
    returnValidationMessages[itemId] = `Only ${availableQuantity} units available for return`;
    return;
  }
  
  // Clear validation message if valid
  delete returnValidationMessages[itemId];
};

const loadReturnedQuantities = async () => {
  try {
    for (const item of availableItems.value) {
      if (item.id) {
        const returnedQty = await vendorReturnService.getReturnedQuantityForItem(item.id);
        returnedQuantities[item.id] = returnedQty;
      }
    }
  } catch (err) {
    console.error('Error loading returned quantities:', err);
  }
};

const onItemSelectionChange = (item: DeliveryItem) => {
  if (selectedItems[item.id!]) {
    // Set default return quantity to available quantity when selected
    const availableQuantity = getAvailableQuantity(item.id!);
    returnQuantities[item.id!] = Math.min(item.quantity, availableQuantity);
    validateReturnQuantity(item.id!);
  } else {
    // Clear return quantity and validation when deselected
    delete returnQuantities[item.id!];
    delete returnValidationMessages[item.id!];
  }
};

const nextStep = () => {
  if (canProceedToNextStep.value && currentStep.value < steps.length - 1) {
    currentStep.value++;
    
    // Auto-set monetary amount for split refund
    if (currentStep.value === 2 && returnForm.refundType === 'split' && returnForm.monetaryAmount === 0) {
      returnForm.monetaryAmount = totalReturnAmount.value / 2;
    }
  }
};

const processReturn = async () => {
  if (!canSubmit.value) return;

  // Final validation before processing
  for (const item of selectedItemsForReturn.value) {
    const requestedQuantity = returnQuantities[item.id!];
    const result = await vendorReturnService.canReturnItem(item.id!, requestedQuantity);
    
    if (!result.canReturn) {
      error(result.message || 'Cannot process return for selected items');
      return;
    }
  }

  loading.value = true;
  try {
    // Create the vendor return record
    const vendorReturn = await vendorReturnService.create({
      vendor: selectedItemsForReturn.value[0].expand?.delivery?.vendor || '', // All items should be from same vendor
      return_date: new Date().toISOString().split('T')[0],
      reason: returnForm.reason as any,
      status: 'completed', // Process immediately
      notes: returnForm.notes,
      photos: [], // Handle photos separately if needed
      total_return_amount: totalReturnAmount.value,
      actual_refund_amount: returnForm.refundType === 'credit' ? 0 : 
                           returnForm.refundType === 'monetary' ? totalReturnAmount.value : 
                           returnForm.monetaryAmount
    });

    // Create vendor return items
    for (const item of selectedItemsForReturn.value) {
      await vendorReturnItemService.create({
        vendor_return: vendorReturn.id!,
        delivery_item: item.id!,
        quantity_returned: returnQuantities[item.id!],
        return_rate: item.unit_price,
        return_amount: item.unit_price * returnQuantities[item.id!],
        condition: 'used', // Default condition
        item_notes: ''
      });
    }

    // Process refund based on type
    if (returnForm.refundType === 'monetary') {
      // Create monetary refund transaction
      await accountTransactionService.createRefundTransaction({
        account: returnForm.account,
        amount: totalReturnAmount.value,
        vendor: vendorReturn.vendor,
        refund_date: vendorReturn.return_date,
        notes: `Refund for return #${vendorReturn.id?.slice(-6)}`,
        return_id: vendorReturn.id
      });
    } else if (returnForm.refundType === 'credit') {
      // Create credit note
      await vendorCreditNoteService.create({
        vendor: vendorReturn.vendor,
        credit_amount: totalReturnAmount.value,
        balance: totalReturnAmount.value,
        issue_date: vendorReturn.return_date,
        reason: `Return: ${returnForm.reason}`,
        return_id: vendorReturn.id,
        status: 'active'
      });
    } else if (returnForm.refundType === 'split') {
      // Create monetary refund
      if (returnForm.monetaryAmount > 0) {
        await accountTransactionService.createRefundTransaction({
          account: returnForm.account,
          amount: returnForm.monetaryAmount,
          vendor: vendorReturn.vendor,
          refund_date: vendorReturn.return_date,
          notes: `Partial refund for return #${vendorReturn.id?.slice(-6)}`,
          return_id: vendorReturn.id
        });
      }

      // Create credit note for remaining amount
      if (creditAmount.value > 0) {
        await vendorCreditNoteService.create({
          vendor: vendorReturn.vendor,
          credit_amount: creditAmount.value,
          balance: creditAmount.value,
          issue_date: vendorReturn.return_date,
          reason: `Partial credit for return: ${returnForm.reason}`,
          return_id: vendorReturn.id,
          status: 'active'
        });
      }
    }

    success(t('returns.returnProcessedSuccess'));
    emit('success', vendorReturn);
  } catch (err) {
    console.error('Error processing return:', err);
    error(t('returns.returnProcessedError'));
  } finally {
    loading.value = false;
  }
};

const loadAccounts = async () => {
  try {
    accounts.value = await accountService.getAll();
  } catch (err) {
    console.error('Error loading accounts:', err);
  }
};

// Initialize
onMounted(async () => {
  await loadAccounts();
  await loadReturnedQuantities();
  
  // Pre-select item if provided
  if (props.preselectedItemId) {
    selectedItems[props.preselectedItemId] = true;
    const item = availableItems.value.find(item => item.id === props.preselectedItemId);
    if (item) {
      onItemSelectionChange(item);
    }
  }
});
</script>