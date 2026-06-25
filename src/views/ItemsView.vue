<template>
  <div>
    <!-- Header - Mobile optimized -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="font-display text-xl sm:text-2xl font-bold text-ink dark:text-cream">{{ t('items.title') }}</h1>
        <p class="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
          {{ t('items.subtitle') }}
        </p>
      </div>
      <button @click="handleAddItem" :disabled="!canCreateItem" :class="[
        canCreateItem ? 'btn-primary' : 'btn-disabled',
        'hidden lg:flex items-center'
      ]"
        :title="!canCreateItem ? t('subscription.banner.freeTierLimitReached') : t('common.keyboardShortcut', { keys: 'Shift+Alt+N' })"
        data-keyboard-shortcut="n" data-tour="add-item-btn">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('items.addItem') }}
      </button>
    </div>

    <!-- Search Box -->
    <div class="w-full lg:w-96 mb-6" data-tour="search-bar">
      <SearchBox v-model="searchQuery" :placeholder="t('search.items')" :search-loading="searchLoading" />
    </div>

    <!-- Loading State: skeleton card grid -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6" aria-hidden="true">
      <div v-for="i in 6" :key="'skel-' + i" class="card-interactive flex flex-col">
        <!-- Card header: title + unit -->
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0 space-y-2">
            <Skeleton height="1.25rem" width="60%" />
            <Skeleton height="0.875rem" width="35%" />
          </div>
        </div>
        <!-- Stat strip -->
        <div class="mt-auto pt-4 border-t border-stone-200 dark:border-ink-4 flex items-end justify-between gap-4">
          <div class="space-y-1.5">
            <Skeleton height="0.625rem" width="4rem" />
            <Skeleton height="1.5rem" width="3rem" />
          </div>
          <div class="space-y-1.5 flex flex-col items-end">
            <Skeleton height="0.625rem" width="3rem" />
            <Skeleton height="1.5rem" width="4rem" />
          </div>
        </div>
      </div>
    </div>

    <!-- Items Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6" data-tour="items-table">
      <div v-for="item in items" :key="item.id"
        class="card-interactive group flex flex-col"
        @click="viewItemDetail(item.id!)">

        <!-- Card header: title + actions -->
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h3 class="font-display text-lg font-semibold text-ink dark:text-cream truncate">{{ item.name }}</h3>
            <div class="mt-1 flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
              <Package class="h-3.5 w-3.5 shrink-0" />
              <span>{{ getUnitDisplay(item.unit) }}</span>
            </div>
          </div>

          <!-- Desktop Action Buttons — hover-reveal ghost cluster -->
          <div class="hidden lg:flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150" @click.stop>
            <button @click="editItem(item)" :disabled="!canEditDelete" :class="[
              canEditDelete
                ? 'text-stone-400 hover:text-ink dark:text-stone-500 dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4'
                : 'text-stone-300 dark:text-stone-600 cursor-not-allowed',
              'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors duration-150'
            ]" :title="t('items.editItem')">
              <Edit2 class="h-4 w-4" />
            </button>
            <button @click="cloneItem(item)" :disabled="!canCreateItem" :class="[
              canCreateItem
                ? 'text-stone-400 hover:text-ink dark:text-stone-500 dark:hover:text-cream hover:bg-stone-100 dark:hover:bg-ink-4'
                : 'text-stone-300 dark:text-stone-600 cursor-not-allowed',
              'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors duration-150'
            ]" :title="t('items.cloneItem')" data-tour="clone-item-btn">
              <Copy class="h-4 w-4" />
            </button>
            <button @click="deleteItem(item.id!)" :disabled="!canEditDelete" :class="[
              canEditDelete
                ? 'text-stone-400 hover:text-clay-600 dark:text-stone-500 dark:hover:text-clay-400 hover:bg-stone-100 dark:hover:bg-ink-4'
                : 'text-stone-300 dark:text-stone-600 cursor-not-allowed',
              'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors duration-150'
            ]" :title="t('items.deleteItem')">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Mobile Dropdown Menu -->
          <div class="lg:hidden" data-tour="mobile-actions-menu">
            <CardDropdownMenu :actions="getItemActions(item)" @action="handleItemAction(item, $event)" />
          </div>
        </div>

        <!-- Description -->
        <p v-if="item.description" class="text-sm text-stone-500 dark:text-stone-400 mt-2 line-clamp-2">{{ item.description }}</p>

        <!-- Tags -->
        <div v-if="itemTags.get(item.id!)?.length" class="mt-3">
          <div class="flex flex-wrap gap-1.5">
            <span v-for="tag in itemTags.get(item.id!)" :key="tag.id"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 dark:bg-ink-4 text-stone-700 dark:text-stone-300">
              <span class="h-2 w-2 rounded-[2px] shrink-0" :style="{ backgroundColor: tag.color }"></span>
              {{ tag.name }}
            </span>
          </div>
        </div>

        <!-- Stat strip — bottom-pinned, separated by 1px border -->
        <div class="mt-auto pt-4 border-t border-stone-200 dark:border-ink-4">
          <div class="flex items-end justify-between gap-4">
            <!-- HERO: total delivered -->
            <div class="flex flex-col gap-0.5">
              <span class="sw-eyebrow text-stone-400 dark:text-stone-500">{{ t('items.totalDelivered') }}</span>
              <span class="sw-stat font-mono tabular-nums text-ink dark:text-cream leading-none">
                {{ getItemDeliveredQuantity(item.id!).toFixed(1) }}
              </span>
            </div>
            <!-- SECONDARY: avg price -->
            <div class="flex flex-col gap-0.5 text-right">
              <span class="sw-eyebrow text-stone-400 dark:text-stone-500">{{ t('items.avgPrice') }}</span>
              <span class="font-mono tabular-nums text-base font-semibold text-forest-700 dark:text-forest-400 leading-none">
                ₹{{ getItemAveragePrice(item.id!).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="items.length === 0" class="col-span-full">
        <div class="text-center py-12">
          <Package class="mx-auto h-12 w-12 text-stone-400" />
          <h3 class="font-display mt-2 text-sm font-medium text-ink dark:text-cream">{{ t('items.noItems') }}</h3>
          <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">{{ t('items.getStarted') }}</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingItem"
      class="fixed inset-0 bg-ink/60 overflow-y-auto h-full w-full z-[60]" @click="closeModal"
      @keydown.esc="closeModal" tabindex="-1">
      <div
        class="relative top-20 mx-auto w-full max-w-md shadow-modal rounded-xl bg-white dark:bg-ink-3 border border-stone-200 dark:border-ink-4 m-4 mb-20 lg:mb-4"
        @click.stop>
        <div class="flex items-center gap-3 px-6 py-4 border-b border-stone-200 dark:border-ink-4">
          <span class="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-amber-500/15">
            <Package class="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </span>
          <div>
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ editingItem ? t('common.edit') : t('common.create') }}</p>
            <h3 class="font-display text-lg font-semibold text-ink dark:text-cream leading-tight">
              {{ editingItem ? t('items.editItem') : t('items.addItem') }}
            </h3>
          </div>
        </div>
        <div class="p-6">
          <form @submit.prevent="saveItem" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.name') }}</label>
              <input ref="nameInputRef" v-model="form.name" type="text" required class="input mt-1"
                :placeholder="t('forms.enterItemName')" autofocus autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.description')
                }}</label>
              <textarea v-model="form.description" class="input mt-1" rows="3"
                :placeholder="t('forms.enterDescription')" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('items.unit') }}</label>
              <select v-model="form.unit" required :disabled="editingItemHasDeliveries"
                class="input mt-1 disabled:opacity-60 disabled:cursor-not-allowed">
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
              <p v-if="editingItemHasDeliveries"
                class="mt-1.5 flex items-start gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <Lock class="h-3.5 w-3.5 mt-0.5 flex-none" />
                <span>{{ t('items.unitLockedHint') }}</span>
              </p>
            </div>

            <!-- Tags -->
            <TagSelector v-model="form.tags" :label="t('tags.itemTags')" tag-type="item_category"
              :placeholder="t('tags.searchItemTags')" />

            <div class="flex space-x-3 pt-4">
              <button type="submit" :disabled="formLoading" class="flex-1 btn-primary">
                <Loader2 v-if="formLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ formLoading ? (editingItem ? t('common.updating') : t('common.creating')) : (editingItem ? t('common.update') : t('common.create')) }}
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
import { ref, reactive, computed, nextTick } from 'vue';
import { useQuickActionModal } from '../composables/useQuickActionModal';
import { useKeyboardShortcutSingle } from '../composables/useKeyboardShortcut';
import { useRouter } from 'vue-router';
import { Package, Plus, Edit2, Trash2, Loader2, Copy, Lock } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import { useSiteData } from '../composables/useSiteData';
import Skeleton from '../components/Skeleton.vue';
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
import { useModalState } from '../composables/useModalState';
import { computeItemDeliveryStats, getDeliveredQuantity, getAveragePrice } from '../utils/itemAggregations';

