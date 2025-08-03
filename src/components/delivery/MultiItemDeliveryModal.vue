<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="$emit('close')" @keydown.esc="$emit('close')" tabindex="-1">
    <div class="relative top-4 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" @click.stop>
      <div class="mt-3">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ editingDelivery ? t('delivery.editDelivery') : t('delivery.recordDelivery') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('delivery.multiItemSubtitle') }}
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
          <!-- Step 1: Delivery Info -->
          <div v-if="currentStep === 0" class="space-y-6">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('delivery.deliveryInfo') }}</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('common.vendor') }} *</label>
                <select ref="vendorInputRef" v-model="deliveryForm.vendor" required class="input" >
                  <option value="">{{ t('forms.selectVendor') }}</option>
                  <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                    {{ vendor.contact_person }} | {{ vendor.name }}
                  </option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('delivery.deliveryDate') }} *</label>
                <input v-model="deliveryForm.delivery_date" type="date" required class="input" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('delivery.deliveryReference') }}</label>
              <input 
                v-model="deliveryForm.delivery_reference" 
                type="text" 
                class="input" 
                :placeholder="t('delivery.deliveryReferencePlaceholder')"
              />
            </div>


            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('common.notes') }}</label>
              <textarea 
                v-model="deliveryForm.notes" 
                class="input" 
                rows="3" 
                :placeholder="t('forms.deliveryNotes')"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('delivery.photos') }}</label>
              
              <!-- Existing Photos Display -->
              <div v-if="existingPhotos.length > 0" class="mb-4">
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ t('delivery.existingPhotos') }}</p>
                <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                  <div 
                    v-for="(photo, index) in existingPhotos" 
                    :key="photo"
                    class="relative group flex-shrink-0"
                  >
                    <img
                      :src="getPhotoUrl(props.editingDelivery!.id!, photo)"
                      :alt="`Existing photo ${index + 1}`"
                      class="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-75 transition-opacity hover:scale-105"
                      @click="openPhotoGallery(index)"
                    />
                    <div class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        @click.stop="removeExistingPhoto(index)"
                        class="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                        :title="t('common.deleteAction')"
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Add New Photos -->
              <FileUploadComponent
                v-model="selectedFilesForUpload"
                accept-types="image/*"
                :multiple="true"
                :allow-camera="true"
                @files-selected="handleFilesSelected"
              />
            </div>
          </div>

          <!-- Step 2: Items -->
          <div v-if="currentStep === 1" class="space-y-6">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900 dark:text-white">{{ t('delivery.addItems') }}</h4>
              <button 
                @click="addNewItem" 
                class="btn-primary"
                :disabled="!canAddMoreItems"
              >
                <Plus class="mr-2 h-4 w-4" />
                {{ t('delivery.addItem') }}
              </button>
            </div>

            <div v-if="activeDeliveryItems.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
              {{ t('delivery.noItemsAdded') }}
            </div>

            <div v-else class="space-y-4">
              <DeliveryItemRow
                v-for="item in activeDeliveryItems"
                :key="item.tempId"
                :item="item"
                :index="deliveryItems.indexOf(item)"
                :items="items"
                :used-items="usedItemIds"
                @update="updateDeliveryItem"
                @remove="removeDeliveryItem"
              />
            </div>

            <!-- Delivery Totals -->
            <div v-if="activeDeliveryItems.length > 0" class="border-t border-gray-200 dark:border-gray-600 pt-4 mt-6">
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('delivery.deliveryTotals') }}</h5>
                <div class="space-y-2 text-sm">
                  <div v-for="item in activeDeliveryItems" :key="item.tempId" class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">
                      {{ getItemName(item.item) }} ({{ item.quantity }} {{ getItemUnit(item.item) }})
                    </span>
                    <span class="text-gray-900 dark:text-white font-medium">
                      ₹{{ item.total_amount.toFixed(2) }}
                    </span>
                  </div>
                  <div class="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <div class="flex justify-between font-medium">
                      <span class="text-gray-900 dark:text-white">{{ t('common.total') }}:</span>
                      <span class="text-gray-900 dark:text-white">₹{{ totalAmount.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Review -->
          <div v-if="currentStep === 2" class="space-y-6">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('delivery.reviewDelivery') }}</h4>

            <!-- Delivery Information -->
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h5 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('delivery.deliveryInfo') }}</h5>
              <div class="space-y-2 text-sm">
                <div><strong>{{ t('common.vendor') }}:</strong> {{ getVendorName(deliveryForm.vendor) }}</div>
                <div><strong>{{ t('delivery.deliveryDate') }}:</strong> {{ formatDate(deliveryForm.delivery_date) }}</div>
                <div v-if="deliveryForm.delivery_reference">
                  <strong>{{ t('delivery.deliveryReference') }}:</strong> {{ deliveryForm.delivery_reference }}
                </div>
                <div v-if="deliveryForm.notes">
                  <strong>{{ t('common.notes') }}:</strong> {{ deliveryForm.notes }}
                </div>
              </div>
            </div>

            <!-- Items Summary -->
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h5 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('delivery.itemsSummary') }}</h5>
              <div class="space-y-2 text-sm">
                <div v-for="item in activeDeliveryItems" :key="item.tempId" class="flex justify-between">
                  <span>{{ getItemName(item.item) }} ({{ item.quantity }} {{ getItemUnit(item.item) }} @ ₹{{ item.unit_price }}/{{ getItemUnit(item.item) }})</span>
                  <span class="font-medium">₹{{ item.total_amount.toFixed(2) }}</span>
                </div>
                <div class="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                  <div class="flex justify-between font-medium text-base">
                    <span class="text-gray-900 dark:text-white">{{ t('common.total') }}:</span>
                    <span class="text-gray-900 dark:text-white">₹{{ totalAmount.toFixed(2) }}</span>
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
              @click="saveDelivery" 
              :disabled="loading || !canSubmit"
              class="btn-primary bg-green-600 hover:bg-green-700"
            >
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              <CheckCircle v-else class="mr-2 h-4 w-4" />
              {{ editingDelivery ? t('common.update') : t('common.create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Image Slider -->
    <ImageSlider
      v-model:show="showPhotoGallery"
      :images="existingPhotos.map(photo => getPhotoUrl(props.editingDelivery!.id!, photo))"
      :initial-index="galleryIndex"
      @close="showPhotoGallery = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { 
  X, ArrowLeft, ArrowRight, CheckCircle, Loader2, Plus
} from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import { useToast } from '../../composables/useToast';
import { useModalState } from '../../composables/useModalState';
import FileUploadComponent from '../FileUploadComponent.vue';
import DeliveryItemRow from './DeliveryItemRow.vue';
import ImageSlider from '../ImageSlider.vue';
import {
  deliveryService,
  deliveryItemService,
  vendorService,
  itemService,
  type Delivery,
  type Vendor,
  type Item
} from '../../services/pocketbase';

interface Props {
  editingDelivery?: Delivery;
}

interface DeliveryItemForm {
  tempId: string;
  id?: string; // Actual database ID for existing items
  item: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  notes?: string;
  isNew?: boolean; // Track if this is a new item
  isModified?: boolean; // Track if this item was modified
  isDeleted?: boolean; // Track if this item should be deleted
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [delivery: Delivery];
  saved: [delivery: Delivery];
}>();

const { t } = useI18n();
const { success, error } = useToast();
const { openModal, closeModal } = useModalState();

// Component state
const currentStep = ref(0);
const loading = ref(false);
const vendors = ref<Vendor[]>([]);
const items = ref<Item[]>([]);
const vendorInputRef = ref<HTMLInputElement>();
const selectedFilesForUpload = ref<File[]>([]);
const existingPhotos = ref<string[]>([]);
const showPhotoGallery = ref(false);
const galleryIndex = ref(0);

// Steps
const steps = [
  t('delivery.steps.deliveryInfo'),
  t('delivery.steps.items'),
  t('delivery.steps.review')
];

// Form data
const deliveryForm = reactive<Omit<Delivery, 'id' | 'site' | 'created' | 'updated' | 'total_amount' | 'expand' | 'payment_status' | 'paid_amount'>>({
  vendor: '',
  delivery_date: new Date().toISOString().split('T')[0],
  delivery_reference: '',
  photos: [],
  notes: ''
});

const deliveryItems = ref<DeliveryItemForm[]>([]);
const originalDeliveryItems = ref<DeliveryItemForm[]>([]); // Track original items for comparison

// Computed properties
const totalAmount = computed(() => {
  return deliveryItems.value
    .filter(item => !item.isDeleted)
    .reduce((total, item) => total + item.total_amount, 0);
});

const usedItemIds = computed(() => {
  return deliveryItems.value
    .filter(item => !item.isDeleted)
    .map(item => item.item)
    .filter(Boolean);
});

const canAddMoreItems = computed(() => {
  const activeItems = deliveryItems.value.filter(item => !item.isDeleted);
  return activeItems.length < items.value.length;
});

const activeDeliveryItems = computed(() => {
  return deliveryItems.value.filter(item => !item.isDeleted);
});

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 0: // Delivery Info
      return deliveryForm.vendor !== '' && deliveryForm.delivery_date !== '';
    case 1: // Items
      return activeDeliveryItems.value.length > 0 && 
             activeDeliveryItems.value.every(item => 
               item.item !== '' && item.quantity > 0 && item.unit_price > 0
             );
    default:
      return true;
  }
});

