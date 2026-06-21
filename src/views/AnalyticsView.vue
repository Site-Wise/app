<template>
  <div>
    <!-- Header - matches Dashboard "Overview · Month" treatment -->
    <div class="mb-6 lg:mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('analytics.title') }} · {{ currentMonthLabel }}</p>
          <h1 class="font-display text-xl sm:text-2xl font-bold text-ink dark:text-cream">
            {{ t('analytics.subtitle') }}
          </h1>
        </div>
        <button @click="showSaveModal = true" :disabled="!hasActiveFilters" :class="[
          hasActiveFilters ? 'btn-primary' : 'btn-disabled',
          'text-sm whitespace-nowrap'
        ]">
          <Save class="h-4 w-4" />
          <span>{{ t('analytics.saveFilters') }}</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Filters Panel - Left Sidebar on Desktop, Top on Mobile -->
      <div class="lg:col-span-1">
        <div class="card p-4 lg:sticky lg:top-4">
          <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-4">{{ t('analytics.filters') }}</p>

          <!-- Tags Filter -->
          <div class="mb-4">
            <label class="label">{{ t('analytics.selectTags') }}</label>
            <TagSelector v-model="filters.tagIds" :showLabel=false :type-filter="'item_category'" :multiple="true"
              :allow-create="false" :track-usage="false" :placeholder="t('analytics.selectTags')" />
            <p v-if="filters.tagIds.length === 0" class="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {{ t('analytics.noTagsSelected') }}
            </p>
          </div>

          <!-- Date Range Filter -->
          <div class="mb-4">
            <label class="label">{{ t('analytics.dateRange') }}</label>
            <div class="space-y-2">
              <input v-model="filters.dateFrom" type="date" class="input text-sm focus:border-ink dark:focus:border-cream rounded-md"
                :placeholder="t('analytics.dateFrom')" />
              <input v-model="filters.dateTo" type="date" class="input text-sm focus:border-ink dark:focus:border-cream rounded-md"
                :placeholder="t('analytics.dateTo')" />
            </div>
          </div>

          <!-- Amount Range Filter -->
          <div class="mb-4">
            <label class="label">{{ t('analytics.amountRange') }}</label>
            <div class="space-y-2">
              <input v-model="amountMinInput" type="number" min="0" class="input text-sm focus:border-ink dark:focus:border-cream rounded-md"
                :placeholder="t('analytics.amountMin')" />
              <input v-model="amountMaxInput" type="number" min="0" class="input text-sm focus:border-ink dark:focus:border-cream rounded-md"
                :placeholder="t('analytics.amountMax')" />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-2">
            <button @click="calculateAnalytics" :disabled="loading" class="btn-primary w-full">
              <BarChart3 v-if="!loading" class="h-4 w-4" />
              <Loader2 v-else class="h-4 w-4 animate-spin" />
              <span>{{ loading ? t('analytics.calculating') : t('analytics.calculate') }}</span>
            </button>
            <button @click="resetFilters" :disabled="!hasActiveFilters"
              class="btn-secondary w-full disabled:opacity-50">
              <RotateCcw class="h-4 w-4" />
              <span>{{ t('analytics.reset') }}</span>
            </button>
          </div>

          <!-- Saved Settings -->
          <div class="mt-6 pt-5 border-t border-stone-200 dark:border-ink-4">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-3">
              {{ t('analytics.savedSettings') }}
            </p>

            <div v-if="loadingSettings" class="flex justify-center py-4">
              <Loader2 class="h-5 w-5 animate-spin text-amber" />
            </div>

            <div v-else-if="savedSettings.length === 0"
              class="text-sm text-stone-500 dark:text-stone-400 py-4 text-center">
              {{ t('analytics.noSettingsSaved') }}
            </div>

            <div v-else class="space-y-1.5">
              <div v-for="setting in savedSettings" :key="setting.id"
                class="flex items-center justify-between px-2.5 py-2 rounded-md bg-cream-2 dark:bg-ink-2 border border-stone-200 dark:border-ink-4 hover:border-stone-300 dark:hover:border-ink-3 transition-colors">
                <button @click="loadSetting(setting.id!)"
                  class="flex-1 text-left text-sm text-ink dark:text-cream truncate" :title="setting.name">
                  {{ setting.name }}
                </button>
                <button @click="confirmDeleteSetting(setting.id!)"
                  class="ml-2 p-1 text-clay hover:bg-clay/10 rounded-md transition-colors"
                  :title="t('analytics.deleteSetting')">
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Panel - Main Content -->
      <div class="lg:col-span-3">
        <!-- Loading skeleton while calculating -->
        <div v-if="loading" class="space-y-6">
          <!-- Skeleton KPI tiles: 2 cols on mobile, 3 on desktop -->
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div v-for="n in 6" :key="n" class="card p-3 sm:p-5 flex flex-col gap-2">
              <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                <Skeleton width="2rem" height="2rem" rounded="rounded-md" />
                <div class="flex flex-col gap-1.5 flex-1">
                  <Skeleton height="0.65rem" width="60%" />
                  <Skeleton height="1.5rem" width="45%" />
                </div>
              </div>
            </div>
          </div>
          <!-- Skeleton chart panel -->
          <div class="card p-4 sm:p-6">
            <Skeleton height="0.65rem" width="8rem" class="mb-4" />
            <div class="sw-skeleton rounded-lg" style="height: 18rem;"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!analyticsData" class="card p-10 text-center">
          <div class="p-4 bg-stone-200/60 dark:bg-ink-2 rounded-full w-fit mx-auto mb-4">
            <BarChart3 class="h-10 w-10 text-stone-400 dark:text-stone-500" />
          </div>
          <h3 class="font-display text-lg font-semibold text-ink dark:text-cream mb-1.5">
            {{ t('analytics.results') }}
          </h3>
          <p class="text-sm text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
            {{ hasActiveFilters ? t('analytics.messages.calculateFirst') : t('analytics.messages.noFiltersApplied') }}
          </p>
        </div>

        <!-- Results Display -->
        <div v-else class="space-y-6">
          <!-- Summary KPI Cards - 2 cols mobile, 3 cols desktop -->
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <!-- Total Cost -->
            <div class="card p-3 sm:p-5 flex flex-col">
              <div class="flex flex-col sm:flex-row sm:items-center">
                <div class="p-2 bg-amber/15 rounded-md w-fit mb-2 sm:mb-0">
                  <DollarSign class="h-4 w-4 sm:h-5 sm:w-5 text-amber-700 dark:text-amber" />
                </div>
                <div class="sm:ml-3">
                  <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('analytics.summary.totalCost') }}</p>
                  <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">
                    ₹{{ analyticsData.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Average Cost Per Item -->
            <div class="card p-3 sm:p-5 flex flex-col">
              <div class="flex flex-col sm:flex-row sm:items-center">
                <div class="p-2 bg-stone-200/60 dark:bg-ink-2 rounded-md w-fit mb-2 sm:mb-0">
                  <Package class="h-4 w-4 sm:h-5 sm:w-5 text-stone-600 dark:text-stone-300" />
                </div>
                <div class="sm:ml-3">
                  <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('analytics.summary.averageCostPerItem') }}</p>
                  <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">
                    ₹{{ formatCompactAmount(analyticsData.averageCostPerItem) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Average Cost Per Delivery -->
            <div class="card p-3 sm:p-5 flex flex-col">
              <div class="flex flex-col sm:flex-row sm:items-center">
                <div class="p-2 bg-stone-200/60 dark:bg-ink-2 rounded-md w-fit mb-2 sm:mb-0">
                  <TruckIcon class="h-4 w-4 sm:h-5 sm:w-5 text-stone-600 dark:text-stone-300" />
                </div>
                <div class="sm:ml-3">
                  <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('analytics.summary.averageCostPerDelivery') }}</p>
                  <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">
                    ₹{{ formatCompactAmount(analyticsData.averageCostPerDelivery) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Item Count -->
            <div class="card p-3 sm:p-5 flex flex-col">
              <div class="flex flex-col sm:flex-row sm:items-center">
                <div class="p-2 bg-forest/15 rounded-md w-fit mb-2 sm:mb-0">
                  <Hash class="h-4 w-4 sm:h-5 sm:w-5 text-forest-700 dark:text-forest-400" />
                </div>
                <div class="sm:ml-3">
                  <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('analytics.summary.itemCount') }}</p>
                  <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">
                    {{ analyticsData.itemCount.toLocaleString('en-IN') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Delivery Count -->
            <div class="card p-3 sm:p-5 flex flex-col">
              <div class="flex flex-col sm:flex-row sm:items-center">
                <div class="p-2 bg-stone-200/60 dark:bg-ink-2 rounded-md w-fit mb-2 sm:mb-0">
                  <FileText class="h-4 w-4 sm:h-5 sm:w-5 text-stone-600 dark:text-stone-300" />
                </div>
                <div class="sm:ml-3">
                  <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('analytics.summary.deliveryCount') }}</p>
                  <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">
                    {{ analyticsData.deliveryCount.toLocaleString('en-IN') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Total Quantity -->
            <div class="card p-3 sm:p-5 flex flex-col">
              <div class="flex flex-col sm:flex-row sm:items-center">
                <div class="p-2 bg-stone-200/60 dark:bg-ink-2 rounded-md w-fit mb-2 sm:mb-0">
                  <Boxes class="h-4 w-4 sm:h-5 sm:w-5 text-stone-600 dark:text-stone-300" />
                </div>
                <div class="sm:ml-3">
                  <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('analytics.summary.totalQuantity') }}</p>
                  <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">
                    {{ analyticsData.totalQuantity.toLocaleString('en-IN') }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Cost by Tag Chart -->
          <div v-if="analyticsData.costByTag.length > 0" class="card p-4 sm:p-6">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-4">
              {{ t('analytics.charts.costByTag') }}
            </p>
            <div class="relative bg-cream-2 dark:bg-ink-2 border border-stone-200 dark:border-ink-4 rounded-lg p-3 sm:p-6">
              <div class="h-64 sm:h-80">
                <Pie :data="costByTagChartData" :options="pieChartOptions" />
              </div>
            </div>
          </div>

          <!-- Cost Over Time Chart -->
          <div v-if="analyticsData.costOverTime.length > 0" class="card p-4 sm:p-6">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-4">
              {{ t('analytics.charts.costOverTime') }}
            </p>
            <div class="relative bg-cream-2 dark:bg-ink-2 border border-stone-200 dark:border-ink-4 rounded-lg p-3 sm:p-6">
              <div class="h-64 sm:h-80">
                <Bar :data="costOverTimeChartData" :options="barChartOptions" />
              </div>
            </div>
          </div>

          <!-- Quantity by Unit Breakdown -->
          <div v-if="analyticsData.quantityByUnit.length > 0" class="card p-4 sm:p-6">
            <p class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-4">
              {{ t('analytics.quantityByUnit.title') }}
            </p>
            <div class="overflow-hidden rounded-md border border-stone-200 dark:border-ink-4">
              <div
                v-for="(unitData, idx) in analyticsData.quantityByUnit"
                :key="unitData.unit"
                :class="[
                  'flex items-center justify-between px-4 py-3',
                  idx < analyticsData.quantityByUnit.length - 1 ? 'border-b border-stone-200 dark:border-ink-4' : '',
                  'hover:bg-cream-2 dark:hover:bg-ink-2 transition-colors'
                ]"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="h-2 w-2 rounded-[2px] shrink-0 bg-amber"></span>
                  <span class="text-sm font-medium text-ink dark:text-cream">{{ unitData.unit }}</span>
                  <span class="text-xs text-stone-500 dark:text-stone-400">
                    {{ unitData.itemCount }}
                    {{ unitData.itemCount === 1 ? t('analytics.quantityByUnit.item') : t('analytics.quantityByUnit.items') }}
                  </span>
                </div>
                <span class="font-mono sw-tabular text-base font-semibold text-ink dark:text-cream shrink-0">
                  {{ unitData.quantity.toLocaleString('en-IN') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Setting Modal -->
    <div v-if="showSaveModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      @click.self="showSaveModal = false">
      <div class="card shadow-modal p-6 max-w-md w-full">
        <h2 class="font-display text-xl font-semibold text-ink dark:text-cream mb-4">
          {{ t('analytics.saveFilters') }}
        </h2>
        <label class="label">{{ t('analytics.settingName') }}</label>
        <input v-model="settingName" type="text" class="input mb-4 focus:border-ink dark:focus:border-cream rounded-md"
          :placeholder="t('analytics.enterSettingName')"
          @keyup.enter="handleSaveSetting" @keyup.esc="showSaveModal = false" autofocus />
        <div class="flex gap-2 justify-end">
          <button @click="showSaveModal = false" class="btn-secondary">
            {{ t('common.cancel') }}
          </button>
          <button @click="handleSaveSetting" :disabled="!settingName.trim()" class="btn-primary disabled:opacity-50">
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      @click.self="showDeleteConfirm = false">
      <div class="card shadow-modal p-6 max-w-md w-full">
        <h2 class="font-display text-xl font-semibold text-ink dark:text-cream mb-2">
          {{ t('analytics.deleteSetting') }}
        </h2>
        <p class="text-sm text-stone-600 dark:text-stone-300 mb-6">
          {{ t('analytics.confirmDelete') }}
        </p>
        <div class="flex gap-2 justify-end">
          <button @click="showDeleteConfirm = false" class="btn-secondary">
            {{ t('common.cancel') }}
          </button>
          <button @click="handleDeleteSetting" class="btn-danger">
            {{ t('common.deleteAction') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Skeleton from '../components/Skeleton.vue';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
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
const { isDark } = useTheme();

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

// Computed properties for amount inputs to handle empty values properly
const amountMinInput = computed({
  get: () => filters.value.amountMin ?? '',
  set: (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    filters.value.amountMin = isNaN(num) || value === '' ? null : num;
  }
});

const amountMaxInput = computed({
  get: () => filters.value.amountMax ?? '',
  set: (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    filters.value.amountMax = isNaN(num) || value === '' ? null : num;
  }
});

// Chart data
const costByTagChartData = computed(() => {
  if (!analyticsData.value || !analyticsData.value.costByTag.length) {
    return { labels: [], datasets: [] };
  }

  // Color palette for pie chart segments (Sitewise brand-led: amber, forest, clay, then warm/cool spread)
  const colors = [
    'rgba(255, 184, 0, 0.85)',   // Amber (accent)
    'rgba(34, 197, 94, 0.8)',    // Forest
    'rgba(232, 116, 60, 0.8)',   // Clay
    'rgba(120, 113, 108, 0.8)',  // Stone
    'rgba(168, 85, 247, 0.8)',   // Purple
    'rgba(236, 72, 153, 0.8)',   // Pink
    'rgba(14, 165, 233, 0.8)',   // Sky
    'rgba(34, 211, 238, 0.8)',   // Cyan
    'rgba(99, 102, 241, 0.8)',   // Indigo
    'rgba(202, 138, 4, 0.8)',    // Amber-deep
  ];

  const borderColors = [
    'rgb(255, 184, 0)',
    'rgb(34, 197, 94)',
    'rgb(232, 116, 60)',
    'rgb(120, 113, 108)',
    'rgb(168, 85, 247)',
    'rgb(236, 72, 153)',
    'rgb(14, 165, 233)',
    'rgb(34, 211, 238)',
    'rgb(99, 102, 241)',
    'rgb(202, 138, 4)',
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
      { bg: 'rgba(255, 184, 0, 0.25)', border: 'rgb(255, 184, 0)' },   // Amber (accent)
      { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgb(34, 197, 94)' },    // Forest
      { bg: 'rgba(232, 116, 60, 0.2)', border: 'rgb(232, 116, 60)' },  // Clay
      { bg: 'rgba(120, 113, 108, 0.2)', border: 'rgb(120, 113, 108)' },// Stone
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
        backgroundColor: 'rgba(255, 184, 0, 0.85)',
        borderColor: 'rgb(255, 184, 0)',
        borderWidth: 1
      }
    ]
  };
});

// Mode-aware text/grid colors so chart legends, axes and labels stay legible
// on both the light cream card and the dark ink card.
const chartTextColor = computed(() => (isDark.value ? 'rgb(214, 211, 209)' : 'rgb(68, 64, 60)')); // stone-300 / stone-700
const chartGridColor = computed(() => (isDark.value ? 'rgba(250, 250, 247, 0.10)' : 'rgba(10, 14, 13, 0.10)'));

// Pie chart options (for cost by tag)
const pieChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right' as const,
      labels: {
        color: chartTextColor.value
      }
    },
    tooltip: {
      callbacks: {
        // Format currency in tooltips
        label: function (context: any) {
          const label = context.label || '';
          const value = context.parsed;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
        }
      }
    }
  }
}));

// Bar chart options (for cost over time)
const barChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: chartTextColor.value
      }
    },
    tooltip: {
      callbacks: {
        // Format currency in tooltips
        label: function (context: any) {
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
        color: chartTextColor.value,
        maxRotation: 45,
        minRotation: 45,
        autoSkip: true,
        maxTicksLimit: 10
      },
      grid: {
        color: chartGridColor.value
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: chartTextColor.value,
        callback: function (value: any) {
          return '₹' + value.toLocaleString('en-IN');
        }
      },
      grid: {
        color: chartGridColor.value
      }
    }
  }
}));

// "June 2026" eyebrow period label matching Dashboard's design pattern
const currentMonthLabel = computed(() =>
  new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
);

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
