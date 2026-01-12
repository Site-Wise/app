<template>
  <div v-if="show" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]" @click="$emit('close')" @keydown.esc="$emit('close')" tabindex="-1">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4 mb-20 lg:mb-4" @click.stop>
      <div class="mt-3">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {{ t('items.addItem') }}
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
              {{ t('common.create') }}
            </button>
            <button type="button" @click="$emit('close')" class="flex-1 btn-outline">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Loading Overlay -->
    <LoadingOverlay
      :show="showOverlay"
      :state="overlayState"
      :message="overlayMessage"
      @close="handleOverlayClose"
      @timeout="handleOverlayTimeout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import TagSelector from './TagSelector.vue';
import LoadingOverlay from './LoadingOverlay.vue';
import {
  itemService,
  type Item
} from '../services/pocketbase';

interface Props {
  show: boolean;
  initialName?: string;
}

interface Emits {
  (e: 'close'): void;
  (e: 'created', item: Item): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialName: ''
});

const emit = defineEmits<Emits>();

const { t } = useI18n();
const { checkCreateLimit } = useSubscription();

const formLoading = ref(false);
const nameInputRef = ref<HTMLInputElement>();

// Loading overlay state
const showOverlay = ref(false);
const overlayState = ref<'loading' | 'success' | 'error' | 'timeout'>('loading');
const overlayMessage = ref('');

const handleOverlayClose = () => {
  showOverlay.value = false;
  overlayState.value = 'loading';
  overlayMessage.value = '';
};

const handleOverlayTimeout = () => {
  overlayState.value = 'timeout';
  overlayMessage.value = t('loading.timeout');
};

const form = reactive({
  name: '',
  description: '',
  unit: '',
  tags: [] as string[]
});

const resetForm = () => {
  form.name = props.initialName;
  form.description = '';
  form.unit = '';
  form.tags = [];
};

const saveItem = async () => {
  formLoading.value = true;
  showOverlay.value = true;
  overlayState.value = 'loading';
  overlayMessage.value = '';

  try {
    if (!checkCreateLimit('items')) {
      overlayState.value = 'error';
      overlayMessage.value = t('subscription.banner.freeTierLimitReached');
      formLoading.value = false;
      return;
    }

    const newItem = await itemService.create(form);
    overlayState.value = 'success';
    overlayMessage.value = t('messages.createSuccess', { item: t('common.item') });

    // Wait for success animation then emit and close
    setTimeout(() => {
      emit('created', newItem);
      resetForm();
      showOverlay.value = false;
    }, 1500);
  } catch (err) {
    console.error('Error saving item:', err);
    overlayState.value = 'error';
    overlayMessage.value = t('messages.error');
  } finally {
    formLoading.value = false;
  }
};

// Watch for show prop changes to reset form and focus
watch(() => props.show, async (newShow) => {
  if (newShow) {
    resetForm();
    await nextTick();
    nameInputRef.value?.focus();
  }
});

// Watch for initialName changes
watch(() => props.initialName, (newName) => {
  if (props.show) {
    form.name = newName;
  }
});
</script>