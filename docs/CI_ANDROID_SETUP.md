# CI/CD Android Build Configuration

This guide explains how to configure GitHub Actions to automatically build Android releases when you push version tags.

## Current CI/CD Status

### ✅ What's Automated

When you push a version tag (e.g., `v1.0.0`), the CI automatically builds:

1. **Desktop Apps** (`tauri-build.yml`)
   - macOS: `.dmg`, `.app`
   - Linux: `.AppImage`, `.deb`
   - Windows: `.msi`, `.exe`

2. **Android Apps** (`tauri-build.yml` - `build-android` job)
   - Universal APK (all architectures)
   - Universal AAB (for Google Play)
   - Individual APKs per architecture (arm64, armv7, x86_64, x86)

3. **Web/PWA** (`release.yml`)
   - Built web app
   - Docker images

### Workflow: tauri-build.yml

The `build-android` job does the following:
1. Sets up Node.js, Rust, Java JDK 17, and Android SDK
2. Installs all 4 Rust Android targets
3. Initializes Android project
4. Builds signed APK/AAB for all architectures
5. Uploads artifacts to GitHub release
6. Creates draft release

## Required GitHub Secrets

To enable Android builds in CI, you need to configure these secrets in your GitHub repository:

### 1. Android Signing Secrets

Navigate to: **Repository Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `ANDROID_KEYSTORE` | Base64-encoded keystore file | See below |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | Your keystore password |
| `ANDROID_KEY_ALIAS` | Key alias name | Your key alias |
| `ANDROID_KEY_PASSWORD` | Key password | Your key password |

### 2. Creating Android Keystore

If you don't have a keystore yet, create one:

```bash
# Generate keystore
keytool -genkey -v -keystore sitewise-release.keystore \
  -alias sitewise \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password (save this for ANDROID_KEYSTORE_PASSWORD)
# - Key password (save this for ANDROID_KEY_PASSWORD)
# - Your name, organization, etc.

# Convert keystore to base64 for GitHub secret
base64 sitewise-release.keystore > keystore.base64.txt

# Copy the contents of keystore.base64.txt to ANDROID_KEYSTORE secret
cat keystore.base64.txt
```

**⚠️ IMPORTANT:**
- Keep your keystore file safe - you cannot regenerate it
- Store backup copies in a secure location
- Never commit the keystore to git
- The same keystore must be used for all updates to the app

### 3. Setting Secrets in GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the 4 secrets:

```yaml
ANDROID_KEYSTORE: <base64-encoded-keystore-content>
ANDROID_KEYSTORE_PASSWORD: <your-keystore-password>
ANDROID_KEY_ALIAS: sitewise
ANDROID_KEY_PASSWORD: <your-key-password>
```

## How to Trigger Android Builds

### Automatic Build on Tag Push

1. **Create and push a tag:**
```bash
# Tag the current commit
git tag v1.0.0

# Push the tag to trigger CI
git push origin v1.0.0
```

2. **GitHub Actions automatically:**
   - Runs tests
   - Builds Android APK/AAB for all architectures
   - Builds desktop apps (macOS, Linux, Windows)
   - Builds web/PWA version
   - Creates a draft GitHub release
   - Attaches all build artifacts

3. **Review and publish:**
   - Go to GitHub Releases
   - Review the draft release
   - Edit release notes if needed
   - Publish the release

### Manual Trigger

The workflow also supports manual triggering:

1. Go to **Actions** tab in GitHub
2. Select **Build and Release Tauri Apps**
3. Click **Run workflow**
4. Select branch and run

## Workflow Architecture

### build-android Job

```yaml
build-android:
  - Setup: Node.js, Rust, Java 17, Android SDK
  - Install: All 4 Rust Android targets
  - Initialize: Android project structure
  - Build: Universal APK/AAB + individual APKs
  - Upload: Artifacts to GitHub release
  - Duration: ~15-20 minutes
```

### Supported Android Architectures

The CI builds for **all 4 architectures** automatically:

| Architecture | Binary | Devices | Build Output |
|--------------|--------|---------|--------------|
| arm64-v8a | aarch64-linux-android | Modern phones/tablets | ✅ Included |
| armeabi-v7a | armv7-linux-androideabi | Older devices | ✅ Included |
| x86_64 | x86_64-linux-android | Emulators/tablets | ✅ Included |
| x86 | i686-linux-android | Legacy emulators | ✅ Included |

**Default Output:**
- `sitewise-universal.apk` - All architectures in one APK
- `sitewise-universal.aab` - All architectures in one AAB (for Play Store)

**Optional Split Builds:**
To generate individual APKs per architecture, modify the workflow `args` line:
```yaml
args: --target android --split-per-abi
```

## Verifying CI Configuration

### 1. Check Workflow File

Ensure `.github/workflows/tauri-build.yml` includes the `build-android` job.

### 2. Check Secrets

