<template>
  <div>
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('dashboard.title') }}</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ t('dashboard.subtitle', { siteName: currentSite?.name || 'your construction site' }) }}
          </p>
        </div>
        <div v-if="currentSite" class="text-right">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ currentSite.total_units }} {{ t('dashboard.units') }} • {{ currentSite.total_planned_area.toLocaleString() }} {{ t('dashboard.sqft') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <!-- Stats Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-tour="quick-stats">
      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <TrendingUp class="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.totalExpenses') }}</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">₹{{ stats.totalExpenses.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg">
            <Calendar class="h-8 w-8 text-secondary-600 dark:text-secondary-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.currentMonthExpenses') }}</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">₹{{ stats.currentMonthExpenses.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
            <Calculator class="h-8 w-8 text-warning-600 dark:text-warning-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.expensePerSqft') }}</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">₹{{ stats.expensePerSqft }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-error-100 dark:bg-error-900/30 rounded-lg">
            <DollarSign class="h-8 w-8 text-error-600 dark:text-error-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('dashboard.outstandingAmount') }}</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">₹{{ stats.outstandingAmount.toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>


    <!-- Payments Chart -->
    <div class="card mt-8" data-tour="recent-activities">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('dashboard.paymentsLastSevenDays') }}</h2>
        <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <BarChart3 class="h-4 w-4 mr-2" />
          {{ t('dashboard.totalPaid') }}: ₹{{ weeklyPaymentTotal.toLocaleString() }}
        </div>
      </div>
      <div class="w-full">
        <!-- Chart Container -->
        <div class="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <!-- Chart.js Line Chart -->
          <div class="h-64">
            <Line :data="chartData" :options="chartOptions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
  serviceBookingService
} from '../services/pocketbase';

const { t } = useI18n();

const { currentSite } = useSite();

// Use site-aware data loading
const { data: dashboardData, loading } = useSiteData(async () => {
  const [payments, deliveries, serviceBookings] = await Promise.all([
    paymentService.getAll(),
    deliveryService.getAll(),
    serviceBookingService.getAll(),
  ]);
  
  return { payments, deliveries, serviceBookings };
});

const payments = computed(() => dashboardData.value?.payments || []);
const deliveries = computed(() => dashboardData.value?.deliveries || []);
const serviceBookings = computed(() => dashboardData.value?.serviceBookings || []);


const stats = computed(() => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const totalExpenses = deliveries.value.reduce((sum, delivery) => {
    return sum + delivery.total_amount;
  }, 0) + serviceBookings.value.reduce((sum, booking) => {
    return sum + booking.total_amount;
  }, 0);
  
  const currentMonthExpenses = deliveries.value
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
  
  const totalSqft = currentSite.value?.total_planned_area || 1;
  const expensePerSqft = Math.round(totalExpenses / totalSqft);
  
  const outstandingAmount = deliveries.value.reduce((sum, delivery) => {
    const outstanding = delivery.total_amount - delivery.paid_amount;
    return sum + (outstanding > 0 ? outstanding : 0);
  }, 0) + serviceBookings.value.reduce((sum, booking) => {
    const outstanding = booking.total_amount - booking.paid_amount;
    return sum + (outstanding > 0 ? outstanding : 0);
  }, 0);

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
          label: function(context: any) {
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
          callback: function(value: any) {
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



</script>