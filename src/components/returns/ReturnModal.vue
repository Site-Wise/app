<template>
  <!-- Overlay: bottom-sheet on mobile, centered dialog on desktop -->
  <div
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm"
    @click="$emit('close')"
  >
    <!-- Panel -->
    <div
      class="w-full sm:max-w-2xl bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      @click.stop
    >
      <!-- Grab handle (mobile only) -->
      <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden flex-shrink-0" />

      <!-- Sticky header -->
      <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div class="flex-1 min-w-0">
          <h3 class="font-display text-lg font-semibold text-ink dark:text-cream truncate">
            {{ isEdit ? t('vendors.editReturn') : t('vendors.createReturn') }}
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
          <!-- Vendor Selection -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ t('common.vendor') }} *
            </label>
            <VendorSearchBox
              ref="vendorSearchRef"
              v-model="form.vendor"
              :vendors="vendors"
              :deliveries="deliveries"
              :service-bookings="serviceBookings"
              :payments="payments"
              :placeholder="t('search.vendors')"
              :required="true"
              :autofocus="true"
              class="mt-1"
            />
          </div>

          <!-- Return Date -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ t('vendors.returnDate') }} *
            </label>
            <input v-model="form.return_date" type="date" required class="input mt-1 min-h-[44px]" />
          </div>

          <!-- Return Reason -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ t('vendors.returnReason') }} *
            </label>
            <select v-model="form.reason" required class="input mt-1 min-h-[44px]">
              <option value="">{{ t('vendors.selectReason') }}</option>
              <option value="damaged">{{ t('vendors.returnReasons.damaged') }}</option>
              <option value="wrong_item">{{ t('vendors.returnReasons.wrong_item') }}</option>
              <option value="excess_delivery">{{ t('vendors.returnReasons.excess_delivery') }}</option>
              <option value="quality_issue">{{ t('vendors.returnReasons.quality_issue') }}</option>
              <option value="specification_mismatch">{{ t('vendors.returnReasons.specification_mismatch') }}</option>
              <option value="other">{{ t('vendors.returnReasons.other') }}</option>
            </select>
          </div>

          <!-- Return Items -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                {{ t('vendors.returnItems') }} *
              </label>
              <button
                type="button"
                @click="addReturnItem"
                class="btn-outline text-sm py-1.5 px-3 flex items-center min-h-[36px] active:scale-[0.98]"
                :disabled="!form.vendor || loadingDeliveryItems"
              >
                <Loader2 v-if="loadingDeliveryItems" class="h-3 w-3 mr-1.5 animate-spin" />
                <Plus v-else class="h-3 w-3 mr-1.5" />
                {{ loadingDeliveryItems ? t('common.loading') : t('vendors.addItem') }}
              </button>
            </div>

            <div v-if="returnItems.length === 0" class="text-sm text-stone-500 dark:text-stone-400 py-6 text-center border-2 border-dashed border-stone-300 dark:border-ink-4 rounded-xl">
              {{ t('vendors.noItemsSelected') }}
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(item, index) in returnItems"
                :key="index"
                class="border border-stone-200 dark:border-ink-4 rounded-xl p-4"
              >
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-sm font-medium text-ink dark:text-cream">
                    {{ item.delivery_item_data?.expand?.item?.name || t('common.unknown') }}
                  </h4>
                  <button
                    type="button"
                    @click="removeReturnItem(index)"
                    class="text-clay-600 dark:text-clay-400 hover:text-clay-700 dark:hover:text-clay-300 min-h-touch min-w-[44px] inline-flex items-center justify-center rounded active:scale-[0.98]"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                      {{ t('vendors.availableQuantity') }}
                    </label>
                    <div class="text-sm text-ink dark:text-cream font-mono sw-tabular">
                      {{ getAvailableQuantity(item.delivery_item, item.delivery_item_data?.quantity || 0) }} {{ item.delivery_item_data?.expand?.item?.unit || t('vendors.units') }}
                    </div>
                    <div v-if="deliveryItemsReturnInfo[item.delivery_item]?.totalReturned > 0" class="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      ({{ deliveryItemsReturnInfo[item.delivery_item].totalReturned }} {{ t('vendors.alreadyReturned') }})
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                      {{ t('vendors.quantityReturned') }} *
                    </label>
                    <input
                      v-model.number="item.quantity_returned"
                      type="number"
                      step="0.01"
                      :max="getAvailableQuantity(item.delivery_item, item.delivery_item_data?.quantity || 0)"
                      required
                      class="input text-sm font-mono sw-tabular min-h-[44px]"
                      @input="updateReturnAmount(index)"
                      autocomplete="off"
                      autocorrect="off"
                      autocapitalize="off"
                      spellcheck="false"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                      {{ t('vendors.returnRatePerUnit') }}
                    </label>
                    <input
                      v-model.number="item.return_rate"
                      type="number"
                      step="0.01"
                      required
                      class="input text-sm font-mono sw-tabular min-h-[44px]"
                      @input="updateReturnAmount(index)"
                      autocomplete="off"
                      autocorrect="off"
                      autocapitalize="off"
                      spellcheck="false"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                      {{ t('vendors.itemCondition') }} *
                    </label>
                    <select v-model="item.condition" required class="input text-sm min-h-[44px]">
                      <option value="">{{ t('common.select') }}</option>
                      <option value="unopened">{{ t('vendors.itemConditions.unopened') }}</option>
                      <option value="opened">{{ t('vendors.itemConditions.opened') }}</option>
                      <option value="damaged">{{ t('vendors.itemConditions.damaged') }}</option>
                      <option value="used">{{ t('vendors.itemConditions.used') }}</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                      {{ t('vendors.returnAmount') }}
                    </label>
                    <div class="text-sm font-medium text-ink dark:text-cream font-mono sw-tabular min-h-[44px] flex items-center">
                      ₹{{ item.return_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </div>
                  </div>
                </div>

                <div class="mt-3">
                  <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                    {{ t('vendors.itemNotes') }}
                  </label>
                  <textarea
                    v-model="item.item_notes"
                    class="input text-sm"
                    rows="2"
                    :placeholder="t('vendors.additionalItemNotes')"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Return Amount -->
          <div class="bg-cream-2 dark:bg-ink-2 rounded-xl p-4">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-stone-600 dark:text-stone-300">
                {{ t('vendors.totalReturnAmount') }}
              </span>
              <span class="text-lg font-semibold font-display text-ink dark:text-cream font-mono sw-tabular">
                ₹{{ totalReturnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
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
              :placeholder="t('vendors.additionalReturnNotes')"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
            ></textarea>
          </div>

          <!-- Photo Upload -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {{ t('vendors.photosOptional') }}
            </label>
            <div class="mt-1">
              <FileUploadComponent
                v-model="uploadedFiles"
                accept="image/*"
                multiple
                :max-files="5"
                @files-selected="handlePhotosSelected"
              />
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
          type="submit"
          form=""
          :disabled="loading || returnItems.length === 0"
          class="flex-1 btn-primary min-h-[44px] active:scale-[0.98]"
          @click.prevent="handleSubmit"
        >
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ loading ? (isEdit ? t('common.updating') : t('common.creating')) : (isEdit ? t('common.update') : t('common.create')) }}
        </button>
      </div>
    </div>

    <!-- Delivery Items Selection Modal (nested bottom-sheet) -->
    <div
      v-if="showItemSelection"
      class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-ink/60"
      @click="showItemSelection = false"
      @keydown.esc="showItemSelection = false"
    >
      <div
        class="w-full sm:max-w-md bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[85vh] sm:max-h-[75vh] flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- Grab handle (mobile only) -->
        <div class="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4 sm:hidden flex-shrink-0" />

        <!-- Header -->
        <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <div class="flex-1 min-w-0">
            <h3 class="font-display text-lg font-semibold text-ink dark:text-cream truncate">
              {{ t('vendors.selectItemsToReturn') }}
            </h3>
          </div>
          <button
            @click="showItemSelection = false"
            class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors flex-shrink-0 active:scale-[0.98]"
            :aria-label="t('common.close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Item list body -->
        <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 space-y-2">
          <div
            v-for="item in availableDeliveryItems"
            :key="item.id"
            class="p-4 border border-stone-200 dark:border-ink-4 rounded-xl hover:bg-cream-2 dark:hover:bg-ink-2 cursor-pointer transition-colors active:scale-[0.99] min-h-[44px]"
            @click="selectDeliveryItem(item)"
          >
            <div class="flex justify-between items-start gap-3">
              <div class="min-w-0">
                <div class="text-sm font-medium text-ink dark:text-cream truncate">
                  {{ item.expand?.item?.name || t('common.unknown') }}
                </div>
                <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {{ t('vendors.deliveredOn') }} {{ formatDate(item.expand?.delivery?.delivery_date || '') }}
                </div>
                <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {{ t('vendors.available') }} <span class="font-mono sw-tabular">{{ getAvailableQuantity(item.id!, item.quantity) }}</span> {{ item.expand?.item?.unit || t('vendors.units') }} @ <span class="font-mono sw-tabular">₹{{ item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                </div>
                <div v-if="deliveryItemsReturnInfo[item.id!]?.totalReturned > 0" class="text-xs text-clay-600 dark:text-clay-400 mt-0.5">
                  ({{ deliveryItemsReturnInfo[item.id!].totalReturned }} {{ t('common.of') }} {{ item.quantity }} {{ t('vendors.alreadyReturned') }})
                </div>
              </div>
              <div class="text-sm font-medium text-ink dark:text-cream font-mono sw-tabular flex-shrink-0">
                ₹{{ item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </div>
            </div>
          </div>

          <div v-if="loadingDeliveryItems" class="text-center py-10 text-stone-500 dark:text-stone-400">
            <Loader2 class="h-6 w-6 animate-spin mx-auto mb-2" />
            <p class="text-sm">{{ t('vendors.loadingDeliveryItems') }}</p>
          </div>
          <div v-else-if="availableDeliveryItems.length === 0" class="text-center py-10 text-stone-500 dark:text-stone-400">
            <p class="text-sm">{{ t('vendors.noDeliveredItemsFound') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { X, Plus, Trash2, Loader2 } from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import { useModalEscape } from '../../composables/useModalEscape';
import { useToast } from '../../composables/useToast';
import {
  vendorReturnService,
  vendorReturnItemService,
  deliveryItemService,
  getCurrentSiteId,
  type VendorReturn,
  type Vendor,
  type DeliveryItem,
  type Delivery,
  type ServiceBooking,
  type Payment
} from '../../services/pocketbase';
import FileUploadComponent from '../FileUploadComponent.vue';
import VendorSearchBox from '../VendorSearchBox.vue';

interface Props {
  isEdit: boolean;
  returnData?: VendorReturn | null;
  vendors: Vendor[];
  deliveries?: Delivery[];
  serviceBookings?: ServiceBooking[];
  payments?: Payment[];
}

interface ReturnItemForm {
  delivery_item: string;
  delivery_item_data?: DeliveryItem;
  quantity_returned: number;
  return_rate: number;
  return_amount: number;
  condition: string;
  item_notes: string;
}

const props = withDefaults(defineProps<Props>(), {
  deliveries: () => [],
  serviceBookings: () => [],
  payments: () => []
});
const emit = defineEmits<{
  close: [];
  save: [];
}>();

const { t } = useI18n();
const toast = useToast();

// ESC key handling for modal (defers to the nested item-selection modal when it's open)
useModalEscape(() => emit('close'), () => !showItemSelection.value);

// Refs - used in template via ref="vendorSearchRef"
const vendorSearchRef = ref<InstanceType<typeof VendorSearchBox> | null>(null);

// Autofocus the first field (vendor picker) when the modal mounts. The bound
// :autofocus attribute does not fire for dynamically-inserted modal content,
// so focus it explicitly after the DOM is ready.
onMounted(async () => {
  await nextTick();
  if (typeof vendorSearchRef.value?.focus === 'function') {
    vendorSearchRef.value.focus();
  }
});

// Form data
const form = reactive({
  vendor: '',
  return_date: new Date().toISOString().split('T')[0],
  reason: '' as '' | 'damaged' | 'wrong_item' | 'excess_delivery' | 'quality_issue' | 'specification_mismatch' | 'other',
  notes: '',
  photos: [] as string[],
  status: 'initiated' as const,
  total_return_amount: 0
});

// Separate state for file uploads
const uploadedFiles = ref<File[]>([]);

const returnItems = ref<ReturnItemForm[]>([]);
const loading = ref(false);
const showItemSelection = ref(false);
const vendorDeliveryItems = ref<DeliveryItem[]>([]);
const loadingDeliveryItems = ref(false);
const deliveryItemsReturnInfo = ref<Record<string, {
  totalReturned: number;
  availableForReturn: number;
  returns: Array<{
    id: string;
    returnDate: string;
    quantityReturned: number;
    status: string;
    reason: string;
  }>;
}>>({});

// Computed properties
const availableDeliveryItems = computed(() => {
  if (!form.vendor) return [];

  return vendorDeliveryItems.value.filter(item => {
    // Exclude already selected items
    const isNotSelected = !returnItems.value.some(ri => ri.delivery_item === item.id);

    // Exclude fully returned items
    const returnInfo = deliveryItemsReturnInfo.value[item.id!] || { availableForReturn: item.quantity };
    const hasAvailableQuantity = returnInfo.availableForReturn > 0;

    return isNotSelected && hasAvailableQuantity;
  });
});

// Helper to get available quantity for a delivery item
const getAvailableQuantity = (deliveryItemId: string, originalQuantity: number): number => {
  const returnInfo = deliveryItemsReturnInfo.value[deliveryItemId];
  return returnInfo ? returnInfo.availableForReturn : originalQuantity;
};

const totalReturnAmount = computed(() => {
  return returnItems.value.reduce((sum, item) => sum + item.return_amount, 0);
});

// Initialize form data if editing
if (props.isEdit && props.returnData) {
  Object.assign(form, {
    vendor: props.returnData.vendor,
    return_date: props.returnData.return_date,
    reason: props.returnData.reason,
    notes: props.returnData.notes || '',
    photos: props.returnData.photos || [],
    status: props.returnData.status,
    total_return_amount: props.returnData.total_return_amount
  });
}

// Update total return amount when items change
watch(totalReturnAmount, (newTotal) => {
  form.total_return_amount = newTotal;
});

// Watch vendor selection to fetch delivery items
watch(() => form.vendor, async (newVendorId) => {
  if (newVendorId) {
    await fetchVendorDeliveryItems(newVendorId);
  } else {
    vendorDeliveryItems.value = [];
  }
  // Clear selected items when vendor changes
  returnItems.value = [];
});

// Methods
const fetchVendorDeliveryItems = async (vendorId: string) => {
  loadingDeliveryItems.value = true;
  try {
    vendorDeliveryItems.value = await deliveryItemService.getAll(vendorId);

    // Fetch return info for all delivery items
    const deliveryItemIds = vendorDeliveryItems.value.map(item => item.id!).filter(id => id);
    if (deliveryItemIds.length > 0) {
      deliveryItemsReturnInfo.value = await vendorReturnService.getReturnInfoForDeliveryItems(deliveryItemIds);
    } else {
      deliveryItemsReturnInfo.value = {};
    }
  } catch (error) {
    console.error('Error fetching delivery items for vendor:', error);
    vendorDeliveryItems.value = [];
    deliveryItemsReturnInfo.value = {};
  } finally {
    loadingDeliveryItems.value = false;
  }
};
const addReturnItem = () => {
  if (!form.vendor) return;
  showItemSelection.value = true;
};

const removeReturnItem = (index: number) => {
  returnItems.value.splice(index, 1);
};

const selectDeliveryItem = (deliveryItem: DeliveryItem) => {
  const returnItem: ReturnItemForm = {
    delivery_item: deliveryItem.id!,
    delivery_item_data: deliveryItem,
    quantity_returned: 0,
    return_rate: deliveryItem.unit_price,
    return_amount: 0,
    condition: '',
    item_notes: ''
  };

  returnItems.value.push(returnItem);
  showItemSelection.value = false;
};

const updateReturnAmount = (index: number) => {
  const item = returnItems.value[index];
  item.return_amount = item.quantity_returned * item.return_rate;
};

const handlePhotosSelected = (_files: File[]) => {
  // Files are stored in uploadedFiles via v-model
  // Actual upload happens in handleSubmit after return is created
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const handleSubmit = async () => {
  if (returnItems.value.length === 0) return;
  if (!form.reason) return; // Ensure reason is selected

  loading.value = true;
  try {
    // Create or update the vendor return
    let vendorReturn: VendorReturn;

    // Prepare return data WITHOUT photos - photos will be uploaded separately
    const returnData = {
      vendor: form.vendor,
      return_date: form.return_date,
      reason: form.reason as 'damaged' | 'wrong_item' | 'excess_delivery' | 'quality_issue' | 'specification_mismatch' | 'other',
      notes: form.notes,
      status: form.status,
      total_return_amount: form.total_return_amount
    };

    if (props.isEdit && props.returnData?.id) {
      vendorReturn = await vendorReturnService.update(props.returnData.id, returnData);
    } else {
      vendorReturn = await vendorReturnService.create(returnData);
    }

    // Upload photos if any were selected
    if (uploadedFiles.value.length > 0) {
      for (const file of uploadedFiles.value) {
        await vendorReturnService.uploadPhoto(vendorReturn.id!, file);
      }
    }

    // Create return items
    for (const item of returnItems.value) {
      await vendorReturnItemService.create({
        vendor_return: vendorReturn.id!,
        delivery_item: item.delivery_item,
        quantity_returned: item.quantity_returned,
        return_rate: item.return_rate,
        return_amount: item.return_amount,
        condition: item.condition as 'unopened' | 'opened' | 'damaged' | 'used',
        item_notes: item.item_notes,
        site: getCurrentSiteId() || ''
      });
    }

    toast.success(props.isEdit ? t('vendors.returnUpdated') : t('vendors.returnCreated'));
    emit('save');
  } catch (error) {
    console.error('Error saving return:', error);
    toast.error(t('common.errorSavingData'));
  } finally {
    loading.value = false;
  }
};
</script>
