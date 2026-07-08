<template>
  <Teleport to="body">
    <!-- Confetti lives behind the card, never intercepts clicks. Only present
         when celebrating and the user hasn't asked for reduced motion. -->
    <canvas
      v-if="showConfetti"
      ref="canvasRef"
      class="fixed inset-0 z-[60] pointer-events-none"
      aria-hidden="true"
    />

    <!-- The "special toast" — a distinct celebratory card, top-centre. -->
    <Transition name="milestone-pop">
      <div
        v-if="current"
        :key="current.id"
        class="milestone-card fixed left-1/2 -translate-x-1/2 z-[70] pointer-events-auto
               w-[calc(100%-1.5rem)] max-w-sm top-4 sm:top-6"
        role="status"
        aria-live="polite"
        :aria-label="t('milestones.aria')"
      >
        <div
          class="relative overflow-hidden rounded-2xl border border-amber-300/70 dark:border-amber-500/30
                 bg-white dark:bg-ink-3 shadow-modal"
        >
          <!-- Warm celebratory wash -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-amber-100 via-white to-forest-50
                   dark:from-amber-500/15 dark:via-ink-3 dark:to-forest-500/10"
            aria-hidden="true"
          />

          <div class="relative flex items-start gap-3 p-4">
            <!-- Icon chip -->
            <div
              class="flex-shrink-0 grid place-items-center h-11 w-11 rounded-xl
                     bg-amber-500/15 text-amber-600 dark:text-amber-400 milestone-icon"
            >
              <PartyPopper class="h-6 w-6" />
            </div>

            <div class="flex-1 min-w-0 py-0.5">
              <p class="sw-eyebrow text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Sparkles class="h-3 w-3" />
                {{ t('milestones.badge') }}
              </p>
              <p class="font-display text-base font-semibold leading-snug text-ink dark:text-cream mt-0.5">
                {{ title }}
              </p>
              <p class="text-sm leading-snug text-stone-600 dark:text-stone-300 mt-1">
                {{ message }}
              </p>

              <button
                @click="dismiss"
                class="mt-2.5 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold
                       text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20
                       transition-colors duration-200
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
              >
                {{ t('milestones.dismiss') }}
              </button>
            </div>

            <!-- Close -->
            <button
              @click="dismiss"
              class="flex-shrink-0 -mr-1 -mt-1 grid place-items-center h-9 w-9 rounded-lg
                     text-stone-400 dark:text-stone-500 transition-colors duration-200
                     hover:text-ink dark:hover:text-cream hover:bg-stone-100/70 dark:hover:bg-ink-4
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
              :aria-label="t('milestones.dismiss')"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { PartyPopper, Sparkles, X } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useMilestones } from '../composables/useMilestones';

const { t } = useI18n();
const { activeCelebration, dismissCelebration } = useMilestones();

const current = computed(() => activeCelebration.value);

const title = computed(() =>
  current.value ? t(`milestones.${current.value.action}.${current.value.count}.title`) : ''
);
const message = computed(() =>
  current.value ? t(`milestones.${current.value.action}.${current.value.count}.message`) : ''
);

// How long the card stays before auto-dismissing.
const AUTO_DISMISS_MS = 6500;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function dismiss() {
  dismissCelebration();
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// -- Confetti -----------------------------------------------------------------
const showConfetti = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);
let rafId: number | null = null;

// Brand palette — amber accent + forest success + warm cream.
const CONFETTI_COLORS = ['#FFB800', '#E69F00', '#22C55E', '#15803D', '#FFF4D1', '#DCFCE7'];

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; rot: number; vrot: number; life: number;
}

function launchConfetti() {
  showConfetti.value = true;
  // Wait for the canvas to render, then drive the animation.
  nextTick(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Burst from the top-centre, roughly where the card sits.
    const originX = w / 2;
    const originY = h * 0.12;
    const count = Math.min(160, Math.round(w / 8));
    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = (Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 4 + Math.random() * 7;
      return {
        x: originX + (Math.random() - 0.5) * 60,
        y: originY,
        vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1),
        vy: Math.sin(angle) * speed - (6 + Math.random() * 4),
        size: 5 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        life: 1,
      };
    });

    const gravity = 0.16;
    const drag = 0.99;
    let frames = 0;
    const maxFrames = 200; // ~3.3s @60fps hard cap

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of particles) {
        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        if (frames > 90) p.life -= 0.02; // fade out in the final second
        if (p.life > 0 && p.y < h + 20) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }
      frames++;
      if (alive && frames < maxFrames) {
        rafId = requestAnimationFrame(tick);
      } else {
        stopConfetti();
      }
    };
    rafId = requestAnimationFrame(tick);
  });
}

function stopConfetti() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  showConfetti.value = false;
}

function clearDismissTimer() {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

// React to each new celebration (id changes even for a repeat milestone).
watch(
  () => activeCelebration.value?.id,
  (id) => {
    clearDismissTimer();
    stopConfetti();
    if (!id) return;

    if (!prefersReducedMotion()) {
      launchConfetti();
    }
    dismissTimer = setTimeout(dismiss, AUTO_DISMISS_MS);
  }
);

onUnmounted(() => {
  clearDismissTimer();
  stopConfetti();
});
</script>

<style scoped>
/* Card entrance — a playful pop that respects reduced-motion. */
.milestone-pop-enter-active {
  transition: transform 0.42s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.3s ease;
}
.milestone-pop-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.milestone-pop-enter-from {
  transform: translate(-50%, -18px) scale(0.9);
  opacity: 0;
}
.milestone-pop-leave-to {
  transform: translate(-50%, -12px) scale(0.96);
  opacity: 0;
}

.milestone-icon {
  animation: milestone-wiggle 0.6s ease-in-out 0.15s 2;
}
@keyframes milestone-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-12deg); }
  75% { transform: rotate(12deg); }
}

@media (prefers-reduced-motion: reduce) {
  .milestone-pop-enter-active,
  .milestone-pop-leave-active {
    transition: opacity 0.2s ease;
  }
  .milestone-pop-enter-from,
  .milestone-pop-leave-to {
    transform: translate(-50%, 0);
  }
  .milestone-icon {
    animation: none;
  }
}
</style>
