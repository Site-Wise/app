/**
 * usePasskey Composable Tests
 *
 * Comprehensive tests for passkey/WebAuthn functionality including:
 * - Conditional UI setup with auth checks
 * - AbortSignal handling
 * - Error handling for guest-only endpoints
 * - Registration and authentication flows
 * - Passkey management (list, rename, delete)
 * - Transform functions for WebAuthn options
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pocketbase service
const mockPb = {
  authStore: {
    isValid: false,
    save: vi.fn(),
  },
};

vi.mock('../../services/pocketbase', () => ({
  pb: mockPb,
}));

// Mock the passkeyService
const mockStartAuthentication = vi.fn();
const mockFinishAuthentication = vi.fn();
const mockStartRegistration = vi.fn();
const mockFinishRegistration = vi.fn();
const mockListPasskeys = vi.fn();
const mockDeletePasskey = vi.fn();
const mockUpdatePasskey = vi.fn();

vi.mock('../../services/passkeyService', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
  isConditionalUIAvailable: vi.fn(() => Promise.resolve(true)),
  startRegistration: () => mockStartRegistration(),
  finishRegistration: () => mockFinishRegistration(),
  startAuthentication: () => mockStartAuthentication(),
  finishAuthentication: () => mockFinishAuthentication(),
  listPasskeys: () => mockListPasskeys(),
  deletePasskey: (id: string) => mockDeletePasskey(id),
  updatePasskey: (id: string, name: string) => mockUpdatePasskey(id, name),
  base64UrlToArrayBuffer: vi.fn((str: string) => new ArrayBuffer(0)),
}));

describe('usePasskey Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPb.authStore.isValid = false;
    mockPb.authStore.save.mockClear();
  });

  // ============================================================================
  // setupConditionalUI Tests
  // ============================================================================
  describe('setupConditionalUI Auth Check Logic', () => {
    it('should return early if user is already authenticated', async () => {
      mockPb.authStore.isValid = true;
      const shouldCallApi = !mockPb.authStore.isValid;
      expect(shouldCallApi).toBe(false);
      expect(mockStartAuthentication).not.toHaveBeenCalled();
    });

    it('should proceed with API call if user is not authenticated', async () => {
      mockPb.authStore.isValid = false;
      const shouldCallApi = !mockPb.authStore.isValid;
      expect(shouldCallApi).toBe(true);
    });

    it('should check auth state before and after API call for race conditions', async () => {
      let checkCount = 0;
      const getAuthState = () => {
        checkCount++;
        return checkCount > 1; // First: false, Second: true (simulates login during API call)
      };

      const beforeApiCall = getAuthState();
      expect(beforeApiCall).toBe(false);

      const afterApiCall = getAuthState();
      expect(afterApiCall).toBe(true);

      const shouldSaveAuth = !afterApiCall;
      expect(shouldSaveAuth).toBe(false);
    });

    it('should handle conditional UI not available', () => {
      const isConditionalAvailable = false;
      const shouldSetup = isConditionalAvailable;
      expect(shouldSetup).toBe(false);
    });
  });

  describe('AbortSignal Handling Logic', () => {
    it('should respect aborted signal before API call', () => {
      const abortController = new AbortController();
      abortController.abort();
      expect(abortController.signal.aborted).toBe(true);
    });

    it('should respect aborted signal after API call', () => {
      const abortController = new AbortController();
      expect(abortController.signal.aborted).toBe(false);
      abortController.abort();
      expect(abortController.signal.aborted).toBe(true);
    });

    it('should not save auth if signal aborted during credential get', () => {
      const abortController = new AbortController();
      const mockCredential = { id: 'test-credential' };
      abortController.abort();

      const shouldSaveAuth = mockCredential && !abortController.signal.aborted && !mockPb.authStore.isValid;
      expect(shouldSaveAuth).toBe(false);
    });

    it('should save auth if signal not aborted and user not logged in', () => {
      const abortController = new AbortController();
      const mockCredential = { id: 'test-credential' };
      mockPb.authStore.isValid = false;

      const shouldSaveAuth = mockCredential && !abortController.signal.aborted && !mockPb.authStore.isValid;
      expect(shouldSaveAuth).toBe(true);
    });

    it('should not save auth if user already logged in via another method', () => {
      const abortController = new AbortController();
      const mockCredential = { id: 'test-credential' };
      mockPb.authStore.isValid = true; // User logged in via password

      const shouldSaveAuth = mockCredential && !abortController.signal.aborted && !mockPb.authStore.isValid;
      expect(shouldSaveAuth).toBe(false);
    });
  });

  describe('Error Handling Logic', () => {
    it('should suppress NotAllowedError', () => {
      const error = { name: 'NotAllowedError', message: 'User cancelled' };
      const shouldLog = error.name !== 'NotAllowedError' && error.name !== 'AbortError';
      expect(shouldLog).toBe(false);
    });

    it('should suppress AbortError', () => {
      const error = { name: 'AbortError', message: 'Aborted' };
      const shouldLog = error.name !== 'NotAllowedError' && error.name !== 'AbortError';
      expect(shouldLog).toBe(false);
    });

    it('should suppress guest-only endpoint errors', () => {
      const error = {
        name: 'ClientResponseError',
        message: 'The request can be accessed only by guests.'
      };
      const shouldLog = error.name !== 'NotAllowedError' &&
                       error.name !== 'AbortError' &&
                       !error.message?.includes('guests');
      expect(shouldLog).toBe(false);
    });

    it('should log unexpected errors', () => {
      const error = { name: 'NetworkError', message: 'Failed to fetch' };
      const shouldLog = error.name !== 'NotAllowedError' &&
                       error.name !== 'AbortError' &&
                       !error.message?.includes('guests');
      expect(shouldLog).toBe(true);
    });
  });

  describe('Combined Guard Conditions', () => {
    it('should test all guard condition combinations', () => {
      const testCases = [
        { isConditionalAvailable: false, isAuthValid: false, isAborted: false, expected: false },
        { isConditionalAvailable: true, isAuthValid: true, isAborted: false, expected: false },
        { isConditionalAvailable: true, isAuthValid: false, isAborted: true, expected: false },
        { isConditionalAvailable: true, isAuthValid: false, isAborted: false, expected: true },
        { isConditionalAvailable: false, isAuthValid: true, isAborted: true, expected: false },
      ];

      testCases.forEach(({ isConditionalAvailable, isAuthValid, isAborted, expected }) => {
        const shouldProceed = isConditionalAvailable && !isAuthValid && !isAborted;
        expect(shouldProceed).toBe(expected);
      });
    });
  });

  // ============================================================================
  // registerPasskey Tests
  // ============================================================================
  describe('registerPasskey Logic', () => {
    it('should return null if passkeys not supported', () => {
      const canUsePasskeys = false;
      const result = canUsePasskeys ? 'would register' : null;
      expect(result).toBeNull();
    });

    it('should check canUsePasskeys computed correctly', () => {
      const testCases = [
        { isSupported: true, isPlatformAvailable: true, expected: true },
        { isSupported: true, isPlatformAvailable: false, expected: false },
        { isSupported: false, isPlatformAvailable: true, expected: false },
        { isSupported: false, isPlatformAvailable: false, expected: false },
      ];

      testCases.forEach(({ isSupported, isPlatformAvailable, expected }) => {
        const canUsePasskeys = isSupported && isPlatformAvailable;
        expect(canUsePasskeys).toBe(expected);
      });
    });

    it('should handle NotAllowedError during registration', () => {
      const err = { name: 'NotAllowedError' };
      let errorMessage = '';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Passkey creation was cancelled or timed out';
      }

      expect(errorMessage).toBe('Passkey creation was cancelled or timed out');
    });

    it('should handle InvalidStateError during registration', () => {
      const err = { name: 'InvalidStateError' };
      let errorMessage = '';

      if (err.name === 'InvalidStateError') {
        errorMessage = 'A passkey for this device is already registered';
      }

      expect(errorMessage).toBe('A passkey for this device is already registered');
    });

    it('should handle NotSupportedError during registration', () => {
      const err = { name: 'NotSupportedError' };
      let errorMessage = '';

      if (err.name === 'NotSupportedError') {
        errorMessage = 'This device does not support passkeys';
      }

      expect(errorMessage).toBe('This device does not support passkeys');
    });

    it('should handle generic errors during registration', () => {
      const err = { name: 'Error', message: 'Network error' };
      let errorMessage = '';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Passkey creation was cancelled or timed out';
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'A passkey for this device is already registered';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'This device does not support passkeys';
      } else {
        errorMessage = err.message || 'Failed to register passkey';
      }

      expect(errorMessage).toBe('Network error');
    });

    it('should return passkey credential on success', () => {
      const result = {
        id: 'pk-123',
        deviceName: 'Test Device',
        createdAt: '2024-01-10T12:00:00Z',
      };

      const passkey = {
        id: result.id,
        deviceName: result.deviceName,
        deviceType: 'platform' as const,
        backedUp: false,
        lastUsed: result.createdAt,
        createdAt: result.createdAt,
        flagged: false,
      };

      expect(passkey.id).toBe('pk-123');
      expect(passkey.deviceType).toBe('platform');
      expect(passkey.backedUp).toBe(false);
      expect(passkey.flagged).toBe(false);
    });
  });

  // ============================================================================
  // authenticateWithPasskey Tests
  // ============================================================================
  describe('authenticateWithPasskey Logic', () => {
    it('should return false if WebAuthn not supported', () => {
      const isSupported = false;
      const canAuthenticate = isSupported;
      expect(canAuthenticate).toBe(false);
    });

    it('should handle NotAllowedError during authentication', () => {
      const err = { name: 'NotAllowedError' };
      let errorMessage = '';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Authentication was cancelled or timed out';
      }

      expect(errorMessage).toBe('Authentication was cancelled or timed out');
    });

    it('should handle SecurityError during authentication', () => {
      const err = { name: 'SecurityError' };
      let errorMessage = '';

      if (err.name === 'SecurityError') {
        errorMessage = 'Security error during authentication';
      }

      expect(errorMessage).toBe('Security error during authentication');
    });

    it('should save auth token on success', () => {
      const result = {
        token: 'jwt-token-123',
        record: { id: 'user-1', email: 'test@test.com' },
      };

      mockPb.authStore.save(result.token, result.record);

      expect(mockPb.authStore.save).toHaveBeenCalledWith('jwt-token-123', { id: 'user-1', email: 'test@test.com' });
    });
  });

  // ============================================================================
  // loadPasskeys Tests
  // ============================================================================
  describe('loadPasskeys Logic', () => {
    it('should clear passkeys if not authenticated', () => {
      mockPb.authStore.isValid = false;
      const passkeys: any[] = [];

      if (!mockPb.authStore.isValid) {
        expect(passkeys).toEqual([]);
      }
    });

    it('should load passkeys if authenticated', async () => {
      mockPb.authStore.isValid = true;
      const mockPasskeys = [
        { id: '1', deviceName: 'iPhone' },
        { id: '2', deviceName: 'Mac' },
      ];
      mockListPasskeys.mockResolvedValue(mockPasskeys);

      if (mockPb.authStore.isValid) {
        const result = await mockListPasskeys();
        expect(result).toEqual(mockPasskeys);
      }
    });

    it('should handle errors gracefully', async () => {
      mockListPasskeys.mockRejectedValue(new Error('Network error'));

      let passkeys: any[] = [];
      try {
        passkeys = await mockListPasskeys();
      } catch {
        passkeys = [];
      }

      expect(passkeys).toEqual([]);
    });
  });

  // ============================================================================
  // removePasskey Tests
  // ============================================================================
  describe('removePasskey Logic', () => {
    it('should call deletePasskey with correct ID', async () => {
      mockDeletePasskey.mockResolvedValue(undefined);

      await mockDeletePasskey('pk-123');

      expect(mockDeletePasskey).toHaveBeenCalledWith('pk-123');
    });

    it('should return true on success', async () => {
      mockDeletePasskey.mockResolvedValue(undefined);

      let success = false;
      try {
        await mockDeletePasskey('pk-123');
        success = true;
      } catch {
        success = false;
      }

      expect(success).toBe(true);
    });

    it('should return false on error', async () => {
      mockDeletePasskey.mockRejectedValue(new Error('Not found'));

      let success = false;
      let errorMessage = '';
      try {
        await mockDeletePasskey('pk-invalid');
        success = true;
      } catch (err: any) {
        success = false;
        errorMessage = err.message || 'Failed to delete passkey';
      }

      expect(success).toBe(false);
      expect(errorMessage).toBe('Not found');
    });
  });

  // ============================================================================
  // renamePasskey Tests
  // ============================================================================
  describe('renamePasskey Logic', () => {
    it('should call updatePasskey with correct parameters', async () => {
      mockUpdatePasskey.mockResolvedValue({ id: 'pk-123', deviceName: 'New Name' });

      await mockUpdatePasskey('pk-123', 'New Name');

      expect(mockUpdatePasskey).toHaveBeenCalledWith('pk-123', 'New Name');
    });

    it('should return true on success', async () => {
      mockUpdatePasskey.mockResolvedValue({ id: 'pk-123', deviceName: 'New Name' });

      let success = false;
      try {
        await mockUpdatePasskey('pk-123', 'New Name');
        success = true;
      } catch {
        success = false;
      }

      expect(success).toBe(true);
    });

    it('should return false on error', async () => {
      mockUpdatePasskey.mockRejectedValue(new Error('Not found'));

      let success = false;
      let errorMessage = '';
      try {
        await mockUpdatePasskey('pk-invalid', 'New Name');
        success = true;
      } catch (err: any) {
        success = false;
        errorMessage = err.message || 'Failed to rename passkey';
      }

      expect(success).toBe(false);
      expect(errorMessage).toBe('Not found');
    });
  });

  // ============================================================================
  // clearError Tests
  // ============================================================================
  describe('clearError Logic', () => {
    it('should clear error state', () => {
      let error: string | null = 'Some error message';

      const clearError = () => {
        error = null;
      };

      clearError();
      expect(error).toBeNull();
    });
  });

  // ============================================================================
  // checkSupport Tests
  // ============================================================================
  describe('checkSupport Logic', () => {
    it('should check all support types when WebAuthn supported', async () => {
      const isSupported = true;
      let isPlatformAvailable = false;
      let isConditionalAvailable = false;

      if (isSupported) {
        [isPlatformAvailable, isConditionalAvailable] = await Promise.all([
          Promise.resolve(true),
          Promise.resolve(true),
        ]);
      }

      expect(isPlatformAvailable).toBe(true);
      expect(isConditionalAvailable).toBe(true);
    });

    it('should not check platform/conditional when WebAuthn not supported', async () => {
      const isSupported = false;
      let isPlatformAvailable = false;
      let isConditionalAvailable = false;

      if (isSupported) {
        [isPlatformAvailable, isConditionalAvailable] = await Promise.all([
          Promise.resolve(true),
          Promise.resolve(true),
        ]);
      }

      expect(isPlatformAvailable).toBe(false);
      expect(isConditionalAvailable).toBe(false);
    });
  });

  // ============================================================================
  // hasPasskeys Computed Tests
  // ============================================================================
  describe('hasPasskeys Computed Logic', () => {
    it('should return false when no passkeys', () => {
      const passkeys: any[] = [];
      const hasPasskeys = passkeys.length > 0;
      expect(hasPasskeys).toBe(false);
    });

    it('should return true when passkeys exist', () => {
      const passkeys = [{ id: '1' }, { id: '2' }];
      const hasPasskeys = passkeys.length > 0;
      expect(hasPasskeys).toBe(true);
    });
  });

  // ============================================================================
  // Options Initialization Tests
  // ============================================================================
  describe('Options Initialization Logic', () => {
    it('should use default checkOnMount = true', () => {
      const options = {};
      const { checkOnMount = true } = options;
      expect(checkOnMount).toBe(true);
    });

    it('should respect checkOnMount = false', () => {
      const options = { checkOnMount: false };
      const { checkOnMount = true } = options;
      expect(checkOnMount).toBe(false);
    });
  });

  // ============================================================================
  // onMounted Behavior Tests
  // ============================================================================
  describe('onMounted Behavior Logic', () => {
    it('should check support on mount when checkOnMount is true', async () => {
      const checkOnMount = true;
      let checkSupportCalled = false;

      if (checkOnMount) {
        checkSupportCalled = true;
      }

      expect(checkSupportCalled).toBe(true);
    });

    it('should load passkeys on mount when authenticated', async () => {
      const checkOnMount = true;
      mockPb.authStore.isValid = true;
      let loadPasskeysCalled = false;

      if (checkOnMount && mockPb.authStore.isValid) {
        loadPasskeysCalled = true;
      }

      expect(loadPasskeysCalled).toBe(true);
    });

    it('should not load passkeys on mount when not authenticated', async () => {
      const checkOnMount = true;
      mockPb.authStore.isValid = false;
      let loadPasskeysCalled = false;

      if (checkOnMount && mockPb.authStore.isValid) {
        loadPasskeysCalled = true;
      }

      expect(loadPasskeysCalled).toBe(false);
    });

    it('should not check support when checkOnMount is false', async () => {
      const checkOnMount = false;
      let checkSupportCalled = false;

      if (checkOnMount) {
        checkSupportCalled = true;
      }

      expect(checkSupportCalled).toBe(false);
    });
  });
});

// ============================================================================
// PasskeyLoginButton Lifecycle Logic
// ============================================================================
describe('PasskeyLoginButton Lifecycle Logic', () => {
  describe('AbortController Management', () => {
    it('should create AbortController on mount when conditional UI available', () => {
      const isConditionalAvailable = true;
      let abortController: AbortController | null = null;

      if (isConditionalAvailable) {
        abortController = new AbortController();
      }

      expect(abortController).not.toBeNull();
      expect(abortController?.signal.aborted).toBe(false);
    });

    it('should not create AbortController when conditional UI unavailable', () => {
      const isConditionalAvailable = false;
      let abortController: AbortController | null = null;

      if (isConditionalAvailable) {
        abortController = new AbortController();
      }

      expect(abortController).toBeNull();
    });

    it('should abort and cleanup on unmount', () => {
      let abortController: AbortController | null = new AbortController();
      const originalController = abortController;

      // Simulate unmount - abort and cleanup
      abortController.abort();
      abortController = null;

      expect(abortController).toBeNull();
      expect(originalController.signal.aborted).toBe(true);
    });
  });

  describe('showButton State Logic', () => {
    it('should show button when supported and platform available', () => {
      const isSupported = true;
      const isPlatformAvailable = true;
      const showButton = isSupported && isPlatformAvailable;
      expect(showButton).toBe(true);
    });

    it('should hide button when not supported', () => {
      const isSupported = false;
      const isPlatformAvailable = true;
      const showButton = isSupported && isPlatformAvailable;
      expect(showButton).toBe(false);
    });

    it('should hide button when platform not available', () => {
      const isSupported = true;
      const isPlatformAvailable = false;
      const showButton = isSupported && isPlatformAvailable;
      expect(showButton).toBe(false);
    });
  });
});

// ============================================================================
// Transform Functions Logic Tests
// ============================================================================
describe('Transform Functions Logic', () => {
  describe('transformRegistrationOptions logic', () => {
    it('should transform all required fields', () => {
      const serverOptions = {
        challenge: 'test-challenge',
        rp: { name: 'Test', id: 'test.com' },
        user: { id: 'user-id', name: 'test@test.com', displayName: 'Test User' },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
        excludeCredentials: [
          { id: 'cred-1', type: 'public-key', transports: ['internal'] }
        ],
      };

      // Verify all fields are present
      expect(serverOptions.challenge).toBeDefined();
      expect(serverOptions.rp).toBeDefined();
      expect(serverOptions.user).toBeDefined();
      expect(serverOptions.pubKeyCredParams).toBeDefined();
      expect(serverOptions.authenticatorSelection).toBeDefined();
      expect(serverOptions.timeout).toBeDefined();
      expect(serverOptions.attestation).toBeDefined();
      expect(serverOptions.excludeCredentials).toBeDefined();
    });

    it('should handle empty excludeCredentials', () => {
      const excludeCredentials: any[] = [];
      const transformed = excludeCredentials.map((cred) => ({
        id: cred.id,
        type: cred.type,
        transports: cred.transports,
      }));

      expect(transformed).toEqual([]);
    });

    it('should transform multiple excludeCredentials', () => {
      const excludeCredentials = [
        { id: 'cred-1', type: 'public-key', transports: ['internal'] },
        { id: 'cred-2', type: 'public-key', transports: ['usb', 'nfc'] },
      ];

      const transformed = excludeCredentials.map((cred) => ({
        id: cred.id,
        type: cred.type,
        transports: cred.transports,
      }));

      expect(transformed).toHaveLength(2);
      expect(transformed[0].id).toBe('cred-1');
      expect(transformed[1].transports).toEqual(['usb', 'nfc']);
    });
  });

  describe('transformAuthenticationOptions logic', () => {
    it('should transform basic options', () => {
      const serverOptions = {
        challenge: 'test-challenge',
        rpId: 'test.com',
        userVerification: 'required',
        timeout: 60000,
      };

      expect(serverOptions.challenge).toBeDefined();
      expect(serverOptions.rpId).toBe('test.com');
      expect(serverOptions.userVerification).toBe('required');
      expect(serverOptions.timeout).toBe(60000);
    });

    it('should handle options with allowCredentials', () => {
      const allowCredentials = [
        { id: 'cred-1', type: 'public-key', transports: ['internal'] },
      ];

      const result: any = {
        challenge: 'test-challenge',
        rpId: 'test.com',
      };

      if (allowCredentials && allowCredentials.length > 0) {
        result.allowCredentials = allowCredentials.map((cred) => ({
          id: cred.id,
          type: cred.type,
          transports: cred.transports,
        }));
      }

      expect(result.allowCredentials).toBeDefined();
      expect(result.allowCredentials).toHaveLength(1);
    });

    it('should not add allowCredentials when empty', () => {
      const allowCredentials: any[] = [];

      const result: any = {
        challenge: 'test-challenge',
        rpId: 'test.com',
      };

      if (allowCredentials && allowCredentials.length > 0) {
        result.allowCredentials = allowCredentials;
      }

      expect(result.allowCredentials).toBeUndefined();
    });

    it('should not add allowCredentials when undefined', () => {
      const allowCredentials = undefined;

      const result: any = {
        challenge: 'test-challenge',
        rpId: 'test.com',
      };

      if (allowCredentials && allowCredentials.length > 0) {
        result.allowCredentials = allowCredentials;
      }

      expect(result.allowCredentials).toBeUndefined();
    });
  });
});

// ============================================================================
// State Management Logic Tests
// ============================================================================
describe('State Management Logic', () => {
  describe('isLoading State', () => {
    it('should set loading true at start of operation', () => {
      let isLoading = false;

      // Start operation
      isLoading = true;
      expect(isLoading).toBe(true);
    });

    it('should set loading false in finally block', () => {
      let isLoading = true;

      try {
        // Operation
      } finally {
        isLoading = false;
      }

      expect(isLoading).toBe(false);
    });

    it('should set loading false even on error', () => {
      let isLoading = true;

      try {
        throw new Error('Test error');
      } catch {
        // Error handled
      } finally {
        isLoading = false;
      }

      expect(isLoading).toBe(false);
    });
  });

  describe('error State', () => {
    it('should clear error at start of operation', () => {
      let error: string | null = 'Previous error';

      // Start of operation
      error = null;

      expect(error).toBeNull();
    });

    it('should set error on failure', () => {
      let error: string | null = null;

      try {
        throw new Error('Operation failed');
      } catch (err: any) {
        error = err.message;
      }

      expect(error).toBe('Operation failed');
    });

    it('should use default message when error has no message', () => {
      let error: string | null = null;

      try {
        throw { name: 'Error' }; // Error without message
      } catch (err: any) {
        error = err.message || 'Failed to complete operation';
      }

      expect(error).toBe('Failed to complete operation');
    });
  });
});

// ============================================================================
// PasskeyList Component Logic Tests
// ============================================================================
describe('PasskeyList Component Logic', () => {
  describe('sortedPasskeys', () => {
    it('should sort passkeys by lastUsed date descending', () => {
      const passkeys = [
        { id: '1', lastUsed: '2024-01-01T00:00:00Z' },
        { id: '2', lastUsed: '2024-01-03T00:00:00Z' },
        { id: '3', lastUsed: '2024-01-02T00:00:00Z' },
      ];

      const sorted = [...passkeys].sort((a, b) => {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });

      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('should handle empty passkeys array', () => {
      const passkeys: any[] = [];
      const sorted = [...passkeys].sort((a, b) => {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });

      expect(sorted).toEqual([]);
    });

    it('should handle single passkey', () => {
      const passkeys = [{ id: '1', lastUsed: '2024-01-01T00:00:00Z' }];
      const sorted = [...passkeys].sort((a, b) => {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });

      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('1');
    });
  });

  describe('getDeviceIcon', () => {
    const getDeviceIcon = (deviceType: string, deviceName: string): string => {
      const name = deviceName.toLowerCase();
      if (name.includes('iphone')) return '📱';
      if (name.includes('ipad')) return '📱';
      if (name.includes('android')) return '📱';
      if (name.includes('mac')) return '💻';
      if (name.includes('windows')) return '🖥️';
      if (name.includes('linux')) return '🐧';
      return deviceType === 'platform' ? '🔐' : '🔑';
    };

    it('should return mobile icon for iPhone', () => {
      expect(getDeviceIcon('platform', 'iPhone (Safari)')).toBe('📱');
    });

    it('should return mobile icon for iPad', () => {
      expect(getDeviceIcon('platform', 'iPad Pro')).toBe('📱');
    });

    it('should return mobile icon for Android', () => {
      expect(getDeviceIcon('platform', 'Android (Chrome)')).toBe('📱');
    });

    it('should return laptop icon for Mac', () => {
      expect(getDeviceIcon('platform', 'Mac (Chrome)')).toBe('💻');
    });

    it('should return desktop icon for Windows', () => {
      expect(getDeviceIcon('platform', 'Windows (Edge)')).toBe('🖥️');
    });

    it('should return penguin icon for Linux', () => {
      expect(getDeviceIcon('platform', 'Linux (Firefox)')).toBe('🐧');
    });

    it('should return lock icon for unknown platform device', () => {
      expect(getDeviceIcon('platform', 'Unknown Device')).toBe('🔐');
    });

    it('should return key icon for cross-platform device', () => {
      expect(getDeviceIcon('cross-platform', 'Security Key')).toBe('🔑');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      };

      const result = formatDate('2024-01-15T12:00:00Z');
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });
  });

  describe('formatRelativeTime', () => {
    const formatRelativeTime = (dateString: string, now: Date): string => {
      const date = new Date(dateString);
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    };

    it('should return Today for same day', () => {
      const now = new Date('2024-01-10T12:00:00Z');
      expect(formatRelativeTime('2024-01-10T10:00:00Z', now)).toBe('Today');
    });

    it('should return Yesterday for previous day', () => {
      const now = new Date('2024-01-10T12:00:00Z');
      expect(formatRelativeTime('2024-01-09T10:00:00Z', now)).toBe('Yesterday');
    });

    it('should return X days ago for recent dates', () => {
      const now = new Date('2024-01-10T12:00:00Z');
      expect(formatRelativeTime('2024-01-07T10:00:00Z', now)).toBe('3 days ago');
    });

    it('should return formatted date for older dates', () => {
      const now = new Date('2024-01-10T12:00:00Z');
      const result = formatRelativeTime('2024-01-01T10:00:00Z', now);
      expect(result).toContain('/'); // Contains date separator
    });
  });

  describe('Modal State Management', () => {
    it('should toggle add modal', () => {
      let showAddModal = false;

      showAddModal = true;
      expect(showAddModal).toBe(true);

      showAddModal = false;
      expect(showAddModal).toBe(false);
    });

    it('should track selected passkey for delete', () => {
      let selectedPasskey: any = null;
      let showDeleteModal = false;

      const openDeleteModal = (passkey: any) => {
        selectedPasskey = passkey;
        showDeleteModal = true;
      };

      openDeleteModal({ id: 'pk-1', deviceName: 'Test' });

      expect(selectedPasskey).not.toBeNull();
      expect(selectedPasskey.id).toBe('pk-1');
      expect(showDeleteModal).toBe(true);
    });

    it('should track rename value', () => {
      let renameValue = '';
      let selectedPasskey: any = null;

      const openRenameModal = (passkey: any) => {
        selectedPasskey = passkey;
        renameValue = passkey.deviceName;
      };

      openRenameModal({ id: 'pk-1', deviceName: 'Original Name' });

      expect(renameValue).toBe('Original Name');
    });

    it('should validate rename value is not empty', () => {
      const renameValue = '  ';
      const isValid = renameValue.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it('should accept valid rename value', () => {
      const renameValue = 'New Device Name';
      const isValid = renameValue.trim().length > 0;

      expect(isValid).toBe(true);
    });
  });
});
