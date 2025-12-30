<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="$emit('close')"
    @keydown.esc="$emit('close')" tabindex="-1">
    <div
      class="relative top-4 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      @click.stop>
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
        <div class="min-h-96">
          <!-- Step 1: Delivery Info -->
          <div v-if="currentStep === 0" class="space-y-6">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('delivery.deliveryInfo') }}</h4>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('common.vendor') }}
                  *</label>
                <VendorSearchBox ref="vendorInputRef" v-model="deliveryForm.vendor" :vendors="vendors"
                  :deliveries="deliveries" :service-bookings="serviceBookings" :payments="payments"
                  :placeholder="t('forms.selectVendor')" :autofocus="true" :required="true"
                  @vendor-selected="handleVendorSelected" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{
                  t('delivery.deliveryDate') }} *</label>
                <input v-model="deliveryForm.delivery_date" type="date" required class="input" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{
                t('delivery.deliveryReference') }}</label>
              <input v-model="deliveryForm.delivery_reference" type="text" class="input"
                :placeholder="t('delivery.deliveryReferencePlaceholder')" />
            </div>


            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('common.notes')
              }}</label>
              <textarea v-model="deliveryForm.notes" class="input" rows="3"
                :placeholder="t('forms.deliveryNotes')"></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('delivery.photos')
              }}</label>

              <!-- Existing Photos Display -->
              <div v-if="existingPhotos.length > 0" class="mb-4">
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ t('delivery.existingPhotos') }}</p>
                <div
                  class="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                  <div v-for="(photo, index) in existingPhotos" :key="photo" class="relative group flex-shrink-0">
                    <img :src="getPhotoUrl(props.editingDelivery!.id!, photo)" :alt="`Existing photo ${index + 1}`"
                      class="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-75 transition-opacity hover:scale-105"
                      @click="openPhotoGallery(index)" />
                    <div class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" @click.stop="removeExistingPhoto(index)"
                        class="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                        :title="t('common.deleteAction')">
                        <X class="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Add New Photos -->
              <FileUploadComponent v-model="selectedFilesForUpload" accept-types="image/*,application/pdf" :multiple="true"
                :allow-camera="true" @files-selected="handleFilesSelected" />
            </div>
          </div>

          <!-- Step 2: Items -->
          <div v-if="currentStep === 1" class="space-y-6">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ t('delivery.addItems') }}
                <span v-if="completedDeliveryItems.length > 0"
                  class="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({{ completedDeliveryItems.length }} {{ completedDeliveryItems.length === 1 ? t('common.item') :
                    t('common.items') }})
                </span>
                <span v-if="itemsTotal > 0" class="ml-3 text-sm font-semibold text-green-600 dark:text-green-400">
                  • {{ t('common.total') }}: ₹{{ itemsTotal.toFixed(2) }}
                </span>
              </h4>
            </div>

            <!-- New Item Form (Always at top) -->
            <div v-if="newItemForm"
              class="border-2 border-dashed border-primary-300 dark:border-primary-600 rounded-lg p-1">
              <div class="text-sm font-medium text-primary-600 dark:text-primary-400 mb-3 px-3 pt-3">
                {{ t('deliveryForm.newItem') }}
              </div>
              <DeliveryItemRow :key="newItemForm.tempId" :item="newItemForm" :index="-1" :items="items"
                :used-items="usedItemIds" @update="updateNewItem" @remove="cancelNewItem"
                @create-new-item="handleCreateNewItem" ref="newItemRowRef" />
              <div class="flex justify-end space-x-2 p-3">
                <button @click="cancelNewItem" class="btn-outline text-sm" v-if="completedDeliveryItems.length > 0">
                  {{ t('common.cancel') }}
                </button>
                <button @click="saveNewItem" :disabled="!isNewItemValid" class="btn-primary text-sm"
                  :class="{ 'opacity-50 cursor-not-allowed': !isNewItemValid }">
                  <Plus class="mr-2 h-4 w-4" />
                  {{ t('deliveryForm.addItem') }}
                </button>
              </div>
            </div>

            <!-- This section is no longer needed as we always show a new item form -->

            <!-- Completed Items List -->
            <div v-if="completedDeliveryItems.length > 0" class="space-y-4">
              <div
                class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2">
                {{ t('deliveryForm.addedItems') }}
              </div>
              <DeliveryItemRow v-for="item in completedDeliveryItems" :key="item.tempId" :item="item"
                :index="deliveryItems.indexOf(item)" :items="items" :used-items="usedItemIds"
                @update="updateDeliveryItem" @remove="removeDeliveryItem" @create-new-item="handleCreateNewItem" />
            </div>

            <!-- Removed detailed delivery totals - now shown in header -->
          </div>

          <!-- Step 3: Review -->
          <div v-if="currentStep === 2" class="space-y-6">
            <h4 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('delivery.reviewDelivery') }}</h4>

            <!-- Delivery Information -->
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h5 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('delivery.deliveryInfo') }}</h5>
              <div class="space-y-2 text-sm">
                <div><strong>{{ t('common.vendor') }}:</strong> {{ getVendorName(deliveryForm.vendor) }}</div>
                <div><strong>{{ t('delivery.deliveryDate') }}:</strong> {{ formatDate(deliveryForm.delivery_date) }}
                </div>
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
                  <span>{{ getItemName(item.item) }} ({{ item.quantity }} {{ getItemUnit(item.item) }} @ ₹{{
                    item.unit_price }}/{{ getItemUnit(item.item) }})</span>
                  <span class="font-medium">₹{{ item.total_amount.toFixed(2) }}</span>
                </div>
                <div class="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2 space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-700 dark:text-gray-300">{{ t('delivery.itemsTotal') }}:</span>
                    <span class="text-gray-700 dark:text-gray-300">₹{{ itemsTotal.toFixed(2) }}</span>
                  </div>

                  <!-- Round-off Section -->
                  <div class="flex items-center justify-between text-sm">
                    <label class="text-gray-700 dark:text-gray-300">{{ t('delivery.roundOff') }}:</label>
                    <div class="flex items-center space-x-2">
                      <span class="text-gray-500 dark:text-gray-400">₹</span>
                      <input v-model.number="deliveryForm.rounded_off_with" type="number" step="0.01"
                        class="w-20 px-2 py-1 text-center text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        :placeholder="t('delivery.enterRoundOff')" />
                    </div>
                  </div>

                  <div
                    class="flex justify-between font-medium text-base border-t border-gray-300 dark:border-gray-500 pt-2">
                    <span class="text-gray-900 dark:text-white">{{ t('delivery.finalTotal') }}:</span>
                    <span class="text-gray-900 dark:text-white">₹{{ totalAmount.toFixed(2) }}</span>
                  </div>
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

            <!-- Keyboard shortcut hint for delivery creation -->
            <div v-if="currentStep === 2 && canSubmit && !loading"
              class="hidden md:block text-xs text-gray-500 dark:text-gray-400">
              Ctrl + Enter to create delivery
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

              <button v-else @click="saveDelivery" :disabled="loading || !canSubmit"
                class="btn-primary bg-green-600 hover:bg-green-700"
                :class="{ 'opacity-50 cursor-not-allowed': loading || !canSubmit }">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                <CheckCircle v-else class="mr-2 h-4 w-4" />
                {{ editingDelivery ? t('common.update') : t('common.create') }}
              </button>
            </div>

            <div v-if="currentStep < steps.length - 1" class="hidden md:block text-xs text-gray-500 dark:text-gray-400">
              Shift + →
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Slider -->
    <ImageSlider v-model:show="showPhotoGallery"
      :images="existingPhotos.map(photo => getPhotoUrl(props.editingDelivery!.id!, photo))"
      :initial-index="galleryIndex" @close="showPhotoGallery = false" />

    <!-- Item Create Modal -->
    <ItemCreateModal :show="showItemCreateModal" :initial-name="newItemName" @close="closeItemCreateModal"
      @created="handleItemCreated" />
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
import FileUploadComponent from '../FileUploadComponent.vue';
import DeliveryItemRow from './DeliveryItemRow.vue';
import ImageSlider from '../ImageSlider.vue';
import ItemCreateModal from '../ItemCreateModal.vue';
import VendorSearchBox from '../VendorSearchBox.vue';
import {
  deliveryService,
  deliveryItemService,
  vendorService,
  itemService,
  paymentService,
  serviceBookingService,
  type Delivery,
  type Vendor,
  type Item,
  type Payment,
  type ServiceBooking
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
const payments = ref<Payment[]>([]);
const serviceBookings = ref<ServiceBooking[]>([]);
const deliveries = ref<Delivery[]>([]);
const vendorInputRef = ref<InstanceType<typeof VendorSearchBox>>();
const selectedFilesForUpload = ref<File[]>([]);
const existingPhotos = ref<string[]>([]);
const showPhotoGallery = ref(false);
const galleryIndex = ref(0);
const showItemCreateModal = ref(false);
const newItemName = ref('');

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
  notes: '',
  rounded_off_with: 0
});

