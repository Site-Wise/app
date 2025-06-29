<template>
  <div v-if="item">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center space-x-4">
        <button @click="$router.back()"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ item.name }}</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Item Details & Delivery History</p>
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
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Item Information</h2>
        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Name:</span>
            <p class="text-gray-900 dark:text-white">{{ item.name }}</p>
          </div>
          <div v-if="item.description">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</span>
            <p class="text-gray-900 dark:text-white">{{ item.description }}</p>
          </div>
          <div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Unit:</span>
            <p class="text-gray-900 dark:text-white">{{ t(`units.${item.unit}`) !== `units.${item.unit}` ? `${t(`units.${item.unit}`)} (${item.unit})` : item.unit }}</p>
          </div>
        </div>
      </div>

      <!-- Delivery Summary -->
      <div class="lg:col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
            <div class="flex items-center">
              <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TruckIcon class="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-blue-700 dark:text-blue-300">Total Deliveries</p>
                <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ itemDeliveries.length }}</p>
              </div>
            </div>
          </div>

          <div class="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
            <div class="flex items-center">
              <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Package class="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-green-700 dark:text-green-300">Total Delivered</p>
                <p class="text-2xl font-bold text-green-900 dark:text-green-100">{{ totalDeliveredQuantity }} {{ t(`units.${item.unit}`) !== `units.${item.unit}` ? `${t(`units.${item.unit}`)} (${item.unit})` : item.unit }}</p>
              </div>
            </div>
          </div>

          <div class="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
            <div class="flex items-center">
              <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <DollarSign class="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-yellow-700 dark:text-yellow-300">Avg. Unit Price</p>
                <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">₹{{ averageUnitPrice.toFixed(2) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Price Range -->
        <div class="mt-6 card">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Price Range</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">₹{{ minPrice.toFixed(2) }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Lowest</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{{ averageUnitPrice.toFixed(2) }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Average</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-600 dark:text-red-400">₹{{ maxPrice.toFixed(2) }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Highest</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Price Chart -->
    <div class="card mb-8">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Unit Price Trend</h2>
      <div class="h-64 relative">
        <canvas ref="chartCanvas" class="w-full h-full"></canvas>
        <div v-if="itemDeliveries.length === 0" class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <BarChart3 class="mx-auto h-12 w-12 text-gray-400" />
            <p class="mt-2 text-gray-500 dark:text-gray-400">No delivery data to display</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Delivery History -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Delivery History</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ itemDeliveries.length }} deliveries</span>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date</th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Vendor</th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Quantity</th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Unit Price</th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Total Amount</th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Payment Status</th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="deliveryItem in itemDeliveries" :key="deliveryItem.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ formatDate(deliveryItem.delivery_date || '') }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ deliveryItem.expand?.delivery?.expand?.vendor?.name || 'Unknown Vendor' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ deliveryItem.quantity }} {{ t(`units.${item.unit}`) !== `units.${item.unit}` ? `${t(`units.${item.unit}`)} (${item.unit})` : item.unit }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ₹{{ deliveryItem.unit_price.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ₹{{ deliveryItem.total_amount.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="`status-${deliveryItem.expand?.delivery?.payment_status || 'pending'}`">
                  {{ deliveryItem.expand?.delivery?.payment_status || 'pending' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button @click="viewDelivery(deliveryItem)"
                  class="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300">
                  <Eye class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="itemDeliveries.length === 0" class="text-center py-12">
          <TruckIcon class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No deliveries recorded</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Start tracking by recording a delivery.</p>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center min-h-96">
    <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
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
  ctx.strokeStyle = '#e5e7eb';
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
  ctx.fillStyle = '#6b7280';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'right';

  // Y-axis labels (prices)
  const priceSteps = 5;
  for (let i = 0; i <= priceSteps; i++) {
    const price = adjustedMinPrice + (adjustedMaxPrice - adjustedMinPrice) * (i / priceSteps);
    const y = height - padding - (i / priceSteps) * chartHeight;

    // Grid line
    ctx.strokeStyle = '#f3f4f6';
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
    ctx.strokeStyle = '#3b82f6';
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
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Hover effect would go here in a more advanced implementation
  });

  // Chart title
  ctx.fillStyle = '#1f2937';
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

onMounted(() => {
  loadItemData();

  // Redraw chart on window resize
  const handleResize = () => {
    setTimeout(drawPriceChart, 100);
  };
  window.addEventListener('resize', handleResize);

  // Cleanup
  return () => {
    window.removeEventListener('resize', handleResize);
  };
});
</script>