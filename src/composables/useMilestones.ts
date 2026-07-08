import { ref } from 'vue';
import { pb, getCurrentSiteId } from '../services/pocketbase';

/**
 * Milestone celebrations — "unexpected moments of delight".
 *
 * When a user records a delivery or payment and their all-time count for the
 * current site lands exactly on a milestone (1st, 10th, 100th, ...), we fire a
 * one-time celebration (confetti + a special toast). The intent is purely
 * encouragement: mark real progress so people feel good about the habit they're
 * building.
 *
 * Design rules honoured here:
 * - Purposeful: only fires on genuine progress, never on edits/deletes.
 * - Once per site: each (site, action, count) celebrates exactly once, ever —
 *   persisted in localStorage so reloads and recounts don't re-fire it.
 * - No back-fill spam: a site that already had e.g. 47 deliveries before this
 *   shipped won't retroactively fire 1/10/25 — a milestone only fires when a
 *   fresh create lands the count squarely on a threshold.
 * - Best-effort: anything that can fail (network, storage) is swallowed so the
 *   core create flow is never affected.
 */

export type MilestoneAction = 'deliveries' | 'payments';

/** Counts that earn a celebration, per action, per site. */
export const MILESTONE_THRESHOLDS: readonly number[] = [1, 10, 25, 50, 100, 250, 500, 1000];

/** PocketBase collection backing the authoritative all-time count per action. */
const COLLECTION: Record<MilestoneAction, string> = {
  deliveries: 'deliveries',
  payments: 'payments',
};

export interface Celebration {
  /** Unique per firing so the overlay re-triggers even for the same milestone across sessions. */
  id: string;
  action: MilestoneAction;
  count: number;
}

// Module-level singleton state (same pattern as useToast) so a single global
// <MilestoneCelebration> overlay can react to celebrations fired from any view.
const activeCelebration = ref<Celebration | null>(null);
let celebrationSeq = 0;

const STORAGE_KEY = 'sw-milestones-v1';

type CelebratedMap = Record<string, number[]>;

function loadCelebrated(): CelebratedMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCelebrated(data: CelebratedMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode / quota). Celebrations degrade to
    // best-effort — worst case a milestone could re-fire, which is harmless.
  }
}

function keyFor(siteId: string, action: MilestoneAction): string {
  return `${siteId}:${action}`;
}

function hasCelebrated(siteId: string, action: MilestoneAction, count: number): boolean {
  return (loadCelebrated()[keyFor(siteId, action)] || []).includes(count);
}

function markCelebrated(siteId: string, action: MilestoneAction, count: number): void {
  const data = loadCelebrated();
  const key = keyFor(siteId, action);
  const list = data[key] || [];
  if (!list.includes(count)) {
    list.push(count);
    data[key] = list;
    saveCelebrated(data);
  }
}

/**
 * Authoritative all-time count for the current site via a single 1-row list
 * query — PocketBase returns `totalItems` for the full filtered set regardless
 * of the page size, so this stays cheap.
 */
async function fetchLifetimeCount(action: MilestoneAction, siteId: string): Promise<number | null> {
  try {
    const res = await pb.collection(COLLECTION[action]).getList(1, 1, {
      filter: `site="${siteId}"`,
      fields: 'id', // keep the payload tiny — we only need totalItems
    });
    return res.totalItems;
  } catch (err) {
    console.error('[milestones] count query failed:', err);
    return null;
  }
}

export function useMilestones() {
  /**
   * Call right after a successful create. Resolves the site's all-time count for
   * the action and, if it lands on an as-yet-uncelebrated threshold, fires a
   * one-time celebration. Never throws.
   */
  async function celebrateMilestone(action: MilestoneAction): Promise<void> {
    try {
      const siteId = getCurrentSiteId();
      if (!siteId) return;

      const count = await fetchLifetimeCount(action, siteId);
      if (count === null) return;
      if (!MILESTONE_THRESHOLDS.includes(count)) return;
      if (hasCelebrated(siteId, action, count)) return;

      markCelebrated(siteId, action, count);
      activeCelebration.value = { id: `celebration-${++celebrationSeq}`, action, count };
    } catch (err) {
      // Delight must never break the core flow.
      console.error('[milestones] celebrate failed:', err);
    }
  }

  function dismissCelebration(): void {
    activeCelebration.value = null;
  }

  return {
    activeCelebration,
    celebrateMilestone,
    dismissCelebration,
  };
}
