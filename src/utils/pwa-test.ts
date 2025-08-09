/**
 * PWA Testing Utilities
 * 
 * Helper functions to test PWA functionality in development
 */

// Test PWA Install Prompt
export function testPWAInstall() {
  console.log('🧪 Testing PWA Install Prompt...');
  
  // Create a fake beforeinstallprompt event for testing
  const fakeEvent = new CustomEvent('beforeinstallprompt', {
    detail: {
      preventDefault: () => console.log('preventDefault called'),
      prompt: () => {
        console.log('Install prompt called');
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: 'accepted' })
    }
  });
  
  // Add the methods to the event object
  (fakeEvent as any).preventDefault = () => console.log('preventDefault called');
  (fakeEvent as any).prompt = () => {
    console.log('Install prompt called');
    return Promise.resolve();
  };
  (fakeEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' });
  
  // Dispatch the event
  window.dispatchEvent(fakeEvent);
  console.log('✅ Fake install event dispatched');
}

// Test PWA Update Notification
export function testPWAUpdate() {
  console.log('🧪 Testing PWA Update Notification...');
  
  // Import and trigger simulation
  import('../composables/usePWAUpdate').then(({ usePWAUpdate }) => {
    const pwa = usePWAUpdate();
    
    if (pwa.simulateUpdateAndReload && typeof pwa.simulateUpdateAndReload === 'function') {
      pwa.simulateUpdateAndReload();
      console.log('✅ Update simulation triggered');
    } else {
      console.warn('⚠️ Update simulation not available (production mode?)');
      
      // Manual trigger for testing
      const manualTrigger = () => {
        console.log('🎯 Manually triggering update prompt...');
        // Access the shared state directly
        pwa.showUpdatePrompt.value = true;
        pwa.updateAvailable.value = true;
      };
      
      manualTrigger();
      console.log('✅ Manual update trigger completed');
    }
  });
}

// Check PWA Installation Status
export function checkPWAStatus() {
  console.log('🔍 Checking PWA Status...');
  
  const status = {
    serviceWorker: 'serviceWorker' in navigator,
    manifest: !!document.querySelector('link[rel="manifest"]'),
    https: location.protocol === 'https:' || location.hostname === 'localhost',
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    installed: (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  };
  
  console.table(status);
  
  // Check manifest details
  const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (manifestLink) {
    fetch(manifestLink.href)
      .then(response => response.json())
      .then(manifest => {
        console.log('📋 Manifest details:', manifest);
        
        // Check installability criteria
        const installabilityCriteria = {
          hasName: !!manifest.name,
          hasShortName: !!manifest.short_name,
          hasStartUrl: !!manifest.start_url,
          hasDisplay: !!manifest.display,
          hasIcons: manifest.icons && manifest.icons.length > 0,
          hasIcon192: manifest.icons?.some((icon: any) => icon.sizes?.includes('192x192'))
        };
        
        console.log('✅ Installability Criteria:', installabilityCriteria);
        
        const allCriteriaMet = Object.values(installabilityCriteria).every(Boolean);
        console.log(allCriteriaMet ? '✅ All installability criteria met!' : '❌ Some criteria not met');
      })
      .catch(error => console.error('❌ Error fetching manifest:', error));
  }
  
  return status;
}

// Add global testing functions for easy access in console
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).testPWAInstall = testPWAInstall;
  (window as any).testPWAUpdate = testPWAUpdate;
  (window as any).checkPWAStatus = checkPWAStatus;
  
  console.log('🧪 PWA Testing functions available:');
  console.log('   - testPWAInstall()  - Test install prompt');  
  console.log('   - testPWAUpdate()   - Test update notification');
  console.log('   - checkPWAStatus()  - Check PWA status');
}