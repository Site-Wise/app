<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('incoming.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('incoming.subtitle') }}
        </p>
      </div>
      <button @click="showAddModal = true" class="btn-primary">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('incoming.recordDelivery') }}
      </button>
    </div>

    <!-- Incoming Items Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.item') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.vendor') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.quantity') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('forms.unitPrice') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.total') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('incoming.paymentStatus') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('incoming.deliveryDate') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('incoming.photos') }}</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="item in incomingItems" :key="item.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ item.expand?.item?.name || 'Unknown Item' }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ item.expand?.item?.unit || 'units' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900 dark:text-white">{{ item.expand?.vendor?.name || 'Unknown Vendor' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ item.quantity }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              ₹{{ item.unit_price.toFixed(2) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900 dark:text-white">₹{{ item.total_amount.toFixed(2) }}</div>
              <div v-if="item.paid_amount > 0" class="text-xs text-green-600 dark:text-green-400">
                {{ t('incoming.paid') }}: ₹{{ item.paid_amount.toFixed(2) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="`status-${item.payment_status}`">
                {{ t(`common.${item.payment_status}`) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
              {{ formatDate(item.delivery_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div v-if="item.photos && item.photos.length > 0" class="flex items-center space-x-2">
                <div class="flex -space-x-2">
                  <img 
                    v-for="(photo, index) in item.photos.slice(0, 3)" 
                    :key="index"
                    :src="getPhotoUrl(item.id!, photo)" 
                    :alt="`${t('incoming.photos')} ${index + 1}`"
                    class="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 object-cover cursor-pointer hover:scale-110 transition-transform duration-200"
                    @click="viewPhotos(item)"
                  />
                </div>
                <button 
                  @click="viewPhotos(item)"
                  class="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 font-medium"
                >
                  {{ item.photos.length > 3 ? `+${item.photos.length - 3} ${t('common.more')}` : t('common.view') }}
                </button>
              </div>
              <div v-else class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('incoming.noPhotos') }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-2">
                <button @click="viewItem(item)" class="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300" :title="t('common.view')">
                  <Eye class="h-4 w-4" />
                </button>
                <button @click="editItem(item)" class="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300" :title="t('common.edit')">
                  <Edit2 class="h-4 w-4" />
                </button>
                <button @click="deleteItem(item.id!)" class="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300" :title="t('common.delete')">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="incomingItems.length === 0" class="text-center py-12">
        <TruckIcon class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('incoming.noDeliveries') }}</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('incoming.startTracking') }}</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingItem" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingItem ? t('incoming.editDelivery') : t('incoming.recordDelivery') }}
          </h3>
          
          <form @submit.prevent="saveItem" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.item') }}</label>
              <select v-model="form.item" required class="input mt-1">
                <option value="">{{ t('forms.selectItem') }}</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.name }} ({{ item.unit }})
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}</label>
              <select v-model="form.vendor" required class="input mt-1">
                <option value="">{{ t('forms.selectVendor') }}</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.quantity') }}</label>
                <input v-model.number="form.quantity" type="number" required class="input mt-1" placeholder="0" @input="calculateTotal" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('forms.unitPrice') }}</label>
                <input v-model.number="form.unit_price" type="number" step="0.01" required class="input mt-1" placeholder="0.00" @input="calculateTotal" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.total') }}</label>
              <input v-model.number="form.total_amount" type="number" step="0.01" required class="input mt-1" readonly />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('incoming.deliveryDate') }}</label>
              <input v-model="form.delivery_date" type="date" required class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('incoming.paymentStatus') }}</label>
              <select v-model="form.payment_status" required class="input mt-1">
                <option value="pending">{{ t('common.pending') }}</option>
                <option value="partial">{{ t('common.partial') }}</option>
                <option value="paid">{{ t('common.paid') }}</option>
              </select>
            </div>
            
            <div v-if="form.payment_status !== 'pending'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('incoming.paidAmount') }}</label>
              <input v-model.number="form.paid_amount" type="number" step="0.01" class="input mt-1" placeholder="0.00" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('incoming.photos') }}</label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                @change="handleFileUpload" 
                class="input mt-1"
                ref="fileInput"
              />
              <div v-if="selectedFiles.length > 0" class="mt-2 grid grid-cols-3 gap-2">
                <div v-for="(file, index) in selectedFiles" :key="index" class="relative">
                  <img :src="file.preview" :alt="`${t('incoming.photos')} ${index + 1}`" class="w-full h-20 object-cover rounded" />
                  <button type="button" @click="removeFile(index)" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    ×
                  </button>
                </div>
              </div>
              <div v-if="editingItem && editingItem.photos && editingItem.photos.length > 0" class="mt-2">
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ t('incoming.existingPhotos') }}</p>
                <PhotoGallery 
                  :photos="editingItem.photos" 
                  :item-id="editingItem.id"
                  :show-delete-button="true"
                  @photo-deleted="handlePhotoDeleted"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.notes') }}</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" :placeholder="t('forms.deliveryNotes')"></textarea>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingItem ? t('common.update') : t('common.create') }}
              </button>
              <button type="button" @click="closeModal" class="flex-1 btn-outline">
                {{ t('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Modal -->
    <div v-if="viewingItem" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('incoming.deliveryDetails') }}</h3>
            <button @click="viewingItem = null" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Delivery Information -->
            <div class="space-y-4">
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.item') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingItem.expand?.item?.name || 'Unknown Item' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.vendor') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingItem.expand?.vendor?.name || 'Unknown Vendor' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.quantity') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ viewingItem.quantity }} {{ viewingItem.expand?.item?.unit || 'units' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.total') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">₹{{ viewingItem.total_amount.toFixed(2) }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('incoming.paymentStatus') }}:</span>
                <span :class="`ml-2 status-${viewingItem.payment_status}`">
                  {{ t(`common.${viewingItem.payment_status}`) }}
                </span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('incoming.deliveryDate') }}:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ formatDate(viewingItem.delivery_date) }}</span>
              </div>
              <div v-if="viewingItem.notes">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('common.notes') }}:</span>
                <p class="ml-2 text-gray-600 dark:text-gray-400 mt-1">{{ viewingItem.notes }}</p>
              </div>
            </div>

            <!-- Photos -->
            <div>
              <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-3">{{ t('incoming.photos') }}</h4>
              <PhotoGallery 
                v-if="viewingItem.photos && viewingItem.photos.length > 0"
                :photos="viewingItem.photos" 
                :item-id="viewingItem.id"
              />
              <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
                {{ t('incoming.noPhotos') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Photo Gallery Modal -->
    <div v-if="showPhotoGallery" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ t('incoming.photos') }} - {{ galleryItem?.expand?.item?.name }}
            </h3>
            <button @click="closePhotoGallery" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <PhotoGallery 
            v-if="galleryItem?.photos"
            :photos="galleryItem.photos" 
            :item-id="galleryItem.id"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { TruckIcon, Plus, Edit2, Trash2, Loader2, Eye, X } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import PhotoGallery from '../components/PhotoGallery.vue';