Verify all 4 Android secrets are configured:
```bash
# In GitHub repo settings → Secrets → Actions
# You should see:
ANDROID_KEYSTORE
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

### 3. Test Build

Create a test tag to verify everything works:
```bash
git tag v0.0.1-test
git push origin v0.0.1-test
```

Monitor the Actions tab - the build should complete successfully.

## Troubleshooting

### Build Fails: "Android SDK not found"

**Issue:** Android SDK setup failed
**Solution:** The workflow uses `android-actions/setup-android@v3` which should handle this automatically. If it fails, check GitHub Actions logs for details.

### Build Fails: "Keystore not found"

**Issue:** Android signing secrets not configured
**Solution:**
1. Verify all 4 secrets are set in GitHub
2. Ensure `ANDROID_KEYSTORE` is properly base64-encoded
3. Check there are no extra spaces or newlines in secrets

### Build Fails: "Rust target not found"

**Issue:** Android Rust targets not installed
**Solution:** The workflow installs them automatically. If this fails, check:
```yaml
- name: Install Android Rust targets
  run: |
    rustup target add aarch64-linux-android
    rustup target add armv7-linux-androideabi
    rustup target add i686-linux-android
    rustup target add x86_64-linux-android
```

### Build Succeeds but No APK/AAB

**Issue:** Build completes but artifacts missing
**Solution:**
1. Check the "Upload Android artifacts" step succeeded
2. Verify the output paths exist: `src-tauri/gen/android/app/build/outputs/`
3. Look for errors in the Tauri build step

### Release is Draft

**Issue:** Release is created but not published
**Solution:** This is intentional! The workflow creates draft releases for review:
1. Go to GitHub Releases
2. Edit the draft
3. Review build artifacts
4. Publish when ready

## Release Process Checklist

- [ ] All tests passing locally
- [ ] Version bumped in `package.json` and `src-tauri/Cargo.toml`
- [ ] Changelog updated
- [ ] Keystore secrets configured in GitHub
- [ ] Create and push version tag
- [ ] Monitor GitHub Actions build
- [ ] Review draft release
- [ ] Test download and install APK
- [ ] Publish release
- [ ] Upload AAB to Google Play (if applicable)

## Build Artifacts

After a successful build, you'll get:

### Android (build-android job)
- `app-universal-release.apk` - Single APK with all architectures
- `app-universal-release.aab` - Android App Bundle for Play Store
- `app-arm64-v8a-release.apk` - arm64 only (if split builds enabled)
- `app-armeabi-v7a-release.apk` - armv7 only (if split builds enabled)
- `app-x86_64-release.apk` - x86_64 only (if split builds enabled)
- `app-x86-release.apk` - x86 only (if split builds enabled)

### Desktop (build-tauri job)
- macOS: `.dmg`, `.app`
- Linux: `.AppImage`, `.deb`
- Windows: `.msi`, `.exe`

### Web (build-web job)
- `dist/` - PWA build artifacts

## Google Play Distribution

To publish to Google Play:

1. **First-time setup:**
   - Create Google Play Console account
   - Create new app listing
   - Complete store listing information
   - Set up content rating, pricing, etc.

2. **Upload AAB:**
   - Download `app-universal-release.aab` from GitHub release
   - Go to Play Console → Production → Create new release
   - Upload the AAB file
   - Google Play automatically serves correct architecture to each device

3. **Automated uploads (optional):**
   - Set up Google Play service account
   - Add credentials to GitHub secrets
   - Modify workflow to use `fastlane` or Play Developer API

## Cost Optimization

### Reducing Build Time

Current Android build takes ~15-20 minutes. To optimize:

1. **Rust caching:** Already enabled via `swatinem/rust-cache@v2`
2. **Dependency caching:** Already enabled for npm
3. **Build only on tags:** Already configured (not on every push)

### Reducing Build Minutes Usage

- Builds only run on tag push (not PRs)
- Android build is separate job (can be disabled if needed)
- Uses Ubuntu runner (cheapest option)

To disable Android builds temporarily, comment out the `build-android` job in the workflow.

## Security Best Practices

✅ **Do:**
- Store keystore as base64-encoded GitHub secret
- Use separate keystore for production vs development
- Keep keystore backup in secure, offline location
- Rotate keystore passwords periodically
- Use GitHub's environment protection rules

❌ **Don't:**
- Commit keystore files to git
- Share keystore files via email/chat
- Use same keystore for multiple apps
- Store passwords in workflow file
- Push keystore to any cloud storage

## Next Steps

1. ✅ Generate Android keystore (if not exists)
2. ✅ Add secrets to GitHub repository settings
3. ✅ Create and push a test tag
4. ✅ Verify build completes successfully
5. ✅ Download and test APK on device
6. ✅ Publish release when ready
7. ⏭️ Set up Google Play listing (optional)
8. ⏭️ Configure automated Play Store uploads (optional)

## Resources

- [Tauri Android Code Signing](https://v2.tauri.app/distribute/sign/android/)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [Google Play Publishing](https://developer.android.com/studio/publish)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
