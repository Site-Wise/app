import { describe, it, expect, beforeEach, vi } from 'vitest'

// The shared test setup stubs localStorage with no-op vi.fn()s. The once-per-site
// guard relies on real persistence, so install a working in-memory store here.
function installMemoryLocalStorage() {
  let store: Record<string, string> = {}
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v) },
      removeItem: (k: string) => { delete store[k] },
      clear: () => { store = {} },
    },
  })
}

// Mutable mock state driving the PocketBase count query.
let mockSiteId: string | null = 'site-1'
const totals: Record<string, number> = { deliveries: 0, payments: 0 }
let shouldThrow = false

vi.mock('../../services/pocketbase', () => ({
  getCurrentSiteId: () => mockSiteId,
  pb: {
    collection: (name: string) => ({
      getList: vi.fn(async () => {
        if (shouldThrow) throw new Error('network boom')
        return { items: [], page: 1, perPage: 1, totalPages: 1, totalItems: totals[name] ?? 0 }
      })
    })
  }
}))

import { useMilestones, MILESTONE_THRESHOLDS } from '../../composables/useMilestones'

const { celebrateMilestone, dismissCelebration, activeCelebration } = useMilestones()

describe('useMilestones', () => {
  beforeEach(() => {
    installMemoryLocalStorage()
    mockSiteId = 'site-1'
    totals.deliveries = 0
    totals.payments = 0
    shouldThrow = false
    dismissCelebration()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('exposes the confirmed milestone thresholds', () => {
    expect([...MILESTONE_THRESHOLDS]).toEqual([1, 10, 25, 50, 100, 250, 500, 1000])
  })

  it('fires a celebration when the count lands exactly on a threshold', async () => {
    totals.deliveries = 10
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value).toMatchObject({ action: 'deliveries', count: 10 })
  })

  it('celebrates the very first record (count === 1)', async () => {
    totals.payments = 1
    await celebrateMilestone('payments')
    expect(activeCelebration.value).toMatchObject({ action: 'payments', count: 1 })
  })

  it('does NOT fire when the count is between thresholds', async () => {
    totals.deliveries = 11
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value).toBeNull()
  })

  it('does NOT back-fill: passing 47 then landing on 48 stays quiet', async () => {
    totals.deliveries = 48
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value).toBeNull()
  })

  it('celebrates each milestone only once per site', async () => {
    totals.deliveries = 25
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value).toMatchObject({ count: 25 })

    // Dismiss, then a second create that somehow re-reports 25 must not re-fire.
    dismissCelebration()
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value).toBeNull()
  })

  it('tracks milestones independently per action', async () => {
    totals.deliveries = 100
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value).toMatchObject({ action: 'deliveries', count: 100 })

    dismissCelebration()
    // Payments at 100 is a separate ledger — it should still celebrate.
    totals.payments = 100
    await celebrateMilestone('payments')
    expect(activeCelebration.value).toMatchObject({ action: 'payments', count: 100 })
  })

  it('tracks milestones independently per site', async () => {
    totals.deliveries = 50
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value).toMatchObject({ count: 50 })

    // Same milestone, different site → celebrates again.
    dismissCelebration()
    mockSiteId = 'site-2'
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value).toMatchObject({ action: 'deliveries', count: 50 })
  })

  it('does nothing when there is no current site', async () => {
    mockSiteId = null
    totals.deliveries = 10
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value).toBeNull()
  })

  it('never throws and stays quiet when the count query fails', async () => {
    shouldThrow = true
    totals.deliveries = 10
    await expect(celebrateMilestone('deliveries')).resolves.toBeUndefined()
    expect(activeCelebration.value).toBeNull()
  })

  it('assigns a fresh id per firing so the overlay re-triggers', async () => {
    totals.deliveries = 10
    await celebrateMilestone('deliveries')
    const firstId = activeCelebration.value?.id

    dismissCelebration()
    mockSiteId = 'site-3'
    totals.deliveries = 10
    await celebrateMilestone('deliveries')
    expect(activeCelebration.value?.id).toBeTruthy()
    expect(activeCelebration.value?.id).not.toBe(firstId)
  })

  it('dismissCelebration clears the active celebration', async () => {
    totals.payments = 500
    await celebrateMilestone('payments')
    expect(activeCelebration.value).not.toBeNull()
    dismissCelebration()
    expect(activeCelebration.value).toBeNull()
  })
})