const canSubmit = computed(() => {
  return canProceedToNextStep.value && totalAmount.value > 0;
});

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const getVendorName = (vendorId: string) => {
  const vendor = vendors.value.find(v => v.id === vendorId);
  return vendor?.name || 'Unknown Vendor';
};

const getItemName = (itemId: string) => {
  const item = items.value.find(i => i.id === itemId);
  return item?.name || 'Unknown Item';
};

const getItemUnit = (itemId: string) => {
  const item = items.value.find(i => i.id === itemId);
  return item?.unit || 'units';
};

const addNewItem = () => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  deliveryItems.value.push({
    tempId,
    item: '',
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    notes: '',
    isNew: true,
    isModified: false,
    isDeleted: false
  });
};

const updateDeliveryItem = (index: number, updatedItem: DeliveryItemForm) => {
  const originalItem = originalDeliveryItems.value.find(item => item.tempId === updatedItem.tempId);
  
  // Mark as modified if values changed from original
  if (originalItem && !updatedItem.isNew) {
    const hasChanges = originalItem.item !== updatedItem.item ||
                     originalItem.quantity !== updatedItem.quantity ||
                     originalItem.unit_price !== updatedItem.unit_price ||
                     originalItem.notes !== updatedItem.notes;
    updatedItem.isModified = hasChanges;
  }
  
  deliveryItems.value[index] = { ...updatedItem };
};

