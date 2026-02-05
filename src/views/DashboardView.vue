<template>
  <div>
    <!-- Header - Mobile optimized -->
    <div class="mb-6 lg:mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{{ t('dashboard.title') }}</h1>
          <p class="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            {{ t('dashboard.subtitle', { siteName: currentSite?.name || 'your construction site' }) }}
          </p>
        </div>
        <div v-if="currentSite" class="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5">
          <span>{{ currentSite.total_units }} {{ t('dashboard.units') }}</span>
          <span class="mx-1.5">•</span>
          <span>{{ currentSite.total_planned_area.toLocaleString() }} {{ t('dashboard.sqft') }}</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
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
            <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg w-fit mb-2 sm:mb-0">
              <TrendingUp class="h-5 w-5 sm:h-8 sm:w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div class="sm:ml-4">
              <p class="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.totalExpenses') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">₹{{
                formatCompactAmount(stats.totalExpenses) }}
              </p>
            </div>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg w-fit mb-2 sm:mb-0">
              <Calendar class="h-5 w-5 sm:h-8 sm:w-8 text-secondary-600 dark:text-secondary-400" />
            </div>
            <div class="sm:ml-4">
              <p class="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 line-clamp-1">{{ t('dashboard.currentMonthExpenses') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">₹{{
                formatCompactAmount(stats.currentMonthExpenses) }}</p>
            </div>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg w-fit mb-2 sm:mb-0">
              <Calculator class="h-5 w-5 sm:h-8 sm:w-8 text-warning-600 dark:text-warning-400" />
            </div>
            <div class="sm:ml-4">
              <p class="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.expensePerSqft') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">₹{{ stats.expensePerSqft.toLocaleString() }}</p>
            </div>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <div class="p-2 bg-error-100 dark:bg-error-900/30 rounded-lg w-fit mb-2 sm:mb-0">
              <DollarSign class="h-5 w-5 sm:h-8 sm:w-8 text-error-600 dark:text-error-400" />
            </div>
            <div class="sm:ml-4">
              <p class="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.outstandingAmount') }}</p>
              <p class="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">₹{{
                formatCompactAmount(stats.outstandingAmount) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Payments Chart -->
      <div class="card p-4 sm:p-6" data-tour="recent-activities">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h2 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{{ t('dashboard.paymentsLastSevenDays') }}</h2>
          <div class="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5">
            <BarChart3 class="h-4 w-4 mr-2" />
            {{ t('dashboard.totalPaid') }}: ₹{{ formatCompactAmount(weeklyPaymentTotal) }}
          </div>
        </div>
        <div class="w-full">
          <!-- Chart Container -->
          <div
            class="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 sm:p-6 border border-gray-200 dark:border-gray-700">
            <!-- Chart.js Line Chart -->
            <div class="h-48 sm:h-64">
              <Line :data="chartData" :options="chartOptions" />
            </div>
          </div>
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

  return {
    totalExpenses,
    currentMonthExpenses,
    expensePerSqft,
    outstandingAmount
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
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };
});

const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        cornerRadius: 8,
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
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
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
        hoverBackgroundColor: 'rgb(59, 130, 246)',
        hoverBorderColor: 'white'
      }
    }
  };
});

const weeklyPaymentTotal = computed(() => {
  return paymentChartData.value.reduce((sum, day) => sum + day.amount, 0);
});

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