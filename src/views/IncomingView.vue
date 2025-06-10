<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Incoming Items</h1>
        <p class="mt-1 text-sm text-gray-600">
          Track deliveries and manage receipts
        </p>
      </div>
      <button @click="showAddModal = true" class="btn-primary">
        <Plus class="mr-2 h-4 w-4" />
        Record Delivery
      </button>
    </div>

    <!-- Incoming Items Table -->
    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in incomingItems" :key="item.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ item.expand?.item?.name || 'Unknown Item' }}</div>
              <div class="text-sm text-gray-500">{{ item.expand?.item?.unit || 'units' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ item.expand?.vendor?.name || 'Unknown Vendor' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ item.quantity }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              ${{ item.unit_price.toFixed(2) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">${{ item.total_amount.toFixed(2) }}</div>
              <div v-if="item.paid_amount > 0" class="text-xs text-green-600">
                Paid: ${{ item.paid_amount.toFixed(2) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="`status-${item.payment_status}`">
                {{ item.payment_status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatDate(item.delivery_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-2">
                <button @click="viewItem(item)" class="text-primary-600 hover:text-primary-900">
                  <Eye class="h-4 w-4" />
                </button>
                <button @click="editItem(item)" class="text-primary-600 hover:text-primary-900">
                  <Edit2 class="h-4 w-4" />
                </button>
                <button @click="deleteItem(item.id!)" class="text-red-600 hover:text-red-900">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="incomingItems.length === 0" class="text-center py-12">
        <TruckIcon class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No deliveries recorded</h3>
        <p class="mt-1 text-sm text-gray-500">Start tracking by recording a delivery.</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingItem" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ editingItem ? 'Edit Delivery' : 'Record New Delivery' }}
          </h3>
          
          <form @submit.prevent="saveItem" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Item</label>
              <select v-model="form.item" required class="input mt-1">
                <option value="">Select an item</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.name }} ({{ item.unit }})
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Vendor</label>
              <select v-model="form.vendor" required class="input mt-1">
                <option value="">Select a vendor</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Quantity</label>
                <input v-model.number="form.quantity" type="number" required class="input mt-1" placeholder="0" @input="calculateTotal" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Unit Price</label>
                <input v-model.number="form.unit_price" type="number" step="0.01" required class="input mt-1" placeholder="0.00" @input="calculateTotal" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Total Amount</label>
              <input v-model.number="form.total_amount" type="number" step="0.01" required class="input mt-1" readonly />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Delivery Date</label>
              <input v-model="form.delivery_date" type="date" required class="input mt-1" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Payment Status</label>
              <select v-model="form.payment_status" required class="input mt-1">
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            
            <div v-if="form.payment_status !== 'pending'">
              <label class="block text-sm font-medium text-gray-700">Paid Amount</label>
              <input v-model.number="form.paid_amount" type="number" step="0.01" class="input mt-1" placeholder="0.00" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Photos</label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                @change="handleFileUpload" 
                class="input mt-1"
              />
              <div v-if="form.photos && form.photos.length > 0" class="mt-2 grid grid-cols-3 gap-2">
                <div v-for="(photo, index) in form.photos" :key="index" class="relative">
                  <img :src="photo" alt="Delivery photo" class="w-full h-20 object-cover rounded" />
                  <button type="button" @click="removePhoto(index)" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    ×
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Notes</label>
              <textarea v-model="form.notes" class="input mt-1" rows="3" placeholder="Delivery notes"></textarea>
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingItem ? 'Update' : 'Record' }}
              </button>
              <button type="button" @click="closeModal" class="flex-1 btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Modal -->
    <div v-if="viewingItem" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Delivery Details</h3>
          
          <div class="space-y-4">
            <div>
              <span class="font-medium text-gray-700">Item:</span>
              <span class="ml-2">{{ viewingItem.expand?.item?.name || 'Unknown Item' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Vendor:</span>
              <span class="ml-2">{{ viewingItem.expand?.vendor?.name || 'Unknown Vendor' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Quantity:</span>
              <span class="ml-2">{{ viewingItem.quantity }} {{ viewingItem.expand?.item?.unit || 'units' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Total Amount:</span>
              <span class="ml-2">${{ viewingItem.total_amount.toFixed(2) }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Payment Status:</span>
              <span :class="`ml-2 status-${viewingItem.payment_status}`">
                {{ viewingItem.payment_status }}
              </span>
            </div>
            <div v-if="viewingItem.photos && viewingItem.photos.length > 0">
              <span class="font-medium text-gray-700">Photos:</span>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <img v-for="photo in viewingItem.photos" :key="photo" :src="photo" alt="Delivery photo" class="w-full h-32 object-cover rounded" />
              </div>
            </div>
            <div v-if="viewingItem.notes">
              <span class="font-medium text-gray-700">Notes:</span>
              <p class="ml-2 text-gray-600">{{ viewingItem.notes }}</p>
            </div>
          </div>
          
          <div class="mt-6">
            <button @click="viewingItem = null" class="w-full btn-outline">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { TruckIcon, Plus, Edit2, Trash2, Loader2, Eye } from 'lucide-vue-next';
import { 
  incomingItemService, 
  itemService, 
  vendorService,
  type IncomingItem, 
  type Item, 
  type Vendor 
} from '../services/pocketbase';

const incomingItems = ref<IncomingItem[]>([]);
const items = ref<Item[]>([]);
const vendors = ref<Vendor[]>([]);
const showAddModal = ref(false);
const editingItem = ref<IncomingItem | null>(null);
const viewingItem = ref<IncomingItem | null>(null);
const loading = ref(false);

const form = reactive({
  item: '',
  vendor: '',
  quantity: 0,
  unit_price: 0,
  total_amount: 0,
  delivery_date: new Date().toISOString().split('T')[0],
  photos: [] as string[],
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
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          form.photos.push(result);
        }
      };
      reader.readAsDataURL(file);
    });
  }
};

const removePhoto = (index: number) => {
  form.photos.splice(index, 1);
};

const saveItem = async () => {
  loading.value = true;
  try {
    const data = { ...form };
    if (data.payment_status === 'pending') {
      data.paid_amount = 0;
    }
    
    if (editingItem.value) {
      await incomingItemService.update(editingItem.value.id!, data);
    } else {
      await incomingItemService.create(data);
    }
    await loadData();
    closeModal();
  } catch (error) {
    console.error('Error saving incoming item:', error);
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
    photos: item.photos || [],
    notes: item.notes || '',
    payment_status: item.payment_status,
    paid_amount: item.paid_amount
  });
};

const viewItem = (item: IncomingItem) => {
  viewingItem.value = item;
};

const deleteItem = async (id: string) => {
  if (confirm('Are you sure you want to delete this delivery record?')) {
    try {
      await incomingItemService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting incoming item:', error);
    }
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const closeModal = () => {
  showAddModal.value = false;
  editingItem.value = null;
  Object.assign(form, {
    item: '',
    vendor: '',
    quantity: 0,
    unit_price: 0,
    total_amount: 0,
    delivery_date: new Date().toISOString().split('T')[0],
    photos: [],
    notes: '',
    payment_status: 'pending',
    paid_amount: 0
  });
};

const handleQuickAction = () => {
  showAddModal.value = true;
};

onMounted(() => {
  loadData();
  window.addEventListener('show-add-modal', handleQuickAction);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
});
</script>