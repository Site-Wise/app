# Tauri Integration for SiteWise

This document provides information about the Tauri integration in SiteWise, enabling native desktop applications while maintaining PWA compatibility.

## Overview

SiteWise now supports both Progressive Web App (PWA) deployment and native desktop applications through Tauri. The integration is designed to be seamless, with the same codebase working across all platforms.

## Architecture

### Dual Platform Support

- **Web/PWA Mode**: Uses web notifications, PWA features, and browser APIs
- **Native Mode**: Uses Tauri's native APIs for enhanced desktop features

### Key Components

1. **Platform Detection** (`usePlatform.ts`)
   - Automatically detects the runtime environment
   - Provides platform-specific capabilities
   - Enables conditional feature activation

2. **Native Notifications** (`useNativeNotifications.ts`)
   - Unified API for notifications across platforms
   - Falls back to web notifications when Tauri is unavailable
   - Business-specific notification helpers

3. **Build Configuration**
   - Conditional PWA plugin loading based on environment
   - Separate build targets for web and native apps

## Features

### Native Desktop Features (Tauri Only)

- **System Tray Integration**: App can run in the system tray
- **Native Notifications**: OS-level notifications
- **File System Access**: Direct file operations
- **Window Management**: Hide/show, minimize/maximize controls
- **Auto-updater Ready**: Framework for automatic updates

### Cross-Platform Features

- **Notifications**: Delivery, payment, quotation, and service booking alerts
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Offline Support**: PWA caching strategies maintained
- **Authentication**: Seamless across all platforms

## Development

### Requirements

- **Rust**: Latest stable version
- **Node.js**: 18+ with npm
- **Platform Tools**:
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: Development packages (gcc, webkit2gtk)

### Development Commands

```bash
# Web development (PWA)
npm run dev

# Native development (Tauri)
npm run dev:tauri

# Build for web
npm run build

# Build native apps
npm run build:tauri
```

### Testing

```bash
# Run all tests
npm test

# Test with coverage
npm run test:coverage

# Platform-specific tests
npm test -- --grep "platform|notification"
```

## Build Targets

### Web/PWA Build
- Generates standard web assets
- Includes service worker and manifest
- Optimized for web deployment

### Native Builds
- **Windows**: `.msi` and `.exe` installers
- **macOS**: `.app` bundle and `.dmg` disk image
- **Linux**: `.deb`, `.rpm`, and `.AppImage` packages

## Configuration

### Tauri Configuration (`src-tauri/tauri.conf.json`)

Key security and capability settings:

```json
{
  "tauri": {
    "allowlist": {
      "notification": { "all": true },
      "window": { "all": false, "close": true, "hide": true },
      "fs": {
        "scope": ["$APPDATA", "$DOWNLOAD", "$DOCUMENT", "$PICTURE"]
      }
    }
  }
}
```

### Vite Configuration

Automatically detects build target and configures plugins accordingly:

- Disables PWA plugin when building for Tauri
- Maintains separate configurations for each platform
- Ensures optimal build output for target environment

## Security

### Tauri Security Features

- **Content Security Policy**: Configurable CSP for web content
- **API Allowlisting**: Only required APIs are enabled
- **File System Scoping**: Limited to safe directories
- **Command Validation**: All Rust commands are validated

### Best Practices

1. **Minimal Permissions**: Only request necessary capabilities
2. **Input Validation**: All data passed between frontend and backend is validated
3. **Secure Defaults**: Conservative security settings by default
4. **Regular Updates**: Keep Tauri and dependencies updated

## Deployment

### Web Deployment
Standard web deployment process remains unchanged. The PWA features continue to work as before.

### Native Distribution

1. **Build for all platforms**: Use GitHub Actions or platform-specific builds
2. **Code Signing**: Required for macOS and recommended for Windows
3. **Auto-updater**: Configure update servers for automatic updates
4. **Store Distribution**: Can be distributed through app stores

## Migration from PWA-only

Existing users can continue using the PWA version without any changes. The native app provides an enhanced experience for desktop users who prefer native applications.

### Data Compatibility

- Same PocketBase backend
- Identical authentication flow
- Shared data models and APIs
- No migration required for existing users

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Ensure Rust toolchain is installed
   - Check platform-specific dependencies
   - Verify Node.js and npm versions

2. **Permission Issues**
   - Review Tauri allowlist configuration
   - Check file system scope settings
   - Verify notification permissions

3. **Performance**
   - Native apps typically have better performance
   - Web version maintains offline capabilities
   - Consider target audience when recommending platform

### Development Tips

1. **Testing Both Environments**: Always test features in both web and native modes
2. **Feature Detection**: Use platform detection for conditional features
3. **Error Handling**: Graceful fallbacks for unsupported features
4. **Performance**: Monitor bundle size impact of Tauri APIs

## Future Enhancements

### Planned Features

- **Auto-updater Implementation**: Seamless updates for native apps
- **Deep Linking**: URL handling in native apps
- **Offline Data Sync**: Enhanced offline capabilities
- **Push Notifications**: Background notifications

### Considerations

- **Mobile Apps**: Future React Native or Flutter integration
- **Plugin System**: Custom Tauri plugins for specific features
- **Enterprise Features**: Advanced security and deployment options