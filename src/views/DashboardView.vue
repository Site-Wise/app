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
            <!-- Chart.js Line Chart -->
            <div class="h-48 sm:h-64">
              <Line :data="chartData" :options="chartOptions" />
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
              >
                <!-- Desktop cells -->
                <td class="hidden lg:table-cell px-4 py-3 font-mono sw-tabular text-stone-600 dark:text-stone-300">
                  {{ formatLedgerDate(row.date) }}
                </td>
                <td class="hidden lg:table-cell px-4 py-3 text-ink dark:text-cream">{{ row.vendorName }}</td>
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
                        <span class="font-medium text-ink dark:text-cream truncate">{{ row.vendorName }}</span>
                      </div>
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
import { computed, ref, onMounted } from 'vue';
import { TrendingUp, Undo2, Wallet, DollarSign, BarChart3 } from 'lucide-vue-next';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
import Skeleton from '../components/Skeleton.vue';
import { useSite } from '../composables/useSite';
import { useSiteData } from '../composables/useSiteData';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
import { useCountUp } from '../composables/useCountUp';
import {
  paymentService,
  deliveryService,
  serviceBookingService,
  ServiceBookingService,
  vendorRefundService,
  vendorReturnService,
  vendorCreditNoteService,
  vendorService
} from '../services/pocketbase';
import { DeliveryPaymentCalculator } from '../services/deliveryUtils';
import { useSiteStore } from '../stores/site';
import NewUserOnboarding from '../components/NewUserOnboarding.vue';

const { t } = useI18n();
const { isDark } = useTheme();

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


const stats = computed(() => {
  // Calculate gross expenses from deliveries and service bookings
  const grossExpenses = deliveries.value.reduce((sum, delivery) => {
    return sum + delivery.total_amount;
  }, 0) + serviceBookings.value.reduce((sum, booking) => {
    return sum + booking.total_amount;
  }, 0);

  // Calculate total refunds received
  const totalRefunds = vendorRefunds.value.reduce((sum, refund) => {
    return sum + refund.refund_amount;
  }, 0);

  // Net expenses = Gross expenses - Refunds
  const totalExpenses = grossExpenses - totalRefunds;

  const totalSqft = currentSite.value?.total_planned_area || 1;
  const expensePerSqft = Math.round(totalExpenses / totalSqft);

  // Outstanding is summed PER ITEM, never netted globally: an overpayment/advance on
  // one delivery or booking must not cancel out a genuine balance owed on another.
  //
  // The `paid_amount`/`payment_status` fields on deliveries & bookings are deprecated
  // (always 0 from the API) — the canonical "how much is paid against this item" lives
  // in the payment_allocations pivot, carried on each payment's expand. Paid = sum of
  // allocations referencing the item. This is the same source VendorService uses, so the
  // site-wide total here equals the sum of every vendor's outstanding.
  const allocations = payments.value.flatMap(p => p.expand?.payment_allocations || []);

  // Deliveries: outstanding = total_amount - allocated (clamped at 0).
  const deliveriesOutstanding = deliveries.value.reduce((sum, delivery) => {
    return sum + DeliveryPaymentCalculator.calculateOutstandingAmount(delivery, allocations);
  }, 0);

  // Service bookings: due is the progress-based amount (total scaled by percent
  // completed), minus what's been allocated to the booking (clamped at 0).
  const serviceBookingsOutstanding = serviceBookings.value.reduce((sum, booking) => {
    const allocated = allocations
      .filter(a => a.service_booking === booking.id)
      .reduce((s, a) => s + a.allocated_amount, 0);
    return sum + ServiceBookingService.calculateOutstandingAmountFromData(booking, allocated);
  }, 0);

  const outstandingAmount = deliveriesOutstanding + serviceBookingsOutstanding;

  // Count of items with an outstanding balance (honest "unpaid" note for the outstanding
  // tile) — deliveries not fully paid plus service bookings whose progress-based due
  // exceeds what's been allocated.
  const unpaidCount =
    deliveries.value.filter(
      d => DeliveryPaymentCalculator.calculateOutstandingAmount(d, allocations) > 0
    ).length +
    serviceBookings.value.filter(b => {
      const allocated = allocations
        .filter(a => a.service_booking === b.id)
        .reduce((s, a) => s + a.allocated_amount, 0);
      return ServiceBookingService.calculateOutstandingAmountFromData(b, allocated) > 0;
    }).length;

  // Advances = money paid to vendors that isn't (fully) attributed to a delivery or
  // service booking yet. Per payment: max(0, amount - sum(allocated_amount)).
  let advances = 0;
  let advanceCount = 0;
  for (const payment of payments.value) {
    const allocations = payment.expand?.payment_allocations || [];
    const allocated = allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
    const unattributed = payment.amount - allocated;
    if (unattributed > 0) {
      advances += unattributed;
      advanceCount += 1;
    }
  }

  // Pending recovery = money owed back on vendor returns that haven't been settled
  // yet — i.e. returns (not rejected) with neither a linked refund/adjustment nor a
  // credit note. The moment a credit note or refund is recorded, the return drops off.
  const refundedReturnIds = new Set(
    vendorRefunds.value.map(r => r.vendor_return).filter(Boolean)
  );
  const creditedReturnIds = new Set(
    creditNotes.value.map(cn => cn.return_id).filter(Boolean)
  );
  let pendingRecovery = 0;
  let pendingRecoveryCount = 0;
  for (const ret of vendorReturns.value) {
    if (ret.status === 'rejected') continue;
    const settled = refundedReturnIds.has(ret.id!) || creditedReturnIds.has(ret.id!);
    if (!settled) {
      pendingRecovery += ret.total_return_amount || 0;
      pendingRecoveryCount += 1;
    }
  }

  return {
    totalExpenses,
    expensePerSqft,
    outstandingAmount,
    unpaidCount,
    advances,
    advanceCount,
    pendingRecovery,
    pendingRecoveryCount
  };
});

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
interface LedgerRow {
  id: string;
  date: string; // ISO date used for sorting
  vendorName: string;
  category: LedgerCategory;
  amount: number;
  // semantic status mapped to sw-badge variant
  statusKey: string;
  statusVariant: 'success' | 'accent' | 'danger';
}

// Resolve a vendor id to its display name from the loaded vendors array.
const vendorNameById = (vendorId?: string): string => {
  if (!vendorId) return t('common.unknownVendor');
  const match = vendors.value.find(v => v.id === vendorId);
  return match?.name || t('common.unknownVendor');
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
    rows.push({
      id: `delivery-${d.id}`,
      date: d.delivery_date,
      vendorName: vendorNameById(d.vendor),
      category: 'material',
      amount: d.total_amount,
      statusKey: status.key,
      statusVariant: status.variant
    });
  }

  for (const b of serviceBookings.value) {
    const status = statusFromPayment(b.payment_status);
    rows.push({
      id: `booking-${b.id}`,
      date: b.start_date,
      vendorName: vendorNameById(b.vendor),
      category: 'service',
      amount: b.total_amount,
      statusKey: status.key,
      statusVariant: status.variant
    });
  }

  for (const p of payments.value) {
    rows.push({
      id: `payment-${p.id}`,
      date: p.payment_date || p.created || '',
      vendorName: vendorNameById(p.vendor),
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