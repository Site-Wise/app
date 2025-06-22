#!/bin/bash

# Development setup script for SiteWise Tauri integration
set -e

echo "🔧 Setting up SiteWise development environment..."

# Check if running on WSL
if grep -qi microsoft /proc/version 2>/dev/null; then
    echo "⚠️  Detected WSL environment"
    echo "   Note: GUI apps may require additional setup"
fi

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old (required: $REQUIRED_VERSION+)"
    exit 1
fi

echo "✅ Node.js $NODE_VERSION detected"

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "📦 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
else
    echo "✅ Rust $(rustc --version | cut -d' ' -f2) detected"
fi

# Install platform-specific dependencies
OS=$(uname -s)
case $OS in
    "Linux")
        echo "🐧 Setting up Linux dependencies..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y \
                libwebkit2gtk-4.0-dev \
                build-essential \
                curl \
                wget \
                libssl-dev \
                libgtk-3-dev \
                libayatana-appindicator3-dev \
                librsvg2-dev
        elif command -v pacman &> /dev/null; then
            sudo pacman -S --needed \
                webkit2gtk \
                base-devel \
                curl \
                wget \
                openssl \
                appmenu-gtk-module \
                gtk3 \
                libappindicator-gtk3 \
                librsvg
        else
            echo "⚠️  Unknown package manager. Please install webkit2gtk and build tools manually."
        fi
        ;;
    "Darwin")
        echo "🍎 Setting up macOS dependencies..."
        if ! command -v xcode-select &> /dev/null; then
            echo "Installing Xcode Command Line Tools..."
            xcode-select --install
        fi
        ;;
    "MINGW"*|"MSYS"*|"CYGWIN"*)
        echo "🪟 Windows detected"
        echo "   Make sure you have Visual Studio Build Tools installed"
        ;;
    *)
        echo "⚠️  Unknown OS: $OS"
        ;;
esac

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm ci

# Generate Tauri icons if needed
echo "🎨 Setting up Tauri icons..."
if [ ! -f "src-tauri/icons/icon.ico" ]; then
    echo "   Generating platform-specific icons..."
    # Copy existing web icons as placeholders
    mkdir -p src-tauri/icons
    
    # For proper icon generation, use tauri icon command with a source PNG
    if [ -f "public/android-chrome-512x512.png" ]; then
        cp public/android-chrome-512x512.png src-tauri/icons/icon.png
        echo "   Using existing app icon as source"
    fi
fi

# Run tests to verify setup
echo "🧪 Running tests to verify setup..."
npm test -- --run

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start web development server"
echo "  npm run dev:tauri    - Start Tauri development (desktop app)"
echo "  npm run build        - Build web version"
echo "  npm run build:tauri  - Build native desktop apps"
echo "  npm test             - Run tests"
echo ""
echo "📚 See TAURI_INTEGRATION.md for detailed documentation"