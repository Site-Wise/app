<template>
  <div v-if="item">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center space-x-4">
        <button @click="$router.back()"
          class="p-2 rounded-md hover:bg-stone-100 dark:hover:bg-ink-4 transition-colors">
          <ArrowLeft class="h-5 w-5 text-stone-600 dark:text-stone-400" />
        </button>
        <div>
          <h1 class="sw-h2 font-display text-ink dark:text-cream">{{ item.name }}</h1>
          <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">Item Details & Delivery History</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <button @click="exportItemReport" class="btn-outline">
          <Download class="mr-2 h-4 w-4" />
          Export Report
        </button>
        <button @click="recordDelivery" class="btn-primary">
          <TruckIcon class="mr-2 h-4 w-4" />
          Record Delivery
        </button>
      </div>
    </div>

    <!-- Item Info & Summary -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <!-- Item Information -->
      <div class="card">
        <h2 class="sw-h4 font-display text-ink dark:text-cream mb-4">Item Information</h2>
        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-stone-700 dark:text-stone-300">Name:</span>
            <p class="text-ink dark:text-cream">{{ item.name }}</p>
          </div>
          <div v-if="item.description">
            <span class="text-sm font-medium text-stone-700 dark:text-stone-300">Description:</span>
            <p class="text-ink dark:text-cream">{{ item.description }}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-stone-700 dark:text-stone-300">Unit:</span>
            <p class="text-ink dark:text-cream">{{ t(`units.${item.unit}`) !== `units.${item.unit}` ? `${t(`units.${item.unit}`)} (${item.unit})` : item.unit }}</p>
          </div>
        </div>
      </div>

      <!-- Delivery Summary -->
      <div class="lg:col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card">
            <div class="flex items-center">
              <div class="p-2 bg-stone-100 dark:bg-ink-4 rounded-md">
                <TruckIcon class="h-6 w-6 text-ink dark:text-cream" />
              </div>
              <div class="ml-4">
                <p class="sw-eyebrow text-stone-500 dark:text-stone-400">Total Deliveries</p>
                <p class="sw-stat font-display text-ink dark:text-cream sw-tabular">{{ itemDeliveries.length }}</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex items-start">
              <div class="p-2 bg-forest-100 dark:bg-forest-900/30 rounded-md">
                <Package class="h-6 w-6 text-forest-600 dark:text-forest-400" />
              </div>
              <div class="ml-4 min-w-0">
                <p class="sw-eyebrow text-stone-500 dark:text-stone-400">Total Delivered</p>
                <p class="sw-stat font-display text-ink dark:text-cream sw-tabular">{{ totalDeliveredQuantity }}</p>
                <p class="text-xs text-stone-500 dark:text-stone-400 leading-tight">{{ t(`units.${item.unit}`) !== `units.${item.unit}` ? `${t(`units.${item.unit}`)} (${item.unit})` : item.unit }}</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex items-center">
              <div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                <DollarSign class="h-6 w-6 text-amber-700 dark:text-amber-400" />
              </div>
              <div class="ml-4">
                <p class="sw-eyebrow text-stone-500 dark:text-stone-400">Avg. Unit Price</p>
                <p class="sw-stat font-display text-ink dark:text-cream sw-tabular">₹{{ averageUnitPrice.toFixed(2) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Price Range -->
        <div class="mt-6 card">
          <h3 class="sw-h4 font-display text-ink dark:text-cream mb-4">Price Range</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-2xl font-bold font-mono sw-tabular text-forest-600 dark:text-forest-400">₹{{ minPrice.toFixed(2) }}</p>
              <p class="text-sm text-stone-600 dark:text-stone-400">Lowest</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold font-mono sw-tabular text-ink dark:text-cream">₹{{ averageUnitPrice.toFixed(2) }}</p>
              <p class="text-sm text-stone-600 dark:text-stone-400">Average</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold font-mono sw-tabular text-clay-600 dark:text-clay-400">₹{{ maxPrice.toFixed(2) }}</p>
              <p class="text-sm text-stone-600 dark:text-stone-400">Highest</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Price Chart -->
    <div class="card mb-8">
      <h2 class="sw-h4 font-display text-ink dark:text-cream mb-4">Unit Price Trend</h2>
      <div class="h-64 relative">
        <canvas ref="chartCanvas" class="w-full h-full"></canvas>
        <div v-if="itemDeliveries.length === 0" class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <BarChart3 class="mx-auto h-12 w-12 text-stone-400" />
            <p class="mt-2 text-stone-500 dark:text-stone-400">No delivery data to display</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Delivery History -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="sw-h4 font-display text-ink dark:text-cream">Delivery History</h2>
        <span class="text-sm text-stone-500 dark:text-stone-400">{{ itemDeliveries.length }} deliveries</span>
      </div>

      <!-- Desktop table (lg+) -->
      <table v-if="itemDeliveries.length > 0" class="hidden lg:table min-w-full">
        <thead class="hidden lg:table-header-group">
          <tr class="border-b border-stone-200 dark:border-ink-4">
            <th class="px-4 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">Date</th>
            <th class="px-4 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">Vendor</th>
            <th class="px-4 py-3 text-right sw-eyebrow text-stone-500 dark:text-stone-400">Quantity</th>
            <th class="px-4 py-3 text-right sw-eyebrow text-stone-500 dark:text-stone-400">Unit Price</th>
            <th class="px-4 py-3 text-right sw-eyebrow text-stone-500 dark:text-stone-400">Total</th>
            <th class="px-4 py-3 text-left sw-eyebrow text-stone-500 dark:text-stone-400">Payment</th>
            <th class="px-4 py-3 text-right sw-eyebrow text-stone-500 dark:text-stone-400">View</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200 dark:divide-ink-4">
          <tr v-for="deliveryItem in itemDeliveries" :key="deliveryItem.id"
            class="hover:bg-cream-2 dark:hover:bg-ink-2 transition-colors">
            <td class="hidden lg:table-cell px-4 py-3.5 whitespace-nowrap text-sm text-ink dark:text-cream">
              {{ formatDate(deliveryItem.delivery_date || '') }}
            </td>
            <td class="hidden lg:table-cell px-4 py-3.5 text-sm text-ink dark:text-cream">
              {{ deliveryItem.expand?.delivery?.expand?.vendor?.name || 'Unknown Vendor' }}
            </td>
            <td class="hidden lg:table-cell px-4 py-3.5 whitespace-nowrap text-right text-sm font-mono sw-tabular text-ink dark:text-cream">
              {{ deliveryItem.quantity }} <span class="text-xs text-stone-500 dark:text-stone-400">{{ item.unit }}</span>
            </td>
            <td class="hidden lg:table-cell px-4 py-3.5 whitespace-nowrap text-right text-sm font-mono sw-tabular text-ink dark:text-cream">
              ₹{{ deliveryItem.unit_price.toFixed(2) }}
            </td>
            <td class="hidden lg:table-cell px-4 py-3.5 whitespace-nowrap text-right text-sm font-mono sw-tabular font-semibold text-ink dark:text-cream">
              ₹{{ deliveryItem.total_amount.toFixed(2) }}
            </td>
            <td class="hidden lg:table-cell px-4 py-3.5 whitespace-nowrap">
              <span :class="`status-${deliveryItem.expand?.delivery?.payment_status || 'pending'}`">
                {{ deliveryItem.expand?.delivery?.payment_status || 'pending' }}
              </span>
            </td>
            <td class="hidden lg:table-cell px-4 py-3.5 whitespace-nowrap text-right">
              <button @click="viewDelivery(deliveryItem)" aria-label="View delivery"
                class="inline-flex items-center justify-center h-9 w-9 rounded-md text-stone-500 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-cream-3 dark:hover:bg-ink-4 transition-colors">
                <Eye class="h-4 w-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile / tablet cards (<lg) -->
      <div v-if="itemDeliveries.length > 0" class="lg:hidden space-y-3">
        <div v-for="deliveryItem in itemDeliveries" :key="deliveryItem.id"
          class="rounded-lg border border-stone-200 dark:border-ink-4 bg-cream-2/50 dark:bg-ink-2 p-4">
          <!-- Header: date + vendor / status -->
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink dark:text-cream">{{ deliveryItem.expand?.delivery?.expand?.vendor?.name || 'Unknown Vendor' }}</p>
              <p class="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{{ formatDate(deliveryItem.delivery_date || '') }}</p>
            </div>
            <span :class="`status-${deliveryItem.expand?.delivery?.payment_status || 'pending'} shrink-0`">
              {{ deliveryItem.expand?.delivery?.payment_status || 'pending' }}
            </span>
          </div>

          <!-- Mini-grid: quantity / unit price / total -->
          <div class="mt-3 grid grid-cols-3 gap-2 border-t border-stone-200 dark:border-ink-4 pt-3">
            <div>
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400">Quantity</p>
              <p class="mt-0.5 text-sm font-mono sw-tabular text-ink dark:text-cream">
                {{ deliveryItem.quantity }} <span class="text-xs text-stone-500 dark:text-stone-400">{{ item.unit }}</span>
              </p>
            </div>
            <div>
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400">Unit Price</p>
              <p class="mt-0.5 text-sm font-mono sw-tabular text-ink dark:text-cream">₹{{ deliveryItem.unit_price.toFixed(2) }}</p>
            </div>
            <div>
              <p class="sw-eyebrow text-stone-500 dark:text-stone-400">Total</p>
              <p class="mt-0.5 text-sm font-mono sw-tabular font-semibold text-ink dark:text-cream">₹{{ deliveryItem.total_amount.toFixed(2) }}</p>
            </div>
          </div>

          <!-- Action -->
          <div class="mt-3 flex justify-end border-t border-stone-200 dark:border-ink-4 pt-3">
            <button @click="viewDelivery(deliveryItem)"
              class="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-md text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-cream-3 dark:hover:bg-ink-4 transition-colors">
              <Eye class="h-4 w-4" />
              View Delivery
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="itemDeliveries.length === 0" class="text-center py-12">
        <TruckIcon class="mx-auto h-12 w-12 text-stone-400" />
        <h3 class="mt-2 text-sm font-medium text-ink dark:text-cream">No deliveries recorded</h3>
        <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">Start tracking by recording a delivery.</p>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center min-h-96">
    <Loader2 class="h-8 w-8 animate-spin text-stone-400" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useI18n } from '../composables/useI18n';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  Download,
  TruckIcon,
  Package,
  DollarSign,
  BarChart3,
  Eye,
  Loader2
} from 'lucide-vue-next';
import {
  itemService,
  deliveryService,
  type Item,
  type DeliveryItem
} from '../services/pocketbase';

