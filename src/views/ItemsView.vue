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
          'hidden md:flex items-center'
        ]"
        :title="!canCreateItem ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
      >
        <Plus class="mr-2 h-4 w-4" />
        {{ t('items.addItem') }}
      </button>
    </div>

    <!-- Search Box -->
    <div class="mb-6">
      <div class="max-w-md">
        <SearchBox
          v-model="searchQuery"
          :placeholder="t('search.items')"
          :search-loading="searchLoading"
        />
      </div>
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
                {{ getUnitDisplay(item.unit) }}
              </div>
            </div>

            <!-- Tags -->
            <div v-if="itemTags.get(item.id!)?.length" class="mt-3">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="tag in itemTags.get(item.id!)"
                  :key="tag.id"
                  class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white"
                  :style="{ backgroundColor: tag.color }"
                >
                  {{ tag.name }}
                </span>
              </div>
            </div>
            
            <!-- Delivery Summary -->
            <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('items.totalDelivered') }}</span>
                <span class="text-sm font-semibold text-blue-600 dark:text-blue-400">{{ getItemDeliveredQuantity(item.id!) }} {{ getUnitDisplay(item.unit) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('items.avgPrice') }}</span>
                <span class="text-sm font-semibold text-green-600 dark:text-green-400">₹{{ getItemAveragePrice(item.id!).toFixed(2) }}</span>
              </div>
            </div>
          </div>
          
          <!-- Desktop Action Buttons -->
          <div class="hidden lg:flex items-center space-x-2" @click.stop>
            <button
              @click="editItem(item)"
              :disabled="!canEditDelete"
              :class="[
                canEditDelete 
                  ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200' 
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
              ]"
              :title="t('items.editItem')"
            >
              <Edit2 class="h-4 w-4" />
            </button>
            <button
              @click="cloneItem(item)"
              :disabled="!canCreateItem"
              :class="[
                canCreateItem 
                  ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200' 
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
              ]"
              :title="t('items.cloneItem')"
            >
              <Copy class="h-4 w-4" />
            </button>
            <button
              @click="deleteItem(item.id!)"
              :disabled="!canEditDelete"
              :class="[
                canEditDelete 
                  ? 'text-red-400 hover:text-red-600 dark:hover:text-red-300' 
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
              ]"
              :title="t('items.deleteItem')"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Mobile Dropdown Menu -->
          <div class="lg:hidden">
            <CardDropdownMenu
              :actions="getItemActions(item)"
              @action="handleItemAction(item, $event)"
            />
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
    <div v-if="showAddModal || editingItem" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeModal" @keydown.esc="closeModal" tabindex="-1">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ editingItem ? t('items.editItem') : t('items.addItem') }}
          </h3>
          
          <form @submit.prevent="saveItem" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.name') }}</label>
              <input ref="nameInputRef" v-model="form.name" type="text" required class="input mt-1" :placeholder="t('forms.enterItemName')" autofocus />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.description') }}</label>
              <textarea v-model="form.description" class="input mt-1" rows="3" :placeholder="t('forms.enterDescription')"></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('items.unit') }}</label>
              <select v-model="form.unit" required class="input mt-1">
                <option value="">{{ t('forms.selectUnit') }}</option>
                <option value="pcs">{{ t('units.pcs') }} (pcs)</option>
                <option value="pkt">{{ t('units.pkt') }} (pkt)</option>
                <option value="each">{{ t('units.each') }} (each)</option>
                <option value="ft">{{ t('units.ft') }} (ft)</option>
                <option value="m">{{ t('units.m') }} (m)</option>
                <option value="m2">{{ t('units.m2') }} (m²)</option>
                <option value="sqft">{{ t('units.sqft') }} (sqft)</option>
                <option value="m3">{{ t('units.m3') }} (m³)</option>
                <option value="ft3">{{ t('units.ft3') }} (ft³)</option>
                <option value="l">{{ t('units.l') }} (l)</option>
                <option value="kg">{{ t('units.kg') }} (kg)</option>
                <option value="ton">{{ t('units.ton') }} (ton)</option>
                <option value="bag">{{ t('units.bag') }} (bag)</option>
                <option value="box">{{ t('units.box') }} (box)</option>
              </select>
            </div>

            <!-- Tags -->
            <TagSelector
              v-model="form.tags"
              :label="t('tags.itemTags')"
              tag-type="item_category"
              :placeholder="t('tags.searchItemTags')"
            />
            
            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="formLoading" class="flex-1 btn-primary">
                <Loader2 v-if="formLoading" class="mr-2 h-4 w-4 animate-spin" />
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
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useKeyboardShortcutSingle } from '../composables/useKeyboardShortcut';
import { useRouter } from 'vue-router';
import { Package, Plus, Edit2, Trash2, Loader2, Copy } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useSiteData } from '../composables/useSiteData';
import TagSelector from '../components/TagSelector.vue';
import SearchBox from '../components/SearchBox.vue';
import CardDropdownMenu from '../components/CardDropdownMenu.vue';
import { useItemSearch } from '../composables/useSearch';
import { 
  itemService, 
  deliveryService,
  tagService,
  type Item,
  type Tag as TagType
} from '../services/pocketbase';
import { usePermissions } from '../composables/usePermissions';

const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error } = useToast();
const { canDelete } = usePermissions();

const router = useRouter();

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults } = useItemSearch();

