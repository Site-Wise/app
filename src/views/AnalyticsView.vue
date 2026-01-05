<template>
  <div class="pb-20">
    <!-- Header -->
    <div class="mb-4 sm:mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{{ t('analytics.title') }}</h1>
          <p class="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{{ t('analytics.subtitle') }}</p>
        </div>
        <button
          @click="showSaveModal = true"
          :disabled="!hasActiveFilters"
          class="btn-secondary text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save class="h-4 w-4" />
          <span>{{ t('analytics.saveFilters') }}</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
      <!-- Filters Panel - Left Sidebar on Desktop, Top on Mobile -->
      <div class="lg:col-span-1">
        <div class="card p-4 sticky top-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('analytics.filters') }}</h2>

          <!-- Tags Filter -->
          <div class="mb-4">
            <label class="label">{{ t('analytics.selectTags') }}</label>
            <TagSelector
              v-model="filters.tagIds"
              :type-filter="'item_category'"
              :multiple="true"
              :placeholder="t('analytics.selectTags')"
            />
            <p v-if="filters.tagIds.length === 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ t('analytics.noTagsSelected') }}
            </p>
          </div>

          <!-- Date Range Filter -->
          <div class="mb-4">
            <label class="label">{{ t('analytics.dateRange') }}</label>
            <div class="space-y-2">
              <input
                v-model="filters.dateFrom"
                type="date"
                class="input text-sm"
                :placeholder="t('analytics.dateFrom')"
              />
              <input
                v-model="filters.dateTo"
                type="date"
                class="input text-sm"
                :placeholder="t('analytics.dateTo')"
              />
            </div>
          </div>

          <!-- Amount Range Filter -->
          <div class="mb-4">
            <label class="label">{{ t('analytics.amountRange') }}</label>
            <div class="space-y-2">
              <input
                v-model.number="filters.amountMin"
                type="number"
                min="0"
                class="input text-sm"
                :placeholder="t('analytics.amountMin')"
              />
              <input
                v-model.number="filters.amountMax"
                type="number"
                min="0"
                class="input text-sm"
                :placeholder="t('analytics.amountMax')"
              />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-2">
            <button
              @click="calculateAnalytics"
              :disabled="loading"
              class="btn-primary w-full"
            >
              <BarChart3 v-if="!loading" class="h-4 w-4" />
              <Loader2 v-else class="h-4 w-4 animate-spin" />
              <span>{{ loading ? t('analytics.calculating') : t('analytics.calculate') }}</span>
            </button>
            <button
              @click="resetFilters"
              :disabled="!hasActiveFilters"
              class="btn-secondary w-full disabled:opacity-50"
            >
              <RotateCcw class="h-4 w-4" />
              <span>{{ t('analytics.reset') }}</span>
            </button>
          </div>

          <!-- Saved Settings -->
          <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {{ t('analytics.savedSettings') }}
            </h3>

            <div v-if="loadingSettings" class="flex justify-center py-4">
              <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
            </div>

            <div v-else-if="savedSettings.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              {{ t('analytics.noSettingsSaved') }}
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="setting in savedSettings"
                :key="setting.id"
                class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <button
                  @click="loadSetting(setting.id!)"
                  class="flex-1 text-left text-sm text-gray-900 dark:text-white truncate"
                  :title="setting.name"
                >
                  {{ setting.name }}
                </button>
                <button
                  @click="confirmDeleteSetting(setting.id!)"
                  class="ml-2 p-1 text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded"
                  :title="t('analytics.deleteSetting')"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Panel - Main Content -->
      <div class="lg:col-span-3">
        <!-- Empty State -->
        <div v-if="!analyticsData" class="card p-8 text-center">
          <BarChart3 class="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {{ t('analytics.results') }}
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            {{ hasActiveFilters ? t('analytics.messages.calculateFirst') : t('analytics.messages.noFiltersApplied') }}
          </p>
        </div>

        <!-- Results Display -->
        <div v-else class="space-y-4 sm:space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <!-- Total Cost -->
            <div class="card p-3 sm:p-4">
              <div class="flex items-center mb-2">
                <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <DollarSign class="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{{ t('analytics.summary.totalCost') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                ₹{{ formatCompactAmount(analyticsData.totalCost) }}
              </p>
            </div>

            <!-- Average Cost Per Item -->
            <div class="card p-3 sm:p-4">
              <div class="flex items-center mb-2">
                <div class="p-2 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg">
                  <Package class="h-4 w-4 sm:h-5 sm:w-5 text-secondary-600 dark:text-secondary-400" />
                </div>
              </div>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{{ t('analytics.summary.averageCostPerItem') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                ₹{{ formatCompactAmount(analyticsData.averageCostPerItem) }}
              </p>
            </div>

            <!-- Average Cost Per Delivery -->
            <div class="card p-3 sm:p-4">
              <div class="flex items-center mb-2">
                <div class="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                  <TruckIcon class="h-4 w-4 sm:h-5 sm:w-5 text-warning-600 dark:text-warning-400" />
                </div>
              </div>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{{ t('analytics.summary.averageCostPerDelivery') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                ₹{{ formatCompactAmount(analyticsData.averageCostPerDelivery) }}
              </p>
            </div>

            <!-- Item Count -->
            <div class="card p-3 sm:p-4">
              <div class="flex items-center mb-2">
                <div class="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                  <Hash class="h-4 w-4 sm:h-5 sm:w-5 text-success-600 dark:text-success-400" />
                </div>
              </div>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{{ t('analytics.summary.itemCount') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {{ analyticsData.itemCount }}
              </p>
            </div>

            <!-- Delivery Count -->
            <div class="card p-3 sm:p-4">
              <div class="flex items-center mb-2">
                <div class="p-2 bg-info-100 dark:bg-info-900/30 rounded-lg">
                  <FileText class="h-4 w-4 sm:h-5 sm:w-5 text-info-600 dark:text-info-400" />
                </div>
              </div>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{{ t('analytics.summary.deliveryCount') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {{ analyticsData.deliveryCount }}
              </p>
            </div>

            <!-- Total Quantity -->
            <div class="card p-3 sm:p-4">
              <div class="flex items-center mb-2">
                <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Boxes class="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{{ t('analytics.summary.totalQuantity') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {{ analyticsData.totalQuantity.toLocaleString() }}
              </p>
            </div>
          </div>

          <!-- Cost by Tag Chart -->
          <div v-if="analyticsData.costByTag.length > 0" class="card p-4 sm:p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {{ t('analytics.charts.costByTag') }}
            </h3>
            <div class="h-64 sm:h-80">
              <Bar :data="costByTagChartData" :options="chartOptions" />
            </div>
          </div>

          <!-- Cost Over Time Chart -->
          <div v-if="analyticsData.costOverTime.length > 0" class="card p-4 sm:p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {{ t('analytics.charts.costOverTime') }}
            </h3>
            <div class="h-64 sm:h-80">
              <Line :data="costOverTimeChartData" :options="chartOptions" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Setting Modal -->
    <div
      v-if="showSaveModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showSaveModal = false"
    >
      <div class="card p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('analytics.saveFilters') }}
        </h2>
        <label class="label">{{ t('analytics.settingName') }}</label>
        <input
          ref="settingNameInput"
          v-model="settingName"
          type="text"
          class="input mb-4"
          :placeholder="t('analytics.enterSettingName')"
          @keyup.enter="handleSaveSetting"
          @keyup.esc="showSaveModal = false"
        />
        <div class="flex gap-2 justify-end">
          <button @click="showSaveModal = false" class="btn-secondary">
            {{ t('common.cancel') }}
          </button>
          <button
            @click="handleSaveSetting"
            :disabled="!settingName.trim()"
            class="btn-primary disabled:opacity-50"
          >
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showDeleteConfirm = false"
    >
      <div class="card p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('analytics.deleteSetting') }}
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ t('analytics.confirmDelete') }}
        </p>
        <div class="flex gap-2 justify-end">
          <button @click="showDeleteConfirm = false" class="btn-secondary">
            {{ t('common.cancel') }}
          </button>
          <button @click="handleDeleteSetting" class="btn-danger">
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useI18n } from '../composables/useI18n';
import { useAnalytics } from '../composables/useAnalytics';
import { useSiteData } from '../composables/useSiteData';
import { tagService, type Tag } from '../services/pocketbase';
import TagSelector from '../components/TagSelector.vue';
import {
  BarChart3,
  DollarSign,
  Package,
  TruckIcon,
  Hash,
  FileText,
  Boxes,
  Save,
  RotateCcw,
  Trash2,
  Loader2
} from 'lucide-vue-next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'vue-chartjs';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const { t } = useI18n();

const {
  filters,
  analyticsData,
  loading,
  savedSettings,
  loadingSettings,
  hasActiveFilters,
  calculateAnalytics,
  loadSavedSettings,
  saveSetting,
  loadSetting,
  deleteSetting,
  resetFilters,
  formatCompactAmount
} = useAnalytics();

// Load tags for tag selector
const { data: tagsData } = useSiteData(async () => {
  const tags = await tagService.getAll();
  return { tags };
});

const tags = computed(() => tagsData.value?.tags || []);

// Modal states
const showSaveModal = ref(false);
const showDeleteConfirm = ref(false);
const settingName = ref('');
const settingToDelete = ref<string | null>(null);
const settingNameInput = ref<HTMLInputElement | null>(null);

// Chart data
const costByTagChartData = computed(() => {
  if (!analyticsData.value || !analyticsData.value.costByTag.length) {
    return { labels: [], datasets: [] };
  }

  return {
    labels: analyticsData.value.costByTag.map(item => item.tagName),
    datasets: [
      {
        label: t('analytics.charts.costByTag'),
        data: analyticsData.value.costByTag.map(item => item.cost),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }
    ]
  };
});

const costOverTimeChartData = computed(() => {
  if (!analyticsData.value || !analyticsData.value.costOverTime.length) {
    return { labels: [], datasets: [] };
  }

  return {
    labels: analyticsData.value.costOverTime.map(item => item.date),
    datasets: [
      {
        label: t('analytics.charts.costOverTime'),
        data: analyticsData.value.costOverTime.map(item => item.cost),
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
};

// Handlers
const handleSaveSetting = async () => {
  if (!settingName.value.trim()) return;

  const success = await saveSetting(settingName.value.trim());
  if (success) {
    showSaveModal.value = false;
    settingName.value = '';
  }
};

const confirmDeleteSetting = (id: string) => {
  settingToDelete.value = id;
  showDeleteConfirm.value = true;
};

const handleDeleteSetting = async () => {
  if (!settingToDelete.value) return;

  const success = await deleteSetting(settingToDelete.value);
  if (success) {
    showDeleteConfirm.value = false;
    settingToDelete.value = null;
  }
};

// Auto-focus setting name input when modal opens
const focusSettingNameInput = async () => {
  await nextTick();
  settingNameInput.value?.focus();
};

// Watch for modal open
const originalShowSaveModal = showSaveModal.value;
const unwatchShowSaveModal = () => {
  if (showSaveModal.value && !originalShowSaveModal) {
    focusSettingNameInput();
  }
};

onMounted(async () => {
  await loadSavedSettings();
});
</script>
