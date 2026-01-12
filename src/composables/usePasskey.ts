/**
 * usePasskey Composable
 *
 * Provides WebAuthn/Passkey functionality for Vue components.
 * Handles passkey registration, authentication, and management.
 */

import { ref, computed, onMounted } from 'vue';
import { pb } from '../services/pocketbase';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  isConditionalUIAvailable,
  startRegistration,
  finishRegistration,
  startAuthentication,
  finishAuthentication,
  listPasskeys,
  deletePasskey,
  updatePasskey,
  base64UrlToArrayBuffer,
  type PasskeyCredential,
  type RegistrationOptions,
  type AuthenticationOptions,
} from '../services/passkeyService';

export interface UsePasskeyOptions {
  /**
   * Whether to check platform authenticator availability on mount
   */
  checkOnMount?: boolean;
}

export function usePasskey(options: UsePasskeyOptions = {}) {
  const { checkOnMount = true } = options;

  // State
  const isSupported = ref(false);
  const isPlatformAvailable = ref(false);
  const isConditionalAvailable = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const passkeys = ref<PasskeyCredential[]>([]);

  // Computed
  const canUsePasskeys = computed(() => isSupported.value && isPlatformAvailable.value);
  const hasPasskeys = computed(() => passkeys.value.length > 0);

  /**
   * Check WebAuthn support and availability
   */
  async function checkSupport(): Promise<void> {
    isSupported.value = isWebAuthnSupported();

    if (isSupported.value) {
      [isPlatformAvailable.value, isConditionalAvailable.value] = await Promise.all([
        isPlatformAuthenticatorAvailable(),
        isConditionalUIAvailable(),
      ]);
    }
  }

  /**
   * Register a new passkey for the current user
   * @param deviceName - Optional friendly name for the device
   */
  async function registerPasskey(deviceName?: string): Promise<PasskeyCredential | null> {
    if (!canUsePasskeys.value) {
      error.value = 'Passkeys are not supported on this device';
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Step 1: Get registration options from server
      const options = await startRegistration();

      // Step 2: Create credential with browser API
      const credential = await navigator.credentials.create({
        publicKey: transformRegistrationOptions(options),
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('Passkey creation was cancelled');
      }

      // Step 3: Send credential to server for verification
      const result = await finishRegistration(credential, deviceName);

      // Refresh passkey list
      await loadPasskeys();

      return {
        id: result.id,
        deviceName: result.deviceName,
        deviceType: 'platform',
        backedUp: false,
        lastUsed: result.createdAt,
        createdAt: result.createdAt,
        flagged: false,
      };
    } catch (err: any) {
      // Handle specific WebAuthn errors
      if (err.name === 'NotAllowedError') {
        error.value = 'Passkey creation was cancelled or timed out';
      } else if (err.name === 'InvalidStateError') {
        error.value = 'A passkey for this device is already registered';
      } else if (err.name === 'NotSupportedError') {
        error.value = 'This device does not support passkeys';
      } else {
        error.value = err.message || 'Failed to register passkey';
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Authenticate using a passkey
   * @param email - Optional email for user-specific authentication
   */
  async function authenticateWithPasskey(email?: string): Promise<boolean> {
    if (!isSupported.value) {
      error.value = 'Passkeys are not supported on this device';
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Step 1: Get authentication options from server
      const options = await startAuthentication(email);

      // Step 2: Get credential with browser API
      const credential = await navigator.credentials.get({
        publicKey: transformAuthenticationOptions(options),
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('Passkey authentication was cancelled');
      }

      // Step 3: Send credential to server for verification
      const result = await finishAuthentication(credential);

      // Step 4: Save auth token
      pb.authStore.save(result.token, result.record);

      return true;
    } catch (err: any) {
      // Handle specific WebAuthn errors
      if (err.name === 'NotAllowedError') {
        error.value = 'Authentication was cancelled or timed out';
      } else if (err.name === 'SecurityError') {
        error.value = 'Security error during authentication';
      } else {
        error.value = err.message || 'Failed to authenticate with passkey';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Setup conditional UI (passkey autofill)
   * Call this on login page mount to enable passkey autofill
   * @param signal - Optional AbortSignal to cancel the operation
   */
  async function setupConditionalUI(signal?: AbortSignal): Promise<void> {
    if (!isConditionalAvailable.value) {
      return;
    }

    // Don't try to authenticate if user is already logged in
    // The /api/passkey/authenticate/start endpoint is guest-only
    if (pb.authStore.isValid) {
      return;
    }

    try {
      // Check abort signal before making API call
      if (signal?.aborted) {
        return;
      }

      // Get authentication options for conditional UI
      const options = await startAuthentication();

      // Check again after API call in case user logged in while waiting
      if (signal?.aborted || pb.authStore.isValid) {
        return;
      }

      // Start conditional mediation
      const credential = await navigator.credentials.get({
        publicKey: transformAuthenticationOptions(options),
        mediation: 'conditional',
        signal,
      } as CredentialRequestOptions) as PublicKeyCredential | null;

      // Verify user hasn't logged in via another method while waiting
      if (credential && !signal?.aborted && !pb.authStore.isValid) {
        // User selected a passkey from autofill
        const result = await finishAuthentication(credential);
        pb.authStore.save(result.token, result.record);
      }
    } catch (err: any) {
      // Conditional UI errors are expected when:
      // - User doesn't select a passkey
      // - Operation is aborted
      // - User logged in via another method (guest-only endpoint rejects)
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        // Only log if it's not the expected "guests only" error
        if (!err.message?.includes('guests')) {
          console.error('Conditional UI error:', err);
        }
      }
    }
  }

  /**
   * Load user's passkeys
   */
  async function loadPasskeys(): Promise<void> {
    if (!pb.authStore.isValid) {
      passkeys.value = [];
      return;
    }

    try {
      passkeys.value = await listPasskeys();
    } catch (err: any) {
      console.error('Failed to load passkeys:', err);
      passkeys.value = [];
    }
  }

  /**
   * Remove a passkey
   * @param id - Passkey ID to remove
   */
  async function removePasskey(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await deletePasskey(id);
      await loadPasskeys();
      return true;
    } catch (err: any) {
      error.value = err.message || 'Failed to delete passkey';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Rename a passkey
   * @param id - Passkey ID to rename
   * @param newName - New device name
   */
  async function renamePasskey(id: string, newName: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await updatePasskey(id, newName);
      await loadPasskeys();
      return true;
    } catch (err: any) {
      error.value = err.message || 'Failed to rename passkey';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  // Initialize on mount
  onMounted(async () => {
    if (checkOnMount) {
      await checkSupport();
      if (pb.authStore.isValid) {
        await loadPasskeys();
      }
    }
  });

  return {
    // State
    isSupported,
    isPlatformAvailable,
    isConditionalAvailable,
    isLoading,
    error,
    passkeys,

    // Computed
    canUsePasskeys,
    hasPasskeys,

    // Methods
    checkSupport,
    registerPasskey,
    authenticateWithPasskey,
    setupConditionalUI,
    loadPasskeys,
    removePasskey,
    renamePasskey,
    clearError,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform server registration options to WebAuthn format
 */
function transformRegistrationOptions(options: RegistrationOptions): PublicKeyCredentialCreationOptions {
  return {
    challenge: base64UrlToArrayBuffer(options.challenge),
    rp: options.rp,
    user: {
      id: base64UrlToArrayBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: options.authenticatorSelection,
    timeout: options.timeout,
    attestation: options.attestation,
    excludeCredentials: options.excludeCredentials.map((cred) => ({
      id: base64UrlToArrayBuffer(cred.id),
      type: cred.type,
      transports: cred.transports as AuthenticatorTransport[],
    })),
  };
}

/**
 * Transform server authentication options to WebAuthn format
 */
function transformAuthenticationOptions(options: AuthenticationOptions): PublicKeyCredentialRequestOptions {
  const result: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToArrayBuffer(options.challenge),
    rpId: options.rpId,
    userVerification: options.userVerification,
    timeout: options.timeout,
  };

  if (options.allowCredentials && options.allowCredentials.length > 0) {
    result.allowCredentials = options.allowCredentials.map((cred) => ({
      id: base64UrlToArrayBuffer(cred.id),
      type: cred.type,
      transports: cred.transports as AuthenticatorTransport[],
    }));
  }

  return result;
}

export type { PasskeyCredential };
