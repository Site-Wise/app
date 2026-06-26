<template>
  <BottomSheet
    :model-value="modelValue"
    size="sm"
    :show-close-button="false"
    :close-on-overlay="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="text-center pt-2 pb-1">
      <!-- Icon -->
      <div class="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/25">
        <component :is="methodIcon" class="h-10 w-10 text-ink" :stroke-width="1.75" />
      </div>

      <h2 class="sw-h3 text-ink dark:text-cream">{{ t('biometric.setupTitle') }}</h2>
      <p class="mt-2 text-stone-600 dark:text-stone-400 leading-relaxed">
        {{ t('biometric.setupSubtitle', { method: methodLabel }) }}
      </p>

      <!-- Benefits -->
      <ul class="mt-6 space-y-3 text-left">
        <li
          v-for="benefit in benefits"
          :key="benefit.key"
          class="flex items-start gap-3"
        >
          <span class="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-forest-100 dark:bg-forest-500/15">
            <component :is="benefit.icon" class="h-4 w-4 text-forest-600 dark:text-forest-400" />
          </span>
          <span class="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
            {{ benefit.text }}
          </span>
        </li>
      </ul>
    </div>

    <template #footer>
      <div class="flex w-full flex-col gap-2">
        <button
          type="button"
          class="btn-primary w-full"
          :disabled="isBusy"
          @click="onEnable"
        >
          <Loader2 v-if="isBusy" class="h-4 w-4 animate-spin" />
          <component v-else :is="methodIcon" class="h-5 w-5" />
          {{ isBusy ? t('biometric.enabling') : t('biometric.enableButton', { method: methodLabel }) }}
        </button>
        <button
          type="button"
          class="btn-ghost w-full"
          :disabled="isBusy"
          @click="onLater"
        >
          {{ t('biometric.maybeLater') }}
        </button>
      </div>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Fingerprint, ScanFace, Zap, ShieldCheck, EyeOff, Loader2 } from 'lucide-vue-next';
import BottomSheet from './BottomSheet.vue';
import { useI18n } from '../composables/useI18n';
import { useToast } from '../composables/useToast';
import { useBiometricAuth } from '../composables/useBiometricAuth';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const { t } = useI18n();
const toast = useToast();
const { methodLabel, method, isBusy, enable, dismissSetupOffer } = useBiometricAuth();

const methodIcon = computed(() => (method.value === 'face' ? ScanFace : Fingerprint));

const benefits = computed(() => [
  { key: 'speed', icon: Zap, text: t('biometric.setupBenefitSpeed') },
  { key: 'secure', icon: ShieldCheck, text: t('biometric.setupBenefitSecure', { method: methodLabel.value }) },
  { key: 'private', icon: EyeOff, text: t('biometric.setupBenefitPrivate') },
]);

const close = () => emit('update:modelValue', false);

const onEnable = async () => {
  const ok = await enable();
  if (ok) close();
};

const onLater = () => {
  dismissSetupOffer();
  close();
  toast.info(t('biometric.laterHint'));
};
</script>
