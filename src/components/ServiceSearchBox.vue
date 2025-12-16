<template>
  <div class="relative">
    <div class="relative">
      <input
        ref="inputRef"
        type="text"
        :placeholder="placeholder"
        :value="inputDisplayValue"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @click="handleClick"
        @keydown.down.prevent="navigateDown"
        @keydown.up.prevent="navigateUp"
        @keydown.enter.prevent="selectCurrent"
        @keydown.escape.prevent="closeDropdown"
        class="w-full px-4 py-3 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        :class="{
          'border-red-500 dark:border-red-500': hasError,
          'pr-20': selectedService && !searchQuery && selectedService.standard_rate,
          'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700': disabled
        }"
        :autofocus="autofocus"
        :required="required"
        :name="name"
        :disabled="disabled"
      />
      <!-- Standard rate display in input -->
      <div v-if="selectedService && !searchQuery && selectedService.standard_rate" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <div class="text-right">
          <div class="text-sm font-semibold text-gray-600 dark:text-gray-400">
            ₹{{ selectedService.standard_rate.toFixed(2) }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('services.perUnit') }}
          </div>
        </div>
      </div>
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <div v-if="loading" class="absolute inset-y-0 right-0 flex items-center pointer-events-none"
           :class="selectedService && !searchQuery && selectedService.standard_rate ? 'pr-24' : 'pr-3'">
        <Loader2 class="h-4 w-4 animate-spin text-gray-400" />
      </div>
    </div>

    <!-- Dropdown with services -->
    <div
      v-if="showDropdown && (filteredServices.length > 0 || selectedService)"
      class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
      <!-- Selected service -->
      <div
        v-if="selectedService && !searchQuery"
        class="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <div>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ selectedService.name }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
                ({{ selectedService.category }})
              </span>
            </div>
          </div>
          <div v-if="selectedService.standard_rate" class="text-right">
            <div class="text-sm font-semibold text-gray-600 dark:text-gray-400">
              ₹{{ selectedService.standard_rate.toFixed(2) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              / {{ selectedService.unit || t('services.unit') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Service search results -->
      <div v-if="filteredServices.length > 0" class="py-1">
        <div
          v-for="(service, index) in filteredServices"
          :key="service.id"
          @mousedown="selectService(service)"
          @mouseenter="highlightedIndex = index"
          class="px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          :class="{ 'bg-gray-50 dark:bg-gray-700': highlightedIndex === index }"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="text-gray-900 dark:text-white">{{ service.name }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
                ({{ service.category }})
              </span>
            </div>
            <div v-if="service.standard_rate" class="text-right">
              <div class="text-xs text-gray-600 dark:text-gray-400">
                ₹{{ service.standard_rate.toFixed(2) }} / {{ service.unit || t('services.unit') }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No results message -->
      <div v-if="filteredServices.length === 0 && searchQuery && !selectedService" class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {{ t('services.noServicesFound', { query: searchQuery }) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import type { Service } from '../services/pocketbase';
import { useI18n } from '../composables/useI18n';

interface Props {
  modelValue: string;
  services: Service[];
  placeholder?: string;
  loading?: boolean;
  autofocus?: boolean;
  required?: boolean;
  name?: string;
  hasError?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search services...',
  loading: false,
  autofocus: false,
  required: false,
  name: 'service',
  hasError: false,
  disabled: false
});

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'service-selected', service: Service): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
}

const emit = defineEmits<Emits>();

const { t } = useI18n();

// Refs
const inputRef = ref<HTMLInputElement>();
const searchQuery = ref('');
const showDropdown = ref(false);
const highlightedIndex = ref(-1);

// Computed properties
const selectedService = computed(() => {
  if (!props.modelValue) return null;
  return props.services.find(s => s.id === props.modelValue) || null;
});

const inputDisplayValue = computed(() => {
  if (searchQuery.value) {
    return searchQuery.value;
  }
  if (selectedService.value) {
    return `${selectedService.value.name} (${selectedService.value.category})`;
  }
  return '';
});

const filteredServices = computed(() => {
  if (!searchQuery.value) return [];

  const query = searchQuery.value.toLowerCase();
  return props.services.filter(service =>
    (service.name?.toLowerCase().includes(query) ||
     service.category?.toLowerCase().includes(query)) &&
    service.id !== props.modelValue // Don't show already selected service
  );
});

// Event handlers
const handleInput = (event: Event) => {
  if (props.disabled) return;

  const target = event.target as HTMLInputElement;
  searchQuery.value = target.value;
  highlightedIndex.value = -1;

  // If user starts typing and there's a selected service, clear the selection
  if (target.value && selectedService.value) {
    emit('update:modelValue', '');
  }

  if (target.value) {
    showDropdown.value = true;
  } else {
    showDropdown.value = false;
  }
};

const handleFocus = () => {
  if (props.disabled) return;

  emit('focus');

  // Only show dropdown if user is actively searching
  if (searchQuery.value) {
    showDropdown.value = true;
  }
};

const handleClick = () => {
  if (props.disabled) return;

  // When user clicks on input, show dropdown to allow service selection/change
  if (selectedService.value && !searchQuery.value) {
    showDropdown.value = true;

    // Select all text to make it easy to replace the service name
    setTimeout(() => {
      inputRef.value?.select();
    }, 0);
  }
};

const handleBlur = () => {
  emit('blur');

  // Delay hiding dropdown to allow for clicks
  setTimeout(() => {
    showDropdown.value = false;
    searchQuery.value = '';
    highlightedIndex.value = -1;
  }, 200);
};

const selectService = (service: Service) => {
  emit('update:modelValue', service.id!);
  emit('service-selected', service);

  searchQuery.value = '';
  showDropdown.value = false;
  highlightedIndex.value = -1;
};

const navigateDown = () => {
  if (filteredServices.value.length > 0) {
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredServices.value.length - 1);
  }
};

const navigateUp = () => {
  if (filteredServices.value.length > 0) {
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
  }
};

const selectCurrent = () => {
  if (highlightedIndex.value >= 0 && filteredServices.value[highlightedIndex.value]) {
    selectService(filteredServices.value[highlightedIndex.value]);
  }
};

const closeDropdown = () => {
  showDropdown.value = false;
  searchQuery.value = '';
  highlightedIndex.value = -1;
};

// Public methods
const focus = () => {
  inputRef.value?.focus();
};

// Watch for changes to show appropriate display
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    searchQuery.value = '';
  }
});

// Expose focus method
defineExpose({ focus });
</script>

<style scoped>
/* Add custom scrollbar styling for dropdown */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}
</style>
