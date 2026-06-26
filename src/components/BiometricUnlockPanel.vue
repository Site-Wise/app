<template>
  <div class="text-center">
    <button
      type="button"
      :disabled="isBusy"
      class="group mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/25 transition-transform duration-150 ease-snap hover:scale-[1.03] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-4 focus-visible:ring-offset-cream dark:focus-visible:ring-offset-ink disabled:opacity-70"
      :aria-label="t('biometric.unlockButton', { method: methodLabel })"
      @click="doUnlock"
    >
      <Loader2 v-if="isBusy" class="h-11 w-11 animate-spin text-ink" />
      <component v-else :is="methodIcon" class="h-11 w-11 text-ink" :stroke-width="1.75" />
    </button>

    <h2 class="sw-h3 mt-6 text-ink dark:text-cream">{{ t('biometric.unlockTitle') }}</h2>
    <p v-if="vaultEmail" class="mt-1 text-sm font-medium text-stone-700 dark:text-stone-300">
      {{ vaultEmail }}
    </p>
    <p class="mt-2 text-stone-600 dark:text-stone-400">
      {{ t('biometric.unlockSubtitle', { method: methodLabel }) }}
    </p>

    <button
      type="button"
      class="btn-primary mt-7 w-full"
      :disabled="isBusy"
      @click="doUnlock"
    >
      <Loader2 v-if="isBusy" class="h-4 w-4 animate-spin" />
      <component v-else :is="methodIcon" class="h-5 w-5" />
      {{ isBusy ? t('biometric.unlocking') : t('biometric.unlockButton', { method: methodLabel }) }}
    </button>

    <button
      type="button"
      class="mt-4 text-sm font-semibold text-ink dark:text-cream hover:text-amber-700 dark:hover:text-amber-400"
      @click="$emit('usePassword')"
    >
      {{ t('biometric.usePassword') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Fingerprint, ScanFace, Loader2 } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useBiometricAuth } from '../composables/useBiometricAuth';

const props = withDefaults(defineProps<{ autoPrompt?: boolean }>(), { autoPrompt: false });
const emit = defineEmits<{ (e: 'unlocked'): void; (e: 'usePassword'): void }>();

const { t } = useI18n();
const { methodLabel, method, isBusy, vaultEmail, unlock } = useBiometricAuth();

const methodIcon = computed(() => (method.value === 'face' ? ScanFace : Fingerprint));

const doUnlock = async () => {
  const ok = await unlock({ onExpired: () => emit('usePassword') });
  if (ok) emit('unlocked');
};

onMounted(() => {
  // Optionally surface the OS prompt immediately for a one-tap return.
  if (props.autoPrompt) {
    // Defer so the panel paints first (and a user gesture isn't strictly
    // required on returning PWAs / native).
    setTimeout(() => doUnlock(), 350);
  }
});
</script>
