<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="$emit('close')"
    @keydown.esc="$emit('close')" tabindex="-1">
    <div
      class="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      @click.stop>
      <div class="mt-3">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ editingQuotation ? t('quotations.editQuotation') : t('quotations.addQuotation') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('quotations.multiItemSubtitle') }}
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
              <div :class="[
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                currentStep > index
                  ? 'bg-green-500 text-white'
                  : currentStep === index
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
              ]">
                {{ index + 1 }}
              </div>
              <span :class="[
                'ml-2 text-sm font-medium',
                currentStep >= index
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              ]">
                {{ step }}
              </span>
              <div v-if="index < steps.length - 1" class="ml-4 h-px w-8 bg-gray-200 dark:bg-gray-600"></div>
            </div>
          </div>
        </div>

        <!-- Step Content -->
        <div class="min-h-80">
          <!-- Step 1: Quotation Info -->
          <div v-if="currentStep === 0" class="space-y-6">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('quotations.steps.quotationInfo') }}</h4>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {{ t('common.vendor') }} *
                </label>
                <VendorSearchBox
                  ref="vendorInputRef"
                  v-model="quotationForm.vendor"
                  :vendors="vendors"
                  :deliveries="deliveries"
                  :service-bookings="serviceBookings"
                  :payments="payments"
                  :placeholder="t('forms.selectVendor')"
                  :autofocus="true"
                  :required="true"
                  @vendor-selected="handleVendorSelected"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {{ t('quotations.validUntil') }}
                </label>
                <input v-model="quotationForm.valid_until" type="date" class="input" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('common.status') }} *
              </label>
              <select v-model="quotationForm.status" required class="input">
                <option value="pending">{{ t('common.pending') }}</option>
                <option value="approved">{{ t('common.approved') }}</option>
                <option value="rejected">{{ t('common.rejected') }}</option>
                <option value="expired">{{ t('common.expired') }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('common.notes') }}
              </label>
              <textarea
                v-model="quotationForm.notes"
                class="input"
                rows="3"
                :placeholder="t('quotations.additionalNotes')"
              ></textarea>
            </div>
          </div>

          <!-- Step 2: Items -->
          <div v-if="currentStep === 1" class="space-y-6">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ t('quotations.steps.addItems') }}
                <span v-if="completedQuotationItems.length > 0"
                  class="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({{ completedQuotationItems.length }} {{ completedQuotationItems.length === 1 ? t('common.item') : t('common.items') }})
                </span>
              </h4>
            </div>

            <!-- New Item Form (Always at top) -->
            <div v-if="newItemForm"
              class="border-2 border-dashed border-primary-300 dark:border-primary-600 rounded-lg p-1">
              <div class="text-sm font-medium text-primary-600 dark:text-primary-400 mb-3 px-3 pt-3">
                {{ t('quotations.newItem') }}
              </div>
              <QuotationItemRow
                :key="newItemForm.tempId"
                :item="newItemForm"
                :index="-1"
                :items="items"
                :used-items="usedItemIds"
                @update="updateNewItem"
                @remove="cancelNewItem"
                @create-new-item="handleCreateNewItem"
                ref="newItemRowRef"
              />
              <div class="flex justify-end space-x-2 p-3">
                <button @click="cancelNewItem" class="btn-outline text-sm" v-if="completedQuotationItems.length > 0">
                  {{ t('common.cancel') }}
                </button>
                <button
                  @click="saveNewItem"
                  :disabled="!isNewItemValid"
                  class="btn-primary text-sm"
                  :class="{ 'opacity-50 cursor-not-allowed': !isNewItemValid }"
                >
                  <Plus class="mr-2 h-4 w-4" />
                  {{ t('quotations.addItem') }}
                </button>
              </div>
            </div>

            <!-- Completed Items List -->
            <div v-if="completedQuotationItems.length > 0" class="space-y-4">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2">
                {{ t('quotations.addedItems') }}
              </div>
              <QuotationItemRow
                v-for="item in completedQuotationItems"
                :key="item.tempId"
                :item="item"
                :index="quotationItems.indexOf(item)"
                :items="items"
                :used-items="usedItemIds"
                @update="updateQuotationItem"
                @remove="removeQuotationItem"
                @create-new-item="handleCreateNewItem"
              />
            </div>
          </div>

          <!-- Step 3: Review -->
          <div v-if="currentStep === 2" class="space-y-6">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('quotations.steps.review') }}</h4>

            <!-- Quotation Information -->
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h5 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('quotations.steps.quotationInfo') }}</h5>
              <div class="space-y-2 text-sm">
                <div><strong>{{ t('common.vendor') }}:</strong> {{ getVendorName(quotationForm.vendor) }}</div>
                <div v-if="quotationForm.valid_until">
                  <strong>{{ t('quotations.validUntil') }}:</strong> {{ formatDate(quotationForm.valid_until) }}
                </div>
                <div><strong>{{ t('common.status') }}:</strong> {{ t(`common.${quotationForm.status}`) }}</div>
                <div v-if="quotationForm.notes">
                  <strong>{{ t('common.notes') }}:</strong> {{ quotationForm.notes }}
                </div>
              </div>
            </div>

            <!-- Items Summary -->
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h5 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('quotations.itemsSummary') }}</h5>
              <div class="space-y-2 text-sm">
                <div v-for="item in activeQuotationItems" :key="item.tempId" class="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                  <div>
                    <span class="font-medium">{{ getItemName(item.item) }}</span>
                    <div class="text-gray-500 dark:text-gray-400 text-xs">
                      {{ getItemUnit(item.item) }}
                      <span v-if="item.minimum_quantity"> | {{ t('quotations.minimumQuantity') }}: {{ item.minimum_quantity }}</span>
                    </div>
                    <div v-if="item.notes" class="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      {{ item.notes }}
                    </div>
                  </div>
                  <span class="font-semibold text-green-600 dark:text-green-400">₹{{ item.unit_price.toFixed(2) }}/{{ getItemUnit(item.item) }}</span>
                </div>
              </div>
              <div class="mt-4 pt-3 border-t border-gray-300 dark:border-gray-500">
                <div class="text-sm text-gray-600 dark:text-gray-300">
                  {{ t('quotations.totalItems') }}: <strong>{{ activeQuotationItems.length }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-600">
          <div class="flex items-center space-x-3">
            <button v-if="currentStep > 0" @click="previousStep" class="btn-outline" :disabled="loading">
              <ArrowLeft class="mr-2 h-4 w-4" />
              {{ t('common.back') }}
            </button>
            <div v-if="currentStep > 0" class="hidden md:block text-xs text-gray-500 dark:text-gray-400">
              Shift + ←
            </div>
          </div>

          <div class="flex items-center space-x-4">
            <!-- Keyboard shortcut hint for item creation -->
            <div v-if="currentStep === 1 && newItemForm"
              class="hidden md:block text-xs text-gray-500 dark:text-gray-400">
              Ctrl + Enter to add item
            </div>

            <!-- Keyboard shortcut hint for quotation creation -->
            <div v-if="currentStep === 2 && canSubmit && !loading"
              class="hidden md:block text-xs text-gray-500 dark:text-gray-400">
              Ctrl + Enter to create
            </div>

            <div class="flex space-x-3">
              <button @click="$emit('close')" class="btn-outline" :disabled="loading">
                {{ t('common.cancel') }}
              </button>

              <button v-if="currentStep < steps.length - 1" @click="nextStep"
                :disabled="!canProceedToNextStep || loading" class="btn-primary"
                :class="{ 'opacity-50 cursor-not-allowed': !canProceedToNextStep || loading }">
                {{ t('common.next') }}
                <ArrowRight class="ml-2 h-4 w-4" />
              </button>

              <button v-else @click="saveQuotations" :disabled="loading || !canSubmit"
                class="btn-primary bg-green-600 hover:bg-green-700"
                :class="{ 'opacity-50 cursor-not-allowed': loading || !canSubmit }">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                <CheckCircle v-else class="mr-2 h-4 w-4" />
                {{ editingQuotation ? t('common.update') : t('common.create') }}
              </button>
            </div>

            <div v-if="currentStep < steps.length - 1" class="hidden md:block text-xs text-gray-500 dark:text-gray-400">
              Shift + →
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Create Modal -->
    <ItemCreateModal
      :show="showItemCreateModal"
      :initial-name="newItemName"
      @close="closeItemCreateModal"
      @created="handleItemCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import {
  X, ArrowLeft, ArrowRight, CheckCircle, Loader2, Plus
} from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import { useToast } from '../../composables/useToast';
import { useModalState } from '../../composables/useModalState';
import QuotationItemRow from './QuotationItemRow.vue';
import ItemCreateModal from '../ItemCreateModal.vue';
import VendorSearchBox from '../VendorSearchBox.vue';
import {
  quotationService,
  vendorService,
  itemService,
  paymentService,
  serviceBookingService,
  deliveryService,
  type Quotation,
  type Vendor,
  type Item,
  type Payment,
  type ServiceBooking,
  type Delivery
} from '../../services/pocketbase';

