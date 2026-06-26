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
 * It supports two modes, and BOTH sign with a STABLE key so an APK always
 * installs over a previously-installed SiteWise build:
 *
 *   1. Release signing (Play Store ready) — used when ANDROID_KEYSTORE_BASE64
 *      (plus password/alias) is provided. The release APK/AAB is signed with the
 *      upload keystore from CI secrets.
 *
 *   2. Stable sideload signing — used when no release keystore is provided. The
 *      release build is signed with the committed keystore at
 *      `src-tauri/keys/sideload.keystore`.
 *
 *      Why not the default debug key? Android's default debug keystore
 *      (`~/.android/debug.keystore`) is generated PER MACHINE, so every fresh
 *      CI runner (or developer laptop) signs with a DIFFERENT key. Installing a
 *      new APK over one signed with a different key fails with a signature
 *      conflict — Android reports "App not installed" / "app already installed"
 *      (INSTALL_FAILED_UPDATE_INCOMPATIBLE). Committing a single, fixed sideload
 *      keystore guarantees every build shares one signing identity.
 *
 *      NOTE: the sideload keystore is intentionally public and is NOT suitable
 *      as a Play Store upload key. Use Mode 1 (ANDROID_KEYSTORE_BASE64) for
 *      anything published to the Play Store.
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

// Committed, fixed sideload keystore (used when no release secret is provided).
const SIDELOAD_KEYSTORE = resolve('src-tauri/keys/sideload.keystore')
const SIDELOAD_STORE_PASSWORD = 'sitewise-sideload'
const SIDELOAD_KEY_ALIAS = 'sideload'
const SIDELOAD_KEY_PASSWORD = 'sitewise-sideload'

if (!existsSync(ANDROID_DIR)) {
  console.error(`[android-signing] ${ANDROID_DIR} not found. Run "tauri android init" first.`)
  process.exit(1)
}

const b64 = process.env.ANDROID_KEYSTORE_BASE64
const useReleaseKeystore = Boolean(b64)

// Resolve the keystore bytes + credentials for whichever mode we're in. Both
// modes produce a dedicated "release" signing config so the release build is
// always signed with a STABLE key (never the per-machine default debug key).
let keystoreBytes
let storePassword
let keyAlias
let keyPassword

if (useReleaseKeystore) {
  storePassword = process.env.ANDROID_KEYSTORE_PASSWORD || ''
  keyAlias = process.env.ANDROID_KEY_ALIAS || ''
  keyPassword = process.env.ANDROID_KEY_PASSWORD || storePassword

  if (!storePassword || !keyAlias) {
    console.error('[android-signing] ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_ALIAS are required when ANDROID_KEYSTORE_BASE64 is set.')
    process.exit(1)
  }

  keystoreBytes = Buffer.from(b64, 'base64')
  console.log('[android-signing] Using release keystore from ANDROID_KEYSTORE_BASE64.')
} else {
  if (!existsSync(SIDELOAD_KEYSTORE)) {
    console.error(`[android-signing] ${SIDELOAD_KEYSTORE} not found. The committed sideload keystore is required when no release keystore secret is set.`)
    process.exit(1)
  }
  keystoreBytes = readFileSync(SIDELOAD_KEYSTORE)
  storePassword = SIDELOAD_STORE_PASSWORD
  keyAlias = SIDELOAD_KEY_ALIAS
  keyPassword = SIDELOAD_KEY_PASSWORD
  console.log('[android-signing] ANDROID_KEYSTORE_BASE64 not set — signing with the committed stable sideload keystore (not the per-machine debug key).')
}

// 1. Materialise the keystore inside the app module.
if (!existsSync(APP_DIR)) mkdirSync(APP_DIR, { recursive: true })
const keystorePath = resolve(APP_DIR, 'upload-keystore.jks')
writeFileSync(keystorePath, keystoreBytes)
console.log(`[android-signing] Wrote keystore to ${keystorePath}`)

// 2. Write keystore.properties next to the gradle root.
const propsPath = resolve(ANDROID_DIR, 'keystore.properties')
const props = [
  `storePassword=${storePassword}`,
  `keyPassword=${keyPassword}`,
  `keyAlias=${keyAlias}`,
  `storeFile=${keystorePath}`,
  ''
].join('\n')
writeFileSync(propsPath, props)
console.log(`[android-signing] Wrote ${propsPath}`)

// 3. Patch app/build.gradle.kts (idempotent via marker).
let gradle = readFileSync(GRADLE_FILE, 'utf8')
const MARKER = '// >>> tauri-android-signing'

if (gradle.includes(MARKER)) {
  console.log('[android-signing] build.gradle.kts already patched.')
  process.exit(0)
}

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

// 3c. Attach the release signingConfig to the release build type.
const releaseBlock = gradle.match(/getByName\("release"\)\s*\{/)
if (releaseBlock) {
  const at = releaseBlock.index + releaseBlock[0].length
  gradle = gradle.slice(0, at) +
    `\n            signingConfig = signingConfigs.getByName("release")` +
    gradle.slice(at)
} else {
  console.warn('[android-signing] No getByName("release") build type found; release APK/AAB may stay unsigned.')
}

writeFileSync(GRADLE_FILE, gradle)
console.log('[android-signing] Patched build.gradle.kts (release build signed with a stable key).')
