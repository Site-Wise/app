# Building SiteWise — Android & Desktop (Tauri v2)

SiteWise ships from a single Vue 3 frontend as:

- a **web app / PWA** (`npm run build`)
- **native desktop apps** for Windows / macOS / Linux (Tauri)
- **native Android** (Tauri v2 mobile) — and iOS, with the same setup

This document covers the native (Tauri) builds. The web/PWA build is unchanged.

---

## How the project is wired for native builds

Tauri v2 mobile requires the Rust app to expose a **library entry point** that
both desktop and mobile share. The key pieces:

| File | Role |
| --- | --- |
| `src-tauri/src/lib.rs` | Shared `run()` entry point. Annotated with `#[cfg_attr(mobile, tauri::mobile_entry_point)]` so mobile runtimes can call it. Desktop-only code (system tray, window-hide-on-close) is gated behind `#[cfg(desktop)]`. |
| `src-tauri/src/main.rs` | Thin desktop binary that just calls `sitewise_lib::run()`. |
| `src-tauri/Cargo.toml` | Declares the `[lib]` target (`crate-type = ["staticlib", "cdylib", "rlib"]`). The `tray-icon` feature is **desktop-only** (added via a `cfg(not(android/ios))` target table) because it does not compile for mobile. |
| `src-tauri/tauri.conf.json` | `bundle.android.minSdkVersion = 24`. |
| `vite.config.ts` | Binds the dev server to `TAURI_DEV_HOST` and configures HMR for mobile dev; aliases `virtual:pwa-register/vue` to a no-op stub for native builds (no service worker on native). |

> ⚠️ **Do not add `tray-icon` to the base `tauri` dependency** in `Cargo.toml`.
> It must stay in the desktop-only target table, or Android/iOS builds will fail.

The generated native projects live in `src-tauri/gen/` (`gen/android`,
`gen/apple`). **They are git-ignored and regenerated on every machine / CI run**
via `tauri android init` — do not commit them.

---

## Desktop builds (Windows / macOS / Linux)

### Local

```bash
npm install
npm run dev:tauri      # dev mode with hot reload
npm run build:tauri    # produce a distributable bundle in src-tauri/target/release/bundle
```

Linux build prerequisites (Debian/Ubuntu):

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
  libappindicator3-dev librsvg2-dev patchelf
```

macOS needs Xcode command-line tools; Windows needs the MSVC build tools +
WebView2 (preinstalled on Windows 11).

### CI

`.github/workflows/tauri-build.yml` builds all three desktop platforms (macOS
arm64 + x86_64, Linux, Windows) on tag pushes (`v*`) or manual dispatch and
attaches the bundles to a draft GitHub Release.

---

## Android builds

### Prerequisites (local)

1. **Java 17** (Temurin recommended).
2. **Android SDK** with: `platform-tools`, `platforms;android-34`,
   `build-tools;34.0.0`.
3. **Android NDK** (e.g. `ndk;26.1.10909125`).
4. Environment:
   ```bash
   export ANDROID_HOME="$HOME/Android/Sdk"
   export NDK_HOME="$ANDROID_HOME/ndk/26.1.10909125"
   ```
5. **Rust Android targets**:
   ```bash
   rustup target add aarch64-linux-android armv7-linux-androideabi \
     i686-linux-android x86_64-linux-android
   ```

### Build

```bash
npm install
npm run android:init        # generates src-tauri/gen/android (one-time per checkout)
npm run dev:android         # run on a connected device / emulator
npm run build:android:apk   # build a universal APK
npm run build:android:aab   # build an AAB for the Play Store
```

Artifacts land under
`src-tauri/gen/android/app/build/outputs/{apk,bundle}/...`.

### CI

`.github/workflows/android-build.yml` installs the SDK + NDK + Rust targets,
runs `tauri android init`, optionally configures signing, and builds the APK/AAB
on tag pushes (`v*`) or manual dispatch (choose `apk` / `aab` / `both`). Outputs
are uploaded as workflow artifacts and attached to a draft Release on tags.

---

## Release signing (Android)

Signing is **optional** for CI to run, but **required** to publish to the Play
Store. The flow follows the official Tauri guide and is scripted in
`scripts/setup-android-signing.mjs` (idempotent; runs after `android:init`).

### 1. Generate an upload keystore (once)

```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

### 2. Add GitHub repository secrets

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 upload-keystore.jks` output |
| `ANDROID_KEYSTORE_PASSWORD` | keystore (store) password |
| `ANDROID_KEY_ALIAS` | key alias (e.g. `upload`) |
| `ANDROID_KEY_PASSWORD` | key password (defaults to store password) |

When `ANDROID_KEYSTORE_BASE64` is present the CI release artifacts are signed;
otherwise an unsigned/debug build is produced so the pipeline still completes.

### Local signing

```bash
export ANDROID_KEYSTORE_BASE64=$(base64 -w0 upload-keystore.jks)
export ANDROID_KEYSTORE_PASSWORD=...
export ANDROID_KEY_ALIAS=upload
export ANDROID_KEY_PASSWORD=...
npm run android:init
node scripts/setup-android-signing.mjs
npm run build:android:aab
```

---

## Runtime note: backend URL on device

On native builds the frontend is served from the app bundle, so
`VITE_POCKETBASE_URL` **must point at a reachable, public PocketBase URL**
(e.g. `https://api.sitewise.in`) at build time — `localhost`/`127.0.0.1` will
not resolve from a phone or emulator. Set it in the build environment before
`npm run build:android:*`.
