<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Items</h1>
        <p class="mt-1 text-sm text-gray-600">
          Manage your construction items and quantities
        </p>
      </div>
      <button @click="showAddModal = true" class="btn-primary">
        <Plus class="mr-2 h-4 w-4" />
        Add Item
      </button>
    </div>

    <!-- Items Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="item in items" :key="item.id" class="card hover:shadow-md transition-shadow duration-200 cursor-pointer" @click="viewItemDetail(item.id!)">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900">{{ item.name }}</h3>
            <p v-if="item.description" class="text-sm text-gray-600 mt-1">{{ item.description }}</p>
            <div class="mt-3 flex items-center space-x-4">
              <div class="flex items-center text-sm text-gray-500">
                <Package class="mr-1 h-4 w-4" />
                {{ item.quantity }} {{ item.unit }}
              </div>
              <div v-if="item.category" class="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                {{ item.category }}
              </div>
            </div>
            
            <!-- Delivery Summary -->
            <div class="mt-4 p-3 bg-gray-50 rounded-lg">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700">Total Delivered</span>
                <span class="text-sm font-semibold text-blue-600">{{ getItemDeliveredQuantity(item.id!) }} {{ item.unit }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700">Avg. Price</span>
                <span class="text-sm font-semibold text-green-600">₹{{ getItemAveragePrice(item.id!).toFixed(2) }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-2" @click.stop>
            <button @click="editItem(item)" class="p-1 text-gray-400 hover:text-gray-600">
              <Edit2 class="h-4 w-4" />
            </button>
            <button @click="deleteItem(item.id!)" class="p-1 text-gray-400 hover:text-red-600">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="items.length === 0" class="col-span-full">
        <div class="text-center py-12">
          <Package class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900">No items</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by creating a new item.</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingItem" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ editingItem ? 'Edit Item' : 'Add New Item' }}
          </h3>
          
          <form @submit.prevent="saveItem" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Name</label>
              <input v-model="form.name" type="text" required class="input mt-1" placeholder="Enter item name" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <textarea v-model="form.description" class="input mt-1" rows="3" placeholder="Enter item description"></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Quantity</label>
                <input v-model.number="form.quantity" type="number" required class="input mt-1" placeholder="0" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Unit</label>
                <input v-model="form.unit" type="text" required class="input mt-1" placeholder="kg, pcs, m²" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Category</label>
              <input v-model="form.category" type="text" class="input mt-1" placeholder="Enter category" />
            </div>
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="loading" class="flex-1 btn-primary">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ editingItem ? 'Update' : 'Create' }}
              </button>
              <button type="button" @click="closeModal" class="flex-1 btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Package, Plus, Edit2, Trash2, Loader2 } from 'lucide-vue-next';
import { 
  itemService, 
  incomingItemService,
  type Item,
  type IncomingItem
} from '../services/pocketbase';

const router = useRouter();
const items = ref<Item[]>([]);
const incomingItems = ref<IncomingItem[]>([]);
const showAddModal = ref(false);
const editingItem = ref<Item | null>(null);
const loading = ref(false);

const form = reactive({
  name: '',
  description: '',
  quantity: 0,
  unit: '',
  category: ''
});

const loadData = async () => {
  try {
    const [itemsData, incomingData] = await Promise.all([
      itemService.getAll(),
      incomingItemService.getAll()
    ]);
    items.value = itemsData;
    incomingItems.value = incomingData;
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const getItemDeliveredQuantity = (itemId: string) => {
  return incomingItems.value
    .filter(delivery => delivery.item === itemId)
    .reduce((sum, delivery) => sum + delivery.quantity, 0);
};

const getItemAveragePrice = (itemId: string) => {
  const itemDeliveries = incomingItems.value.filter(delivery => delivery.item === itemId);
  if (itemDeliveries.length === 0) return 0;
  
  const totalValue = itemDeliveries.reduce((sum, delivery) => sum + delivery.total_amount, 0);
  const totalQuantity = itemDeliveries.reduce((sum, delivery) => sum + delivery.quantity, 0);
  
  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
};

const viewItemDetail = (itemId: string) => {
  router.push(`/items/${itemId}`);
};

const saveItem = async () => {
  loading.value = true;
  try {
    if (editingItem.value) {
      await itemService.update(editingItem.value.id!, form);
    } else {
      await itemService.create(form);
    }
    await loadData();
    closeModal();
  } catch (error) {
    console.error('Error saving item:', error);
  } finally {
    loading.value = false;
  }
};

const editItem = (item: Item) => {
  editingItem.value = item;
  Object.assign(form, {
    name: item.name,
    description: item.description || '',
    quantity: item.quantity,
    unit: item.unit,
    category: item.category || ''
  });
};

const deleteItem = async (id: string) => {
  if (confirm('Are you sure you want to delete this item?')) {
    try {
      await itemService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }
};

const closeModal = () => {
  showAddModal.value = false;
  editingItem.value = null;
  Object.assign(form, {
    name: '',
    description: '',
    quantity: 0,
    unit: '',
    category: ''
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