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

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-amber" />
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
        <div class="card p-3 sm:p-5">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-amber/15 rounded-md w-fit mb-2 sm:mb-0">
              <TrendingUp class="h-5 w-5 sm:h-8 sm:w-8 text-amber-700 dark:text-amber" />
            </div>
            <div class="sm:ml-4">
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('dashboard.totalExpenses') }}</p>
              <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">₹{{
                formatCompactAmount(animTotalExpenses) }}
              </p>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-stone-200 dark:border-ink-4 flex items-center gap-1.5 text-xs">
            <span class="text-stone-500 dark:text-stone-400">{{ t('dashboard.perSqftNote') }}</span>
            <span class="font-mono sw-tabular text-stone-600 dark:text-stone-300">₹{{ displayPerSqft }}</span>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-stone-200/60 dark:bg-ink-2 rounded-md w-fit mb-2 sm:mb-0">
              <Calendar class="h-5 w-5 sm:h-8 sm:w-8 text-stone-600 dark:text-stone-300" />
            </div>
            <div class="sm:ml-4">
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400 line-clamp-1">{{ t('dashboard.currentMonthExpenses') }}</p>
              <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">₹{{
                formatCompactAmount(animCurrentMonthExpenses) }}</p>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-stone-200 dark:border-ink-4 flex items-center gap-1.5 text-xs">
            <template v-if="monthOverMonthDelta">
              <span
                class="font-mono sw-tabular font-semibold"
                :class="monthOverMonthDelta.isUp ? 'text-clay-600 dark:text-clay-400' : 'text-forest-600 dark:text-forest-400'"
              >{{ monthOverMonthDelta.label }}</span>
              <span class="text-stone-500 dark:text-stone-400">{{ t('dashboard.vsLastMonth') }}</span>
            </template>
            <span v-else class="text-stone-500 dark:text-stone-400">{{ t('dashboard.thisMonthNote') }}</span>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-amber/15 rounded-md w-fit mb-2 sm:mb-0">
              <Calculator class="h-5 w-5 sm:h-8 sm:w-8 text-amber-700 dark:text-amber" />
            </div>
            <div class="sm:ml-4">
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('dashboard.expensePerSqft') }}</p>
              <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">₹{{ displayPerSqft }}</p>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-stone-200 dark:border-ink-4 flex items-center gap-1.5 text-xs">
            <span class="text-stone-500 dark:text-stone-400">{{ currentSite?.total_planned_area?.toLocaleString('en-IN') }}</span>
            <span class="text-stone-500 dark:text-stone-400">{{ t('dashboard.sqft') }}</span>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-clay/15 rounded-md w-fit mb-2 sm:mb-0">
              <DollarSign class="h-5 w-5 sm:h-8 sm:w-8 text-clay" />
            </div>
            <div class="sm:ml-4">
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('dashboard.outstandingAmount') }}</p>
              <p class="font-mono sw-tabular text-lg sm:text-2xl font-semibold text-ink dark:text-cream">₹{{
                formatCompactAmount(animOutstandingAmount) }}</p>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-stone-200 dark:border-ink-4 flex items-center gap-1.5 text-xs">
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
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h2 class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('dashboard.paymentsLastSevenDays') }}</h2>
          <div class="flex items-center text-xs sm:text-sm text-stone-600 dark:text-stone-300 bg-cream-2 dark:bg-ink-2 border border-stone-200 dark:border-ink-4 rounded-md px-3 py-1.5">
            <BarChart3 class="h-4 w-4 mr-2 text-amber-700 dark:text-amber" />
            {{ t('dashboard.totalPaid') }}: <span class="ml-1 font-mono sw-tabular text-ink dark:text-cream">₹{{ formatCompactAmount(animWeeklyTotal) }}</span>
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
import { TrendingUp, Calendar, Calculator, DollarSign, Loader2, BarChart3 } from 'lucide-vue-next';
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
  vendorService
} from '../services/pocketbase';
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
  const [payments, deliveries, serviceBookings, vendorRefunds, vendors] = await Promise.all([
    paymentService.getAll(),
    deliveryService.getAll(),
    serviceBookingService.getAll(),
    vendorRefundService.getAll(),
    vendorService.getAll(),
  ]);

  return { payments, deliveries, serviceBookings, vendorRefunds, vendors };
});