interface Props {
  editingQuotation?: Quotation;
}

interface QuotationItemForm {
  tempId: string;
  id?: string;
  item: string;
  unit_price: number;
  minimum_quantity?: number;
  notes?: string;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [quotations: Quotation[]];
  saved: [quotations: Quotation[]];
}>();

const { t } = useI18n();
const { success, error } = useToast();
const { openModal, closeModal } = useModalState();

// Component state
const currentStep = ref(0);
const loading = ref(false);
const vendors = ref<Vendor[]>([]);
const items = ref<Item[]>([]);
const payments = ref<Payment[]>([]);
const serviceBookings = ref<ServiceBooking[]>([]);
const deliveries = ref<Delivery[]>([]);
const vendorInputRef = ref<InstanceType<typeof VendorSearchBox>>();
const showItemCreateModal = ref(false);
const newItemName = ref('');

// Steps
const steps = computed(() => [
  t('quotations.steps.quotationInfo'),
  t('quotations.steps.items'),
  t('quotations.steps.review')
]);

// Form data
const quotationForm = reactive({
  vendor: '',
  valid_until: '',
  notes: '',
  status: 'pending' as 'pending' | 'approved' | 'rejected' | 'expired'
});

const quotationItems = ref<QuotationItemForm[]>([]);
const newItemForm = ref<QuotationItemForm | null>(null);
const newItemRowRef = ref();

