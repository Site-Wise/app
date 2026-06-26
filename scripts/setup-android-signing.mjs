#!/usr/bin/env node
/**
 * Configure signing for the Tauri-generated Android project.
 *
 * The Android project under `src-tauri/gen/android` is generated fresh by
 * `tauri android init` (it is git-ignored), so signing must be injected after
 * init, on every build. This script implements the official Tauri Android
 * signing flow (https://v2.tauri.app/distribute/sign/android/) in an idempotent,
 * CI-friendly way.
 *
 * It supports two modes:
 *
 *   1. Release signing (Play Store ready) — used when ANDROID_KEYSTORE_BASE64
 *      (plus password/alias) is provided. The release APK/AAB is signed with the
 *      upload keystore.
 *
 *   2. Debug-signing fallback — used when no keystore is provided. The release
 *      build type is signed with Android's default debug key so the resulting
 *      APK is still INSTALLABLE for sideloading/testing.
 *
 *      This fallback is important: `tauri android build --apk` builds in release
 *      mode, and a release APK with NO signing config is left *unsigned*
 *      (`app-universal-release-unsigned.apk`). Android refuses to install an
 *      unsigned package with "App not installed" / "package appears to be
 *      invalid" — the most common cause of sideload failures. Debug-signing the
 *      release build guarantees an installable artifact even without secrets.
 *
 * Required environment variables (for release signing only):
 *   ANDROID_KEYSTORE_BASE64   - base64 of the .jks/.keystore file
 *   ANDROID_KEYSTORE_PASSWORD - keystore (store) password
 *   ANDROID_KEY_ALIAS         - key alias
 *   ANDROID_KEY_PASSWORD      - key password (defaults to keystore password)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ANDROID_DIR = resolve('src-tauri/gen/android')
const APP_DIR = resolve(ANDROID_DIR, 'app')
const GRADLE_FILE = resolve(APP_DIR, 'build.gradle.kts')

if (!existsSync(ANDROID_DIR)) {
  console.error(`[android-signing] ${ANDROID_DIR} not found. Run "tauri android init" first.`)
  process.exit(1)
}

const b64 = process.env.ANDROID_KEYSTORE_BASE64
const useReleaseKeystore = Boolean(b64)

// In release mode we materialise the upload keystore + keystore.properties and
// reference a dedicated "release" signing config. Without a keystore we attach
// the always-present default "debug" signing config so the release APK installs.
let signingConfigRef = 'signingConfigs.getByName("debug")'

if (useReleaseKeystore) {
  const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD || ''
  const keyAlias = process.env.ANDROID_KEY_ALIAS || ''
  const keyPassword = process.env.ANDROID_KEY_PASSWORD || storePassword

  if (!storePassword || !keyAlias) {
    console.error('[android-signing] ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_ALIAS are required when ANDROID_KEYSTORE_BASE64 is set.')
    process.exit(1)
  }

  // 1. Write the keystore file.
  if (!existsSync(APP_DIR)) mkdirSync(APP_DIR, { recursive: true })
  const keystorePath = resolve(APP_DIR, 'upload-keystore.jks')
  writeFileSync(keystorePath, Buffer.from(b64, 'base64'))
  console.log(`[android-signing] Wrote keystore to ${keystorePath}`)

  // 2. Write keystore.properties next to the gradle root.
  const propsPath = resolve(ANDROID_DIR, 'keystore.properties')
  const props = [
    `storePassword=${storePassword}`,
    `keyPassword=${keyPassword}`,
    `keyAlias=${keyAlias}`,
    // Relative to app/build.gradle.kts (rootProject.file uses the gradle root).
    `storeFile=${keystorePath}`,
    ''
  ].join('\n')
  writeFileSync(propsPath, props)
  console.log(`[android-signing] Wrote ${propsPath}`)

  signingConfigRef = 'signingConfigs.getByName("release")'
} else {
  console.log('[android-signing] ANDROID_KEYSTORE_BASE64 not set — signing the release build with the debug key so the APK is installable.')
}

// 3. Patch app/build.gradle.kts (idempotent via marker).
let gradle = readFileSync(GRADLE_FILE, 'utf8')
const MARKER = '// >>> tauri-android-signing'

if (gradle.includes(MARKER)) {
  console.log('[android-signing] build.gradle.kts already patched.')
  process.exit(0)
}

if (useReleaseKeystore) {
  // 3a. Imports + properties loading at the very top of the file.
  const header = `${MARKER}
import java.io.FileInputStream
import java.util.Properties

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}
// <<< tauri-android-signing

`
  gradle = header + gradle

  // 3b. Insert a signingConfigs block immediately after the `android {` opener.
  const androidOpen = gradle.match(/\nandroid\s*\{/)
  if (!androidOpen) {
    console.error('[android-signing] Could not find `android {` block in build.gradle.kts')
    process.exit(1)
  }
  const signingBlock = `
    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }
`
  const insertAt = androidOpen.index + androidOpen[0].length
  gradle = gradle.slice(0, insertAt) + signingBlock + gradle.slice(insertAt)
} else {
  // Debug-signing fallback: no new signingConfigs block is needed — Android's
  // default "debug" config always exists. Just drop a marker so this patch is
  // idempotent across repeated runs.
  gradle = `${MARKER} (debug-signing fallback)\n\n` + gradle
}

// 3c. Attach the chosen signingConfig to the release build type.
const releaseBlock = gradle.match(/getByName\("release"\)\s*\{/)
if (releaseBlock) {
  const at = releaseBlock.index + releaseBlock[0].length
  gradle = gradle.slice(0, at) +
    `\n            signingConfig = ${signingConfigRef}` +
    gradle.slice(at)
} else {
  console.warn('[android-signing] No getByName("release") build type found; release APK/AAB may stay unsigned.')
}

writeFileSync(GRADLE_FILE, gradle)
console.log(`[android-signing] Patched build.gradle.kts (release build signed with ${signingConfigRef}).`)
