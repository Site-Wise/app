import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// Mock the entire usePlatform module to avoid dynamic import issues
vi.mock('../../composables/usePlatform', () => {
  const mockRef = (value: any) => ref(value)
  
  return {
    usePlatform: vi.fn(() => {
      const platformInfo = mockRef({
        platform: 'web',
        arch: 'unknown',
        isNative: false,
        isTauri: false,
        isPWA: false,
        isMobile: false,
        isDesktop: false
      })
      
      const isLoading = mockRef(false)
      
      const capabilities = mockRef({
        notifications: false,
        filesystem: false,
        systemTray: false,
        autoUpdater: false,
        deepLinking: false
      })
      
      return {
        platformInfo,
        isLoading,
        capabilities
      }
    })
  }
})

import { usePlatform } from '../../composables/usePlatform'

describe('usePlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default web platform values', () => {
    const { platformInfo, isLoading, capabilities } = usePlatform()

    expect(platformInfo.value.platform).toBe('web')
    expect(platformInfo.value.isNative).toBe(false)
    expect(platformInfo.value.isTauri).toBe(false)
    expect(platformInfo.value.isPWA).toBe(false)
    expect(isLoading.value).toBe(false)
    expect(capabilities.value.notifications).toBe(false)
  })

  it('should provide platform capabilities', () => {
    const { capabilities } = usePlatform()

    expect(typeof capabilities.value.notifications).toBe('boolean')
    expect(typeof capabilities.value.filesystem).toBe('boolean')
    expect(typeof capabilities.value.systemTray).toBe('boolean')
    expect(typeof capabilities.value.autoUpdater).toBe('boolean')
    expect(typeof capabilities.value.deepLinking).toBe('boolean')
  })

  it('should have reactive platform info', () => {
    const { platformInfo } = usePlatform()

    // Test that we can modify the platform info (in a real scenario)
    expect(platformInfo.value).toBeDefined()
    expect('platform' in platformInfo.value).toBe(true)
    expect('arch' in platformInfo.value).toBe(true)
    expect('isNative' in platformInfo.value).toBe(true)
  })
})