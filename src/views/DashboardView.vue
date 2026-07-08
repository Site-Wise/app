<template>
  <div>
    <!-- Header - Mobile optimized -->
    <div class="mb-6 lg:mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ overviewLabel }}</p>
          <h1 class="font-display text-xl sm:text-2xl font-bold text-ink dark:text-cream">
            {{ t('dashboard.subtitle', { siteName: currentSite?.name || 'your construction site' }) }}
          </h1>
        </div>
        <div v-if="currentSite" class="flex items-center text-xs sm:text-sm text-stone-600 dark:text-stone-300 bg-cream-2 dark:bg-ink-2 border border-stone-200 dark:border-ink-4 rounded-md px-3 py-1.5">
          <span class="font-mono sw-tabular">{{ currentSite.total_units }}</span>
          <span class="ml-1">{{ t('dashboard.units') }}</span>
          <span class="mx-1.5 text-stone-400">•</span>
          <span class="font-mono sw-tabular">{{ currentSite.total_planned_area.toLocaleString() }}</span>
          <span class="ml-1">{{ t('dashboard.sqft') }}</span>
        </div>
      </div>
    </div>

    <!-- Loading State: skeleton KPI tiles + chart panel -->
    <div v-if="loading">
      <!-- Skeleton KPI tiles: 2x2 on mobile, 4 cols on desktop -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div v-for="n in 4" :key="n" class="card p-3 sm:p-5 flex flex-col gap-3">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <Skeleton width="2rem" height="2rem" rounded="rounded-md" />
            <div class="flex flex-col gap-1.5 flex-1">
              <Skeleton height="0.75rem" width="60%" />
              <Skeleton height="1.5rem" width="40%" />
            </div>
          </div>
          <div class="mt-auto pt-3 border-t border-stone-200 dark:border-ink-4 flex gap-2">
            <Skeleton height="0.75rem" width="50%" />
            <Skeleton height="0.75rem" width="25%" />
          </div>
        </div>
      </div>
      <!-- Skeleton chart panel -->
      <div class="card p-4 sm:p-6">
        <div class="flex items-center gap-3 mb-4">
          <Skeleton height="0.75rem" width="5rem" />
          <Skeleton height="1.5rem" width="8rem" rounded="rounded-md" />
        </div>
        <div class="sw-skeleton rounded-lg" style="height: 14rem;"></div>
      </div>
    </div>

    <!-- New User Onboarding -->
    <NewUserOnboarding
      v-else-if="shouldShowOnboarding"
      :vendor-count="vendors.length"
      :delivery-count="deliveries.length"
      :service-booking-count="serviceBookings.length"
      @dismiss="dismissOnboarding"
    />

    <!-- Regular Dashboard Content -->
    <template v-else>
      <!-- Behavioral nudge: single prioritized next step (or all-clear celebration) -->
      <DashboardNudge :stats="stats" :has-activity="hasActivity" :site-id="currentSite?.id" />

      <!-- Stats Cards - 2x2 grid on mobile for better space usage -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8" data-tour="quick-stats">
        <div class="card p-3 sm:p-5 flex flex-col">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-amber/15 rounded-md w-fit mb-2 sm:mb-0">
              <TrendingUp class="h-5 w-5 sm:h-8 sm:w-8 text-amber-700 dark:text-amber" />
            </div>
            <div class="sm:ml-4">
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400 min-h-[2rem]">{{ t('dashboard.totalExpenses') }}</p>
              <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">₹{{
                formatCompactAmount(animTotalExpenses) }}
              </p>
            </div>
          </div>
          <div class="mt-auto pt-3 border-t border-stone-200 dark:border-ink-4 flex items-center gap-1.5 text-xs">
            <span class="text-stone-500 dark:text-stone-400">{{ t('dashboard.perSqftNote') }}</span>
            <span class="font-mono sw-tabular text-stone-600 dark:text-stone-300">₹{{ displayPerSqft }}</span>
          </div>
        </div>

        <div class="card p-3 sm:p-5 flex flex-col">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-amber/15 rounded-md w-fit mb-2 sm:mb-0">
              <Undo2 class="h-5 w-5 sm:h-8 sm:w-8 text-amber-700 dark:text-amber" />
            </div>
            <div class="sm:ml-4">
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400 min-h-[2rem]">{{ t('dashboard.pendingRecovery') }}</p>
              <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">₹{{
                formatCompactAmount(animPendingRecovery) }}</p>
            </div>
          </div>
          <div class="mt-auto pt-3 border-t border-stone-200 dark:border-ink-4 flex items-center gap-1.5 text-xs">
            <span
              v-if="stats.pendingRecoveryCount > 0"
              class="font-mono sw-tabular font-semibold text-amber-700 dark:text-amber-400"
            >{{ t('dashboard.pendingRecoveryNote', { count: stats.pendingRecoveryCount }) }}</span>
            <span v-else class="text-stone-500 dark:text-stone-400">{{ t('dashboard.pendingRecoveryNoneNote') }}</span>
          </div>
        </div>

        <div class="card p-3 sm:p-5 flex flex-col">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-forest/15 rounded-md w-fit mb-2 sm:mb-0">
              <Wallet class="h-5 w-5 sm:h-8 sm:w-8 text-forest-700 dark:text-forest-400" />
            </div>
            <div class="sm:ml-4">
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400 min-h-[2rem]">{{ t('dashboard.advances') }}</p>
              <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">₹{{
                formatCompactAmount(animAdvances) }}</p>
            </div>
          </div>
          <div class="mt-auto pt-3 border-t border-stone-200 dark:border-ink-4 flex items-center gap-1.5 text-xs">
            <span
              v-if="stats.advanceCount > 0"
              class="font-mono sw-tabular font-semibold text-forest-700 dark:text-forest-400"
            >{{ t('dashboard.advancesNote', { count: stats.advanceCount }) }}</span>
            <span v-else class="text-stone-500 dark:text-stone-400">{{ t('dashboard.advancesNoneNote') }}</span>
          </div>
        </div>

        <div class="card p-3 sm:p-5 flex flex-col">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-clay/15 rounded-md w-fit mb-2 sm:mb-0">
              <DollarSign class="h-5 w-5 sm:h-8 sm:w-8 text-clay" />
            </div>
            <div class="sm:ml-4">
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400 min-h-[2rem]">{{ t('dashboard.outstandingAmount') }}</p>
              <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">₹{{
                formatCompactAmount(animOutstandingAmount) }}</p>
            </div>
          </div>
          <div class="mt-auto pt-3 border-t border-stone-200 dark:border-ink-4 flex items-center gap-1.5 text-xs">
            <span
              v-if="stats.unpaidCount > 0"
              class="font-mono sw-tabular font-semibold text-clay-600 dark:text-clay-400"
            >{{ t('dashboard.unpaidNote', { count: stats.unpaidCount }) }}</span>
            <span v-else class="text-stone-500 dark:text-stone-400">{{ t('dashboard.allSettled') }}</span>
          </div>
        </div>
      </div>

      <!-- Payments Chart -->
      <div class="card p-4 sm:p-6" data-tour="recent-activities">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div class="flex items-center gap-3">
            <h2 class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('dashboard.payments') }}</h2>
            <!-- Period toggle -->
            <div class="inline-flex rounded-md border border-stone-200 dark:border-ink-4 p-0.5 bg-cream-2 dark:bg-ink-2">
              <button
                v-for="opt in chartPeriodOptions"
                :key="opt.value"
                @click="chartPeriod = opt.value"
                :class="[
                  'px-2.5 py-1 text-xs font-medium rounded-[4px] transition-colors duration-150 ease-snap',
                  chartPeriod === opt.value
                    ? 'bg-amber-500 text-ink'
                    : 'text-stone-600 dark:text-stone-300 hover:text-ink dark:hover:text-cream'
                ]"
              >{{ t(opt.labelKey) }}</button>
            </div>
          </div>
          <div class="flex items-center text-xs sm:text-sm text-stone-600 dark:text-stone-300 bg-cream-2 dark:bg-ink-2 border border-stone-200 dark:border-ink-4 rounded-md px-3 py-1.5">
            <BarChart3 class="h-4 w-4 mr-2 text-amber-700 dark:text-amber" />
            {{ t('dashboard.totalPaid') }}: <span class="ml-1 font-mono sw-tabular text-ink dark:text-cream">₹{{ formatCompactAmount(animPeriodTotal) }}</span>
          </div>
        </div>
        <div class="w-full">
          <!-- Chart Container -->
          <div
            class="relative bg-cream-2 dark:bg-ink-2 rounded-lg p-3 sm:p-6 border border-stone-200 dark:border-ink-4">
            <!-- Chart.js Line Chart (lazy-loaded, off the critical path) -->
            <div class="h-48 sm:h-64">
              <DashboardLineChart :data="chartData" :options="chartOptions" />
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Transactions Ledger -->
      <div class="card p-4 sm:p-6 mt-6 lg:mt-8">
        <h2 class="sw-eyebrow text-stone-500 dark:text-stone-400 mb-4">{{ t('dashboard.recentTransactions') }}</h2>

        <div v-if="recentTransactions.length === 0" class="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
          {{ t('dashboard.noTransactions') }}
        </div>

        <div v-else class="overflow-hidden rounded-md border border-stone-200 dark:border-ink-4">
          <table class="w-full text-sm">
            <!-- Desktop header -->
            <thead class="hidden lg:table-header-group bg-cream-2 dark:bg-ink-2">
              <tr>
                <th class="sw-eyebrow text-stone-500 dark:text-stone-400 text-left px-4 py-2.5">{{ t('common.date') }}</th>
                <th class="sw-eyebrow text-stone-500 dark:text-stone-400 text-left px-4 py-2.5">{{ t('common.vendor') }}</th>
                <th class="sw-eyebrow text-stone-500 dark:text-stone-400 text-left px-4 py-2.5">{{ t('common.category') }}</th>
                <th class="sw-eyebrow text-stone-500 dark:text-stone-400 text-right px-4 py-2.5">{{ t('common.amount') }}</th>
                <th class="sw-eyebrow text-stone-500 dark:text-stone-400 text-right px-4 py-2.5">{{ t('common.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in recentTransactions"
                :key="row.id"
                class="rounded-none border-b border-stone-200 dark:border-ink-4 last:border-b-0 lg:hover:bg-cream-2 lg:dark:hover:bg-ink-2"
                :class="isRowNavigable(row) ? 'cursor-pointer hover:bg-cream-2 dark:hover:bg-ink-2' : ''"
                @click="isRowNavigable(row) && openLedgerRow(row)"
              >
                <!-- Desktop cells -->
                <td class="hidden lg:table-cell px-4 py-3 font-mono sw-tabular text-stone-600 dark:text-stone-300">
                  {{ formatLedgerDate(row.date) }}
                </td>
                <td class="hidden lg:table-cell px-4 py-3 text-ink dark:text-cream">
                  <RecordLink
                    v-if="row.vendorId"
                    type="vendor"
                    mode="detail"
                    :id="row.vendorId"
                    :label="row.vendorLabel"
                  />
                  <span v-else>{{ row.vendorLabel }}</span>
                  <div v-if="row.vendorCompany" class="text-xs text-stone-500 dark:text-stone-400">{{ row.vendorCompany }}</div>
                </td>
                <td class="hidden lg:table-cell px-4 py-3">
                  <span class="inline-flex items-center gap-2 text-stone-600 dark:text-stone-300">
                    <span class="h-2 w-2 rounded-[2px]" :style="{ backgroundColor: categoryDotColor(row.category) }"></span>
                    {{ categoryLabel(row.category) }}
                  </span>
                </td>
                <td class="hidden lg:table-cell px-4 py-3 text-right font-mono sw-tabular font-semibold text-ink dark:text-cream">
                  {{ formatRupees(row.amount) }}
                </td>
                <td class="hidden lg:table-cell px-4 py-3 text-right">
                  <span :class="badgeClass(row.statusVariant)">{{ t(row.statusKey) }}</span>
                </td>

                <!-- Mobile stacked card -->
                <td class="lg:hidden px-4 py-3 block">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="h-2 w-2 rounded-[2px] shrink-0" :style="{ backgroundColor: categoryDotColor(row.category) }"></span>
                        <span class="font-medium truncate">
                          <RecordLink
                            v-if="row.vendorId"
                            type="vendor"
                            mode="detail"
                            :id="row.vendorId"
                            :label="row.vendorLabel"
                          />
                          <span v-else class="text-ink dark:text-cream">{{ row.vendorLabel }}</span>
                        </span>
                      </div>
                      <div v-if="row.vendorCompany" class="mt-0.5 text-xs text-stone-500 dark:text-stone-400 truncate">{{ row.vendorCompany }}</div>
                      <div class="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                        <span>{{ categoryLabel(row.category) }}</span>
                        <span class="text-stone-400 dark:text-stone-500">•</span>
                        <span class="font-mono sw-tabular">{{ formatLedgerDate(row.date) }}</span>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <div class="font-mono sw-tabular font-semibold text-ink dark:text-cream">{{ formatRupees(row.amount) }}</div>
                      <span :class="badgeClass(row.statusVariant)" class="mt-1">{{ t(row.statusKey) }}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { TrendingUp, Undo2, Wallet, DollarSign, BarChart3 } from 'lucide-vue-next';

import ChartLoadingPlaceholder from '../components/charts/ChartLoadingPlaceholder.vue';

// Lazy-load chart.js (heavy) so the dashboard stats/cards paint without waiting
// for the chart bundle on the critical/landing path.
const DashboardLineChart = defineAsyncComponent({
  loader: () => import('../components/charts/DashboardLineChart.vue'),
  loadingComponent: ChartLoadingPlaceholder
});
import Skeleton from '../components/Skeleton.vue';
import RecordLink from '../components/RecordLink.vue';
import { useSite } from '../composables/useSite';
import { useSiteData } from '../composables/useSiteData';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
import { useCountUp } from '../composables/useCountUp';
import {
  paymentService,
  deliveryService,
  serviceBookingService,
  vendorRefundService,
  vendorReturnService,
  vendorCreditNoteService,
  vendorService
} from '../services/pocketbase';
import { computeDashboardStats } from '../utils/dashboardStats';
import { useSiteStore } from '../stores/site';
import NewUserOnboarding from '../components/NewUserOnboarding.vue';
import DashboardNudge from '../components/DashboardNudge.vue';

const { t } = useI18n();
const { isDark } = useTheme();
const router = useRouter();

const { currentSite } = useSite();
const siteStore = useSiteStore();

// Check if user has dismissed the onboarding for this site
const ONBOARDING_DISMISSED_KEY = 'sitewise_onboarding_dismissed_';
const isOnboardingDismissed = ref(false);

onMounted(() => {
  const siteId = currentSite.value?.id;
  if (siteId) {
    isOnboardingDismissed.value = localStorage.getItem(ONBOARDING_DISMISSED_KEY + siteId) === 'true';
  }
});

const dismissOnboarding = () => {
  const siteId = currentSite.value?.id;
  if (siteId) {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY + siteId, 'true');
    isOnboardingDismissed.value = true;
  }
};

// Check if user has multiple sites (experienced user)
const isExperiencedUser = computed(() => siteStore.userSites.length > 1);

// Check if we should show onboarding
const shouldShowOnboarding = computed(() => {
  // Don't show for experienced users with multiple sites
  if (isExperiencedUser.value) return false;

  // Don't show if user dismissed it
  if (isOnboardingDismissed.value) return false;

  // Show if no vendors OR no deliveries/service bookings
  const hasNoVendors = vendors.value.length === 0;
  const hasNoActivity = deliveries.value.length === 0 && serviceBookings.value.length === 0;

  return hasNoVendors || hasNoActivity;
});

// Use site-aware data loading
const { data: dashboardData, loading } = useSiteData(async () => {
  const [payments, deliveries, serviceBookings, vendorRefunds, vendorReturns, creditNotes, vendors] = await Promise.all([
    paymentService.getAll(),
    deliveryService.getAll(),
    serviceBookingService.getAll(),
    vendorRefundService.getAll(),
    vendorReturnService.getAll(),
    vendorCreditNoteService.getAll(),
    vendorService.getAll(),
  ]);

  return { payments, deliveries, serviceBookings, vendorRefunds, vendorReturns, creditNotes, vendors };
});

const payments = computed(() => dashboardData.value?.payments || []);
const deliveries = computed(() => dashboardData.value?.deliveries || []);
const serviceBookings = computed(() => dashboardData.value?.serviceBookings || []);
const vendorRefunds = computed(() => dashboardData.value?.vendorRefunds || []);
const vendorReturns = computed(() => dashboardData.value?.vendorReturns || []);
const creditNotes = computed(() => dashboardData.value?.creditNotes || []);
const vendors = computed(() => dashboardData.value?.vendors || []);


// Dashboard tile numbers are computed by the pure computeDashboardStats helper
// (src/utils/dashboardStats.ts). The math — gross/net expenses, expense-per-sqft,
// per-item-clamped site outstanding, unpaid count, advances and pending recovery — is
// pinned by the financial safety-net test, which binds to that same helper. This view
// only supplies the loaded collections; the deferred shared-cache refactor will change
// only WHERE those collections come from, not the numbers.
const stats = computed(() =>
  computeDashboardStats({
    deliveries: deliveries.value,
    serviceBookings: serviceBookings.value,
    payments: payments.value,
    vendorRefunds: vendorRefunds.value,
    vendorReturns: vendorReturns.value,
    creditNotes: creditNotes.value,
    totalPlannedArea: currentSite.value?.total_planned_area || 1,
  })
);

// Whether the site has real activity yet — gates the nudge's celebration state
// so an empty (but past-onboarding) ledger doesn't read as "all caught up".
const hasActivity = computed(
  () => deliveries.value.length > 0 || serviceBookings.value.length > 0 || payments.value.length > 0
);

// Payments chart period — toggle between last 7 and last 30 days.
const chartPeriod = ref<'week' | 'month'>('week');
const chartPeriodOptions = [
  { value: 'week' as const, labelKey: 'dashboard.last7Days' },
  { value: 'month' as const, labelKey: 'dashboard.last30Days' },
];

const paymentChartData = computed(() => {
  const days = [];
  const today = new Date();
  const span = chartPeriod.value === 'month' ? 30 : 7;

  for (let i = span - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayPayments = payments.value.filter(payment => {
      if (!payment.created) return false;
      const paymentDate = new Date(payment.created);
      return paymentDate >= dayStart && paymentDate <= dayEnd;
    });

    const amount = dayPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    // Weekday labels for the week view; compact day/month for the month view.
    const label = span === 7
      ? date.toLocaleDateString('en-US', { weekday: 'short' })
      : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    days.push({ label, amount });
  }

  return days;
});

const chartData = computed(() => {
  return {
    labels: paymentChartData.value.map(day => day.label),
    datasets: [
      {
        label: 'Daily Payments',
        data: paymentChartData.value.map(day => day.amount),
        borderColor: 'rgb(255, 184, 0)',
        backgroundColor: 'rgba(255, 184, 0, 0.12)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(255, 184, 0)',
        pointBorderColor: '#FAFAF7',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };
});

const chartOptions = computed(() => {
  // Mode-aware axis/grid colors so labels stay legible on both light and dark cards
  const gridColor = isDark.value ? 'rgba(250, 250, 247, 0.10)' : 'rgba(10, 14, 13, 0.10)';
  const tickColor = isDark.value ? 'rgb(214, 211, 209)' : 'rgb(87, 83, 78)'; // stone-300 / stone-600
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 13, 0.92)',
        titleColor: '#FAFAF7',
        bodyColor: '#FAFAF7',
        borderColor: 'rgb(255, 184, 0)',
        borderWidth: 1,
        cornerRadius: 6,
        callbacks: {
          label: function (context: any) {
            return `₹${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: gridColor,
          drawBorder: false
        },
        ticks: {
          color: tickColor,
          font: {
            size: 12
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: gridColor,
          drawBorder: false
        },
        ticks: {
          color: tickColor,
          font: {
            size: 12
          },
          callback: function (value: any) {
            return '₹' + formatAmount(value);
          }
        }
      }
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgb(255, 184, 0)',
        hoverBorderColor: '#FAFAF7'
      }
    }
  };
});

const periodPaymentTotal = computed(() => {
  return paymentChartData.value.reduce((sum, day) => sum + day.amount, 0);
});

// ---- Recent transactions ledger (design-system LedgerTable) ----
type LedgerCategory = 'material' | 'service' | 'payment';
type LedgerKind = 'delivery' | 'serviceBooking' | 'payment';
interface LedgerRow {
  id: string;
  // Source record kind + its raw record id, used to deep-link the row to the
  // underlying record's category view (delivery/booking/payment).
  kind: LedgerKind;
  recordId?: string;
  date: string; // ISO date used for sorting
  // App-wide vendor display convention: contact_person is the prominent label,
  // company `name` is a muted subtext shown only when BOTH exist.
  vendorId?: string;
  vendorLabel: string;
  vendorCompany?: string;
  category: LedgerCategory;
  amount: number;
  // semantic status mapped to sw-badge variant
  statusKey: string;
  statusVariant: 'success' | 'accent' | 'danger';
}

// Resolve a vendor id to its display parts from the loaded vendors array.
// Mirrors VendorsView/VendorOption: contact_person as main label (fallback to
// company name, then unknown-vendor fallback); company name kept separately so
// it can be rendered as muted subtext only when both values exist.
const vendorPartsById = (vendorId?: string): { id?: string; label: string; company?: string } => {
  const match = vendorId ? vendors.value.find(v => v.id === vendorId) : undefined;
  const contactPerson = match?.contact_person;
  const company = match?.name;
  const label = contactPerson || company || t('common.unknownVendor');
  return {
    id: match?.id,
    label,
    // Only expose company as subtext when both contact_person and name exist.
    company: contactPerson && company ? company : undefined
  };
};

// Map a delivery/booking payment_status to a badge variant + label.
const statusFromPayment = (status?: string): { key: string; variant: 'success' | 'accent' | 'danger' } => {
  if (status === 'paid' || status === 'currently_paid_up') return { key: 'common.paid', variant: 'success' };
  if (status === 'partial') return { key: 'common.partial', variant: 'accent' };
  return { key: 'common.pending', variant: 'danger' };
};

// Category color dot — aligns with the design-system palette.
const categoryDotColor = (category: LedgerCategory): string => {
  switch (category) {
    case 'material': return '#FFB800'; // amber
    case 'service': return '#0ea5e9'; // sky
    case 'payment': return '#22c55e'; // forest/green
  }
};

const categoryLabel = (category: LedgerCategory): string => {
  switch (category) {
    case 'material': return t('dashboard.material');
    case 'service': return t('common.service');
    case 'payment': return t('common.payment');
  }
};

const recentTransactions = computed<LedgerRow[]>(() => {
  const rows: LedgerRow[] = [];

  for (const d of deliveries.value) {
    const status = statusFromPayment(d.payment_status);
    const vendor = vendorPartsById(d.vendor);
    rows.push({
      id: `delivery-${d.id}`,
      kind: 'delivery',
      recordId: d.id,
      date: d.delivery_date,
      vendorId: vendor.id,
      vendorLabel: vendor.label,
      vendorCompany: vendor.company,
      category: 'material',
      amount: d.total_amount,
      statusKey: status.key,
      statusVariant: status.variant
    });
  }

  for (const b of serviceBookings.value) {
    const status = statusFromPayment(b.payment_status);
    const vendor = vendorPartsById(b.vendor);
    rows.push({
      id: `booking-${b.id}`,
      kind: 'serviceBooking',
      recordId: b.id,
      date: b.start_date,
      vendorId: vendor.id,
      vendorLabel: vendor.label,
      vendorCompany: vendor.company,
      category: 'service',
      amount: b.total_amount,
      statusKey: status.key,
      statusVariant: status.variant
    });
  }

  for (const p of payments.value) {
    const vendor = vendorPartsById(p.vendor);
    rows.push({
      id: `payment-${p.id}`,
      kind: 'payment',
      recordId: p.id,
      date: p.payment_date || p.created || '',
      vendorId: vendor.id,
      vendorLabel: vendor.label,
      vendorCompany: vendor.company,
      category: 'payment',
      amount: p.amount,
      statusKey: 'common.paid',
      statusVariant: 'success'
    });
  }

  return rows
    .filter(r => r.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);
});

// Formatted date for ledger rows (mono tabular, locale-aware short form).
const formatLedgerDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// Indian-grouped rupee amount for the ledger.
const formatRupees = (amount: number): string =>
  '₹' + Math.round(amount).toLocaleString('en-IN');

const badgeClass = (variant: 'success' | 'accent' | 'danger'): string =>
  `sw-badge sw-badge--${variant}`;

// A row is navigable only when it carries a resolvable source record id.
const isRowNavigable = (row: LedgerRow): boolean => !!row.recordId;

// Deep-link a ledger row to its source record's category view, passing the
// record id using each view's deep-link query convention:
//   payment        -> /payments?paymentId=<id>   (PaymentsView opens the modal)
//   delivery       -> /deliveries?id=<id>
//   serviceBooking -> /service-bookings?id=<id>
const openLedgerRow = (row: LedgerRow): void => {
  if (!row.recordId) return;
  switch (row.kind) {
    case 'payment':
      router.push({ path: '/payments', query: { paymentId: row.recordId } });
      break;
    case 'delivery':
      router.push({ path: '/deliveries', query: { id: row.recordId } });
      break;
    case 'serviceBooking':
      router.push({ path: '/service-bookings', query: { id: row.recordId } });
      break;
  }
};

// "Overview · April 2026" eyebrow, matching the design-system dashboard kit.
const overviewLabel = computed(() => {
  const month = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return `${t('dashboard.title')} · ${month}`;
});

// Signature count-up animations on the KPI stats (Sitewise design system).
const animTotalExpenses = useCountUp(() => stats.value.totalExpenses);
const animExpensePerSqft = useCountUp(() => stats.value.expensePerSqft);
const animOutstandingAmount = useCountUp(() => stats.value.outstandingAmount);
const animAdvances = useCountUp(() => stats.value.advances);
const animPendingRecovery = useCountUp(() => stats.value.pendingRecovery);
const animPeriodTotal = useCountUp(() => periodPaymentTotal.value);
const displayPerSqft = computed(() => Math.round(animExpensePerSqft.value).toLocaleString());

const formatAmount = (amount: number) => {
  if (amount >= 100000) {
    return (amount / 100000).toFixed(1) + 'L';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K';
  }
  return amount.toString();
};

// Format amount for compact display on mobile
const formatCompactAmount = (amount: number) => {
  if (amount >= 10000000) {
    return (amount / 10000000).toFixed(1) + 'Cr';
  } else if (amount >= 100000) {
    return (amount / 100000).toFixed(1) + 'L';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K';
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
};



</script>