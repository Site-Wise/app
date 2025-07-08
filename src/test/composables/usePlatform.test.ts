
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { usePlatform } from '../../composables/usePlatform';
import { nextTick } from 'vue';

// Mock Tauri API
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

describe('usePlatform', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockInvoke.mockReset();
    // Reset user agent and PWA display mode
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: '' },
      writable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      writable: true,
    });
  });

  it('detects web platform when Tauri is not available', async () => {
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return { ...usePlatform() };
      },
    });

    await nextTick();

    expect(wrapper.vm.platformInfo.platform).toBe('web');
    expect(wrapper.vm.platformInfo.isNative).toBe(false);
    expect(wrapper.vm.platformInfo.isTauri).toBe(false);
    expect(wrapper.vm.platformInfo.isPWA).toBe(false);
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('detects Tauri platform when available', async () => {
    mockInvoke.mockResolvedValue({
      platform: 'linux',
      arch: 'x86_64',
      is_native: true,
    });

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return { ...usePlatform() };
      },
    });

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
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: true })),
      writable: true,
    });

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return { ...usePlatform() };
      },
    });

    await nextTick();

    expect(wrapper.vm.platformInfo.isPWA).toBe(true);
  });

  it('detects mobile platform based on user agent', async () => {
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Mobile Safari/537.36' },
      writable: true,
    });

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return { ...usePlatform() };
      },
    });

    await nextTick();

    expect(wrapper.vm.platformInfo.platform).toBe('android');
    expect(wrapper.vm.platformInfo.isMobile).toBe(true);
    expect(wrapper.vm.platformInfo.isDesktop).toBe(false);
  });

  it('detects desktop platform based on user agent', async () => {
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36' },
      writable: true,
    });

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return { ...usePlatform() };
      },
    });

    await nextTick();

    expect(wrapper.vm.platformInfo.platform).toBe('windows');
    expect(wrapper.vm.platformInfo.isMobile).toBe(false);
    expect(wrapper.vm.platformInfo.isDesktop).toBe(true);
  });

  it('returns correct capabilities for Tauri desktop', async () => {
    mockInvoke.mockResolvedValue({
      platform: 'macos',
      arch: 'arm64',
      is_native: true,
    });

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return { ...usePlatform() };
      },
    });

    await nextTick();

    expect(wrapper.vm.capabilities.notifications).toBe(true);
    expect(wrapper.vm.capabilities.filesystem).toBe(true);
    expect(wrapper.vm.capabilities.systemTray).toBe(true);
    expect(wrapper.vm.capabilities.autoUpdater).toBe(true);
    expect(wrapper.vm.capabilities.deepLinking).toBe(true);
  });

  it('returns correct capabilities for web PWA', async () => {
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: true })),
      writable: true,
    });

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return { ...usePlatform() };
      },
    });

    await nextTick();

    expect(wrapper.vm.capabilities.notifications).toBe(true);
    expect(wrapper.vm.capabilities.filesystem).toBe(false);
    expect(wrapper.vm.capabilities.systemTray).toBe(false);
    expect(wrapper.vm.capabilities.autoUpdater).toBe(false);
    expect(wrapper.vm.capabilities.deepLinking).toBe(true);
  });

  it('returns correct capabilities for regular web', async () => {
    mockInvoke.mockRejectedValue(new Error('Tauri API not available'));

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return { ...usePlatform() };
      },
    });

    await nextTick();

    expect(wrapper.vm.capabilities.notifications).toBe(true);
    expect(wrapper.vm.capabilities.filesystem).toBe(false);
    expect(wrapper.vm.capabilities.systemTray).toBe(false);
    expect(wrapper.vm.capabilities.autoUpdater).toBe(false);
    expect(wrapper.vm.capabilities.deepLinking).toBe(false);
  });
});
