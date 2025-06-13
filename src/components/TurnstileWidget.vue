<template>
  <div ref="turnstileRef" class="turnstile-widget"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  siteKey: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  language?: string;
}>();

const emit = defineEmits<{
  success: [token: string];
  error: [error: string];
  expired: [];
  timeout: [];
}>();

const turnstileRef = ref<HTMLElement>();
let widgetId: string | null = null;

const loadTurnstileScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile script'));
    document.head.appendChild(script);
  });
};

const renderWidget = async () => {
  if (!turnstileRef.value || !window.turnstile) return;

  try {
    widgetId = window.turnstile.render(turnstileRef.value, {
      sitekey: props.siteKey,
      theme: props.theme || 'auto',
      size: props.size || 'normal',
      language: props.language,
      callback: (token: string) => {
        emit('success', token);
      },
      'error-callback': (error: string) => {
        emit('error', error);
      },
      'expired-callback': () => {
        emit('expired');
      },
      'timeout-callback': () => {
        emit('timeout');
      },
    });
  } catch (error) {
    console.error('Failed to render Turnstile widget:', error);
    emit('error', 'Failed to render Turnstile widget');
  }
};

const reset = () => {
  if (widgetId && window.turnstile) {
    window.turnstile.reset(widgetId);
  }
};

const getResponse = (): string | null => {
  if (widgetId && window.turnstile) {
    return window.turnstile.getResponse(widgetId);
  }
  return null;
};

onMounted(async () => {
  try {
    await loadTurnstileScript();
    await renderWidget();
  } catch (error) {
    console.error('Turnstile initialization failed:', error);
    emit('error', 'Turnstile initialization failed');
  }
});

onUnmounted(() => {
  if (widgetId && window.turnstile) {
    window.turnstile.remove(widgetId);
  }
});

// Watch for theme changes
watch(() => props.theme, () => {
  if (widgetId && window.turnstile) {
    window.turnstile.remove(widgetId);
    renderWidget();
  }
});

// Expose methods to parent component
defineExpose({
  reset,
  getResponse
});

// Add global Turnstile types
declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | null;
    };
  }
}
</script>

<style scoped>
.turnstile-widget {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}
</style>