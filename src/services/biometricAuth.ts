/**
 * Biometric "Quick Unlock" for Sitewise.
 *
 * WHAT THIS IS
 * ------------
 * After a user signs in once with their email + password, they can enable
 * biometric unlock. We then store their PocketBase session token *encrypted*
 * on this device and release it only after a successful biometric ceremony
 * (Touch ID / Face ID / fingerprint / Windows Hello). On the next launch the
 * user taps "Unlock" instead of retyping their password.
 *
 * This is the same pattern native banking / finance apps use for
 * "fingerprint login". It needs NO backend changes — the biometric is a local
 * gate in front of the already-issued session token.
 *
 * PLATFORMS
 * ---------
 *  - Web / PWA / desktop webview: WebAuthn platform authenticator
 *    (`userVerification: 'required'` forces the OS to actually verify the user).
 *  - Tauri native (Android / iOS): `@tauri-apps/plugin-biometric`, loaded via a
 *    guarded dynamic import so the web bundle never depends on it.
 *
 * SECURITY MODEL (read me)
 * ------------------------
 * The biometric is a *convenience gate*, not a second factor verified by the
 * server. The session token is encrypted at rest with AES-GCM so it is never
 * sitting in localStorage as plaintext, and the vault is wiped on disable,
 * logout, or when the saved session is rejected by the server. The encryption
 * key currently lives alongside the vault on-device, so the meaningful
 * protection is the OS biometric prompt blocking the unlock code path — which
 * is exactly the threat model for a personal-device quick-unlock. The stored
 * token still expires server-side. A future hardening is to bind the key to the
 * WebAuthn PRF extension / platform keystore so it is never stored at all.
 */

import { pb } from './pocketbase';
import type { RecordModel } from 'pocketbase';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/** The kind of biometric the device exposes — drives the UI copy / icon. */
export type BiometricMethod = 'fingerprint' | 'face' | 'biometrics';

export interface BiometricProvider {
  readonly type: 'webauthn' | 'tauri';
  /** Is a usable platform biometric available right now? */
  isAvailable(): Promise<boolean>;
  /** Best-effort detection of the biometric kind for nicer copy. */
  getMethod(): Promise<BiometricMethod>;
  /** Enroll: bind a credential to this device. Returns an opaque handle. */
  enroll(userId: string, userName: string, reason: string): Promise<string>;
  /** Verify: run the biometric ceremony. Throws on failure / cancel. */
  verify(credentialHandle: string, reason: string): Promise<void>;
}

interface StoredVault {
  v: 1;
  provider: BiometricProvider['type'];
  credentialHandle: string;
  email: string;
  method: BiometricMethod;
  /** base64 AES-GCM key (see security note above). */
  key: string;
  /** base64 IV. */
  iv: string;
  /** base64 ciphertext of the JSON session payload. */
  data: string;
  createdAt: string;
}

interface SessionPayload {
  token: string;
  record: RecordModel | null;
}

/** Raised when the biometric ceremony is cancelled / dismissed by the user. */
export class BiometricCancelledError extends Error {
  constructor(message = 'Biometric verification was cancelled') {
    super(message);
    this.name = 'BiometricCancelledError';
  }
}

/** Raised when a restored session is no longer accepted by the server. */
export class BiometricSessionExpiredError extends Error {
  constructor(message = 'Saved session has expired') {
    super(message);
    this.name = 'BiometricSessionExpiredError';
  }
}

/* -------------------------------------------------------------------------- */
/* Storage keys                                                               */
/* -------------------------------------------------------------------------- */

const VAULT_KEY = 'sitewise_biometric_vault';
const OFFERED_KEY = 'sitewise_biometric_setup_offered';