// Computed properties
const usedItemIds = computed(() => {
  return quotationItems.value
    .filter(item => !item.isDeleted)
    .map(item => item.item)
    .filter(Boolean);
});

const activeQuotationItems = computed(() => {
  return quotationItems.value.filter(item => !item.isDeleted);
});

const completedQuotationItems = computed(() => {
  return quotationItems.value.filter(item => !item.isDeleted);
});

const isNewItemValid = computed(() => {
  if (!newItemForm.value) return false;
  return newItemForm.value.item !== '' && newItemForm.value.unit_price > 0;
});

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 0: // Quotation Info
      return quotationForm.vendor !== '';
    case 1: // Items
      return activeQuotationItems.value.length > 0 &&
        activeQuotationItems.value.every(item =>
          item.item !== '' && item.unit_price > 0
        );
    default:
      return true;
  }
});

const canSubmit = computed(() => {
  return canProceedToNextStep.value && activeQuotationItems.value.length > 0;
});

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const getVendorName = (vendorId: string) => {
  const vendor = vendors.value.find(v => v.id === vendorId);
  return vendor?.contact_person || 'Unknown Vendor';
};

const getItemName = (itemId: string) => {
  const item = items.value.find(i => i.id === itemId);
  return item?.name || 'Unknown Item';
};

