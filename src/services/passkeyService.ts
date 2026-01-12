/**
 * Passkey Service
 * API client for WebAuthn/Passkey operations
 */

import { pb } from './pocketbase';

export interface PasskeyCredential {
  id: string;
  deviceName: string;
  deviceType: 'platform' | 'cross-platform';
  backedUp: boolean;
  lastUsed: string;
  createdAt: string;
  flagged: boolean;
}

export interface RegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    alg: number;
    type: 'public-key';
  }>;
  authenticatorSelection: {
    authenticatorAttachment: 'platform' | 'cross-platform';
    userVerification: 'required' | 'preferred' | 'discouraged';
    residentKey: 'required' | 'preferred' | 'discouraged';
    requireResidentKey: boolean;
  };
  timeout: number;
  attestation: 'none' | 'indirect' | 'direct';
  excludeCredentials: Array<{
    id: string;
    type: 'public-key';
    transports: string[];
  }>;
}

export interface AuthenticationOptions {
  challenge: string;
  rpId: string;
  userVerification: 'required' | 'preferred' | 'discouraged';
  timeout: number;
  allowCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports: string[];
  }>;
}

export interface AuthResult {
  success: boolean;
  token: string;
  record: {
    id: string;
    collectionId: string;
    collectionName: string;
    email: string;
    name: string;
    avatar?: string;
    sites: string[];
    created: string;
    updated: string;
  };
}

/**
 * Start passkey registration
 * Requires authentication
 */
export async function startRegistration(): Promise<RegistrationOptions> {
  const response = await pb.send('/api/passkey/register/start', {
    method: 'POST',
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to start registration');
  }

  return response.options;
}

/**
 * Complete passkey registration
 * @param credential - The credential from navigator.credentials.create()
 * @param deviceName - Optional friendly name for the device
 */
export async function finishRegistration(
  credential: PublicKeyCredential,
  deviceName?: string
): Promise<{ id: string; deviceName: string; createdAt: string }> {
  const attestationResponse = credential.response as AuthenticatorAttestationResponse;

  // Convert ArrayBuffers to base64url
  const response = {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    clientDataJSON: arrayBufferToBase64Url(attestationResponse.clientDataJSON),
    attestationObject: arrayBufferToBase64Url(attestationResponse.attestationObject),
    authenticatorAttachment: credential.authenticatorAttachment,
    transports: attestationResponse.getTransports?.() || ['internal'],
  };

  const result = await pb.send('/api/passkey/register/finish', {
    method: 'POST',
    body: {
      response,
      deviceName: deviceName || getDeviceName(),
    },
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to complete registration');
  }

  return result.credential;
}

/**
 * Start passkey authentication
 * @param email - Optional email for user-specific authentication
 */
export async function startAuthentication(email?: string): Promise<AuthenticationOptions> {
  const response = await pb.send('/api/passkey/authenticate/start', {
    method: 'POST',
    body: email ? { email } : {},
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to start authentication');
  }

  return response.options;
}

/**
 * Complete passkey authentication
 * @param credential - The credential from navigator.credentials.get()
 */
export async function finishAuthentication(credential: PublicKeyCredential): Promise<AuthResult> {
  const assertionResponse = credential.response as AuthenticatorAssertionResponse;

  // Convert ArrayBuffers to base64url
  const response = {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    clientDataJSON: arrayBufferToBase64Url(assertionResponse.clientDataJSON),
    authenticatorData: arrayBufferToBase64Url(assertionResponse.authenticatorData),
    signature: arrayBufferToBase64Url(assertionResponse.signature),
    userHandle: assertionResponse.userHandle
      ? arrayBufferToBase64Url(assertionResponse.userHandle)
      : null,
  };

  const result = await pb.send('/api/passkey/authenticate/finish', {
    method: 'POST',
    body: { response },
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to complete authentication');
  }

  return result;
}

/**
 * List user's passkeys
 * Requires authentication
 */
export async function listPasskeys(): Promise<PasskeyCredential[]> {
  const response = await pb.send('/api/passkey/list', {
    method: 'GET',
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to list passkeys');
  }

  return response.passkeys;
}

/**
 * Delete a passkey
 * @param id - Passkey ID to delete
 */
export async function deletePasskey(id: string): Promise<void> {
  const response = await pb.send(`/api/passkey/${id}`, {
    method: 'DELETE',
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to delete passkey');
  }
}

/**
 * Update a passkey (rename)
 * @param id - Passkey ID to update
 * @param deviceName - New device name
 */
export async function updatePasskey(id: string, deviceName: string): Promise<PasskeyCredential> {
  const response = await pb.send(`/api/passkey/${id}`, {
    method: 'PATCH',
    body: { deviceName },
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to update passkey');
  }

  return response.passkey;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert ArrayBuffer to base64url string
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convert base64url string to ArrayBuffer
 */
export function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Detect device name for friendly display
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;

  // iOS devices
  if (/iPhone/.test(ua)) {
    return `iPhone (${getBrowserName()})`;
  }
  if (/iPad/.test(ua)) {
    return `iPad (${getBrowserName()})`;
  }

  // Android devices
  if (/Android/.test(ua)) {
    const match = ua.match(/Android.*?;\s*([^)]+)/);
    if (match) {
      const device = match[1].split(';')[0].trim();
      return `${device} (${getBrowserName()})`;
    }
    return `Android (${getBrowserName()})`;
  }

  // macOS
  if (/Mac/.test(ua)) {
    return `Mac (${getBrowserName()})`;
  }

  // Windows
  if (/Windows/.test(ua)) {
    return `Windows (${getBrowserName()})`;
  }

  // Linux
  if (/Linux/.test(ua)) {
    return `Linux (${getBrowserName()})`;
  }

  return `${getBrowserName()} Device`;
}

/**
 * Get browser name
 */
function getBrowserName(): string {
  const ua = navigator.userAgent;

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
}

/**
 * Check if WebAuthn is supported
 */
export function isWebAuthnSupported(): boolean {
  return (
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Check if platform authenticator (device biometrics) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Check if conditional UI (autofill) is available
 */
export async function isConditionalUIAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    // @ts-ignore - Not all browsers support this yet
    return await PublicKeyCredential.isConditionalMediationAvailable?.() ?? false;
  } catch {
    return false;
  }
}