const deliveryItems = ref<DeliveryItemForm[]>([]);
const originalDeliveryItems = ref<DeliveryItemForm[]>([]); // Track original items for comparison
const newItemForm = ref<DeliveryItemForm | null>(null);
const newItemRowRef = ref();

// Computed properties
const itemsTotal = computed(() => {
  return deliveryItems.value
    .filter(item => !item.isDeleted)
    .reduce((total, item) => total + item.total_amount, 0);
});

const totalAmount = computed(() => {
  return itemsTotal.value + (deliveryForm.rounded_off_with || 0);
});

const usedItemIds = computed(() => {
  return deliveryItems.value
    .filter(item => !item.isDeleted)
    .map(item => item.item)
    .filter(Boolean);
});

// Removed canAddMoreItems as we now always allow adding items via the new item form

const activeDeliveryItems = computed(() => {
  return deliveryItems.value.filter(item => !item.isDeleted);
});

const completedDeliveryItems = computed(() => {
  return deliveryItems.value.filter(item => !item.isDeleted);
});

const isNewItemValid = computed(() => {
  if (!newItemForm.value) return false;
  return newItemForm.value.item !== '' &&
    newItemForm.value.quantity > 0 &&
    newItemForm.value.unit_price > 0;
});

// Removed ensureNewItemForm as it's not currently used

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
  if (newItemForm.value) return; // Already have a new item form open

  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  newItemForm.value = {
    tempId,
    item: '',
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    notes: '',
    isNew: true,
    isModified: false,
    isDeleted: false
  };

  // Focus the item selector after Vue updates the DOM
  await nextTick();
  newItemRowRef.value?.focusItemSelector();
};