const getItemUnit = (itemId: string) => {
  const item = items.value.find(i => i.id === itemId);
  return item?.unit || 'units';
};

const addNewItem = async () => {
  if (newItemForm.value) return;

  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  newItemForm.value = {
    tempId,
    item: '',
    unit_price: 0,
    minimum_quantity: undefined,
    notes: '',
    isNew: true,
    isModified: false,
    isDeleted: false
  };

  await nextTick();
  newItemRowRef.value?.focusItemSelector();
};

const updateNewItem = (_index: number, updatedItem: QuotationItemForm) => {
  newItemForm.value = { ...updatedItem };
};

const saveNewItem = async () => {
  if (!newItemForm.value || !isNewItemValid.value) return;

  quotationItems.value.push({ ...newItemForm.value });

  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  newItemForm.value = {
    tempId,
    item: '',
    unit_price: 0,
    minimum_quantity: undefined,
    notes: '',
    isNew: true,
    isModified: false,
    isDeleted: false
  };

  await nextTick();
  newItemRowRef.value?.focusItemSelector();
};

const cancelNewItem = () => {
  if (completedQuotationItems.value.length > 0) {
    newItemForm.value = null;
  }
};

const updateQuotationItem = (index: number, updatedItem: QuotationItemForm) => {
  quotationItems.value[index] = { ...updatedItem };
};

const removeQuotationItem = async (index: number) => {
  const item = quotationItems.value[index];

  if (item.id && !item.isNew) {
    item.isDeleted = true;
    item.isModified = true;
  } else {
    quotationItems.value.splice(index, 1);
  }

  if (completedQuotationItems.value.length === 0 && !newItemForm.value) {
    await addNewItem();
  }
};

const handleCreateNewItem = (searchQuery: string) => {
  newItemName.value = searchQuery;
  showItemCreateModal.value = true;
};

const closeItemCreateModal = () => {
  showItemCreateModal.value = false;
  newItemName.value = '';
};

const handleItemCreated = async (newItem: Item) => {
  items.value.push(newItem);
  closeItemCreateModal();

  if (newItemForm.value) {
    updateNewItem(-1, {
      ...newItemForm.value,
      item: newItem.id!
    });
  }
};

const handleVendorSelected = (vendor: Vendor) => {
  quotationForm.vendor = vendor.id!;
};

// Keyboard shortcuts
const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  if (event.shiftKey && event.key === 'ArrowRight') {
    event.preventDefault();
    if (canProceedToNextStep.value && currentStep.value < steps.value.length - 1) {
      nextStep();
    }
    return;
  }

  if (event.shiftKey && event.key === 'ArrowLeft') {
    event.preventDefault();
    if (currentStep.value > 0) {
      previousStep();
    }
    return;
  }

  if (event.ctrlKey && event.key === 'Enter' && currentStep.value === 1) {
    event.preventDefault();
    if (newItemForm.value && isNewItemValid.value) {
      saveNewItem();
    }
    return;
  }

  if (event.ctrlKey && event.key === 'Enter' && currentStep.value === 2) {
    event.preventDefault();
    if (canSubmit.value && !loading.value) {
      saveQuotations();
    }
    return;
  }
};

const nextStep = async () => {
  if (canProceedToNextStep.value && currentStep.value < steps.value.length - 1) {
    currentStep.value++;

    if (currentStep.value === 1) {
      await nextTick();
      setTimeout(() => {
        newItemRowRef.value?.focusItemSelector();
      }, 50);
    }
  }
};

const previousStep = async () => {
  if (currentStep.value > 0) {
    currentStep.value--;

    if (currentStep.value === 0) {
      await nextTick();
      setTimeout(() => {
        vendorInputRef.value?.focus();
      }, 50);
    }
  }
};