/* -------------------------------------------------------------------------- */
/* Small encoding helpers                                                     */
/* -------------------------------------------------------------------------- */

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBuf(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64UrlFromBuf(buf: ArrayBuffer): string {
  return bufToBase64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBytes(len: number): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

/* -------------------------------------------------------------------------- */
/* AES-GCM vault crypto                                                        */
/* -------------------------------------------------------------------------- */

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

async function exportKey(key: CryptoKey): Promise<string> {
  return bufToBase64(await crypto.subtle.exportKey('raw', key));
}

async function importKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', base64ToBuf(b64), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

async function encryptPayload(
  payload: SessionPayload,
): Promise<{ key: string; iv: string; data: string }> {
  const key = await generateKey();
  const iv = randomBytes(12);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { key: await exportKey(key), iv: bufToBase64(iv), data: bufToBase64(cipher) };
}

async function decryptPayload(vault: StoredVault): Promise<SessionPayload> {
  const key = await importKey(vault.key);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(vault.iv) },
    key,
    base64ToBuf(vault.data),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as SessionPayload;
}

/* -------------------------------------------------------------------------- */
/* WebAuthn provider (web / PWA / desktop webview)                            */
/* -------------------------------------------------------------------------- */

function guessWebMethod(): BiometricMethod {
  const ua = (navigator?.userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'face';
  if (/android/.test(ua)) return 'fingerprint';
  if (/mac/.test(ua)) return 'fingerprint'; // Touch ID
  return 'biometrics'; // Windows Hello / unknown — keep it generic
}

const webAuthnProvider: BiometricProvider = {
  type: 'webauthn',

  async isAvailable(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) return false;
      const PKC = window.PublicKeyCredential as unknown as {
        isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
      };
      if (!PKC.isUserVerifyingPlatformAuthenticatorAvailable) return false;
      return await PKC.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  async getMethod(): Promise<BiometricMethod> {
    return guessWebMethod();
  },

  async enroll(userId: string, userName: string, _reason: string): Promise<string> {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: 'Sitewise', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName,
        },
        // ES256 + RS256 — covers effectively all platform authenticators.
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!cred) throw new BiometricCancelledError();
    return base64UrlFromBuf(cred.rawId);
  },

  async verify(credentialHandle: string, _reason: string): Promise<void> {
    try {
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          rpId: window.location.hostname,
          allowCredentials: [
            {
              type: 'public-key',
              id: base64ToBuf(
                credentialHandle.replace(/-/g, '+').replace(/_/g, '/'),
              ),
            },
          ],
          userVerification: 'required',
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null;
      if (!assertion) throw new BiometricCancelledError();
    } catch (err: unknown) {
      // NotAllowedError = user dismissed / timed out. Treat as a cancel.
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw new BiometricCancelledError();
      }
      throw err;
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Tauri native provider (Android / iOS)                                      */
/* -------------------------------------------------------------------------- */

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

interface TauriBiometricPlugin {
  checkStatus(): Promise<{ isAvailable: boolean; biometryType?: number }>;
  authenticate(reason: string, options?: Record<string, unknown>): Promise<void>;
}

async function loadTauriBiometric(): Promise<TauriBiometricPlugin | null> {
  if (!isTauriRuntime()) return null;
  try {
    // @vite-ignore keeps Vite from trying to bundle/resolve the native-only
    // plugin during the web build; it only resolves at runtime inside Tauri.
    const mod = (await import(/* @vite-ignore */ '@tauri-apps/plugin-biometric')) as unknown as TauriBiometricPlugin;
    return mod && typeof mod.authenticate === 'function' ? mod : null;
  } catch {
    return null;
  }
}

const tauriProvider: BiometricProvider = {
  type: 'tauri',

  async isAvailable(): Promise<boolean> {
    const plugin = await loadTauriBiometric();
    if (!plugin) return false;
    try {
      const status = await plugin.checkStatus();
      return !!status.isAvailable;
    } catch {
      return false;
    }
  },

  async getMethod(): Promise<BiometricMethod> {
    const plugin = await loadTauriBiometric();
    try {
      const status = await plugin?.checkStatus();
      // biometryType: 1 = TouchID/fingerprint, 2 = FaceID (iOS convention).
      if (status?.biometryType === 2) return 'face';
      if (status?.biometryType === 1) return 'fingerprint';
    } catch {
      /* fall through */
    }
    return 'fingerprint';
  },

  async enroll(_userId: string, _userName: string, reason: string): Promise<string> {
    // Native biometrics have no per-credential concept — a successful
    // authentication is the enrollment confirmation.
    await this.verify('tauri-native', reason);
    return 'tauri-native';
  },

  async verify(_credentialHandle: string, reason: string): Promise<void> {
    const plugin = await loadTauriBiometric();
    if (!plugin) throw new Error('Biometric plugin unavailable');
    try {
      await plugin.authenticate(reason, { allowDeviceCredential: true });
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || err).toLowerCase();
      if (msg.includes('cancel') || msg.includes('usercancel')) {
        throw new BiometricCancelledError();
      }
      throw err;
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Provider selection                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Injectable for tests. Production resolves the best provider for the runtime:
 * native biometrics inside Tauri, WebAuthn everywhere else.
 */
let providerOverride: BiometricProvider | null = null;

export function __setProviderForTesting(p: BiometricProvider | null): void {
  providerOverride = p;
}

export async function resolveProvider(): Promise<BiometricProvider> {
  if (providerOverride) return providerOverride;
  if (isTauriRuntime()) {
    if (await tauriProvider.isAvailable()) return tauriProvider;
  }
  return webAuthnProvider;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

function readVault(): StoredVault | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredVault;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

/** Is a biometric vault stored on this device? (sync, no crypto / prompts) */
export function hasVault(): boolean {
  return readVault() !== null;
}

/** Email associated with the stored vault, for "Welcome back" copy. */
export function getVaultEmail(): string | null {
  return readVault()?.email ?? null;
}

/** Biometric method recorded at enable time, for icon / copy before unlock. */
export function getVaultMethod(): BiometricMethod | null {
  return readVault()?.method ?? null;
}

/** Is biometric unlock supported by this device/runtime at all? */
export async function isSupported(): Promise<boolean> {
  try {
    const provider = await resolveProvider();
    return await provider.isAvailable();
  } catch {
    return false;
  }
}

/** Best-effort biometric kind for the current device (no prompt). */
export async function detectMethod(): Promise<BiometricMethod> {
  try {
    const provider = await resolveProvider();
    return await provider.getMethod();
  } catch {
    return 'biometrics';
  }
}

/**
 * Enable biometric unlock. Must be called while a valid PocketBase session is
 * active (i.e. straight after a password sign-in). Runs the enrollment
 * ceremony, then encrypts and stores the current session token.
 */
export async function enable(reason: string): Promise<{ method: BiometricMethod }> {
  if (!pb.authStore.isValid || !pb.authStore.token) {
    throw new Error('Cannot enable biometric unlock without an active session');
  }

  const provider = await resolveProvider();
  if (!(await provider.isAvailable())) {
    throw new Error('Biometric authentication is not available on this device');
  }

  const record = pb.authStore.record;
  const userId = record?.id || 'sitewise-user';
  const email = (record?.email as string) || '';

  const credentialHandle = await provider.enroll(userId, email || userId, reason);
  const method = await provider.getMethod();

  const payload: SessionPayload = { token: pb.authStore.token, record };
  const { key, iv, data } = await encryptPayload(payload);

  const vault: StoredVault = {
    v: 1,
    provider: provider.type,
    credentialHandle,
    email,
    method,
    key,
    iv,
    data,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  return { method };
}

/** Remove the stored vault (disable / logout / rejected session). */
export function disable(): void {
  localStorage.removeItem(VAULT_KEY);
}

/** Re-encrypt the vault with a refreshed token, keeping the same credential. */
async function refreshVaultSession(
  vault: StoredVault,
  token: string,
  record: RecordModel | null,
): Promise<void> {
  try {
    const { key, iv, data } = await encryptPayload({ token, record });
    const updated: StoredVault = {
      ...vault,
      key,
      iv,
      data,
      email: (record?.email as string) || vault.email,
    };
    localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  } catch {
    // Non-fatal: the user is already unlocked; a stale vault just means the
    // next unlock may need a password fallback.
  }
}

/**
 * Unlock: run the biometric ceremony, restore the stored session into
 * PocketBase, and validate it with the server. On success the user is signed
 * in. Throws BiometricCancelledError if the user dismisses the prompt, and
 * BiometricSessionExpiredError (and wipes the vault) if the server rejects the
 * restored token.
 */
export async function unlock(reason: string): Promise<{ record: RecordModel | null }> {
  const vault = readVault();
  if (!vault) throw new Error('No biometric unlock is set up on this device');

  const provider = await resolveProvider();
  await provider.verify(vault.credentialHandle, reason);

  const payload = await decryptPayload(vault);
  pb.authStore.save(payload.token, payload.record);

  try {
    // Validate + refresh the restored token against the server.
    const refreshed = await pb.collection('users').authRefresh();
    // Roll the freshly issued token back into the vault so it never expires
    // out from under a regular user between unlocks.
    await refreshVaultSession(vault, pb.authStore.token, refreshed.record);
    return { record: refreshed.record };
  } catch (err: unknown) {
    const status =
      err && typeof err === 'object' && 'status' in err ? Number((err as { status: unknown }).status) : 0;

    // Only a definitive server rejection (token revoked / password changed)
    // means the saved session is dead — wipe it and fall back to password.
    if (status === 401 || status === 403) {
      pb.authStore.clear();
      disable();
      throw new BiometricSessionExpiredError(
        err instanceof Error ? err.message : undefined,
      );
    }

    // Offline / transient error: this is an offline-first app, so keep the
    // restored session and let the user in optimistically. The token is already
    // in the auth store and will be revalidated on the next online request.
    if (pb.authStore.isValid) {
      return { record: pb.authStore.record };
    }
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* First-sign-in prompt bookkeeping                                            */
/* -------------------------------------------------------------------------- */

export function hasOfferedSetup(): boolean {
  return localStorage.getItem(OFFERED_KEY) === 'true';
}

export function markSetupOffered(): void {
  localStorage.setItem(OFFERED_KEY, 'true');
}

/** Allow re-prompting later (e.g. after the user disables then signs out). */
export function resetSetupOffer(): void {
  localStorage.removeItem(OFFERED_KEY);
}
