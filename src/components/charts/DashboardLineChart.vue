<template>
  <Line :data="data" :options="options" />
</template>

<script setup lang="ts">
// Owns the chart.js import + registration so it lives in its own lazy chunk
// (loaded via defineAsyncComponent from the dashboard), keeping chart.js off
// the critical/landing path.
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

defineProps<{
  data: any;
  options: any;
}>();
</script>
