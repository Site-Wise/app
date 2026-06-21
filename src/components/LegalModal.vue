<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm"
    @click="handleBackdropClick"
    @keydown.esc="handleEscape"
    tabindex="-1"
  >
    <!-- Panel — legal uses max-w-2xl on desktop for comfortable reading -->
    <div
      class="w-full sm:max-w-2xl bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      @click.stop
    >
      <!-- Grab handle (mobile only) -->
      <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
        <div class="mx-auto h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4" />
      </div>

      <!-- Sticky header -->
      <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <h3 class="font-display text-lg font-semibold text-ink dark:text-cream flex-1">{{ title }}</h3>
        <button
          @click="handleClose"
          class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors active:scale-[0.98]"
          :aria-label="t('common.close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 scroll-smooth-touch">
        <div
          class="text-sm text-stone-700 dark:text-stone-300 [&_h1]:text-ink dark:[&_h1]:text-cream [&_h2]:text-ink dark:[&_h2]:text-cream [&_h3]:text-ink dark:[&_h3]:text-cream [&_strong]:text-ink dark:[&_strong]:text-cream"
          v-html="content"
        ></div>
      </div>

      <!-- Sticky footer -->
      <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex gap-3 flex-shrink-0 pb-safe">
        <button @click="handleClose" class="flex-1 btn-outline active:scale-[0.98]">
          {{ t('common.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { termsAndConditionsHtml, privacyPolicyHtml } from '../assets/legal';

// Props
interface Props {
  isVisible: boolean;
  type: 'terms' | 'privacy';
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();

// Composables
const { t } = useI18n();

// Computed properties
const title = computed(() => {
  switch (props.type) {
    case 'terms':
      return t('legal.termsAndConditions');
    case 'privacy':
      return t('legal.privacyPolicy');
    default:
      return '';
  }
});

const content = computed(() => {
  switch (props.type) {
    case 'terms':
      return termsAndConditionsHtml;
    case 'privacy':
      return privacyPolicyHtml;
    default:
      return '';
  }
});

// Methods
const handleClose = () => {
  emit('close');
};

const handleBackdropClick = () => {
  emit('close');
};

const handleEscape = () => {
  emit('close');
};
</script>
