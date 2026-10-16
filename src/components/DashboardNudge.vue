<template>
  <!-- Actionable nudge: a single friction-free next step -->
  <div
    v-if="visibleNudge"
    class="card p-4 sm:p-5 mb-6 lg:mb-8 border-l-4 border-l-amber-500"
    data-tour="nudge"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <div class="p-2 bg-amber/15 rounded-md shrink-0">
          <Zap class="h-5 w-5 text-amber-700 dark:text-amber" :aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="sw-eyebrow text-stone-500 dark:text-stone-400">{{ t('nudges.eyebrow') }}</p>
          <h3 class="font-display font-semibold text-ink dark:text-cream mt-0.5">
            {{ t(visibleNudge.titleKey) }}
          </h3>
          <p class="mt-1 text-sm text-stone-600 dark:text-stone-300">
            {{ t(visibleNudge.messageKey, { count: visibleNudge.params.count, amount: formatAmount(visibleNudge.params.amount) }) }}
          </p>
        </div>
      </div>
      <button
        @click="dismiss(visibleNudge.id)"
        class="shrink-0 p-1 -mr-1 -mt-1 rounded-md text-stone-400 hover:text-ink dark:hover:text-cream hover:bg-cream-2 dark:hover:bg-ink-2 transition-colors"
        :aria-label="t('nudges.dismiss')"
      >
        <X class="h-4 w-4" :aria-hidden="true" />
      </button>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <button
        @click="act(visibleNudge)"
        class="inline-flex items-center gap-2 h-9 px-3.5 rounded-md text-sm font-semibold bg-amber-500 text-ink hover:bg-amber-600 transition-colors duration-150 ease-snap active:scale-[0.98]"
      >
        {{ t(visibleNudge.ctaKey) }}
        <ArrowRight class="h-4 w-4" :aria-hidden="true" />
      </button>
      <button
        @click="dismiss(visibleNudge.id)"
        class="text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-cream transition-colors"
      >
        {{ t('nudges.later') }}
      </button>
      <span class="inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 ml-auto">
        <Clock class="h-3.5 w-3.5" :aria-hidden="true" />
        {{ t(visibleNudge.microSprintKey) }}
      </span>
    </div>
  </div>

  <!-- Celebration / all-clear: positive reinforcement when nothing is pending -->
  <div
    v-else-if="showCelebration"
    class="card p-4 sm:p-5 mb-6 lg:mb-8 border-l-4 border-l-forest-500"
    data-tour="nudge"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <div class="p-2 bg-forest/15 rounded-md shrink-0">
          <PartyPopper class="h-5 w-5 text-forest-700 dark:text-forest-400" :aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <h3 class="font-display font-semibold text-ink dark:text-cream">
            {{ t('nudges.celebration.title') }}
          </h3>
          <p class="mt-1 text-sm text-stone-600 dark:text-stone-300">
            {{ t('nudges.celebration.message') }}
          </p>
        </div>
      </div>
      <button
        @click="dismiss('celebration')"
        class="shrink-0 text-sm font-medium text-forest-700 dark:text-forest-400 hover:text-forest-800 dark:hover:text-forest-300 transition-colors"
      >
        {{ t('nudges.celebration.dismiss') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Zap, X, ArrowRight, Clock, PartyPopper } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useNudges, type NudgeDescriptor, type NudgeId } from '../composables/useNudges';
import type { DashboardStats } from '../utils/dashboardStats';

const props = defineProps<{
  stats: DashboardStats | null;
  // Whether the site has any real activity yet. Gates the celebration state so
  // brand-new (but non-onboarding) sites don't get an "all caught up" for an
  // empty ledger.
  hasActivity: boolean;
  // Current site id — dismissals are tracked per site.
  siteId: string | undefined;
}>();

const { t } = useI18n();
const router = useRouter();

const { activeNudge, allClear } = useNudges(() => props.stats);

// Per-site, per-nudge session dismissal. "Later" respects the user's focus for
// the session; the nudge returns next session (or when a higher-priority signal
// appears). Kept in sessionStorage so it never permanently silences the coach.
const DISMISS_PREFIX = 'sitewise_nudge_dismissed_';
const dismissedKeys = ref<Set<string>>(new Set());

const keyFor = (id: NudgeId | 'celebration') => `${DISMISS_PREFIX}${props.siteId ?? 'none'}_${id}`;

// Reload the dismissed set whenever the site changes.
watch(
  () => props.siteId,
  () => {
    const next = new Set<string>();
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(`${DISMISS_PREFIX}${props.siteId ?? 'none'}_`)) next.add(k);
      }
    } catch {
      // sessionStorage unavailable (private mode / SSR) — treat as nothing dismissed.
    }
    dismissedKeys.value = next;
  },
  { immediate: true }
);

const isDismissed = (id: NudgeId | 'celebration') => dismissedKeys.value.has(keyFor(id));

const visibleNudge = computed<NudgeDescriptor | null>(() => {
  const n = activeNudge.value;
  return n && !isDismissed(n.id) ? n : null;
});

const showCelebration = computed(
  () => allClear.value && props.hasActivity && !isDismissed('celebration')
);

const dismiss = (id: NudgeId | 'celebration') => {
  const key = keyFor(id);
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // Ignore storage failures; still hide for this render.
  }
  dismissedKeys.value = new Set(dismissedKeys.value).add(key);
};

const act = (nudge: NudgeDescriptor) => {
  router.push({ path: nudge.route, query: nudge.query });
};

// Compact Indian-rupee formatting for the {amount} placeholder (₹1.2L, ₹85K…).
const formatAmount = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};
</script>
