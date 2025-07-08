<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="$emit('close')" @keydown.esc="$emit('close')" tabindex="-1">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" @click.stop>
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ isEdit ? t('vendors.editReturn') : t('vendors.createReturn') }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Vendor Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('common.vendor') }} *
            </label>
            <select v-model="form.vendor" required class="input mt-1" autofocus>
              <option value="">Select a vendor</option>
              <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                {{ vendor.name || vendor.contact_person || 'Unnamed Vendor' }}
              </option>
            </select>
          </div>

          <!-- Return Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('vendors.returnDate') }} *
            </label>
            <input v-model="form.return_date" type="date" required class="input mt-1" />
          </div>

          <!-- Return Reason -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('vendors.returnReason') }} *
            </label>
            <select v-model="form.reason" required class="input mt-1">
              <option value="">Select a reason</option>
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
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('vendors.returnItems') }} *
              </label>
              <button 
                type="button" 
                @click="addReturnItem" 
                class="btn-outline text-sm py-1 px-2"
                :disabled="!form.vendor || loadingDeliveryItems"
              >
                <Loader2 v-if="loadingDeliveryItems" class="h-3 w-3 mr-1 animate-spin" />
                <Plus v-else class="h-3 w-3 mr-1" />
                {{ loadingDeliveryItems ? 'Loading...' : 'Add Item' }}
              </button>
            </div>

            <div v-if="returnItems.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              No items selected. Click "Add Item" to select items to return.
            </div>

            <div v-else class="space-y-3">
              <div 
                v-for="(item, index) in returnItems" 
                :key="index"
                class="border border-gray-200 dark:border-gray-600 rounded-lg p-3"
              >
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ item.delivery_item_data?.expand?.item?.name || 'Unknown Item' }}
                  </h4>
                  <button 
                    type="button" 
                    @click="removeReturnItem(index)"
                    class="text-red-600 hover:text-red-500"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Available Quantity
                    </label>
                    <div class="text-sm text-gray-900 dark:text-white">
                      {{ item.delivery_item_data?.quantity || 0 }} {{ item.delivery_item_data?.expand?.item?.unit || 'units' }}
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      {{ t('vendors.quantityReturned') }} *
                    </label>
                    <input 
                      v-model.number="item.quantity_returned" 
                      type="number" 
                      step="0.01" 
                      :max="item.delivery_item_data?.quantity || 0"
                      required 
                      class="input text-sm" 
                      @input="updateReturnAmount(index)"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Return Rate (per unit)
                    </label>
                    <input 
                      v-model.number="item.return_rate" 
                      type="number" 
                      step="0.01" 
                      required 
                      class="input text-sm"
                      @input="updateReturnAmount(index)"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      {{ t('vendors.itemCondition') }} *
                    </label>
                    <select v-model="item.condition" required class="input text-sm">
                      <option value="">Select condition</option>
                      <option value="unopened">{{ t('vendors.itemConditions.unopened') }}</option>
                      <option value="opened">{{ t('vendors.itemConditions.opened') }}</option>
                      <option value="damaged">{{ t('vendors.itemConditions.damaged') }}</option>
                      <option value="used">{{ t('vendors.itemConditions.used') }}</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Return Amount
                    </label>
                    <div class="text-sm font-medium text-gray-900 dark:text-white py-2">
                      ₹{{ item.return_amount.toFixed(2) }}
                    </div>
                  </div>
                </div>

                <div class="mt-3">
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Item Notes
                  </label>
                  <textarea 
                    v-model="item.item_notes" 
                    class="input text-sm" 
                    rows="2" 
                    placeholder="Additional notes about this item..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Return Amount -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('vendors.totalReturnAmount') }}
              </span>
              <span class="text-lg font-bold text-gray-900 dark:text-white">
                ₹{{ totalReturnAmount.toFixed(2) }}
              </span>
            </div>
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
              placeholder="Additional notes about this return..."
            ></textarea>
          </div>

          <!-- Photo Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Photos (Optional)
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

          <!-- Actions -->
          <div class="flex space-x-3 pt-4">
            <button type="submit" :disabled="loading || returnItems.length === 0" class="flex-1 btn-primary">
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ isEdit ? t('common.update') : t('common.create') }}
            </button>
            <button type="button" @click="$emit('close')" class="flex-1 btn-outline">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delivery Items Selection Modal -->
    <div v-if="showItemSelection" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]" @click="showItemSelection = false" @keydown.esc="showItemSelection = false">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" @click.stop>
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Select Items to Return</h3>
            <button @click="showItemSelection = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div 
              v-for="item in availableDeliveryItems" 
              :key="item.id"
              class="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              @click="selectDeliveryItem(item)"
            >
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ item.expand?.item?.name || 'Unknown Item' }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Delivered: {{ formatDate(item.expand?.delivery?.delivery_date || '') }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Qty: {{ item.quantity }} {{ item.expand?.item?.unit || 'units' }} @ ₹{{ item.unit_price }}
                  </div>
                </div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  ₹{{ item.total_amount.toFixed(2) }}
                </div>
              </div>
            </div>

            <div v-if="loadingDeliveryItems" class="text-center py-8 text-gray-500 dark:text-gray-400">
              <Loader2 class="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading delivery items...
            </div>
            <div v-else-if="availableDeliveryItems.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
              No delivered items found for this vendor.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { X, Plus, Trash2, Loader2 } from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import {
  vendorReturnService,
  vendorReturnItemService,
  deliveryItemService,
  getCurrentSiteId,
  type VendorReturn,
  type Vendor,
  type DeliveryItem
} from '../../services/pocketbase';
import FileUploadComponent from '../FileUploadComponent.vue';

interface Props {
  isEdit: boolean;
  returnData?: VendorReturn | null;
  vendors: Vendor[];
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

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  save: [];
}>();

const { t } = useI18n();

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

// Computed properties
const availableDeliveryItems = computed(() => {
  if (!form.vendor) return [];
  
  return vendorDeliveryItems.value.filter(item => {
    // Exclude already selected items
    const isNotSelected = !returnItems.value.some(ri => ri.delivery_item === item.id);
    return isNotSelected;
  });
});

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
  } catch (error) {
    console.error('Error fetching delivery items for vendor:', error);
    vendorDeliveryItems.value = [];
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

const handlePhotosSelected = (files: File[]) => {
  // FileUploadComponent emits File[], but we need to store file names or handle uploads
  // For now, we'll store file names as placeholder
  form.photos = files.map(file => file.name);
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
    
    const returnData = {
      ...form,
      reason: form.reason as 'damaged' | 'wrong_item' | 'excess_delivery' | 'quality_issue' | 'specification_mismatch' | 'other'
    };
    
    if (props.isEdit && props.returnData?.id) {
      vendorReturn = await vendorReturnService.update(props.returnData.id, returnData);
    } else {
      vendorReturn = await vendorReturnService.create(returnData);
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

    emit('save');
  } catch (error) {
    console.error('Error saving return:', error);
  } finally {
    loading.value = false;
  }
};
</script>