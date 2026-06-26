import { describe, it, expect, beforeEach, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

// Ensure Web Crypto (subtle) is available in the test runtime.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// Controllable PocketBase mock shared with the module under test.
const h = vi.hoisted(() => {
  const state = {
    token: 'token-initial',
    record: { id: 'u1', email: 'owner@example.com' } as Record<string, unknown> | null,
    isValid: true,
  };
  const authRefresh = vi.fn();
  const save = vi.fn((t: string, r: Record<string, unknown> | null) => {
    state.token = t;
    state.record = r;
    state.isValid = true;
  });
  const clear = vi.fn(() => {
    state.token = '';
    state.record = null;
    state.isValid = false;
  });
  return { state, authRefresh, save, clear };
});

vi.mock('../../services/pocketbase', () => ({
  pb: {
    authStore: {
      get token() {
        return h.state.token;
      },
      get record() {
        return h.state.record;
      },
      get isValid() {
        return h.state.isValid;
      },
      save: h.save,
      clear: h.clear,
    },
    collection: vi.fn(() => ({ authRefresh: h.authRefresh })),
  },
}));

import {
  __setProviderForTesting,
  enable,
  disable,
  unlock,
  hasVault,
  getVaultEmail,
  getVaultMethod,
  isSupported,
  hasOfferedSetup,
  markSetupOffered,
  resetSetupOffer,
  BiometricCancelledError,
  BiometricSessionExpiredError,
  type BiometricProvider,
} from '../../services/biometricAuth';

function makeProvider(overrides: Partial<BiometricProvider> = {}): BiometricProvider {
  return {
    type: 'webauthn',
    isAvailable: vi.fn().mockResolvedValue(true),
    getMethod: vi.fn().mockResolvedValue('fingerprint'),
    enroll: vi.fn().mockResolvedValue('cred-abc'),
    verify: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

let provider: BiometricProvider;

beforeEach(() => {
  // Real in-memory localStorage (the global test setup stubs it with no-ops).
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, 'localStorage', { value: ls, writable: true, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true, configurable: true });

  // Reset session state.
  h.state.token = 'token-initial';
  h.state.record = { id: 'u1', email: 'owner@example.com' };
  h.state.isValid = true;
  h.authRefresh.mockReset();
  h.save.mockClear();
  h.clear.mockClear();

  provider = makeProvider();
  __setProviderForTesting(provider);
});

describe('biometricAuth service', () => {
  describe('support detection', () => {
    it('reports supported when the provider is available', async () => {
      expect(await isSupported()).toBe(true);
    });

    it('reports unsupported when the provider is unavailable', async () => {
      __setProviderForTesting(makeProvider({ isAvailable: vi.fn().mockResolvedValue(false) }));
      expect(await isSupported()).toBe(false);
    });
  });

  describe('enable', () => {
    it('enrolls and stores an encrypted vault for the current session', async () => {
      expect(hasVault()).toBe(false);

      const result = await enable('Unlock');

      expect(result.method).toBe('fingerprint');
      expect(provider.enroll).toHaveBeenCalledOnce();
      expect(hasVault()).toBe(true);
      expect(getVaultEmail()).toBe('owner@example.com');
      expect(getVaultMethod()).toBe('fingerprint');

      // The raw token must never be persisted in plaintext.
      const raw = window.localStorage.getItem('sitewise_biometric_vault')!;
      expect(raw).not.toContain('token-initial');
    });

    it('refuses to enable without an active session', async () => {
      h.state.isValid = false;
      await expect(enable('Unlock')).rejects.toThrow();
      expect(hasVault()).toBe(false);
    });

    it('propagates a cancelled enrollment without storing a vault', async () => {
      __setProviderForTesting(
        makeProvider({ enroll: vi.fn().mockRejectedValue(new BiometricCancelledError()) }),
      );
      await expect(enable('Unlock')).rejects.toBeInstanceOf(BiometricCancelledError);
      expect(hasVault()).toBe(false);
    });
  });

  describe('unlock', () => {
    beforeEach(async () => {
      await enable('Unlock');
      // Simulate a fresh app launch: session no longer in memory.
      h.state.token = '';
      h.state.record = null;
      h.state.isValid = false;
      h.save.mockClear();
    });

    it('verifies, restores the session and refreshes the token', async () => {
      h.authRefresh.mockResolvedValue({ record: { id: 'u1', email: 'owner@example.com' } });

      const result = await unlock('Unlock');

      expect(provider.verify).toHaveBeenCalledWith('cred-abc', 'Unlock');
      // The decrypted original token was restored into the auth store.
      expect(h.save).toHaveBeenCalled();
      expect(h.save.mock.calls[0][0]).toBe('token-initial');
      expect(result.record).toEqual({ id: 'u1', email: 'owner@example.com' });
      expect(hasVault()).toBe(true); // vault still present (token rolled forward)
    });

    it('rolls the refreshed token back into the vault', async () => {
      h.authRefresh.mockImplementation(async () => {
        h.state.token = 'token-rotated';
        return { record: { id: 'u1', email: 'owner@example.com' } };
      });

      await unlock('Unlock');

      // A second unlock should restore the rotated token, proving the vault was
      // re-encrypted with the fresh token.
      h.state.token = '';
      h.state.isValid = false;
      h.save.mockClear();
      h.authRefresh.mockResolvedValue({ record: { id: 'u1', email: 'owner@example.com' } });

      await unlock('Unlock');
      expect(h.save.mock.calls[0][0]).toBe('token-rotated');
    });

    it('surfaces a cancelled verification and keeps the vault', async () => {
      __setProviderForTesting(
        makeProvider({ verify: vi.fn().mockRejectedValue(new BiometricCancelledError()) }),
      );
      await expect(unlock('Unlock')).rejects.toBeInstanceOf(BiometricCancelledError);
      expect(hasVault()).toBe(true);
    });

    it('wipes the vault and signals expiry when the server rejects the token (401)', async () => {
      h.authRefresh.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));

      await expect(unlock('Unlock')).rejects.toBeInstanceOf(BiometricSessionExpiredError);
      expect(h.clear).toHaveBeenCalled();
      expect(hasVault()).toBe(false);
    });

    it('keeps the session and vault on a transient/offline refresh error', async () => {
      // Network failure (status 0): the restored token stays valid locally.
      h.authRefresh.mockRejectedValue(Object.assign(new Error('Network'), { status: 0 }));

      const result = await unlock('Unlock');

      expect(h.save).toHaveBeenCalled(); // session was restored from the vault
      expect(result.record).toEqual({ id: 'u1', email: 'owner@example.com' });
      expect(h.clear).not.toHaveBeenCalled();
      expect(hasVault()).toBe(true); // biometric setup survives going offline
    });

    it('throws when no vault exists', async () => {
      disable();
      await expect(unlock('Unlock')).rejects.toThrow();
    });
  });

  describe('disable', () => {
    it('removes the stored vault', async () => {
      await enable('Unlock');
      expect(hasVault()).toBe(true);
      disable();
      expect(hasVault()).toBe(false);
      expect(getVaultEmail()).toBeNull();
    });
  });

  describe('setup-offer bookkeeping', () => {
    it('tracks whether the prompt was offered', () => {
      expect(hasOfferedSetup()).toBe(false);
      markSetupOffered();
      expect(hasOfferedSetup()).toBe(true);
      resetSetupOffer();
      expect(hasOfferedSetup()).toBe(false);
    });
  });
});