const saveQuotations = async () => {
  if (!canSubmit.value) return;

  loading.value = true;
  try {
    const savedQuotations: Quotation[] = [];

    if (props.editingQuotation) {
      // Update existing quotation
      const item = activeQuotationItems.value[0];
      const quotationData: Partial<Quotation> = {
        vendor: quotationForm.vendor,
        item: item.item,
        quotation_type: 'item',
        unit_price: item.unit_price,
        status: quotationForm.status
      };

      if (item.minimum_quantity) {
        quotationData.minimum_quantity = item.minimum_quantity;
      }
      if (quotationForm.valid_until) {
        quotationData.valid_until = quotationForm.valid_until;
      }
      if (item.notes || quotationForm.notes) {
        quotationData.notes = [quotationForm.notes, item.notes].filter(Boolean).join('\n');
      }

      const updated = await quotationService.update(props.editingQuotation.id!, quotationData);
      savedQuotations.push(updated);

      success(t('messages.updateSuccess', { item: t('quotations.title') }));
      emit('success', savedQuotations);
    } else {
      // Create new quotations - one per item
      for (const item of activeQuotationItems.value) {
        const quotationData: Omit<Quotation, 'id' | 'site'> = {
          vendor: quotationForm.vendor,
          item: item.item,
          quotation_type: 'item',
          unit_price: item.unit_price,
          status: quotationForm.status
        };

        if (item.minimum_quantity) {
          quotationData.minimum_quantity = item.minimum_quantity;
        }
        if (quotationForm.valid_until) {
          quotationData.valid_until = quotationForm.valid_until;
        }
        if (item.notes || quotationForm.notes) {
          quotationData.notes = [quotationForm.notes, item.notes].filter(Boolean).join('\n');
        }

        const created = await quotationService.create(quotationData);
        savedQuotations.push(created);
      }

      success(t('messages.createSuccess', { item: `${savedQuotations.length} ${t('quotations.title')}` }));

      // Reset form for another entry
      resetForm();
      emit('saved', savedQuotations);
    }
  } catch (err) {
    console.error('Error saving quotations:', err);
    error(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const resetForm = async () => {
  currentStep.value = 0;
  quotationForm.valid_until = '';
  quotationForm.notes = '';
  quotationForm.status = 'pending';
  // Keep vendor for convenience

  quotationItems.value = [];
  await addNewItem();

  await nextTick();
  setTimeout(() => {
    vendorInputRef.value?.focus();
  }, 50);
};

const loadData = async () => {
  try {
    const [vendorsData, itemsData, paymentsData, serviceBookingsData, deliveriesData] = await Promise.all([
      vendorService.getAll(),
      itemService.getAll(),
      paymentService.getAll(),
      serviceBookingService.getAll(),
      deliveryService.getAll()
    ]);

    vendors.value = vendorsData;
    items.value = itemsData;
    payments.value = paymentsData;
    serviceBookings.value = serviceBookingsData;
    deliveries.value = deliveriesData;

    if (props.editingQuotation) {
      Object.assign(quotationForm, {
        vendor: props.editingQuotation.vendor,
        valid_until: props.editingQuotation.valid_until || '',
        notes: props.editingQuotation.notes || '',
        status: props.editingQuotation.status
      });

      // Add the single item to the items list
      if (props.editingQuotation.item) {
        quotationItems.value = [{
          tempId: 'edit_0',
          id: props.editingQuotation.id,
          item: props.editingQuotation.item,
          unit_price: props.editingQuotation.unit_price,
          minimum_quantity: props.editingQuotation.minimum_quantity,
          notes: '',
          isNew: false,
          isModified: false,
          isDeleted: false
        }];
      }
    } else {
      await addNewItem();
    }
  } catch (err) {
    console.error('Error loading data:', err);
    error(t('messages.error'));
  }
};

// Initialize
onMounted(async () => {
  loadData();
  openModal('multi-item-quotation-modal');

  await nextTick();
  setTimeout(() => {
    vendorInputRef.value?.focus();
  }, 100);

  useEventListener('keydown', handleKeyboardShortcuts);
});

onUnmounted(() => {
  closeModal('multi-item-quotation-modal');
});
</script>
