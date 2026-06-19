<template>
  <div v-if="isVisible" class="fixed inset-0 bg-ink/60 overflow-y-auto h-full w-full z-[60]" @click="handleBackdropClick" @keydown.esc="handleEscape" tabindex="-1">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-5xl shadow-modal rounded-xl bg-white dark:bg-ink-3 border-stone-200 dark:border-ink-4 m-4 mb-20 lg:mb-4" @click.stop>
      <div class="mt-3">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-ink dark:text-cream">{{ title }}</h3>
          <button @click="handleClose" class="text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream">
            <X class="h-6 w-6" />
          </button>
        </div>

        <!-- Content -->
        <div class="max-h-[70vh] overflow-y-auto border border-stone-200 dark:border-ink-4 rounded-lg bg-stone-50 dark:bg-ink-2 p-4">
          <div class="text-sm text-stone-700 dark:text-stone-300 [&_h1]:text-ink dark:[&_h1]:text-cream [&_h2]:text-ink dark:[&_h2]:text-cream [&_h3]:text-ink dark:[&_h3]:text-cream [&_strong]:text-ink dark:[&_strong]:text-cream" v-html="content"></div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end mt-6 pt-4 border-t border-stone-200 dark:border-ink-4">
          <button @click="handleClose" class="btn-outline">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
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

// Computed properties
const title = computed(() => {
  switch (props.type) {
    case 'terms':
      return 'Terms and Conditions';
    case 'privacy':
      return 'Privacy Policy';
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