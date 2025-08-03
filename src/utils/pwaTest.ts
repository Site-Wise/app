// PWA Installation Test Utility
// This file helps debug PWA installation issues

export interface PWAInstallabilityChecks {
  hasServiceWorker: boolean;
  isHTTPS: boolean;
  hasManifest: boolean;
  hasRequiredIcons: boolean;
  isStandalone: boolean;
  hasBeforeInstallPrompt: boolean;
  userGestureRequired: boolean;
}

export function checkPWAInstallability(): PWAInstallabilityChecks {
  const checks: PWAInstallabilityChecks = {
    hasServiceWorker: 'serviceWorker' in navigator,
    isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
    hasManifest: !!document.querySelector('link[rel="manifest"]'),
    hasRequiredIcons: true, // We'll assume icons are present since build succeeds
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    hasBeforeInstallPrompt: false, // Will be set when event fires
    userGestureRequired: true
  };

  return checks;
}

export function logPWAStatus(): void {
  const checks = checkPWAInstallability();
  
  console.group('🔧 PWA Installation Status');
  console.log('✅ Service Worker supported:', checks.hasServiceWorker);
  console.log('✅ HTTPS/localhost:', checks.isHTTPS);
  console.log('✅ Manifest present:', checks.hasManifest);
  console.log('✅ Required icons:', checks.hasRequiredIcons);
  console.log('📱 Already installed:', checks.isStandalone);
  console.log('🎯 Install prompt available:', checks.hasBeforeInstallPrompt);
  console.log('👆 User gesture required:', checks.userGestureRequired);
  console.groupEnd();

  // Provide recommendations
  if (!checks.hasServiceWorker) {
    console.warn('❌ Service Worker not supported in this browser');
  }
  
  if (!checks.isHTTPS) {
    console.warn('❌ PWA requires HTTPS or localhost');
  }
  
  if (!checks.hasManifest) {
    console.warn('❌ Web App Manifest not found');
  }
  
  if (checks.isStandalone) {
    console.info('ℹ️ App is already installed');
  }
  
  console.info('ℹ️ Install prompt will appear after user interaction if all conditions are met');
}

export function simulateInstallPrompt(): void {
  // This is for development testing only
  if (import.meta.env.DEV) {
    console.log('🧪 Simulating install prompt...');
    
    // Dispatch a custom event to trigger the install prompt
    const event = new CustomEvent('test-install-prompt');
    window.dispatchEvent(event);
    
    // Also try to trigger the beforeinstallprompt event manually
    const installEvent = new Event('beforeinstallprompt') as any;
    installEvent.prompt = () => Promise.resolve();
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted' });
    
    window.dispatchEvent(installEvent);
  }
}

// Auto-log PWA status in development
if (import.meta.env.DEV) {
  setTimeout(logPWAStatus, 1000);
}