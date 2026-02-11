#!/bin/bash

# Android Setup Verification Script
# Checks if all prerequisites for Android development are met

echo "🔍 SiteWise Android Setup Verification"
echo "======================================"
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# 1. Check Java JDK
echo "1. Checking Java JDK..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
    if [ "$JAVA_VERSION" -ge 17 ]; then
        check_pass "Java JDK $JAVA_VERSION installed"

        if [ -n "$JAVA_HOME" ]; then
            check_pass "JAVA_HOME is set: $JAVA_HOME"
        else
            check_warn "JAVA_HOME not set. Set it to avoid issues."
        fi
    else
        check_fail "Java version is $JAVA_VERSION. Need 17 or higher."
    fi
else
    check_fail "Java not found. Install JDK 17 or higher."
fi
echo ""

# 2. Check Android SDK
echo "2. Checking Android SDK..."
if [ -n "$ANDROID_HOME" ]; then
    check_pass "ANDROID_HOME is set: $ANDROID_HOME"

    if [ -d "$ANDROID_HOME" ]; then
        check_pass "Android SDK directory exists"

        # Check for essential tools
        if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
            ADB_VERSION=$($ANDROID_HOME/platform-tools/adb version 2>&1 | head -1)
            check_pass "ADB found: $ADB_VERSION"
        else
            check_warn "ADB not found in platform-tools"
        fi

        # Check for SDK platforms
        if [ -d "$ANDROID_HOME/platforms" ]; then
            PLATFORMS=$(ls "$ANDROID_HOME/platforms" 2>/dev/null | wc -l)
            if [ "$PLATFORMS" -gt 0 ]; then
                check_pass "Android platforms installed: $PLATFORMS"
            else
                check_warn "No Android platforms installed"
            fi
        else
            check_warn "No platforms directory found"
        fi
    else
        check_fail "ANDROID_HOME directory does not exist: $ANDROID_HOME"
    fi
else
    check_fail "ANDROID_HOME not set. Install Android SDK."
fi
echo ""

# 3. Check Rust and targets
echo "3. Checking Rust setup..."
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    check_pass "Rust installed: $RUST_VERSION"

    # Check Android targets
    TARGETS=(
        "aarch64-linux-android"
        "armv7-linux-androideabi"
        "i686-linux-android"
        "x86_64-linux-android"
    )

    ALL_TARGETS_INSTALLED=true
    for target in "${TARGETS[@]}"; do
        if rustup target list --installed | grep -q "$target"; then
            check_pass "Rust target installed: $target"
        else
            check_fail "Rust target missing: $target"
            ALL_TARGETS_INSTALLED=false
        fi
    done

    if [ "$ALL_TARGETS_INSTALLED" = false ]; then
        echo ""
        echo "  To install missing targets, run:"
        echo "  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android"
    fi
else
    check_fail "Rust not found. Install from https://rustup.rs/"
fi
echo ""

# 4. Check Tauri CLI
echo "4. Checking Tauri CLI..."
if grep -q '"@tauri-apps/cli"' package.json 2>/dev/null; then
    TAURI_VERSION=$(npx @tauri-apps/cli --version 2>&1 | grep "tauri-cli" | awk '{print $2}')
    check_pass "Tauri CLI available: $TAURI_VERSION"
else
    check_fail "Tauri CLI not found in package.json"
fi
echo ""

# 5. Check Android project initialization
echo "5. Checking Android project..."
if [ -d "src-tauri/gen/android" ]; then
    check_pass "Android project initialized"

    if [ -f "src-tauri/gen/android/app/build.gradle.kts" ]; then
        check_pass "Gradle build configuration exists"
    else
        check_warn "Gradle configuration not found"
    fi

    if [ -f "src-tauri/gen/android/app/src/main/AndroidManifest.xml" ]; then
        check_pass "AndroidManifest.xml exists"
    else
        check_warn "AndroidManifest.xml not found"
    fi
else
    check_warn "Android project not initialized yet. Run: npm run tauri android init"
fi
echo ""

# 6. Check tauri.conf.json
echo "6. Checking Tauri configuration..."
if [ -f "src-tauri/tauri.conf.json" ]; then
    if grep -q '"android"' src-tauri/tauri.conf.json; then
        check_pass "Android configuration found in tauri.conf.json"
    else
        check_warn "Android configuration not found in tauri.conf.json"
    fi
else
    check_fail "tauri.conf.json not found"
fi
echo ""

# Summary
echo "======================================"
echo "📊 Verification Summary"
echo "======================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Android development is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Connect Android device or start emulator"
    echo "  2. Run: npm run tauri android dev"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Setup mostly complete with $WARNINGS warning(s).${NC}"
    echo "Review warnings above and address if needed."
    echo ""
else
    echo -e "${RED}❌ Setup incomplete. Found $ERRORS error(s) and $WARNINGS warning(s).${NC}"
    echo ""
    echo "📖 Please refer to docs/ANDROID_SETUP.md for detailed setup instructions."
    echo ""
    exit 1
fi

# Architecture support info
echo "📱 Supported Architectures:"
echo "  • arm64-v8a (aarch64-linux-android) - Modern phones/tablets"
echo "  • armeabi-v7a (armv7-linux-androideabi) - Older devices"
echo "  • x86_64 (x86_64-linux-android) - Emulators"
echo "  • x86 (i686-linux-android) - Legacy emulators"
echo ""
echo "Default build includes all architectures (universal APK/AAB)."
echo ""