const removeDeliveryItem = (index: number) => {
  const item = deliveryItems.value[index];
  
  // If it's an existing item (has an ID), mark for deletion instead of removing
  if (item.id && !item.isNew) {
    item.isDeleted = true;
    item.isModified = true;
  } else {
    // If it's a new item, just remove it from the array
    deliveryItems.value.splice(index, 1);
  }
};

const handleFilesSelected = (files: File[]) => {
  selectedFilesForUpload.value = files;
};

const getPhotoUrl = (deliveryId: string, filename: string) => {
  return `${import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'}/api/files/deliveries/${deliveryId}/${filename}`;
};

const openPhotoGallery = (index: number) => {
  galleryIndex.value = index;
  showPhotoGallery.value = true;
};

const removeExistingPhoto = (index: number) => {
  existingPhotos.value.splice(index, 1);
};

const nextStep = () => {
  if (canProceedToNextStep.value && currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
};

const handleDeliveryItemChanges = async (deliveryId: string) => {
  // Handle deleted items using batch delete
  const deletedItems = deliveryItems.value.filter(item => item.isDeleted && item.id && !item.isNew);
  if (deletedItems.length > 0) {
    const idsToDelete = deletedItems.map(item => item.id!);
    await deliveryItemService.deleteMultiple(idsToDelete);
  }

  // Handle modified existing items using batch update
  const modifiedItems = deliveryItems.value.filter(item => item.isModified && item.id && !item.isNew && !item.isDeleted);
  if (modifiedItems.length > 0) {
    const updates = modifiedItems.map(item => ({
      id: item.id!,
      data: {
        item: item.item,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        notes: item.notes
      }
    }));
    
    await deliveryItemService.updateMultiple(updates);
  }

  // Handle new items using batch create (already using createMultiple)
  const newItems = deliveryItems.value.filter(item => item.isNew && !item.isDeleted);
  if (newItems.length > 0) {
    const newItemsData = newItems.map(item => ({
      item: item.item,
      quantity: item.quantity,
      unit_price: item.unit_price,
      notes: item.notes
    }));
    
    await deliveryItemService.createMultiple(deliveryId, newItemsData);
  }
};

const saveDelivery = async () => {
  if (!canSubmit.value) return;

  loading.value = true;
  try {
    // Prepare delivery data - preserve existing photos unless they were removed
    const deliveryData = {
      vendor: deliveryForm.vendor,
      delivery_date: deliveryForm.delivery_date,
      delivery_reference: deliveryForm.delivery_reference,
      notes: deliveryForm.notes,
      total_amount: totalAmount.value
    } as Partial<Delivery>;
    
    // For edits, handle existing photo changes (removals)
    if (props.editingDelivery) {
      const originalPhotoCount = (props.editingDelivery.photos || []).length;
      const currentPhotoCount = existingPhotos.value.length;
      
      // If photos were removed, update the delivery with remaining photos
      if (currentPhotoCount !== originalPhotoCount) {
        deliveryData.photos = existingPhotos.value;
      }
    }
    
    // Only set payment status for new deliveries - existing ones keep their current status
    if (!props.editingDelivery) {
      deliveryData.payment_status = 'pending';
      deliveryData.paid_amount = 0;
      // Don't set photos to empty array - let PocketBase handle initialization
    }

    // Create or update delivery
    let delivery: Delivery;
    if (props.editingDelivery) {
      delivery = await deliveryService.update(props.editingDelivery.id!, deliveryData);
    } else {
      delivery = await deliveryService.create(deliveryData as Omit<Delivery, 'id' | 'site' | 'created' | 'updated' | 'expand'>);
    }

    // Handle delivery items for edit mode
    if (props.editingDelivery) {
      // Process delivery item changes
      await handleDeliveryItemChanges(delivery.id!);
    } else {
      // Create delivery items for new delivery
      const newItemsData = deliveryItems.value
        .filter(item => !item.isDeleted)
        .map(item => ({
          item: item.item,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes
        }));
      
      if (newItemsData.length > 0) {
        await deliveryItemService.createMultiple(delivery.id!, newItemsData);
      }
    }

    // Upload new photos if any (after main delivery update)
    if (selectedFilesForUpload.value.length > 0) {
      try {
        const uploadedPhotos = await deliveryService.uploadPhotos(delivery.id!, selectedFilesForUpload.value);
        console.log(`Successfully uploaded ${uploadedPhotos.length} of ${selectedFilesForUpload.value.length} photos`);
        
        // For editing, we need to fetch the updated delivery to get the final photo list
        if (props.editingDelivery) {
          // Update the existingPhotos list to reflect all photos (old + new)
          existingPhotos.value = [...existingPhotos.value, ...uploadedPhotos];
        }
      } catch (uploadError) {
        console.error('Error uploading photos:', uploadError);
        // Continue with delivery save even if photo upload fails, but inform user
        error(t('delivery.photoUploadError'));
      }
    }

    success(props.editingDelivery ? t('messages.updateSuccess', { item: 'Delivery' }) : t('messages.createSuccess', { item: 'Delivery' }));
    
    // If creating a new delivery, reset the form for another entry
    if (!props.editingDelivery) {
      resetForm();
      emit('saved', delivery);
    } else {
      emit('success', delivery);
    }
  } catch (err) {
    console.error('Error saving delivery:', err);
    error(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  // Reset to step 0
  currentStep.value = 0;
  
  // Reset delivery form but keep vendor and date for convenience
  deliveryForm.delivery_reference = '';
  deliveryForm.notes = '';
  
  // Clear items and add one empty item
  deliveryItems.value = [];
  addNewItem();
  
  // Clear selected files
  selectedFilesForUpload.value = [];

  vendorInputRef.value?.focus();
};

const loadData = async () => {
  try {
    const [vendorsData, itemsData] = await Promise.all([
      vendorService.getAll(),
      itemService.getAll()
    ]);
    
    vendors.value = vendorsData;
    items.value = itemsData;

    // If editing, populate form
    if (props.editingDelivery) {
      Object.assign(deliveryForm, {
        vendor: props.editingDelivery.vendor,
        delivery_date: new Date(props.editingDelivery.delivery_date).toISOString().split('T')[0],
        delivery_reference: props.editingDelivery.delivery_reference,
        notes: props.editingDelivery.notes
      });
      
      // Load existing photos
      existingPhotos.value = [...(props.editingDelivery.photos || [])];

      // Load delivery items if editing
      if (props.editingDelivery.expand?.delivery_items) {
        deliveryItems.value = props.editingDelivery.expand.delivery_items.map((item, index) => ({
          tempId: `edit_${index}`,
          id: item.id,
          item: item.item,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          notes: item.notes,
          isNew: false,
          isModified: false,
          isDeleted: false
        }));
        
        // Store a deep copy of original items for comparison
        originalDeliveryItems.value = JSON.parse(JSON.stringify(deliveryItems.value));
      }
    } else {
      // Add one empty item for new deliveries
      addNewItem();
    }
  } catch (err) {
    console.error('Error loading data:', err);
    error(t('messages.error'));
  }
};

// Initialize
onMounted(() => {
  loadData();
  vendorInputRef.value?.focus();
  openModal('multi-item-delivery-modal');
});

onUnmounted(() => {
  closeModal('multi-item-delivery-modal');
});
</script>