const updateNewItem = (_index: number, updatedItem: DeliveryItemForm) => {
  newItemForm.value = { ...updatedItem };
};

const saveNewItem = async () => {
  if (!newItemForm.value || !isNewItemValid.value) return;

  // Add the new item to the deliveryItems array
  deliveryItems.value.push({ ...newItemForm.value });

  // Automatically create a new empty item form for the next entry
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  newItemForm.value = {
    tempId,
    item: '',
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    notes: '',
    isNew: true,
    isModified: false,
    isDeleted: false
  };

  // Focus the item selector after Vue updates the DOM
  await nextTick();
  newItemRowRef.value?.focusItemSelector();
};

const cancelNewItem = () => {
  // Only allow canceling if there are existing items
  if (completedDeliveryItems.value.length > 0) {
    newItemForm.value = null;
  }
  // If no completed items exist, keep the new item form visible
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

const removeDeliveryItem = async (index: number) => {
  const item = deliveryItems.value[index];

  // If it's an existing item (has an ID), mark for deletion instead of removing
  if (item.id && !item.isNew) {
    item.isDeleted = true;
    item.isModified = true;
  } else {
    // If it's a new item, just remove it from the array
    deliveryItems.value.splice(index, 1);
  }

  // Check if we need to show a new item form (if no items remain and no new item form is showing)
  if (completedDeliveryItems.value.length === 0 && !newItemForm.value) {
    await addNewItem();
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

const handleCreateNewItem = (searchQuery: string) => {
  newItemName.value = searchQuery;
  showItemCreateModal.value = true;
};

const closeItemCreateModal = () => {
  showItemCreateModal.value = false;
  newItemName.value = '';
};

const handleItemCreated = async (newItem: Item) => {
  // Add the new item to the items list
  items.value.push(newItem);

  // Close the modal
  closeItemCreateModal();

  // Auto-select the newly created item in the current new item form
  if (newItemForm.value) {
    updateNewItem(-1, {
      ...newItemForm.value,
      item: newItem.id!
    });
  }
};

const handleVendorSelected = (vendor: Vendor) => {
  // Handle vendor selection - can add additional logic here if needed
  deliveryForm.vendor = vendor.id!;
};

// Keyboard shortcuts
const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  // SHIFT + Right Arrow - Next step
  if (event.shiftKey && event.key === 'ArrowRight') {
    event.preventDefault();
    event.stopPropagation();
    if (canProceedToNextStep.value && currentStep.value < steps.length - 1) {
      nextStep();
    }
    return;
  }

  // SHIFT + Left Arrow - Previous step
  if (event.shiftKey && event.key === 'ArrowLeft') {
    event.preventDefault();
    event.stopPropagation();
    if (currentStep.value > 0) {
      previousStep();
    }
    return;
  }

  // CTRL + ENTER - Handle based on current step
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // On Items step (1) - Add item
    if (currentStep.value === 1) {
      if (newItemForm.value && isNewItemValid.value) {
        saveNewItem();
      }
      return;
    }

    // On Review step (2) - Create delivery
    if (currentStep.value === 2) {
      if (canSubmit.value && !loading.value) {
        saveDelivery();
      }
      return;
    }
  }
};

const nextStep = async () => {
  if (canProceedToNextStep.value && currentStep.value < steps.length - 1) {
    currentStep.value++;

    // Auto-focus item selector when moving to step 1 (items step)
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

    // Auto-focus vendor input when going back to step 0
    if (currentStep.value === 0) {
      await nextTick();
      setTimeout(() => {
        vendorInputRef.value?.focus();
      }, 50);
    }
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
      total_amount: totalAmount.value,
      rounded_off_with: deliveryForm.rounded_off_with || 0
    } as Partial<Delivery>;

    // For edits, always include existing photos to preserve them during updates
    if (props.editingDelivery) {
      // Include existing photos in the update to ensure they're preserved
      // when new photos are uploaded later
      deliveryData.photos = existingPhotos.value;
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
        // Pass existing photos to preserve them when uploading new ones
        const uploadedPhotos = await deliveryService.uploadPhotos(
          delivery.id!,
          selectedFilesForUpload.value,
          props.editingDelivery ? existingPhotos.value : []
        );
        console.log(`Successfully uploaded ${uploadedPhotos.length} of ${selectedFilesForUpload.value.length} photos`);

        // For editing, update the existingPhotos list to reflect all photos (old + new)
        if (props.editingDelivery) {
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

const resetForm = async () => {
  // Reset to step 0
  currentStep.value = 0;

  // Reset delivery form but keep vendor and date for convenience
  deliveryForm.delivery_reference = '';
  deliveryForm.notes = '';
  deliveryForm.rounded_off_with = 0;

  // Clear items and create a fresh new item form
  deliveryItems.value = [];
  await addNewItem();

  // Clear selected files
  selectedFilesForUpload.value = [];

  // Focus vendor input after form reset
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

    // If editing, populate form
    if (props.editingDelivery) {
      Object.assign(deliveryForm, {
        vendor: props.editingDelivery.vendor,
        delivery_date: new Date(props.editingDelivery.delivery_date).toISOString().split('T')[0],
        delivery_reference: props.editingDelivery.delivery_reference,
        notes: props.editingDelivery.notes,
        rounded_off_with: props.editingDelivery.rounded_off_with || 0
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
      // For new deliveries, start with a new item form visible by default
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
  openModal('multi-item-delivery-modal');

  // Focus vendor input after modal is opened and DOM is ready
  await nextTick();
  setTimeout(() => {
    vendorInputRef.value?.focus();
  }, 100);

  // Add keyboard shortcuts
  useEventListener('keydown', handleKeyboardShortcuts);
});

onUnmounted(() => {
  closeModal('multi-item-delivery-modal');
});
</script>