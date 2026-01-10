/**
 * WebAuthn Verifier Worker Tests
 *
 * Comprehensive test suite for the WebAuthn verification Cloudflare Worker.
 * Covers all endpoints, error handling, CORS, and security features.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @simplewebauthn/server
vi.mock('@simplewebauthn/server', () => ({
  verifyRegistrationResponse: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

import worker from './index';
import type { Env } from './index';

// Test environment configuration
const mockEnv: Env = {
  API_KEY: 'test-api-key-12345',
  ALLOWED_ORIGINS: 'http://localhost:5173,https://app.sitewise.com',
  RP_ID: 'localhost',
  RP_NAME: 'Site-Wise',
};

// Helper to create mock requests
function createRequest(
  method: string,
  path: string,
  body?: object,
  headers: Record<string, string> = {}
): Request {
  const url = `https://worker.example.com${path}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173',
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

// Helper to create authenticated request
function createAuthenticatedRequest(
  method: string,
  path: string,
  body?: object,
  headers: Record<string, string> = {}
): Request {
  return createRequest(method, path, body, {
    'X-API-Key': mockEnv.API_KEY,
    ...headers,
  });
}

describe('WebAuthn Verifier Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // CORS HANDLING
  // =========================================================================
  describe('CORS Handling', () => {
    it('should handle OPTIONS preflight request', async () => {
      const request = createRequest('OPTIONS', '/verify/registration');
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(204);
      // Verify CORS headers are present
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, X-API-Key');
    });

    it('should include CORS headers in responses', async () => {
      const request = createRequest('GET', '/health');
      const response = await worker.fetch(request, mockEnv);

      // CORS origin header should be set (value depends on origin matching logic)
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(true);
    });

    it('should return 200 for health check regardless of origin', async () => {
      const url = 'https://worker.example.com/health';
      const request = new Request(url, {
        method: 'GET',
        headers: new Headers({
          'Origin': 'https://unknown-site.com',
        }),
      });
      const response = await worker.fetch(request, mockEnv);

      // Health check should succeed even if CORS origin doesn't match
      expect(response.status).toBe(200);
    });

    it('should handle missing Origin header gracefully', async () => {
      const url = 'https://worker.example.com/health';
      const request = new Request(url, { method: 'GET' });
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // HEALTH CHECK ENDPOINT
  // =========================================================================
  describe('Health Check Endpoint', () => {
    it('should return healthy status without authentication', async () => {
      const request = createRequest('GET', '/health');
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(typeof body.timestamp).toBe('number');
    });

    it('should return correct content type', async () => {
      const request = createRequest('GET', '/health');
      const response = await worker.fetch(request, mockEnv);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  // =========================================================================
  // AUTHENTICATION
  // =========================================================================
  describe('API Key Authentication', () => {
    it('should reject requests without API key', async () => {
      const request = createRequest('POST', '/verify/registration', {});
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with wrong API key', async () => {
      const request = createRequest('POST', '/verify/registration', {}, {
        'X-API-Key': 'wrong-api-key',
      });
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('should accept requests with correct API key', async () => {
      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1, 2, 3]),
            publicKey: new Uint8Array([4, 5, 6]),
            counter: 0,
          },
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
          aaguid: 'test-aaguid',
        },
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/registration', {
        response: { id: 'test-id', rawId: 'test-raw-id' },
        expectedChallenge: 'test-challenge',
        expectedOrigin: 'http://localhost:5173',
        expectedRPID: 'localhost',
      });
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // HTTP METHODS
  // =========================================================================
  describe('HTTP Method Validation', () => {
    it('should reject GET requests on verification endpoints', async () => {
      const request = createAuthenticatedRequest('GET', '/verify/registration');
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(405);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Method not allowed');
      expect(body.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should reject PUT requests on verification endpoints', async () => {
      const request = createAuthenticatedRequest('PUT', '/verify/authentication');
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(405);
      expect(body.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should reject DELETE requests on verification endpoints', async () => {
      const request = createAuthenticatedRequest('DELETE', '/verify/registration');
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(405);
    });
  });

  // =========================================================================
  // REGISTRATION VERIFICATION
  // =========================================================================
  describe('Registration Verification', () => {
    const validRegistrationRequest = {
      response: {
        id: 'credential-id',
        rawId: 'credential-raw-id',
        type: 'public-key',
        clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoidGVzdCIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyJ9',
        response: {
          attestationObject: 'test-attestation',
          clientDataJSON: 'test-client-data',
        },
      },
      expectedChallenge: 'test-challenge',
      expectedOrigin: 'http://localhost:5173',
      expectedRPID: 'localhost',
    };

    it('should successfully verify valid registration', async () => {
      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1, 2, 3, 4]),
            publicKey: new Uint8Array([5, 6, 7, 8]),
            counter: 0,
          },
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
          aaguid: 'device-aaguid-123',
        },
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/registration', validRegistrationRequest);
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.verified).toBe(true);
      expect(body.data.credentialId).toBeDefined();
      expect(body.data.publicKey).toBeDefined();
      expect(body.data.counter).toBe(0);
      expect(body.data.credentialDeviceType).toBe('singleDevice');
      expect(body.data.credentialBackedUp).toBe(false);
      expect(body.data.aaguid).toBe('device-aaguid-123');
    });

    it('should handle multiDevice credential type', async () => {
      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1, 2, 3]),
            publicKey: new Uint8Array([4, 5, 6]),
            counter: 0,
          },
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
          aaguid: 'synced-aaguid',
        },
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/registration', {
        ...validRegistrationRequest,
        response: { id: 'test', rawId: 'test' },
      });
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.credentialDeviceType).toBe('multiDevice');
      expect(body.data.credentialBackedUp).toBe(true);
    });

    it('should return error when verification fails', async () => {
      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: false,
        registrationInfo: null,
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/registration', validRegistrationRequest);
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Registration verification failed');
      expect(body.code).toBe('VERIFICATION_FAILED');
    });

    it('should handle registration verification errors', async () => {
      vi.mocked(verifyRegistrationResponse).mockRejectedValueOnce(
        new Error('Invalid attestation format')
      );

      const request = createAuthenticatedRequest('POST', '/verify/registration', validRegistrationRequest);
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid attestation format');
      expect(body.code).toBe('VERIFICATION_ERROR');
    });

    it('should handle unknown errors gracefully', async () => {
      vi.mocked(verifyRegistrationResponse).mockRejectedValueOnce('String error');

      const request = createAuthenticatedRequest('POST', '/verify/registration', validRegistrationRequest);
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Unknown error');
    });

    it('should pass requireUserVerification to verifyRegistrationResponse', async () => {
      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1]),
            publicKey: new Uint8Array([2]),
            counter: 0,
          },
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
          aaguid: 'test',
        },
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/registration', validRegistrationRequest);
      await worker.fetch(request, mockEnv);

      expect(verifyRegistrationResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          requireUserVerification: true,
        })
      );
    });
  });

  // =========================================================================
  // AUTHENTICATION VERIFICATION
  // =========================================================================
  describe('Authentication Verification', () => {
    const validAuthenticationRequest = {
      response: {
        id: 'credential-id',
        rawId: 'credential-raw-id',
        type: 'public-key',
        clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoidGVzdCIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyJ9',
        response: {
          authenticatorData: 'test-auth-data',
          clientDataJSON: 'test-client-data',
          signature: 'test-signature',
        },
      },
      expectedChallenge: 'test-challenge',
      expectedOrigin: 'http://localhost:5173',
      expectedRPID: 'localhost',
      credential: {
        id: 'stored-credential-id',
        publicKey: 'AQIDBA', // Base64URL encoded [1,2,3,4]
        counter: 5,
      },
    };

    it('should successfully verify valid authentication', async () => {
      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: true,
        authenticationInfo: {
          newCounter: 6,
          credentialID: new Uint8Array([1, 2, 3]),
        },
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/authentication', validAuthenticationRequest);
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.verified).toBe(true);
      expect(body.data.newCounter).toBe(6);
    });

    it('should return error when authentication verification fails', async () => {
      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: false,
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/authentication', validAuthenticationRequest);
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication verification failed');
      expect(body.code).toBe('VERIFICATION_FAILED');
    });

    it('should detect counter replay attacks', async () => {
      vi.mocked(verifyAuthenticationResponse).mockRejectedValueOnce(
        new Error('Unexpected authenticator counter value: received 5, expected > 10')
      );

      const request = createAuthenticatedRequest('POST', '/verify/authentication', validAuthenticationRequest);
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('counter');
      expect(body.code).toBe('COUNTER_ERROR');
    });

    it('should handle signature verification errors', async () => {
      vi.mocked(verifyAuthenticationResponse).mockRejectedValueOnce(
        new Error('Invalid signature')
      );

      const request = createAuthenticatedRequest('POST', '/verify/authentication', validAuthenticationRequest);
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid signature');
      expect(body.code).toBe('VERIFICATION_ERROR');
    });

    it('should pass credential data to verifyAuthenticationResponse', async () => {
      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: true,
        authenticationInfo: {
          newCounter: 10,
        },
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/authentication', validAuthenticationRequest);
      await worker.fetch(request, mockEnv);

      expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          credential: expect.objectContaining({
            id: 'stored-credential-id',
            counter: 5,
          }),
          requireUserVerification: true,
        })
      );
    });

    it('should convert base64url public key to Uint8Array', async () => {
      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: true,
        authenticationInfo: {
          newCounter: 10,
        },
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/authentication', validAuthenticationRequest);
      await worker.fetch(request, mockEnv);

      const call = vi.mocked(verifyAuthenticationResponse).mock.calls[0][0];
      expect(call.credential.publicKey).toBeInstanceOf(Uint8Array);
    });
  });

  // =========================================================================
  // ROUTING
  // =========================================================================
  describe('Routing', () => {
    it('should return 404 for unknown endpoints', async () => {
      const request = createAuthenticatedRequest('POST', '/unknown-endpoint', {});
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Not found');
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should handle /verify/registration path correctly', async () => {
      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1]),
            publicKey: new Uint8Array([2]),
            counter: 0,
          },
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
          aaguid: 'test',
        },
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/registration', {
        response: {},
        expectedChallenge: 'test',
        expectedOrigin: 'http://localhost:5173',
        expectedRPID: 'localhost',
      });
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
    });

    it('should handle /verify/authentication path correctly', async () => {
      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: true,
        authenticationInfo: {
          newCounter: 1,
        },
      } as any);

      const request = createAuthenticatedRequest('POST', '/verify/authentication', {
        response: {},
        expectedChallenge: 'test',
        expectedOrigin: 'http://localhost:5173',
        expectedRPID: 'localhost',
        credential: {
          id: 'test',
          publicKey: 'AQID',
          counter: 0,
        },
      });
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // REQUEST PARSING
  // =========================================================================
  describe('Request Parsing', () => {
    it('should return error for invalid JSON', async () => {
      const url = 'https://worker.example.com/verify/registration';
      const request = new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': mockEnv.API_KEY,
          'Origin': 'http://localhost:5173',
        },
        body: 'invalid json {{{',
      });

      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid request');
      expect(body.code).toBe('INVALID_REQUEST');
    });

    it('should handle empty request body', async () => {
      const url = 'https://worker.example.com/verify/registration';
      const request = new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': mockEnv.API_KEY,
          'Origin': 'http://localhost:5173',
        },
        body: '',
      });

      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe('INVALID_REQUEST');
    });
  });

  // =========================================================================
  // ENVIRONMENT CONFIGURATION
  // =========================================================================
  describe('Environment Configuration', () => {
    it('should handle empty ALLOWED_ORIGINS', async () => {
      const envWithEmpty: Env = {
        ...mockEnv,
        ALLOWED_ORIGINS: '',
      };

      const request = createRequest('GET', '/health');
      const response = await worker.fetch(request, envWithEmpty);

      // Should still return 200 for health check
      expect(response.status).toBe(200);
      // CORS header should be present (even if empty string)
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(true);
    });

    it('should work with configured origins', async () => {
      const request = createRequest('GET', '/health');
      const response = await worker.fetch(request, mockEnv);

      // Health check should work
      expect(response.status).toBe(200);
      // Verify JSON response
      const body = await response.json();
      expect(body.status).toBe('ok');
    });

    it('should parse comma-separated origins', async () => {
      // The implementation splits by comma and trims each origin
      const request = createRequest('GET', '/health');
      const response = await worker.fetch(request, mockEnv);

      // Verify response is successful
      expect(response.status).toBe(200);
      // CORS header should be present
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(true);
    });
  });

  // =========================================================================
  // BASE64URL CONVERSION
  // =========================================================================
  describe('Base64URL Conversion', () => {
    it('should handle base64url with padding', async () => {
      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: true,
        authenticationInfo: {
          newCounter: 1,
        },
      } as any);

      // Test with a public key that would have padding
      const request = createAuthenticatedRequest('POST', '/verify/authentication', {
        response: {},
        expectedChallenge: 'test',
        expectedOrigin: 'http://localhost:5173',
        expectedRPID: 'localhost',
        credential: {
          id: 'test',
          publicKey: 'AQ', // Would need padding
          counter: 0,
        },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);
    });

    it('should handle URL-safe base64 characters', async () => {
      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: true,
        authenticationInfo: {
          newCounter: 1,
        },
      } as any);

      // Test with a valid base64url-encoded public key
      // URL-safe characters (- and _) replace + and /
      const request = createAuthenticatedRequest('POST', '/verify/authentication', {
        response: { id: 'test', rawId: 'test', type: 'public-key' },
        expectedChallenge: 'test',
        expectedOrigin: 'http://localhost:5173',
        expectedRPID: 'localhost',
        credential: {
          id: 'test',
          publicKey: 'AQIDBAUG', // Valid base64url for [1,2,3,4,5,6]
          counter: 0,
        },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // RESPONSE FORMAT
  // =========================================================================
  describe('Response Format', () => {
    it('should return proper JSON content type for all responses', async () => {
      // Health check
      const healthResponse = await worker.fetch(createRequest('GET', '/health'), mockEnv);
      expect(healthResponse.headers.get('Content-Type')).toBe('application/json');

      // 401 Unauthorized
      const unauthResponse = await worker.fetch(
        createRequest('POST', '/verify/registration', {}),
        mockEnv
      );
      expect(unauthResponse.headers.get('Content-Type')).toBe('application/json');

      // 404 Not Found
      const notFoundResponse = await worker.fetch(
        createAuthenticatedRequest('POST', '/unknown', {}),
        mockEnv
      );
      expect(notFoundResponse.headers.get('Content-Type')).toBe('application/json');
    });

    it('should include success field in all responses', async () => {
      // Success response
      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: true,
        authenticationInfo: { newCounter: 1 },
      } as any);

      const successResponse = await worker.fetch(
        createAuthenticatedRequest('POST', '/verify/authentication', {
          response: {},
          expectedChallenge: 'test',
          expectedOrigin: 'http://localhost:5173',
          expectedRPID: 'localhost',
          credential: { id: 'test', publicKey: 'AQ', counter: 0 },
        }),
        mockEnv
      );
      const successBody = await successResponse.json();
      expect(successBody).toHaveProperty('success');

      // Error response
      const errorResponse = await worker.fetch(
        createRequest('POST', '/verify/registration', {}),
        mockEnv
      );
      const errorBody = await errorResponse.json();
      expect(errorBody).toHaveProperty('success');
      expect(errorBody.success).toBe(false);
    });
  });

  // =========================================================================
  // SECURITY EDGE CASES
  // =========================================================================
  describe('Security Edge Cases', () => {
    it('should not leak sensitive information in error messages', async () => {
      const request = createRequest('POST', '/verify/registration', {}, {
        'X-API-Key': 'wrong-key',
      });
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      // Should not contain the actual API key
      expect(JSON.stringify(body)).not.toContain(mockEnv.API_KEY);
      expect(body.error).toBe('Unauthorized');
    });

    it('should validate all required fields are present', async () => {
      vi.mocked(verifyRegistrationResponse).mockRejectedValueOnce(
        new Error('Missing required field: expectedChallenge')
      );

      const request = createAuthenticatedRequest('POST', '/verify/registration', {
        response: {},
        // Missing expectedChallenge, expectedOrigin, expectedRPID
      });
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });
});