const payments = computed(() => dashboardData.value?.payments || []);
const deliveries = computed(() => dashboardData.value?.deliveries || []);
const serviceBookings = computed(() => dashboardData.value?.serviceBookings || []);
const vendorRefunds = computed(() => dashboardData.value?.vendorRefunds || []);
const vendors = computed(() => dashboardData.value?.vendors || []);


const stats = computed(() => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

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

  // Calculate current month gross expenses
  const currentMonthGrossExpenses = deliveries.value
    .filter(delivery => {
      const deliveryDate = new Date(delivery.delivery_date);
      return deliveryDate.getMonth() === currentMonth && deliveryDate.getFullYear() === currentYear;
    })
    .reduce((sum, delivery) => sum + delivery.total_amount, 0) +
    serviceBookings.value
      .filter(booking => {
        const bookingDate = new Date(booking.start_date);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
      })
      .reduce((sum, booking) => sum + booking.total_amount, 0);

  // Calculate current month refunds
  const currentMonthRefunds = vendorRefunds.value
    .filter(refund => {
      const refundDate = new Date(refund.refund_date);
      return refundDate.getMonth() === currentMonth && refundDate.getFullYear() === currentYear;
    })
    .reduce((sum, refund) => sum + refund.refund_amount, 0);

  // Net current month expenses = Gross expenses - Refunds
  const currentMonthExpenses = currentMonthGrossExpenses - currentMonthRefunds;

  // Previous calendar month net expenses (for month-over-month delta on the spend tile)
  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = prevDate.getMonth();
  const prevYear = prevDate.getFullYear();

  const prevMonthGrossExpenses = deliveries.value
    .filter(delivery => {
      const d = new Date(delivery.delivery_date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    })
    .reduce((sum, delivery) => sum + delivery.total_amount, 0) +
    serviceBookings.value
      .filter(booking => {
        const d = new Date(booking.start_date);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((sum, booking) => sum + booking.total_amount, 0);

  const prevMonthRefunds = vendorRefunds.value
    .filter(refund => {
      const d = new Date(refund.refund_date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    })
    .reduce((sum, refund) => sum + refund.refund_amount, 0);

  const prevMonthExpenses = prevMonthGrossExpenses - prevMonthRefunds;

  const totalSqft = currentSite.value?.total_planned_area || 1;
  const expensePerSqft = Math.round(totalExpenses / totalSqft);

  // Calculate total amount due from deliveries
  const deliveriesTotal = deliveries.value.reduce((sum, delivery) => sum + delivery.total_amount, 0);

  // Calculate total amount due from service bookings based on progress percentage
  const serviceBookingsTotal = serviceBookings.value.reduce((sum, booking) => {
    return sum + ServiceBookingService.calculateProgressBasedAmount(booking);
  }, 0);

  // Calculate total payments made
  const totalPaid = payments.value.reduce((sum, payment) => sum + payment.amount, 0);

  // Outstanding = Total Due - Total Paid
  const totalDue = deliveriesTotal + serviceBookingsTotal;
  const outstandingAmount = totalDue - totalPaid > 0 ? totalDue - totalPaid : 0;

  // Count of deliveries that are not fully paid (honest "unpaid" note for the outstanding tile)
  const unpaidCount = deliveries.value.filter(
    d => (d.paid_amount || 0) < d.total_amount
  ).length;

  return {
    totalExpenses,
    currentMonthExpenses,
    prevMonthExpenses,
    expensePerSqft,
    outstandingAmount,
    unpaidCount
  };
});

// Real month-over-month delta % for the current-month spend tile.
// Spend going UP is a warning (clay); going DOWN is good (forest green).
const monthOverMonthDelta = computed(() => {
  const current = stats.value.currentMonthExpenses;
  const prev = stats.value.prevMonthExpenses;
  if (prev <= 0) return null; // no honest baseline -> hide delta, show neutral note instead
  const pct = ((current - prev) / prev) * 100;
  return {
    pct,
    label: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    isUp: pct > 0
  };
});

const paymentChartData = computed(() => {
  const days = [];
  const today = new Date();

  // Get last 7 days of payment data
  for (let i = 6; i >= 0; i--) {
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

    days.push({
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      amount
    });
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

const weeklyPaymentTotal = computed(() => {
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
const animCurrentMonthExpenses = useCountUp(() => stats.value.currentMonthExpenses);
const animExpensePerSqft = useCountUp(() => stats.value.expensePerSqft);
const animOutstandingAmount = useCountUp(() => stats.value.outstandingAmount);
const animWeeklyTotal = useCountUp(() => weeklyPaymentTotal.value);
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