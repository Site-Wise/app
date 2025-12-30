import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

// Store reference to mocked invoke that we can control
let mockInvoke: ReturnType<typeof vi.fn>;

describe('usePlatform', () => {
  let originalNavigator: any;
  let originalMatchMedia: any;
  let originalNotification: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get reference to the mocked invoke from global setup and reset it
    const tauriCore = await import('@tauri-apps/api/core');
    mockInvoke = vi.mocked(tauriCore.invoke);
    mockInvoke.mockReset();

    // Store original values
    originalNavigator = window.navigator;
    originalMatchMedia = window.matchMedia;
    originalNotification = (window as any).Notification;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true
    });
    Object.defineProperty(window, 'matchMedia', {
      value: originalMatchMedia,
      configurable: true,
      writable: true
    });
    if (originalNotification !== undefined) {
      (window as any).Notification = originalNotification;
    } else {
      delete (window as any).Notification;
    }
  });

  it('detects web platform when Tauri is not available', async () => {
    // Mock Tauri invoke to reject
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));

    // Mock web browser environment
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Web browser)' },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      configurable: true,
      writable: true,
    });

    // Dynamically import to get fresh module with updated mock
    const { usePlatform } = await import('../../composables/usePlatform');

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return usePlatform();
      },
    });

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    await nextTick();

    expect(wrapper.vm.platformInfo.platform).toBe('web');
    expect(wrapper.vm.platformInfo.isNative).toBe(false);
    expect(wrapper.vm.platformInfo.isTauri).toBe(false);
    expect(wrapper.vm.platformInfo.isPWA).toBe(false);
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('detects Tauri platform when available', async () => {
    // Mock successful Tauri invoke
    mockInvoke.mockResolvedValue({
      platform: 'linux',
      arch: 'x86_64',
      is_native: true,
    });

    // Dynamically import to get fresh module with updated mock
    const { usePlatform } = await import('../../composables/usePlatform');

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return usePlatform();
      },
    });

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    await nextTick();

    expect(wrapper.vm.platformInfo.platform).toBe('linux');
    expect(wrapper.vm.platformInfo.arch).toBe('x86_64');
    expect(wrapper.vm.platformInfo.isNative).toBe(true);
    expect(wrapper.vm.platformInfo.isTauri).toBe(true);
    expect(wrapper.vm.platformInfo.isPWA).toBe(false);
    expect(wrapper.vm.platformInfo.isDesktop).toBe(true);
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('detects PWA mode', async () => {
    // Mock Tauri invoke to reject
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));

    // Mock PWA detection
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Web browser)' },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: true })),
      configurable: true,
      writable: true,
    });

    // Dynamically import to get fresh module with updated mock
    const { usePlatform } = await import('../../composables/usePlatform');

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return usePlatform();
      },
    });

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    await nextTick();

    expect(wrapper.vm.platformInfo.isPWA).toBe(true);
  });

  it('detects mobile platform based on user agent', async () => {
    // Mock Tauri invoke to reject
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));

    // Mock Android user agent
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Mobile Safari/537.36' },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      configurable: true,
      writable: true,
    });

    // Dynamically import to get fresh module with updated mock
    const { usePlatform } = await import('../../composables/usePlatform');

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return usePlatform();
      },
    });

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    await nextTick();

    expect(wrapper.vm.platformInfo.platform).toBe('android');
    expect(wrapper.vm.platformInfo.isMobile).toBe(true);
    expect(wrapper.vm.platformInfo.isDesktop).toBe(false);
  });

  it('detects desktop platform based on user agent', async () => {
    // Mock Tauri invoke to reject
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));

    // Mock Windows user agent
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36' },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      configurable: true,
      writable: true,
    });

    // Dynamically import to get fresh module with updated mock
    const { usePlatform } = await import('../../composables/usePlatform');

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return usePlatform();
      },
    });

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    await nextTick();

    expect(wrapper.vm.platformInfo.platform).toBe('windows');
    expect(wrapper.vm.platformInfo.isMobile).toBe(false);
    expect(wrapper.vm.platformInfo.isDesktop).toBe(true);
  });

  it('returns correct capabilities for Tauri desktop', async () => {
    // Mock successful Tauri invoke
    mockInvoke.mockResolvedValue({
      platform: 'macos',
      arch: 'arm64',
      is_native: true,
    });

    // Dynamically import to get fresh module with updated mock
    const { usePlatform } = await import('../../composables/usePlatform');

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return usePlatform();
      },
    });

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    await nextTick();

    expect(wrapper.vm.capabilities.notifications).toBe(true);
    expect(wrapper.vm.capabilities.filesystem).toBe(true);
    expect(wrapper.vm.capabilities.systemTray).toBe(true);
    expect(wrapper.vm.capabilities.autoUpdater).toBe(true);
    expect(wrapper.vm.capabilities.deepLinking).toBe(true);
  });

  it('returns correct capabilities for web PWA', async () => {
    // Mock Tauri invoke to reject
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));

    // Mock PWA detection
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Web browser)' },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: true })),
      configurable: true,
      writable: true,
    });

    // Mock Notification API availability
    (window as any).Notification = {};

    // Dynamically import to get fresh module with updated mock
    const { usePlatform } = await import('../../composables/usePlatform');

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return usePlatform();
      },
    });

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    await nextTick();

    expect(wrapper.vm.capabilities.notifications).toBe(true);
    expect(wrapper.vm.capabilities.filesystem).toBe(false);
    expect(wrapper.vm.capabilities.systemTray).toBe(false);
    expect(wrapper.vm.capabilities.autoUpdater).toBe(false);
    expect(wrapper.vm.capabilities.deepLinking).toBe(true);
  });

  it('returns correct capabilities for regular web', async () => {
    // Mock Tauri invoke to reject
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));

    // Mock web browser environment
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Web browser)' },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      configurable: true,
      writable: true,
    });

    // Mock Notification API availability
    (window as any).Notification = {};

    // Dynamically import to get fresh module with updated mock
    const { usePlatform } = await import('../../composables/usePlatform');

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return usePlatform();
      },
    });

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    await nextTick();

    expect(wrapper.vm.capabilities.notifications).toBe(true);
    expect(wrapper.vm.capabilities.filesystem).toBe(false);
    expect(wrapper.vm.capabilities.systemTray).toBe(false);
    expect(wrapper.vm.capabilities.autoUpdater).toBe(false);
    expect(wrapper.vm.capabilities.deepLinking).toBe(false);
  });
});