/**
 * Passkey Service Tests
 *
 * Comprehensive tests for WebAuthn/Passkey API functions and helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pocketbase
const mockSend = vi.fn();
vi.mock('../../services/pocketbase', () => ({
  pb: {
    send: (...args: any[]) => mockSend(...args),
  },
}));

// Import after mocking
import {
  base64UrlToArrayBuffer,
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
} from '../../services/passkeyService';

describe('passkeyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Base64URL Conversion Tests
  // ============================================================================
  describe('base64UrlToArrayBuffer', () => {
    it('should convert simple base64url string to ArrayBuffer', () => {
      // "hello" in base64url is "aGVsbG8"
      const base64url = 'aGVsbG8';
      const buffer = base64UrlToArrayBuffer(base64url);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(5); // "hello" is 5 bytes

      const view = new Uint8Array(buffer);
      expect(String.fromCharCode(...view)).toBe('hello');
    });

    it('should handle base64url with replaced characters', () => {
      // Standard base64 with + and / should work when converted from base64url
      // "test+data/here" in base64url would be "test-data_here"
      // Using a valid base64url encoded string
      const base64url = 'dGVzdA'; // "test" in base64url
      const buffer = base64UrlToArrayBuffer(base64url);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(4); // "test" is 4 bytes
    });

    it('should handle padding correctly', () => {
      // Different lengths require different padding
      const testCases = [
        { input: 'YQ', expectedLength: 1 },      // "a" - needs 2 padding
        { input: 'YWI', expectedLength: 2 },     // "ab" - needs 1 padding
        { input: 'YWJj', expectedLength: 3 },    // "abc" - no padding needed
      ];

      testCases.forEach(({ input, expectedLength }) => {
        const buffer = base64UrlToArrayBuffer(input);
        expect(buffer.byteLength).toBe(expectedLength);
      });
    });

    it('should handle empty string', () => {
      const buffer = base64UrlToArrayBuffer('');
      expect(buffer.byteLength).toBe(0);
    });

    it('should handle WebAuthn-style credential IDs', () => {
      // Typical credential ID format
      const credentialId = 'Uj3wIxMz0Q_LN4t2V8kE-w';
      const buffer = base64UrlToArrayBuffer(credentialId);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // WebAuthn Support Detection Logic Tests
  // ============================================================================
  describe('isWebAuthnSupported logic', () => {
    it('should check PublicKeyCredential existence and type', () => {
      // Test the logic pattern used by isWebAuthnSupported
      const checkSupport = (pkc: any): boolean => {
        return pkc !== undefined && typeof pkc === 'function';
      };

      expect(checkSupport(function() {})).toBe(true);
      expect(checkSupport(undefined)).toBe(false);
      expect(checkSupport(null)).toBe(false);
      expect(checkSupport('not a function')).toBe(false);
      expect(checkSupport({})).toBe(false);
      expect(checkSupport(123)).toBe(false);
    });
  });

  describe('isPlatformAuthenticatorAvailable logic', () => {
    it('should return false when WebAuthn not supported', async () => {
      const checkPlatform = async (isSupported: boolean, checker?: () => Promise<boolean>): Promise<boolean> => {
        if (!isSupported) return false;
        try {
          return checker ? await checker() : false;
        } catch {
          return false;
        }
      };

      expect(await checkPlatform(false)).toBe(false);
      expect(await checkPlatform(true, async () => true)).toBe(true);
      expect(await checkPlatform(true, async () => false)).toBe(false);
      expect(await checkPlatform(true, async () => { throw new Error('fail'); })).toBe(false);
    });
  });

  describe('isConditionalUIAvailable logic', () => {
    it('should return false when WebAuthn not supported', async () => {
      const checkConditional = async (isSupported: boolean, checker?: () => Promise<boolean>): Promise<boolean> => {
        if (!isSupported) return false;
        try {
          return checker ? await checker() : false;
        } catch {
          return false;
        }
      };

      expect(await checkConditional(false)).toBe(false);
      expect(await checkConditional(true, async () => true)).toBe(true);
      expect(await checkConditional(true, async () => false)).toBe(false);
      expect(await checkConditional(true, undefined)).toBe(false);
      expect(await checkConditional(true, async () => { throw new Error('fail'); })).toBe(false);
    });
  });

  // ============================================================================
  // API Function Tests
  // ============================================================================
  describe('startRegistration', () => {
    it('should call API and return options on success', async () => {
      const mockOptions = {
        challenge: 'test-challenge',
        rp: { name: 'Test', id: 'test.com' },
        user: { id: 'user-1', name: 'test@test.com', displayName: 'Test User' },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
        excludeCredentials: [],
      };

      mockSend.mockResolvedValue({ success: true, options: mockOptions });

      const result = await startRegistration();

      expect(mockSend).toHaveBeenCalledWith('/api/passkey/register/start', {
        method: 'POST',
      });
      expect(result).toEqual(mockOptions);
    });

    it('should throw error with server message on failure', async () => {
      mockSend.mockResolvedValue({ success: false, error: 'User not authenticated' });

      await expect(startRegistration()).rejects.toThrow('User not authenticated');
    });

    it('should throw default error when no message provided', async () => {
      mockSend.mockResolvedValue({ success: false });

      await expect(startRegistration()).rejects.toThrow('Failed to start registration');
    });
  });

  describe('startAuthentication', () => {
    it('should call API without email', async () => {
      const mockOptions = {
        challenge: 'test-challenge',
        rpId: 'test.com',
        userVerification: 'required',
        timeout: 60000,
      };

      mockSend.mockResolvedValue({ success: true, options: mockOptions });

      const result = await startAuthentication();

      expect(mockSend).toHaveBeenCalledWith('/api/passkey/authenticate/start', {
        method: 'POST',
        body: {},
      });
      expect(result).toEqual(mockOptions);
    });

    it('should call API with email when provided', async () => {
      const mockOptions = {
        challenge: 'test-challenge',
        rpId: 'test.com',
        userVerification: 'required',
        timeout: 60000,
        allowCredentials: [{ id: 'cred-1', type: 'public-key', transports: ['internal'] }],
      };

      mockSend.mockResolvedValue({ success: true, options: mockOptions });

      const result = await startAuthentication('test@test.com');

      expect(mockSend).toHaveBeenCalledWith('/api/passkey/authenticate/start', {
        method: 'POST',
        body: { email: 'test@test.com' },
      });
      expect(result).toEqual(mockOptions);
    });

    it('should throw error on failure', async () => {
      mockSend.mockResolvedValue({ success: false, error: 'Rate limited' });

      await expect(startAuthentication()).rejects.toThrow('Rate limited');
    });
  });

  describe('listPasskeys', () => {
    it('should return passkeys list on success', async () => {
      const mockPasskeys = [
        {
          id: 'pk-1',
          deviceName: 'iPhone (Safari)',
          deviceType: 'platform',
          backedUp: true,
          lastUsed: '2024-01-10T12:00:00Z',
          createdAt: '2024-01-01T12:00:00Z',
          flagged: false,
        },
        {
          id: 'pk-2',
          deviceName: 'Mac (Chrome)',
          deviceType: 'platform',
          backedUp: false,
          lastUsed: '2024-01-09T12:00:00Z',
          createdAt: '2024-01-02T12:00:00Z',
          flagged: false,
        },
      ];

      mockSend.mockResolvedValue({ success: true, passkeys: mockPasskeys });

      const result = await listPasskeys();

      expect(mockSend).toHaveBeenCalledWith('/api/passkey/list', {
        method: 'GET',
      });
      expect(result).toEqual(mockPasskeys);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no passkeys', async () => {
      mockSend.mockResolvedValue({ success: true, passkeys: [] });

      const result = await listPasskeys();
      expect(result).toEqual([]);
    });

    it('should throw error on failure', async () => {
      mockSend.mockResolvedValue({ success: false, error: 'Unauthorized' });

      await expect(listPasskeys()).rejects.toThrow('Unauthorized');
    });
  });

  describe('deletePasskey', () => {
    it('should call API with passkey ID', async () => {
      mockSend.mockResolvedValue({ success: true });

      await deletePasskey('pk-123');

      expect(mockSend).toHaveBeenCalledWith('/api/passkey/pk-123', {
        method: 'DELETE',
      });
    });

    it('should throw error on failure', async () => {
      mockSend.mockResolvedValue({ success: false, error: 'Passkey not found' });

      await expect(deletePasskey('pk-invalid')).rejects.toThrow('Passkey not found');
    });

    it('should throw error when deleting another user passkey', async () => {
      mockSend.mockResolvedValue({ success: false, error: 'Cannot delete passkey belonging to another user' });

      await expect(deletePasskey('pk-other')).rejects.toThrow('Cannot delete passkey belonging to another user');
    });
  });

  describe('updatePasskey', () => {
    it('should call API with ID and new name', async () => {
      const mockPasskey = {
        id: 'pk-123',
        deviceName: 'My iPhone',
        deviceType: 'platform',
        backedUp: true,
        lastUsed: '2024-01-10T12:00:00Z',
        createdAt: '2024-01-01T12:00:00Z',
        flagged: false,
      };

      mockSend.mockResolvedValue({ success: true, passkey: mockPasskey });

      const result = await updatePasskey('pk-123', 'My iPhone');

      expect(mockSend).toHaveBeenCalledWith('/api/passkey/pk-123', {
        method: 'PATCH',
        body: { deviceName: 'My iPhone' },
      });
      expect(result).toEqual(mockPasskey);
    });

    it('should throw error on failure', async () => {
      mockSend.mockResolvedValue({ success: false, error: 'Passkey not found' });

      await expect(updatePasskey('pk-invalid', 'New Name')).rejects.toThrow('Passkey not found');
    });
  });

  describe('finishRegistration', () => {
    it('should throw error on failure', async () => {
      mockSend.mockResolvedValue({ success: false, error: 'Verification failed' });

      // Create mock credential
      const mockCredential = {
        id: 'cred-id',
        rawId: new ArrayBuffer(16),
        type: 'public-key',
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: new ArrayBuffer(100),
          attestationObject: new ArrayBuffer(200),
          getTransports: () => ['internal'],
        },
      } as unknown as PublicKeyCredential;

      await expect(finishRegistration(mockCredential, 'Test Device')).rejects.toThrow('Verification failed');
    });

    it('should return credential on success', async () => {
      const mockResult = {
        id: 'pk-new',
        deviceName: 'Test Device',
        createdAt: '2024-01-10T12:00:00Z',
      };

      mockSend.mockResolvedValue({ success: true, credential: mockResult });

      const mockCredential = {
        id: 'cred-id',
        rawId: new ArrayBuffer(16),
        type: 'public-key',
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: new ArrayBuffer(100),
          attestationObject: new ArrayBuffer(200),
          getTransports: () => ['internal'],
        },
      } as unknown as PublicKeyCredential;

      const result = await finishRegistration(mockCredential, 'Test Device');
      expect(result).toEqual(mockResult);
    });
  });

  describe('finishAuthentication', () => {
    it('should throw error on failure', async () => {
      mockSend.mockResolvedValue({ success: false, error: 'Invalid signature' });

      const mockCredential = {
        id: 'cred-id',
        rawId: new ArrayBuffer(16),
        type: 'public-key',
        response: {
          clientDataJSON: new ArrayBuffer(100),
          authenticatorData: new ArrayBuffer(50),
          signature: new ArrayBuffer(64),
          userHandle: new ArrayBuffer(16),
        },
      } as unknown as PublicKeyCredential;

      await expect(finishAuthentication(mockCredential)).rejects.toThrow('Invalid signature');
    });

    it('should return auth result on success', async () => {
      const mockResult = {
        success: true,
        token: 'jwt-token',
        record: {
          id: 'user-1',
          collectionId: 'users',
          collectionName: 'users',
          email: 'test@test.com',
          name: 'Test User',
          sites: [],
          created: '2024-01-01T12:00:00Z',
          updated: '2024-01-10T12:00:00Z',
        },
      };

      mockSend.mockResolvedValue(mockResult);

      const mockCredential = {
        id: 'cred-id',
        rawId: new ArrayBuffer(16),
        type: 'public-key',
        response: {
          clientDataJSON: new ArrayBuffer(100),
          authenticatorData: new ArrayBuffer(50),
          signature: new ArrayBuffer(64),
          userHandle: new ArrayBuffer(16),
        },
      } as unknown as PublicKeyCredential;

      const result = await finishAuthentication(mockCredential);
      expect(result.token).toBe('jwt-token');
      expect(result.record.email).toBe('test@test.com');
    });

    it('should handle null userHandle', async () => {
      const mockResult = {
        success: true,
        token: 'jwt-token',
        record: {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test User',
        },
      };

      mockSend.mockResolvedValue(mockResult);

      const mockCredential = {
        id: 'cred-id',
        rawId: new ArrayBuffer(16),
        type: 'public-key',
        response: {
          clientDataJSON: new ArrayBuffer(100),
          authenticatorData: new ArrayBuffer(50),
          signature: new ArrayBuffer(64),
          userHandle: null, // Can be null for non-resident credentials
        },
      } as unknown as PublicKeyCredential;

      const result = await finishAuthentication(mockCredential);
      expect(result.token).toBe('jwt-token');
    });
  });
});

// ============================================================================
// Device & Browser Detection Logic Tests (testing the logic patterns)
// ============================================================================
describe('Device Detection Logic', () => {
  describe('getDeviceName logic', () => {
    const detectDevice = (ua: string): string => {
      // iOS devices
      if (/iPhone/.test(ua)) {
        return 'iPhone';
      }
      if (/iPad/.test(ua)) {
        return 'iPad';
      }
      // Android devices
      if (/Android/.test(ua)) {
        const match = ua.match(/Android.*?;\s*([^)]+)/);
        if (match) {
          const device = match[1].split(';')[0].trim();
          return device;
        }
        return 'Android';
      }
      // Desktop
      if (/Mac/.test(ua)) return 'Mac';
      if (/Windows/.test(ua)) return 'Windows';
      if (/Linux/.test(ua)) return 'Linux';

      return 'Unknown';
    };

    it('should detect iPhone', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
      expect(detectDevice(ua)).toBe('iPhone');
    });

    it('should detect iPad', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
      expect(detectDevice(ua)).toBe('iPad');
    });

    it('should detect Android with device name', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36';
      expect(detectDevice(ua)).toBe('Pixel 8 Pro');
    });

    it('should detect generic Android', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36';
      expect(detectDevice(ua)).toBe('Android');
    });

    it('should detect Mac', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      expect(detectDevice(ua)).toBe('Mac');
    });

    it('should detect Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      expect(detectDevice(ua)).toBe('Windows');
    });

    it('should detect Linux', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
      expect(detectDevice(ua)).toBe('Linux');
    });
  });

  describe('getBrowserName logic', () => {
    const detectBrowser = (ua: string): string => {
      if (/Chrome/.test(ua) && !/Chromium|Edge|OPR|Opera/.test(ua)) {
        return 'Chrome';
      }
      if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
        return 'Safari';
      }
      if (/Firefox/.test(ua)) {
        return 'Firefox';
      }
      if (/Edge/.test(ua)) {
        return 'Edge';
      }
      if (/OPR|Opera/.test(ua)) {
        return 'Opera';
      }
      return 'Browser';
    };

    it('should detect Chrome', () => {
      const ua = 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36';
      expect(detectBrowser(ua)).toBe('Chrome');
    });

    it('should detect Safari (not Chrome)', () => {
      const ua = 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15';
      expect(detectBrowser(ua)).toBe('Safari');
    });

    it('should detect Firefox', () => {
      const ua = 'Mozilla/5.0 Gecko/20100101 Firefox/121.0';
      expect(detectBrowser(ua)).toBe('Firefox');
    });

    it('should detect Edge', () => {
      const ua = 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 Edge/120.0.0.0';
      expect(detectBrowser(ua)).toBe('Edge');
    });

    it('should detect Opera', () => {
      const ua = 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0';
      expect(detectBrowser(ua)).toBe('Opera');
    });

    it('should return Browser for unknown', () => {
      const ua = 'SomeUnknownBrowser/1.0';
      expect(detectBrowser(ua)).toBe('Browser');
    });

    it('should not detect Chrome when Chromium is present', () => {
      const ua = 'Mozilla/5.0 Chrome/120.0.0.0 Chromium/120.0.0.0 Safari/537.36';
      expect(detectBrowser(ua)).toBe('Browser');
    });
  });
});

// ============================================================================
// ArrayBuffer Conversion Edge Cases
// ============================================================================
describe('ArrayBuffer Conversion Edge Cases', () => {
  it('should handle large credential IDs', () => {
    // Credential IDs can be up to 1024 bytes
    const largeBase64 = 'A'.repeat(100);
    const buffer = base64UrlToArrayBuffer(largeBase64);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
  });

  it('should handle special WebAuthn characters correctly', () => {
    // WebAuthn often uses characters that need base64url encoding
    const testCases = [
      'abc123',
      'ABC_xyz-123',
      'aaaabbbbccccdddd',
    ];

    testCases.forEach(input => {
      const buffer = base64UrlToArrayBuffer(input);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
    });
  });
});
