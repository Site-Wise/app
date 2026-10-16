import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import type { Celebration } from '../../composables/useMilestones'

// Controllable celebration state shared with the component under test.
const activeCelebration = ref<Celebration | null>(null)
const dismissCelebration = vi.fn(() => { activeCelebration.value = null })

vi.mock('../../composables/useMilestones', () => ({
  useMilestones: () => ({ activeCelebration, dismissCelebration }),
}))

// Echo i18n keys so we can assert the right copy path is used.
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

import MilestoneCelebration from '../../components/MilestoneCelebration.vue'

function setReducedMotion(reduced: boolean) {
  ;(window.matchMedia as any) = vi.fn().mockImplementation((query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('MilestoneCelebration', () => {
  let wrapper: any

  beforeEach(() => {
    activeCelebration.value = null
    dismissCelebration.mockClear()
    setReducedMotion(false)
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('renders nothing when there is no active celebration', async () => {
    wrapper = mount(MilestoneCelebration)
    await nextTick()
    expect(document.body.querySelector('.milestone-card')).toBeNull()
  })

  it('renders the celebratory card with the matching i18n copy', async () => {
    wrapper = mount(MilestoneCelebration)
    activeCelebration.value = { id: 'c1', action: 'deliveries', count: 100 }
    await nextTick()
    await nextTick()

    const card = document.body.querySelector('.milestone-card')
    expect(card).not.toBeNull()
    const html = card!.innerHTML
    expect(html).toContain('milestones.badge')
    expect(html).toContain('milestones.deliveries.100.title')
    expect(html).toContain('milestones.deliveries.100.message')
  })

  it('shows confetti when motion is allowed', async () => {
    wrapper = mount(MilestoneCelebration)
    activeCelebration.value = { id: 'c2', action: 'payments', count: 10 }
    await nextTick()
    await nextTick()
    expect(document.body.querySelector('canvas')).not.toBeNull()
  })

  it('suppresses confetti under prefers-reduced-motion but still shows the card', async () => {
    setReducedMotion(true)
    wrapper = mount(MilestoneCelebration)
    activeCelebration.value = { id: 'c3', action: 'payments', count: 10 }
    await nextTick()
    await nextTick()
    expect(document.body.querySelector('.milestone-card')).not.toBeNull()
    expect(document.body.querySelector('canvas')).toBeNull()
  })

  it('dismisses when the Nice! button is clicked', async () => {
    wrapper = mount(MilestoneCelebration)
    activeCelebration.value = { id: 'c4', action: 'deliveries', count: 1 }
    await nextTick()
    await nextTick()

    const buttons = Array.from(document.body.querySelectorAll('button'))
    const dismissBtn = buttons.find(b => b.textContent?.includes('milestones.dismiss'))
    expect(dismissBtn).toBeTruthy()
    dismissBtn!.dispatchEvent(new Event('click', { bubbles: true }))
    await nextTick()
    expect(dismissCelebration).toHaveBeenCalled()
  })
})
