<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{{ t('analytics.title') }}</h1>
          <p class="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{{ t('analytics.subtitle') }}</p>
        </div>
        <button
          @click="showSaveModal = true"
          :disabled="!hasActiveFilters"
          :class="[
            hasActiveFilters ? 'btn-primary' : 'btn-disabled',
            'text-sm whitespace-nowrap'
          ]"
        >
          <Save class="h-4 w-4" />
          <span>{{ t('analytics.saveFilters') }}</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Filters Panel - Left Sidebar on Desktop, Top on Mobile -->
      <div class="lg:col-span-1">
        <div class="card p-4 lg:sticky lg:top-4">
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
        <div v-else class="space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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
          <div v-if="analyticsData.costByTag.length > 0" class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {{ t('analytics.charts.costByTag') }}
            </h3>
            <div class="h-64 sm:h-80">
              <Pie :data="costByTagChartData" :options="pieChartOptions" />
            </div>
          </div>

          <!-- Cost Over Time Chart -->
          <div v-if="analyticsData.costOverTime.length > 0" class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {{ t('analytics.charts.costOverTime') }}
            </h3>
            <div class="h-64 sm:h-80">
              <Bar :data="costOverTimeChartData" :options="barChartOptions" />
            </div>
          </div>

          <!-- Quantity by Unit Breakdown -->
          <div v-if="analyticsData.quantityByUnit.length > 0" class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {{ t('analytics.quantityByUnit.title') }}
            </h3>
            <div class="space-y-3">
              <div
                v-for="unitData in analyticsData.quantityByUnit"
                :key="unitData.unit"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ unitData.unit }}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      ({{ unitData.itemCount }} {{ unitData.itemCount === 1 ? t('analytics.quantityByUnit.item') : t('analytics.quantityByUnit.items') }})
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-primary-600 dark:text-primary-400">
                    {{ unitData.quantity.toLocaleString() }}
                  </div>
                </div>
              </div>
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
          v-model="settingName"
          type="text"
          class="input mb-4"
          :placeholder="t('analytics.enterSettingName')"
          @keyup.enter="handleSaveSetting"
          @keyup.esc="showSaveModal = false"
          autofocus
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
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '../composables/useI18n';
import { useAnalytics } from '../composables/useAnalytics';
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
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie, Bar } from 'vue-chartjs';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

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

// Modal states
const showSaveModal = ref(false);
const showDeleteConfirm = ref(false);
const settingName = ref('');
const settingToDelete = ref<string | null>(null);

// Chart data
const costByTagChartData = computed(() => {
  if (!analyticsData.value || !analyticsData.value.costByTag.length) {
    return { labels: [], datasets: [] };
  }

  // Color palette for pie chart segments
  const colors = [
    'rgba(34, 197, 94, 0.8)',    // Green
    'rgba(59, 130, 246, 0.8)',   // Blue
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(245, 158, 11, 0.8)',   // Amber
    'rgba(168, 85, 247, 0.8)',   // Purple
    'rgba(236, 72, 153, 0.8)',   // Pink
    'rgba(14, 165, 233, 0.8)',   // Sky
    'rgba(34, 211, 238, 0.8)',   // Cyan
    'rgba(99, 102, 241, 0.8)',   // Indigo
    'rgba(234, 179, 8, 0.8)',    // Yellow
  ];

  const borderColors = [
    'rgb(34, 197, 94)',
    'rgb(59, 130, 246)',
    'rgb(239, 68, 68)',
    'rgb(245, 158, 11)',
    'rgb(168, 85, 247)',
    'rgb(236, 72, 153)',
    'rgb(14, 165, 233)',
    'rgb(34, 211, 238)',
    'rgb(99, 102, 241)',
    'rgb(234, 179, 8)',
  ];

  const backgroundColors = analyticsData.value.costByTag.map((_, index) => colors[index % colors.length]);
  const borderColorsArray = analyticsData.value.costByTag.map((_, index) => borderColors[index % borderColors.length]);

  return {
    labels: analyticsData.value.costByTag.map(item => item.tagName),
    datasets: [
      {
        data: analyticsData.value.costByTag.map(item => item.cost),
        backgroundColor: backgroundColors,
        borderColor: borderColorsArray,
        borderWidth: 2
      }
    ]
  };
});

const costOverTimeChartData = computed(() => {
  if (!analyticsData.value || !analyticsData.value.costOverTime.length) {
    return { labels: [], datasets: [] };
  }

  // Format dates as YYYY-MM-DD for consistent display
  const formatDate = (dateStr: string): string => {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // If it's a full ISO string, extract the date part
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    // Try to parse and format
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr;
    }
  };

  // If multiple tags are selected, show individual tag trajectories
  if (analyticsData.value.costOverTimeByTag && analyticsData.value.costOverTimeByTag.length > 1) {
    // Color palette for different tags
    const tagColors = [
      { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgb(34, 197, 94)' },    // Green
      { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgb(59, 130, 246)' },  // Blue
      { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgb(239, 68, 68)' },    // Red
      { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgb(245, 158, 11)' },  // Amber
      { bg: 'rgba(168, 85, 247, 0.2)', border: 'rgb(168, 85, 247)' },  // Purple
      { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgb(236, 72, 153)' },  // Pink
      { bg: 'rgba(14, 165, 233, 0.2)', border: 'rgb(14, 165, 233)' },  // Sky
      { bg: 'rgba(34, 211, 238, 0.2)', border: 'rgb(34, 211, 238)' },  // Cyan
    ];

    // Collect all unique dates across all tags for x-axis labels
    const allDates = new Set<string>();
    analyticsData.value.costOverTimeByTag.forEach(tag => {
      tag.data.forEach(item => allDates.add(item.date));
    });
    const sortedDates = Array.from(allDates).sort();

    // Create datasets for each tag with only their actual data points
    const datasets = analyticsData.value.costOverTimeByTag.map((tagData, index) => {
      const color = tagColors[index % tagColors.length];

      // Create a map of date to cost for this tag
      const dateMap = new Map(tagData.data.map(item => [item.date, item.cost]));

      // Only include actual data points (null for missing dates)
      const data = sortedDates.map(date => {
        const value = dateMap.get(date);
        return value !== undefined ? value : null;
      });

      return {
        label: tagData.tagName,
        data,
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 1
      };
    });

    return {
      labels: sortedDates.map(formatDate),
      datasets
    };
  }

  // Default: show combined cost over time
  return {
    labels: analyticsData.value.costOverTime.map(item => formatDate(item.date)),
    datasets: [
      {
        label: t('analytics.charts.costOverTime'),
        data: analyticsData.value.costOverTime.map(item => item.cost),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      }
    ]
  };
});

// Pie chart options (for cost by tag)
const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right' as const
    },
    tooltip: {
      callbacks: {
        // Format currency in tooltips
        label: function(context: any) {
          const label = context.label || '';
          const value = context.parsed;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
        }
      }
    }
  }
};

// Bar chart options (for cost over time)
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const
    },
    tooltip: {
      callbacks: {
        // Format currency in tooltips
        label: function(context: any) {
          const label = context.dataset.label || '';
          const value = context.parsed.y;
          return `${label}: ₹${value.toLocaleString('en-IN')}`;
        }
      }
    }
  },
  scales: {
    x: {
      ticks: {
        maxRotation: 45,
        minRotation: 45,
        autoSkip: true,
        maxTicksLimit: 10
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value: any) {
          return '₹' + value.toLocaleString('en-IN');
        }
      }
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
onMounted(async () => {
  await loadSavedSettings();
});
</script>
