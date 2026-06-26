# Biometric Quick Unlock

Lets returning users sign in with Touch ID / Face ID / fingerprint / Windows
Hello instead of retyping their password. Available on the PWA today and on the
native app via Tauri's biometric plugin.

## How it works

This is a **local biometric gate in front of the existing PocketBase session**,
the same pattern native banking/finance apps use — it needs **no backend
changes**.

1. User signs in once with email + password (unchanged flow).
2. On the first interactive sign-in they're offered biometric unlock
   (`BiometricSetupModal`). Declining is remembered; they can enable it later
   from **Profile → Biometric unlock**.
3. On enable, after a successful biometric ceremony, the current PocketBase
   session token is **encrypted (AES-GCM) and stored on-device**.
4. On the next launch, the sign-in screen shows a one-tap **Unlock** panel
   (`BiometricUnlockPanel`). A successful biometric ceremony decrypts the token,
   restores it into `pb.authStore`, and revalidates it with `authRefresh()`.
   The freshly rotated token is re-encrypted back into the vault so it never
   silently expires between unlocks.

If the server **rejects** the restored token (401/403 — e.g. password changed),
the vault is wiped and the user falls back to password. Transient/offline
refresh errors keep the session (offline-first).

## Platform providers

`src/services/biometricAuth.ts` resolves the best provider for the runtime:

| Runtime | Provider | Mechanism |
| --- | --- | --- |
| Web / PWA / desktop webview | `webauthn` | WebAuthn platform authenticator, `userVerification: 'required'` |
| Tauri native (Android / iOS) | `tauri` | `@tauri-apps/plugin-biometric` (loaded via a guarded `@vite-ignore` dynamic import) |

## Files

- `src/services/biometricAuth.ts` — core service (providers, AES-GCM vault, enable/disable/unlock).
- `src/composables/useBiometricAuth.ts` — reactive wrapper + toast/i18n.
- `src/components/BiometricSetupModal.vue` — first sign-in prompt.
- `src/components/BiometricUnlockPanel.vue` — sign-in screen unlock affordance.
- `src/components/ToggleSwitch.vue` — reusable switch (used by the Profile toggle).
- Integrations: `LoginView.vue`, `ProfileView.vue`, `App.vue`.
- i18n: `biometric.*` keys in `src/locales/{en,hi}.json`.
- Tests: `src/test/services/biometricAuth.test.ts`, `src/test/composables/useBiometricAuth.test.ts`.

## Security model

The biometric is a **convenience gate**, not a server-verified second factor:

- The session token is encrypted at rest (AES-GCM) and wiped on disable / logout
  / rejected session — it is never stored in plaintext.
- The OS biometric prompt gates the unlock code path. The encryption key
  currently lives on-device alongside the vault, so the meaningful protection is
  the biometric ceremony — appropriate for a personal-device quick unlock.
- The stored token still expires server-side and is revalidated on unlock.
- **Future hardening:** bind the key to the WebAuthn PRF extension / platform
  keystore so it is never stored at all.

## Native (Tauri) verification note

The native wiring is **mobile-scoped** so desktop builds are unaffected:

- `Cargo.toml` — `tauri-plugin-biometric` under the `cfg(android|ios)` target table.
- `src-tauri/src/lib.rs` — `builder.plugin(tauri_plugin_biometric::init())` behind `#[cfg(mobile)]`.
- `src-tauri/capabilities/mobile.json` — `biometric:default` scoped to `["android","iOS"]`.
- `@tauri-apps/plugin-biometric` JS bindings in `package.json`.

The Android/iOS builds run only on release tags (`android-build.yml`,
`tauri-build.yml`), not on PR CI. This sandbox cannot compile a mobile target
(or desktop, which is missing GTK system libs), so **validate the native build
in the mobile CI / a local Android-toolchain environment** before release.
