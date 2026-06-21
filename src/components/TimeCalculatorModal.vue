<template>
  <!-- Overlay -->
  <div
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm"
    @click="$emit('close')"
    @keydown.esc="$emit('close')"
    tabindex="-1"
  >
    <!-- Panel -->
    <div
      class="w-full sm:max-w-md bg-white dark:bg-ink-3 shadow-modal border border-stone-200 dark:border-ink-4 rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      @click.stop
    >
      <!-- Grab handle (mobile only) -->
      <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
        <div class="mx-auto h-1 w-10 rounded-full bg-stone-300 dark:bg-ink-4" />
      </div>

      <!-- Sticky header -->
      <div class="sticky top-0 z-10 bg-white dark:bg-ink-3 border-b border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <h3 class="font-display text-lg font-semibold text-ink dark:text-cream flex-1">{{ t('serviceBookings.timeCalculator') }}</h3>
        <button
          @click="$emit('close')"
          class="h-9 w-9 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors active:scale-[0.98]"
          :aria-label="t('common.close')"
        >
          <X class="h-6 w-6" />
        </button>
      </div>

      <!-- Scrollable body -->
      <form @submit.prevent="calculateAndApply" class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4 scroll-smooth-touch">
          <!-- Date Selection -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('common.date') }}</label>
            <input v-model="selectedDate" type="date" required class="input mt-1" />
          </div>

          <!-- Start Time -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('serviceBookings.startTime') }}</label>
            <input v-model="startTime" type="time" required class="input mt-1" @input="calculateDuration"
              ref="startTimeInputRef" />
          </div>

          <!-- End Time -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">{{ t('serviceBookings.endTime') }}</label>
            <input v-model="endTime" type="time" required class="input mt-1" @input="calculateDuration" />
          </div>

          <!-- Calculated Duration Display -->
          <div v-if="calculatedHours > 0"
            class="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-md border border-amber-200 dark:border-amber-700">
            <div class="flex items-center">
              <Clock class="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
              <div>
                <p class="text-sm font-medium text-ink dark:text-cream">
                  {{ t('serviceBookings.calculatedDuration') }}
                </p>
                <p class="text-lg font-mono font-bold sw-tabular text-ink dark:text-cream">
                  {{ calculatedHours }} {{ calculatedHours === 1 ? t('units.hour') : t('units.hours') }}
                </p>
                <p class="text-xs font-mono text-stone-600 dark:text-stone-300">
                  {{ formatTime(startTime) }} - {{ formatTime(endTime) }}
                  <span v-if="isNextDay" class="ml-1 text-amber-700 dark:text-amber-400">({{ t('serviceBookings.nextDay') }})</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage"
            class="p-3 bg-clay-50 dark:bg-clay-900/20 rounded-md border border-clay-200 dark:border-clay-800">
            <p class="text-sm text-clay-600 dark:text-clay-400">{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Sticky footer -->
        <div class="sticky bottom-0 bg-white dark:bg-ink-3 border-t border-stone-200 dark:border-ink-4 px-5 sm:px-6 py-4 flex gap-3 flex-shrink-0 pb-safe">
          <button type="submit" :disabled="calculatedHours <= 0" :class="[
            calculatedHours > 0 ? 'btn-primary' : 'btn-disabled',
            'flex-1 active:scale-[0.98]'
          ]">
            {{ t('serviceBookings.applyDuration') }}
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
