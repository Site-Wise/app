<template>
  <!-- Overlay -->
  <div
    v-if="show"
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm"
    @click="$emit('close')"
    @keydown.esc="$emit('close')"
    tabindex="-1"
  >
    <!-- Panel -->
    <div
      class="w-full sm:max-w-lg bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      @click.stop
    >
      <!-- Grab handle (mobile only) -->
      <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
        <div class="mx-auto h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4" />
      </div>

      <!-- Sticky header -->
      <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <h2 class="font-display text-lg font-semibold text-ink dark:text-cream flex-1">
          {{ t('items.addItem') }}
        </h2>
        <button
          type="button"
          @click="$emit('close')"
          class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors active:scale-[0.98]"
          :aria-label="t('common.close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Scrollable body -->
      <form @submit.prevent="saveItem" class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4 scroll-smooth-touch">
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.name') }}</label>
            <input ref="nameInputRef" v-model="form.name" type="text" required class="input mt-1" :placeholder="t('forms.enterItemName')" autofocus autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.description') }}</label>
            <textarea v-model="form.description" class="input mt-1" rows="3" :placeholder="t('forms.enterDescription')" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('items.unit') }}</label>
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
        </div>

        <!-- Sticky footer -->
        <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex gap-3 flex-shrink-0 pb-safe">
          <button type="submit" :disabled="formLoading" class="flex-1 btn-primary active:scale-[0.98]">
            <Loader2 v-if="formLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ formLoading ? t('common.creating') : t('common.create') }}
          </button>
          <button type="button" @click="$emit('close')" class="flex-1 btn-outline active:scale-[0.98]">
            {{ t('common.cancel') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue';
import { Loader2, X } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useSubscription } from '../composables/useSubscription';
import { useToast } from '../composables/useToast';
import TagSelector from './TagSelector.vue';
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
const { success, error } = useToast();

const formLoading = ref(false);
const nameInputRef = ref<HTMLInputElement>();

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
  try {
    if (!checkCreateLimit('items')) {
      error(t('subscription.banner.freeTierLimitReached'));
      return;
    }

    const newItem = await itemService.create(form);
    success(t('messages.createSuccess', { item: t('common.item') }));
    emit('created', newItem);
    resetForm();
  } catch (err) {
    console.error('Error saving item:', err);
    error(t('messages.error'));
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
