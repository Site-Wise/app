import { isTauriRuntime } from '../composables/usePlatform';

/**
 * Native app attestation for auth requests.
 *
 * Cloudflare Turnstile cannot render inside a native Tauri webview
 * (desktop / Android / iOS), so the web bot-protection widget is unavailable
 * there. Instead, native builds prove they are a genuine SiteWise app by
 * signing each auth request with an HMAC derived from a build-time shared
 * secret (`VITE_APP_ATTEST_SECRET`) plus a fresh timestamp.
 *
 * The PocketBase auth hooks verify this token with the matching server-side
 * secret (`APP_ATTEST_SECRET`) and reject anything older than a short window,
 * which blocks naive API scripting/replay. The web continues to use Turnstile.
 *
 * Token format: `v1.<purpose>.<timestampMs>.<hexHmacSha256>`
 * where the signed message is `<purpose>.<timestampMs>`.
 */

const APP_ATTEST_SECRET = import.meta.env.VITE_APP_ATTEST_SECRET as string | undefined;

export type AttestationPurpose = 'login' | 'register';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a signed attestation token for a native (Tauri) auth request.
 * Returns `undefined` on the web (where Turnstile is used instead) or when the
 * runtime cannot produce a token, so callers can pass the result straight
 * through without branching.
 */
export async function generateAppToken(
  purpose: AttestationPurpose
): Promise<string | undefined> {
  // Web builds rely on Turnstile, not app attestation.
  if (!isTauriRuntime()) return undefined;

  if (!APP_ATTEST_SECRET) {
    console.warn(
      '[app-attestation] VITE_APP_ATTEST_SECRET is not set for this build; ' +
        'native authentication will be rejected by the server.'
    );
    return undefined;
  }

  if (!globalThis.crypto?.subtle) {
    console.warn('[app-attestation] Web Crypto API is unavailable; cannot sign auth request.');
    return undefined;
  }

  const timestamp = Date.now().toString();
  const message = `${purpose}.${timestamp}`;
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(APP_ATTEST_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));

  return `v1.${purpose}.${timestamp}.${toHex(signature)}`;
}
