import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the underlying service so we can drive the composable's orchestration.
const m = vi.hoisted(() => ({
  isSupported: vi.fn(),
  detectMethod: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  unlock: vi.fn(),
  hasVault: vi.fn(),
  getVaultMethod: vi.fn(),
  getVaultEmail: vi.fn(),
  hasOfferedSetup: vi.fn(),
  markSetupOffered: vi.fn(),
}));

class FakeCancelled extends Error {}
class FakeExpired extends Error {}

vi.mock('../../services/biometricAuth', () => ({
  isSupported: m.isSupported,
  detectMethod: m.detectMethod,
  enable: m.enable,
  disable: m.disable,
  unlock: m.unlock,
  hasVault: m.hasVault,
  getVaultMethod: m.getVaultMethod,
  getVaultEmail: m.getVaultEmail,
  hasOfferedSetup: m.hasOfferedSetup,
  markSetupOffered: m.markSetupOffered,
  BiometricCancelledError: FakeCancelled,
  BiometricSessionExpiredError: FakeExpired,
}));

async function load() {
  const mod = await import('../../composables/useBiometricAuth');
  return mod.useBiometricAuth();
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  m.isSupported.mockResolvedValue(true);
  m.detectMethod.mockResolvedValue('fingerprint');
  m.hasVault.mockReturnValue(false);
  m.getVaultMethod.mockReturnValue(null);
  m.getVaultEmail.mockReturnValue(null);
  m.hasOfferedSetup.mockReturnValue(false);
  m.enable.mockResolvedValue({ method: 'fingerprint' });
  m.unlock.mockResolvedValue({ record: { id: 'u1' } });
});

describe('useBiometricAuth', () => {
  it('detects support and resolves the localized method label', async () => {
    m.detectMethod.mockResolvedValue('face');
    // vi.resetModules() gives a fresh useI18n instance, so load the dictionary
    // into it before asserting translated copy.
    await (await import('../../composables/useI18n')).useI18n().loadLanguage('en');
    const bio = await load();

    expect(await bio.ensureChecked()).toBe(true);
    expect(bio.isSupported.value).toBe(true);
    expect(bio.methodLabel.value).toBe('Face ID');
  });

  it('only checks support once', async () => {
    const bio = await load();
    await bio.ensureChecked();
    await bio.ensureChecked();
    expect(m.isSupported).toHaveBeenCalledTimes(1);
  });

  it('enables and flips isEnabled, marking the prompt as offered', async () => {
    const bio = await load();
    const ok = await bio.enable();

    expect(ok).toBe(true);
    expect(bio.isEnabled.value).toBe(true);
    expect(m.markSetupOffered).toHaveBeenCalled();
  });

  it('treats a cancelled enable as a silent no-op', async () => {
    m.enable.mockRejectedValue(new FakeCancelled());
    const bio = await load();

    const ok = await bio.enable();
    expect(ok).toBe(false);
    expect(bio.isEnabled.value).toBe(false);
  });

  it('disables and flips isEnabled off', async () => {
    m.hasVault.mockReturnValue(true);
    const bio = await load();
    expect(bio.isEnabled.value).toBe(true);

    bio.disable();
    expect(m.disable).toHaveBeenCalled();
    expect(bio.isEnabled.value).toBe(false);
  });

  it('returns true on a successful unlock', async () => {
    const bio = await load();
    expect(await bio.unlock()).toBe(true);
  });

  it('invokes onExpired and returns false when the session is expired', async () => {
    m.unlock.mockRejectedValue(new FakeExpired());
    const bio = await load();
    const onExpired = vi.fn();

    const ok = await bio.unlock({ onExpired });
    expect(ok).toBe(false);
    expect(onExpired).toHaveBeenCalled();
    expect(bio.isEnabled.value).toBe(false);
  });

  describe('shouldOfferSetup', () => {
    it('offers when supported, not enabled and not previously offered', async () => {
      const bio = await load();
      expect(await bio.shouldOfferSetup()).toBe(true);
    });

    it('does not offer once already offered', async () => {
      m.hasOfferedSetup.mockReturnValue(true);
      const bio = await load();
      expect(await bio.shouldOfferSetup()).toBe(false);
    });

    it('does not offer when already enabled', async () => {
      m.hasVault.mockReturnValue(true);
      const bio = await load();
      expect(await bio.shouldOfferSetup()).toBe(false);
    });

    it('does not offer when unsupported', async () => {
      m.isSupported.mockResolvedValue(false);
      const bio = await load();
      expect(await bio.shouldOfferSetup()).toBe(false);
    });
  });
});
