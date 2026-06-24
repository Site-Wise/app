import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// Mutable mock site id so we can simulate site changes.
let mockSiteId: string | null = 'site-1'

vi.mock('../../services/pocketbase', () => ({
  pb: {
    authStore: { isValid: true, model: { id: 'user-1' } }
  }
}))

// useSiteStore reads currentSiteId; provide a minimal reactive-ish store via Pinia.
vi.mock('../../stores/site', async () => {
  const { defineStore } = await import('pinia')
  const { ref } = await import('vue')
  const useSiteStore = defineStore('site', () => {
    const currentSiteId = ref<string | null>(mockSiteId)
    return { currentSiteId }
  })
  return { useSiteStore }
})

import { useInfiniteSiteData } from '../../composables/useInfiniteSiteData'
import { useSiteStore } from '../../stores/site'

interface Row { id: string; name: string }

const makePage = (ids: string[], totalItems: number) => ({
  items: ids.map(id => ({ id, name: `name-${id}` })),
  totalItems
})

describe('useInfiniteSiteData', () => {
  beforeEach(() => {
    mockSiteId = 'site-1'
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // Helper: flush the immediate site watcher's initial page-1 load.
  const flush = async () => {
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()
  }

  it('loads page 1 on init and computes hasMore correctly', async () => {
    const loader = vi.fn().mockResolvedValue(makePage(['a', 'b'], 5))
    const { items, totalItems, hasMore, loading } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()

    expect(loader).toHaveBeenCalledWith('site-1', 1, 2)
    expect(items.value.map(i => i.id)).toEqual(['a', 'b'])
    expect(totalItems.value).toBe(5)
    expect(hasMore.value).toBe(true)
    expect(loading.value).toBe(false)
  })

  it('hasMore is false once accumulated length reaches totalItems', async () => {
    const loader = vi.fn().mockResolvedValue(makePage(['a', 'b'], 2))
    const { hasMore } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()
    expect(hasMore.value).toBe(false)
  })

  it('loadMore appends the next page', async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce(makePage(['a', 'b'], 4))
      .mockResolvedValueOnce(makePage(['c', 'd'], 4))
    const { items, loadMore, hasMore } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()

    await loadMore()
    expect(loader).toHaveBeenNthCalledWith(2, 'site-1', 2, 2)
    expect(items.value.map(i => i.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(hasMore.value).toBe(false)
  })

  it('dedupes ids on merge (offset-drift insurance)', async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce(makePage(['a', 'b'], 4))
      // Page 2 overlaps 'b' (e.g. a row was inserted server-side).
      .mockResolvedValueOnce(makePage(['b', 'c'], 4))
    const { items, loadMore } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()

    await loadMore()
    expect(items.value.map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('loadMore is a no-op when no more items', async () => {
    const loader = vi.fn().mockResolvedValue(makePage(['a'], 1))
    const { loadMore } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()
    expect(loader).toHaveBeenCalledTimes(1)

    await loadMore()
    expect(loader).toHaveBeenCalledTimes(1) // unchanged
  })

  it('resets to page 1 and reloads when the site changes', async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce(makePage(['a', 'b'], 4)) // site-1 page 1
      .mockResolvedValueOnce(makePage(['x', 'y'], 2)) // site-2 page 1
    const { items, totalItems } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()
    expect(items.value.map(i => i.id)).toEqual(['a', 'b'])

    const store = useSiteStore()
    store.currentSiteId = 'site-2'
    await flush()

    expect(loader).toHaveBeenLastCalledWith('site-2', 1, 2)
    expect(items.value.map(i => i.id)).toEqual(['x', 'y'])
    expect(totalItems.value).toBe(2)
  })

  it('clears everything when the site becomes null', async () => {
    const loader = vi.fn().mockResolvedValue(makePage(['a', 'b'], 4))
    const { items, totalItems } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()
    expect(items.value.length).toBe(2)

    const store = useSiteStore()
    store.currentSiteId = null
    await nextTick()

    expect(items.value).toEqual([])
    expect(totalItems.value).toBe(0)
  })

  it('ignores a stale load (race guard) when a newer load supersedes it', async () => {
    let resolveFirst: (v: any) => void = () => {}
    const loader = vi.fn()
      // page 1 (initial) resolves immediately
      .mockResolvedValueOnce(makePage(['a', 'b'], 4))
      // page 2 (slow / stale)
      .mockImplementationOnce(() => new Promise(res => { resolveFirst = res }))
      // page 2 retried fast after reload
      .mockResolvedValueOnce(makePage(['fresh1', 'fresh2'], 4))

    const { items, loadMore, reload } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()

    // Start a slow loadMore (page 2), then supersede it with a reload.
    const slow = loadMore()
    await reload() // bumps currentLoadId; resets to page 1
    // Now resolve the stale page-2 load AFTER reload finished.
    resolveFirst(makePage(['stale1', 'stale2'], 4))
    await slow
    await flush()

    // The stale page-2 result (resolved late) must be ignored. Only the freshly
    // reloaded page 1 remains — proving the race guard discards stale loads.
    expect(items.value.map(i => i.id)).toEqual(['fresh1', 'fresh2'])
    expect(items.value.map(i => i.id)).not.toContain('stale1')
  })

  it('patchItem updates a single row in place', async () => {
    const loader = vi.fn().mockResolvedValue(makePage(['a', 'b'], 2))
    const { items, patchItem } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()

    patchItem('b', { name: 'updated-b' })
    expect(items.value.find(i => i.id === 'b')?.name).toBe('updated-b')
    expect(items.value.find(i => i.id === 'a')?.name).toBe('name-a')
  })

  it('removeItem removes a row and decrements totalItems', async () => {
    const loader = vi.fn().mockResolvedValue(makePage(['a', 'b'], 2))
    const { items, totalItems, removeItem } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()

    removeItem('a')
    expect(items.value.map(i => i.id)).toEqual(['b'])
    expect(totalItems.value).toBe(1)
  })

  it('prependItem inserts at the top and increments totalItems', async () => {
    const loader = vi.fn().mockResolvedValue(makePage(['a', 'b'], 4))
    const { items, totalItems, prependItem } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()

    prependItem({ id: 'new', name: 'new-row' })
    expect(items.value.map(i => i.id)).toEqual(['new', 'a', 'b'])
    expect(totalItems.value).toBe(5)
  })

  it('prependItem patches in place (no dupe) when id already present', async () => {
    const loader = vi.fn().mockResolvedValue(makePage(['a', 'b'], 2))
    const { items, totalItems, prependItem } = useInfiniteSiteData<Row>(loader, { perPage: 2 })
    await flush()

    prependItem({ id: 'a', name: 'patched-a' })
    expect(items.value.map(i => i.id)).toEqual(['a', 'b'])
    expect(items.value.find(i => i.id === 'a')?.name).toBe('patched-a')
    expect(totalItems.value).toBe(2) // unchanged
  })
})
