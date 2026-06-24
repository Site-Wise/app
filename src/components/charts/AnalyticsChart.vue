<template>
  <component :is="chartComponent" :data="data" :options="options" />
</template>

<script setup lang="ts">
// Owns the chart.js import + registration so it lives in its own lazy chunk
// (loaded via defineAsyncComponent from AnalyticsView), keeping chart.js off
// the critical/landing path. Renders a Pie or Bar based on the `type` prop.
import { computed } from 'vue';
import { Pie, Bar } from 'vue-chartjs';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const props = defineProps<{
  type: 'pie' | 'bar';
  data: any;
  options: any;
}>();

const chartComponent = computed(() => (props.type === 'pie' ? Pie : Bar));
</script>