// Extended DeliveryItem with delivery context
interface ExtendedDeliveryItem extends DeliveryItem {
  delivery_date?: string;
  expand?: DeliveryItem['expand'] & {
    delivery?: any;
  };
}

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const item = ref<Item | null>(null);
const itemDeliveries = ref<ExtendedDeliveryItem[]>([]);
const chartCanvas = ref<HTMLCanvasElement | null>(null);

const totalDeliveredQuantity = computed(() => {
  return itemDeliveries.value.reduce((sum, deliveryItem) => sum + deliveryItem.quantity, 0);
});

const averageUnitPrice = computed(() => {
  if (itemDeliveries.value.length === 0) return 0;
  const totalValue = itemDeliveries.value.reduce((sum, deliveryItem) => sum + deliveryItem.total_amount, 0);
  const totalQuantity = itemDeliveries.value.reduce((sum, deliveryItem) => sum + deliveryItem.quantity, 0);
  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
});

const minPrice = computed(() => {
  if (itemDeliveries.value.length === 0) return 0;
  return Math.min(...itemDeliveries.value.map(d => d.unit_price));
});

const maxPrice = computed(() => {
  if (itemDeliveries.value.length === 0) return 0;
  return Math.max(...itemDeliveries.value.map(d => d.unit_price));
});

