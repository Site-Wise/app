<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="$emit('close')"
    @keydown.esc="$emit('close')" tabindex="-1">
    <div
      class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      @click.stop>
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('serviceBookings.timeCalculator') }}</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="calculateAndApply" class="space-y-4">
          <!-- Date Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.date') }}</label>
            <input v-model="selectedDate" type="date" required class="input mt-1"  />
          </div>

          <!-- Start Time -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.startTime')
            }}</label>
            <input v-model="startTime" type="time" required class="input mt-1" @input="calculateDuration"
              ref="startTimeInputRef" />
          </div>

          <!-- End Time -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('serviceBookings.endTime')
            }}</label>
            <input v-model="endTime" type="time" required class="input mt-1" @input="calculateDuration" />
          </div>

          <!-- Calculated Duration Display -->
          <div v-if="calculatedHours > 0"
            class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <div class="flex items-center">
              <Clock class="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <p class="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {{ t('serviceBookings.calculatedDuration') }}
                </p>
                <p class="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {{ calculatedHours }} {{ calculatedHours === 1 ? t('units.hour') : t('units.hours') }}
                </p>
                <p class="text-xs text-blue-700 dark:text-blue-300">
                  {{ formatTime(startTime) }} - {{ formatTime(endTime) }}
                  <span v-if="isNextDay" class="ml-1 text-blue-600 dark:text-blue-400">({{ t('serviceBookings.nextDay')
                  }})</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage"
            class="p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
            <p class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
          </div>

          <!-- Buttons -->
          <div class="flex space-x-3 pt-4">
            <button type="submit" :disabled="calculatedHours <= 0" :class="[
              calculatedHours > 0 ? 'btn-primary' : 'btn-disabled'
            ]">
              {{ t('serviceBookings.applyDuration') }}
            </button>
            <button type="button" @click="$emit('close')" class="flex-1 btn-outline">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { X, Clock } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';

interface Props {
  currentDate?: string;
  currentDuration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  currentDate: '',
  currentDuration: 0
});

const emit = defineEmits<{
  close: [];
  apply: [duration: number, date: string];
}>();

const { t } = useI18n();

// Refs
const startTimeInputRef = ref<HTMLInputElement>();

// Form data
const selectedDate = ref(props.currentDate || new Date().toISOString().split('T')[0]);
const startTime = ref('09:00');
const endTime = ref('17:00');
const errorMessage = ref('');

// Computed
const calculatedHours = computed(() => {
  if (!startTime.value || !endTime.value) return 0;

  try {
    const start = new Date(`${selectedDate.value}T${startTime.value}`);
    let end = new Date(`${selectedDate.value}T${endTime.value}`);

    // Handle overnight work (end time is next day)
    if (end <= start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
    }

    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    // round to nearest two decimals
    return Math.round(hours * 100) / 100;
  } catch {
    return 0;
  }
});

const isNextDay = computed(() => {
  if (!startTime.value || !endTime.value) return false;
  return endTime.value <= startTime.value;
});

// Methods
const calculateDuration = () => {
  errorMessage.value = '';

  if (!startTime.value || !endTime.value) {
    return;
  }

  if (calculatedHours.value <= 0) {
    errorMessage.value = t('serviceBookings.invalidTimeRange');
  } else if (calculatedHours.value > 24) {
    errorMessage.value = t('serviceBookings.durationTooLong');
  }
};

const formatTime = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
};

const calculateAndApply = () => {
  if (calculatedHours.value > 0 && !errorMessage.value) {
    emit('apply', calculatedHours.value, selectedDate.value);
  }
};

// Initialize with current duration if provided
onMounted(async () => {
  await nextTick();

  // If we have a current duration, try to set reasonable default times
  if (props.currentDuration > 0) {
    startTime.value = '09:00';
    const startHour = 9;
    const endHour = startHour + props.currentDuration;
    const endHours = Math.floor(endHour);
    const endMinutes = Math.round((endHour - endHours) * 60);

    if (endHour < 24) {
      endTime.value = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    } else {
      endTime.value = '17:00'; // Default to 5 PM if calculated end time exceeds 24 hours
    }
  }

  calculateDuration();

  // Focus on start time for quick input
  startTimeInputRef.value?.focus();
});
</script>