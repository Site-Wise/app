<template>
  <div v-if="isVisible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="handleBackdropClick" @keydown.esc="handleEscape" tabindex="-1">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-5xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 m-4" @click.stop>
      <div class="mt-3">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ title }}</h3>
          <button @click="handleClose" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X class="h-6 w-6" />
          </button>
        </div>
        
        <!-- Content -->
        <div class="max-h-[70vh] overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
          <div v-html="content"></div>
        </div>
        
        <!-- Footer -->
        <div class="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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