const loadItemData = async () => {
  const itemId = route.params.id as string;

  try {
    const [allItems, allDeliveries] = await Promise.all([
      itemService.getAll(),
      deliveryService.getAll()
    ]);

    item.value = allItems.find(i => i.id === itemId) || null;
    
    // Get delivery items for this specific item from all deliveries
    const allDeliveryItems: ExtendedDeliveryItem[] = [];
    allDeliveries.forEach(delivery => {
      if (delivery.expand?.delivery_items) {
        delivery.expand.delivery_items.forEach(deliveryItem => {
          if (deliveryItem.item === itemId) {
            // Add delivery context to delivery item
            allDeliveryItems.push({
              ...deliveryItem,
              delivery_date: delivery.delivery_date,
              expand: {
                ...deliveryItem.expand,
                delivery: delivery
              }
            });
          }
        });
      }
    });
    
    itemDeliveries.value = allDeliveryItems
      .sort((a, b) => new Date(a.delivery_date || '').getTime() - new Date(b.delivery_date || '').getTime());

    if (!item.value) {
      router.push('/items');
      return;
    }

    // Draw chart after data is loaded
    await nextTick();
    drawPriceChart();
  } catch (error) {
    console.error('Error loading item data:', error);
    router.push('/items');
  }
};

const drawPriceChart = () => {
  if (!chartCanvas.value || itemDeliveries.value.length === 0) return;

  const canvas = chartCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set canvas size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;
  const padding = 60;

  // Theme-aware chart colors (presentation only)
  const isDark = document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#3A4140' : '#e5e7eb';
  const gridColor = isDark ? '#232827' : '#f3f4f6';
  const labelColor = isDark ? '#A8B0AD' : '#6b7280';
  const lineColor = '#FFB800';
  const titleColor = isDark ? '#FAFAF7' : '#1f2937';

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Prepare data
  const data = itemDeliveries.value.map(deliveryItem => ({
    date: new Date(deliveryItem.delivery_date || ''),
    price: deliveryItem.unit_price,
    vendor: deliveryItem.expand?.delivery?.expand?.vendor?.name || 'Unknown'
  }));

  if (data.length === 0) return;

  // Calculate scales
  const minPriceValue = Math.min(...data.map(d => d.price));
  const maxPriceValue = Math.max(...data.map(d => d.price));
  const priceRange = maxPriceValue - minPriceValue;
  const adjustedMinPrice = minPriceValue - priceRange * 0.1;
  const adjustedMaxPrice = maxPriceValue + priceRange * 0.1;

  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Draw axes
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;

  // Y-axis
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();

  // X-axis
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw grid lines and labels
  ctx.fillStyle = labelColor;
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'right';

  // Y-axis labels (prices)
  const priceSteps = 5;
  for (let i = 0; i <= priceSteps; i++) {
    const price = adjustedMinPrice + (adjustedMaxPrice - adjustedMinPrice) * (i / priceSteps);
    const y = height - padding - (i / priceSteps) * chartHeight;

    // Grid line
    ctx.strokeStyle = gridColor;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();

    // Label
    ctx.fillText(`₹${price.toFixed(0)}`, padding - 10, y + 4);
  }

  // X-axis labels (dates)
  ctx.textAlign = 'center';
  const dateSteps = Math.min(data.length, 6);
  for (let i = 0; i < dateSteps; i++) {
    let dataIndex;
    if (dateSteps === 1) {
      dataIndex = 0; // Only one data point
    } else {
      dataIndex = Math.floor((data.length - 1) * (i / (dateSteps - 1)));
      dataIndex = Math.min(dataIndex, data.length - 1); // Bounds check
    }
    
    const date = data[dataIndex].date;
    const x = padding + (dataIndex / Math.max(data.length - 1, 1)) * chartWidth;

    ctx.fillText(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, height - padding + 20);
  }

  // Draw line chart
  if (data.length > 1) {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const y = height - padding - ((point.price - adjustedMinPrice) / Math.max(adjustedMaxPrice - adjustedMinPrice, 1)) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  // Draw data points
  data.forEach((point, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = height - padding - ((point.price - adjustedMinPrice) / Math.max(adjustedMaxPrice - adjustedMinPrice, 1)) * chartHeight;

    // Point
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Hover effect would go here in a more advanced implementation
  });

  // Chart title
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Unit Price Over Time', width / 2, 30);
};

const recordDelivery = () => {
  router.push('/deliveries');
};

const viewDelivery = (_deliveryItem: ExtendedDeliveryItem) => {
  router.push('/deliveries');
};

const exportItemReport = () => {
  if (!item.value) return;

  // Create CSV content
  const csvContent = generateItemReportCSV();

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${item.value.name}_report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const generateItemReportCSV = () => {
  if (!item.value) return '';

  const headers = ['Date', 'Vendor', 'Quantity', 'Unit Price', 'Total Amount', 'Payment Status', 'Notes'];

  const rows = itemDeliveries.value.map(deliveryItem => [
    deliveryItem.delivery_date || '',
    deliveryItem.expand?.delivery?.expand?.vendor?.name || 'Unknown Vendor',
    deliveryItem.quantity,
    deliveryItem.unit_price,
    deliveryItem.total_amount,
    deliveryItem.expand?.delivery?.payment_status || 'pending',
    deliveryItem.notes || ''
  ]);

  // Add summary row
  rows.push([
    '',
    'SUMMARY',
    totalDeliveredQuantity.value,
    averageUnitPrice.value.toFixed(2),
    itemDeliveries.value.reduce((sum, d) => sum + d.total_amount, 0),
    '',
    `Report generated on ${new Date().toISOString().split('T')[0]}`
  ]);

  // Convert to CSV
  const csvRows = [headers, ...rows];
  return csvRows.map(row =>
    row.map(field =>
      typeof field === 'string' && field.includes(',') ? `"${field}"` : field
    ).join(',')
  ).join('\n');
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

// Event listeners using @vueuse/core
const handleResize = () => {
  setTimeout(drawPriceChart, 100);
};
useEventListener(window, 'resize', handleResize);

onMounted(() => {
  loadItemData();
});
</script>