/**
 * WebAuthn Verification Worker for Site-Wise
 *
 * This worker handles cryptographic verification of WebAuthn credentials.
 * It is stateless - all state management is done by PocketBase.
 *
 * Endpoints:
 * - POST /verify/registration - Verify registration attestation
 * - POST /verify/authentication - Verify authentication assertion
 * - GET /health - Health check
 */

import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

export interface Env {
  API_KEY: string;
  ALLOWED_ORIGINS: string;
  RP_ID: string;
  RP_NAME: string;
}

interface RegistrationRequest {
  response: RegistrationResponseJSON;
  expectedChallenge: string;
  expectedOrigin: string | string[];
  expectedRPID: string;
}

interface AuthenticationRequest {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  expectedOrigin: string | string[];
  expectedRPID: string;
  credential: {
    id: string;
    publicKey: string; // Base64URL encoded
    counter: number;
  };
}

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// CORS headers for responses
function corsHeaders(origin: string, allowedOrigins: string[]): HeadersInit {
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

// Verify API key from PocketBase
function verifyApiKey(request: Request, env: Env): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey === env.API_KEY;
}

// Parse allowed origins from environment
function parseAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
}

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Handle registration verification
async function handleRegistration(
  body: RegistrationRequest,
  env: Env
): Promise<ApiResponse<{
  verified: boolean;
  credentialId: string;
  publicKey: string;
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  aaguid: string;
}>> {
  try {
    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: body.expectedChallenge,
      expectedOrigin: body.expectedOrigin,
      expectedRPID: body.expectedRPID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return {
        success: false,
        error: 'Registration verification failed',
        code: 'VERIFICATION_FAILED',
      };
    }

    const { registrationInfo } = verification;

    // Convert public key to base64url for storage
    const publicKeyBase64 = btoa(
      String.fromCharCode(...registrationInfo.credential.publicKey)
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Convert credential ID to base64url
    const credentialIdBase64 = btoa(
      String.fromCharCode(...registrationInfo.credential.id)
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return {
      success: true,
      data: {
        verified: true,
        credentialId: credentialIdBase64,
        publicKey: publicKeyBase64,
        counter: registrationInfo.credential.counter,
        credentialDeviceType: registrationInfo.credentialDeviceType,
        credentialBackedUp: registrationInfo.credentialBackedUp,
        aaguid: registrationInfo.aaguid,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Registration verification error: ${message}`,
      code: 'VERIFICATION_ERROR',
    };
  }
}

// Handle authentication verification
async function handleAuthentication(
  body: AuthenticationRequest,
  env: Env
): Promise<ApiResponse<{
  verified: boolean;
  newCounter: number;
}>> {
  try {
    // Convert stored public key from base64url to Uint8Array
    const publicKeyBytes = base64UrlToUint8Array(body.credential.publicKey);

    const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: body.expectedChallenge,
      expectedOrigin: body.expectedOrigin,
      expectedRPID: body.expectedRPID,
      credential: {
        id: body.credential.id,
        publicKey: publicKeyBytes,
        counter: body.credential.counter,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return {
        success: false,
        error: 'Authentication verification failed',
        code: 'VERIFICATION_FAILED',
      };
    }

    return {
      success: true,
      data: {
        verified: true,
        newCounter: verification.authenticationInfo.newCounter,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (message.includes('counter')) {
      return {
        success: false,
        error: 'Authenticator counter did not increase - possible cloned credential',
        code: 'COUNTER_ERROR',
      };
    }

    return {
      success: false,
      error: `Authentication verification error: ${message}`,
      code: 'VERIFICATION_ERROR',
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = parseAllowedOrigins(env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, allowedOrigins),
      });
    }

    // Health check endpoint (no auth required)
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin, allowedOrigins),
        },
      });
    }

    // Verify API key for all other endpoints
    if (!verifyApiKey(request, env)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin, allowedOrigins),
          },
        }
      );
    }

    // Only allow POST for verification endpoints
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin, allowedOrigins),
          },
        }
      );
    }

    try {
      const body = await request.json();

      let result: ApiResponse<unknown>;

      switch (url.pathname) {
        case '/verify/registration':
          result = await handleRegistration(body as RegistrationRequest, env);
          break;

        case '/verify/authentication':
          result = await handleAuthentication(body as AuthenticationRequest, env);
          break;

        default:
          result = { success: false, error: 'Not found', code: 'NOT_FOUND' };
          return new Response(JSON.stringify(result), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders(origin, allowedOrigins),
            },
          });
      }

      const status = result.success ? 200 : 400;
      return new Response(JSON.stringify(result), {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin, allowedOrigins),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ success: false, error: `Invalid request: ${message}`, code: 'INVALID_REQUEST' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin, allowedOrigins),
          },
        }
      );
    }
  },
};