import { 
  incomingItemService, 
  itemService, 
  vendorService,
  pb,
  type IncomingItem, 
  type Item, 
  type Vendor 
} from '../services/pocketbase';

interface FileWithPreview {
  file: File;
  preview: string;
}

const { t } = useI18n();

const incomingItems = ref<IncomingItem[]>([]);
const items = ref<Item[]>([]);
const vendors = ref<Vendor[]>([]);
const showAddModal = ref(false);
const editingItem = ref<IncomingItem | null>(null);
const viewingItem = ref<IncomingItem | null>(null);
const showPhotoGallery = ref(false);
const galleryItem = ref<IncomingItem | null>(null);
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<FileWithPreview[]>([]);

const form = reactive({
  item: '',
  vendor: '',
  quantity: 0,
  unit_price: 0,
  total_amount: 0,
  delivery_date: new Date().toISOString().split('T')[0],
  notes: '',
  payment_status: 'pending' as 'pending' | 'partial' | 'paid',
  paid_amount: 0
});

const loadData = async () => {
  try {
    const [incomingData, itemsData, vendorsData] = await Promise.all([
      incomingItemService.getAll(),
      itemService.getAll(),
      vendorService.getAll()
    ]);
    
    incomingItems.value = incomingData;
    items.value = itemsData;
    vendors.value = vendorsData;
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const calculateTotal = () => {
  form.total_amount = form.quantity * form.unit_price;
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files) {
    selectedFiles.value = [];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          selectedFiles.value.push({
            file,
            preview: result
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }
};

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const getPhotoUrl = (itemId: string, filename: string) => {
  return `${pb.baseUrl}/api/files/incoming_items/${itemId}/${filename}`;
};

const viewPhotos = (item: IncomingItem) => {
  galleryItem.value = item;
  showPhotoGallery.value = true;
};

const closePhotoGallery = () => {
  showPhotoGallery.value = false;
  galleryItem.value = null;
};

const handlePhotoDeleted = async (photoIndex: number) => {
  if (!editingItem.value || !editingItem.value.photos) return;
  
  try {
    // Remove photo from the array
    const updatedPhotos = [...editingItem.value.photos];
    updatedPhotos.splice(photoIndex, 1);
    
    // Update the item in the database
    await incomingItemService.update(editingItem.value.id!, { photos: updatedPhotos });
    
    // Update local state
    editingItem.value.photos = updatedPhotos;
    
    // Reload data to ensure consistency
    await loadData();
  } catch (error) {
    console.error('Error deleting photo:', error);
    alert(t('messages.error'));
  }
};

const saveItem = async () => {
  loading.value = true;
  try {
    const data = { ...form };
    if (data.payment_status === 'pending') {
      data.paid_amount = 0;
    }
    
    let savedItem: IncomingItem;
    
    if (editingItem.value) {
      savedItem = await incomingItemService.update(editingItem.value.id!, data);
    } else {
      savedItem = await incomingItemService.create(data);
    }
    
    if (selectedFiles.value.length > 0 && savedItem.id) {
      const formData = new FormData();
      selectedFiles.value.forEach(fileObj => {
        formData.append('photos', fileObj.file);
      });
      
      await pb.collection('incoming_items').update(savedItem.id, formData);
    }
    
    await loadData();
    closeModal();
  } catch (error) {
    console.error('Error saving incoming item:', error);
    alert(t('messages.error'));
  } finally {
    loading.value = false;
  }
};

const editItem = (item: IncomingItem) => {
  editingItem.value = item;
  Object.assign(form, {
    item: item.item,
    vendor: item.vendor,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_amount: item.total_amount,
    delivery_date: item.delivery_date,
    notes: item.notes || '',
    payment_status: item.payment_status,
    paid_amount: item.paid_amount
  });
  selectedFiles.value = [];
};

const viewItem = (item: IncomingItem) => {
  viewingItem.value = item;
};

const deleteItem = async (id: string) => {
  if (confirm(t('messages.confirmDelete', { item: t('incoming.delivery') }))) {
    try {
      await incomingItemService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting incoming item:', error);
      alert(t('messages.error'));
    }
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const closeModal = () => {
  showAddModal.value = false;
  editingItem.value = null;
  selectedFiles.value = [];
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  Object.assign(form, {
    item: '',
    vendor: '',
    quantity: 0,
    unit_price: 0,
    total_amount: 0,
    delivery_date: new Date().toISOString().split('T')[0],
    notes: '',
    payment_status: 'pending',
    paid_amount: 0
  });
};

const handleQuickAction = () => {
  showAddModal.value = true;
};

const handleSiteChange = () => {
  loadData();
};

onMounted(() => {
  loadData();
  window.addEventListener('show-add-modal', handleQuickAction);
  window.addEventListener('site-changed', handleSiteChange);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
  window.removeEventListener('site-changed', handleSiteChange);
});
</script>