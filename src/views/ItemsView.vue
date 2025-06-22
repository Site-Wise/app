<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('items.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('items.subtitle') }}
        </p>
      </div>
      <button 
        @click="handleAddItem" 
        :disabled="!canCreateItem"
        :class="[
          canCreateItem ? 'btn-primary' : 'btn-disabled',
          'flex items-center'
        ]"
        :title="!canCreateItem ? t('subscription.banner.freeTierLimitReached') : ''"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('items.addItem') }}
      </button>
    </div>

    <!-- Items Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="item in items" :key="item.id" class="card hover:shadow-md transition-shadow duration-200 cursor-pointer" @click="viewItemDetail(item.id!)">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ item.name }}</h3>
            <p v-if="item.description" class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ item.description }}</p>
            <div class="mt-3 flex items-center space-x-4">
              <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Package class="mr-1 h-4 w-4" />
                {{ item.quantity }} {{ item.unit }}
              </div>
              <div v-if="item.category" class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300">
                {{ item.category }}
              </div>
            </div>
            
            <!-- Delivery Summary -->
            <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('items.totalDelivered') }}</span>
                <span class="text-sm font-semibold text-blue-600 dark:text-blue-400">{{ getItemDeliveredQuantity(item.id!) }} {{ item.unit }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('items.avgPrice') }}</span>
                <span class="text-sm font-semibold text-green-600 dark:text-green-400">₹{{ getItemAveragePrice(item.id!).toFixed(2) }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-2" @click.stop>
            <button 
              @click="editItem(item)" 
              :disabled="!canEditDelete"
              :class="[
                canEditDelete 
                  ? 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300' 
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                'p-1'
              ]"
            >
              <Edit2 class="h-4 w-4" />
            </button>
            <button 
              @click="deleteItem(item.id!)" 
              :disabled="!canEditDelete"
              :class="[
                canEditDelete 
                  ? 'text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400' 
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                'p-1'
              ]"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="items.length === 0" class="col-span-full">
        <div class="text-center py-12">
          <Package class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('items.noItems') }}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('items.getStarted') }}</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingItem" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeModal">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingItem ? t('items.editItem') : t('items.addItem') }}
          </h3>
          
          <form @submit.prevent="saveItem" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.name') }}</label>
              <input v-model="form.name" type="text" required class="input mt-1" :placeholder="t('forms.enterItemName')" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.description') }}</label>
              <textarea v-model="form.description" class="input mt-1" rows="3" :placeholder="t('forms.enterDescription')"></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.quantity') }}</label>
                <input v-model.number="form.quantity" type="number" required class="input mt-1" :placeholder="t('forms.enterQuantity')" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('items.unit') }}</label>
                <input v-model="form.unit" type="text" required class="input mt-1" :placeholder="t('forms.enterUnit')" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.category') }}</label>
              <input v-model="form.category" type="text" class="input mt-1" :placeholder="t('forms.enterCategory')" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Package, Plus, Edit2, Trash2, Loader2 } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { 
  itemService, 
  incomingItemService,
  type Item,
  type IncomingItem
} from '../services/pocketbase';

const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error } = useToast();

const router = useRouter();
const items = ref<Item[]>([]);
const incomingItems = ref<IncomingItem[]>([]);
const showAddModal = ref(false);
const editingItem = ref<Item | null>(null);
const loading = ref(false);

const canCreateItem = computed(() => {
  return !isReadOnly.value && checkCreateLimit('items');
});

const canEditDelete = computed(() => {
  return !isReadOnly.value;
});

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

const handleAddItem = () => {
  if (!canCreateItem.value) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  showAddModal.value = true;
};

const saveItem = async () => {
  loading.value = true;
  try {
    if (editingItem.value) {
      await itemService.update(editingItem.value.id!, form);
      success(t('messages.updateSuccess', { item: t('common.item') }));
    } else {
      if (!checkCreateLimit('items')) {
        error(t('subscription.banner.freeTierLimitReached'));
        return;
      }
      await itemService.create(form);
      success(t('messages.createSuccess', { item: t('common.item') }));
      // Usage is automatically incremented by PocketBase hooks
    }
    await loadData();
    closeModal();
  } catch (err) {
    console.error('Error saving item:', err);
    error(t('messages.error'));
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
  if (!canEditDelete.value) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  if (confirm(t('messages.confirmDelete', { item: t('common.item') }))) {
    try {
      await itemService.delete(id);
      success(t('messages.deleteSuccess', { item: t('common.item') }));
      await loadData();
      // Usage is automatically decremented by PocketBase hooks
    } catch (err) {
      console.error('Error deleting item:', err);
      error(t('messages.error'));
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