// Use site-aware data loading
const { data: itemsData, reload: reloadItems } = useSiteData(async () => {
  const [items, deliveries, allTags] = await Promise.all([
    itemService.getAll(),
    deliveryService.getAll(),
    tagService.getAll()
  ]);
  
  // Map tags for each item
  const tagMap = new Map<string, TagType[]>();
  for (const item of items) {
    if (item.tags && item.tags.length > 0) {
      const itemTagObjects = allTags.filter(tag => item.tags!.includes(tag.id!));
      tagMap.set(item.id!, itemTagObjects);
    }
  }
  
  return { items, deliveries, itemTags: tagMap };
});

const items = computed(() => searchQuery.value.trim() ? searchResults.value : (itemsData.value?.items || []));
const deliveries = computed(() => itemsData.value?.deliveries || []);
const itemTags = computed(() => itemsData.value?.itemTags || new Map());

const showAddModal = ref(false);
const editingItem = ref<Item | null>(null);
const formLoading = ref(false);
const nameInputRef = ref<HTMLInputElement>();

const canCreateItem = computed(() => {
  return checkCreateLimit('items') && !isReadOnly.value;
});

const canEditDelete = computed(() => {
  return !isReadOnly.value && canDelete;
});

const form = reactive({
  name: '',
  description: '',
  unit: '',
  tags: [] as string[]
});


const getItemDeliveredQuantity = (itemId: string) => {
  let totalQuantity = 0;
  deliveries.value.forEach(delivery => {
    if (delivery.expand?.delivery_items) {
      delivery.expand.delivery_items.forEach(deliveryItem => {
        if (deliveryItem.item === itemId) {
          totalQuantity += deliveryItem.quantity;
        }
      });
    }
  });
  return totalQuantity;
};

const getItemAveragePrice = (itemId: string) => {
  let totalValue = 0;
  let totalQuantity = 0;
  
  deliveries.value.forEach(delivery => {
    if (delivery.expand?.delivery_items) {
      delivery.expand.delivery_items.forEach(deliveryItem => {
        if (deliveryItem.item === itemId) {
          totalValue += deliveryItem.total_amount;
          totalQuantity += deliveryItem.quantity;
        }
      });
    }
  });
  
  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
};

const getUnitDisplay = (unitKey: string) => {
  // If translation exists, show "Translation (key)", otherwise just show the key
  const translationKey = `units.${unitKey}`;
  const translation = t(translationKey);
  
  // If translation is the same as the key, it means translation doesn't exist
  if (translation === translationKey) {
    return unitKey;
  }
  
  // return `${translation} (${unitKey})`;
  return `(${translation})`;
};

const viewItemDetail = (itemId: string) => {
  router.push(`/items/${itemId}`);
};

const getItemActions = (_item: Item) => {
  return [
    {
      key: 'edit',
      label: t('items.editItem'),
      icon: Edit2,
      variant: 'default' as const,
      disabled: !canEditDelete
    },
    {
      key: 'clone',
      label: t('items.cloneItem'),
      icon: Copy,
      variant: 'default' as const,
      disabled: !canCreateItem
    },
    {
      key: 'delete',
      label: t('items.deleteItem'),
      icon: Trash2,
      variant: 'danger' as const,
      disabled: !canEditDelete
    }
  ];
};

const handleItemAction = (item: Item, action: string) => {
  switch (action) {
    case 'edit':
      editItem(item);
      break;
    case 'clone':
      cloneItem(item);
      break;
    case 'delete':
      deleteItem(item.id!);
      break;
  }
};

const handleAddItem = async () => {
  if (!canCreateItem) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  showAddModal.value = true;
  await nextTick();
  nameInputRef.value?.focus();
};

const saveItem = async () => {
  formLoading.value = true;
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
    await reloadItems();
    closeModal();
  } catch (err) {
    console.error('Error saving item:', err);
    error(t('messages.error'));
  } finally {
    formLoading.value = false;
  }
};

const editItem = (item: Item) => {
  editingItem.value = item;
  Object.assign(form, {
    name: item.name,
    description: item.description || '',
    unit: item.unit,
    tags: item.tags || []
  });
};

const cloneItem = async (item: Item) => {
  if (!canCreateItem) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }

  // Reset editingItem to null so it creates a new item
  editingItem.value = null;
  
  // Pre-fill form with cloned item data, appending "(Copy)" to the name
  Object.assign(form, {
    name: `${item.name} (${t('common.copy')})`,
    description: item.description || '',
    unit: item.unit,
    tags: item.tags || []
  });
  
  // Show the modal
  showAddModal.value = true;
  await nextTick();
  nameInputRef.value?.focus();
};

const deleteItem = async (id: string) => {
  if (!canEditDelete) {
    error(t('subscription.banner.freeTierLimitReached'));
    return;
  }
  if (confirm(t('messages.confirmDelete', { item: t('common.item') }))) {
    try {
      await itemService.delete(id);
      success(t('messages.deleteSuccess', { item: t('common.item') }));
      await reloadItems();
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
    unit: '',
    tags: []
  });
};

const handleQuickAction = async () => {
  showAddModal.value = true;
  await nextTick();
  nameInputRef.value?.focus();
};

// Keyboard shortcut for adding new item (Shift+Alt+N)
useKeyboardShortcutSingle('n', handleAddItem, { shiftKey: true, altKey: true });

onMounted(() => {
  // Data loading is handled automatically by useSiteData
  window.addEventListener('show-add-modal', handleQuickAction);
});

onUnmounted(() => {
  window.removeEventListener('show-add-modal', handleQuickAction);
});
</script>