const { t } = useI18n();
const { checkCreateLimit, isReadOnly } = useSubscription();
const { success, error } = useToast();
const { canDelete } = usePermissions();
const { openModal, closeModal: closeModalState } = useModalState();

const router = useRouter();

// Search functionality
const { searchQuery, loading: searchLoading, results: searchResults } = useItemSearch();

// Use site-aware data loading
const { data: itemsData, loading, reload: reloadItems } = useSiteData(async () => {
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


// Precompute per-item delivery stats ONCE per deliveries change, so each item card
// reads its totals via an O(1) Map lookup instead of re-scanning every delivery.
const itemDeliveryStats = computed(() => computeItemDeliveryStats(deliveries.value));

const getItemDeliveredQuantity = (itemId: string) =>
  getDeliveredQuantity(itemDeliveryStats.value, itemId);

// Units must not change once deliveries exist for the item — changing the unit
// would silently corrupt delivered-quantity and average-price calculations.
const editingItemHasDeliveries = computed(() =>
  !!editingItem.value && getItemDeliveredQuantity(editingItem.value.id!) > 0
);

const getItemAveragePrice = (itemId: string) =>
  getAveragePrice(itemDeliveryStats.value, itemId);

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
  openModal('items-add-modal', closeModal);
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

const editItem = async (item: Item) => {
  editingItem.value = item;
  Object.assign(form, {
    name: item.name,
    description: item.description || '',
    unit: item.unit,
    tags: item.tags || []
  });
  showAddModal.value = true;
  openModal('items-edit-modal', closeModal);
  await nextTick();
  if (typeof nameInputRef.value?.focus === 'function') nameInputRef.value.focus();
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
  openModal('items-clone-modal', closeModal);
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
  closeModalState('items-add-modal');
  closeModalState('items-edit-modal');
  closeModalState('items-clone-modal');
};

const handleQuickAction = async () => {
  showAddModal.value = true;
  openModal('items-add-modal', closeModal);
  await nextTick();
  nameInputRef.value?.focus();
};

// Keyboard shortcut for adding new item (Shift+Alt+N)
useKeyboardShortcutSingle('n', handleAddItem, { shiftKey: true, altKey: true });

// Handle custom event for modal
useQuickActionModal(handleQuickAction);
</script>