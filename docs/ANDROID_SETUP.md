# Android Deployment Setup Guide

This guide provides step-by-step instructions for setting up Android deployment for SiteWise with multi-target CPU architecture support.

## Current Status

✅ **Completed:**
- Rust Android targets installed (all 4 architectures)
- Tauri configuration updated with Android settings
- Build system ready for multi-target compilation

⚠️ **Pending (Required for build):**
- Android SDK installation
- Java JDK 17+ installation
- Environment variables configuration
- Android project initialization

## Step 1: Install Java JDK

### Option A: Using Package Manager (Recommended)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install openjdk-17-jdk
```

**macOS:**
```bash
brew install openjdk@17
```

**Windows:**
Download from [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://adoptium.net/)

### Verify Installation
```bash
java -version
javac -version
```

### Set JAVA_HOME
**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin
```

**Windows:**
Set environment variable via System Properties > Environment Variables

## Step 2: Install Android SDK

### Option A: Android Studio (Full IDE)

1. Download from: https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio > Tools > SDK Manager
4. Install:
   - Android SDK Platform 24 or higher
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
   - Android SDK Platform-Tools

### Option B: Command Line Tools Only (Lighter)

1. Download from: https://developer.android.com/studio#command-line-tools-only
2. Extract to a directory (e.g., `~/Android/Sdk`)
3. Install required packages:
```bash
cd ~/Android/Sdk/cmdline-tools/latest/bin
./sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
```

### Set ANDROID_HOME
**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**Windows:**
```cmd
setx ANDROID_HOME "C:\Users\YourUsername\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools"
```

### Verify Installation
```bash
adb --version
```

## Step 3: Verify Rust Targets

Check installed targets:
```bash
rustup target list --installed | grep android
```

Expected output:
```
aarch64-linux-android
armv7-linux-androideabi
i686-linux-android
x86_64-linux-android
```

✅ These are already installed!

## Step 4: Initialize Android Project

Once Android SDK is set up:

```bash
npm run tauri android init
```

This will:
- Create `src-tauri/gen/android/` directory
- Generate AndroidManifest.xml
- Set up Gradle build files
- Configure project structure

## Step 5: Verify Configuration

### Check Tauri Configuration
File: `src-tauri/tauri.conf.json`

Should include:
```json
{
  "bundle": {
    "android": {
      "minSdkVersion": 24,
      "versionCode": 1
    }
  }
}
```
✅ Already configured!

### Check Gradle Configuration
File: `src-tauri/gen/android/app/build.gradle.kts` (after init)

Multi-target support is automatic - Tauri builds for all architectures by default.

## Step 6: Build and Test

### Development Mode
```bash
npm run tauri android dev
```

This will:
- Build the Rust library for connected device's architecture
- Install and run on device/emulator
- Enable hot reload

### Production Build (All Architectures)
```bash
npm run tauri android build
```

Output:
- **Universal AAB/APK** containing all architectures
- Located in: `src-tauri/gen/android/app/build/outputs/`

### Architecture-Specific Builds

**Individual APKs per architecture:**
```bash
npm run tauri android build -- --split-per-abi
```

Generates 4 separate APKs:
- `app-armeabi-v7a-release.apk` (32-bit ARM)
- `app-arm64-v8a-release.apk` (64-bit ARM)
- `app-x86-release.apk` (32-bit Intel)
- `app-x86_64-release.apk` (64-bit Intel)

**Single architecture (for testing):**
```bash
# For modern phones (primary target)
npm run tauri android build -- --target aarch64

# For older devices
npm run tauri android build -- --target armv7

# For emulators
npm run tauri android build -- --target x86_64
```

## Architecture Support Details

### Supported Architectures

| Target | ABI | Devices | Market Share | Priority |
|--------|-----|---------|--------------|----------|
| aarch64-linux-android | arm64-v8a | Modern phones/tablets | ~70% | **High** |
| armv7-linux-androideabi | armeabi-v7a | Older devices (2011+) | ~20% | Medium |
| x86_64-linux-android | x86_64 | Emulators, some tablets | ~5% | Low |
| i686-linux-android | x86 | Old emulators | ~5% | Low |

### Build Strategy Recommendations

**For Google Play (Recommended):**
- Use default build (universal AAB)
- Let Play Store handle device-specific downloads
- Users automatically get the right architecture

**For Direct Distribution:**
- Use `--split-per-abi` to create smaller files
- Provide architecture-specific downloads
- Include auto-detection on your website

**For Testing:**
- Use `--target` flag for specific devices
- Faster build times
- Easier debugging

## Troubleshooting

### Error: "ANDROID_HOME not set"
```bash
# Verify it's set
echo $ANDROID_HOME

# Should output: /path/to/Android/Sdk
# If not, add to ~/.bashrc or ~/.zshrc and reload shell
```

### Error: "Java not found"
```bash
# Verify Java installation
java -version
echo $JAVA_HOME

# If not set, configure JAVA_HOME (see Step 1)
```

### Error: "NDK not found"
Tauri handles NDK automatically. If you see this error:
```bash
# Install NDK via Android Studio SDK Manager
# Or via command line:
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "ndk;25.1.8937393"
```

### Error: "Rust target not found"
```bash
# Reinstall targets
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

### Build Failures
```bash
# Clean build
cd src-tauri/gen/android
./gradlew clean

# Rebuild
npm run tauri android build
```

## Testing on Devices

### Physical Device
1. Enable Developer Options on device
2. Enable USB Debugging
3. Connect via USB
4. Accept debugging prompt on device
5. Verify: `adb devices`
6. Run: `npm run tauri android dev`

### Emulator (Android Studio)
1. Open AVD Manager in Android Studio
2. Create virtual device (recommend Pixel with arm64)
3. Start emulator
4. Verify: `adb devices`
5. Run: `npm run tauri android dev`

## Distribution Checklist

- [ ] Android SDK installed and `ANDROID_HOME` set
- [ ] Java JDK 17+ installed and `JAVA_HOME` set
- [ ] Rust Android targets installed (✅ Done)
- [ ] Android project initialized (`tauri android init`)
- [ ] Tauri config updated (✅ Done)
- [ ] App tested on physical device
- [ ] App tested on emulator
- [ ] Production build successful (all architectures)
- [ ] Code signing configured (for release)
- [ ] Google Play listing created (if applicable)

## Next Steps

1. Complete Android SDK setup (see Steps 1-2)
2. Run `npm run tauri android init`
3. Test on device/emulator
4. Configure signing for release builds
5. Build and distribute!

## Resources

- [Tauri Android Prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri Android Development](https://v2.tauri.app/develop/)
- [Android Code Signing](https://v2.tauri.app/distribute/sign/android/)
- [Google Play Distribution](https://v2.tauri.app/distribute/google-play/)
- [Android Developer Documentation](https://developer.android.com/docs)
