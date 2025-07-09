// Simple utility to test onboarding functionality
// Run this in browser console to reset and test tours

export function resetOnboardingForTesting() {
  // Clear all onboarding localStorage keys
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('sitewise_onboarding_') || key.startsWith('sitewise_feature_')) {
      localStorage.removeItem(key);
      console.log(`Removed: ${key}`);
    }
  });
  
  localStorage.removeItem('sitewise_onboarding_disabled');
  
  console.log('✅ All onboarding state cleared. Refresh the page to see tours.');
}

export function forceShowDashboardTour() {
  // Import and force start dashboard tour
  import('../composables/useOnboarding').then(({ useOnboarding }) => {
    const { startTour, getDashboardTour } = useOnboarding();
    const tour = getDashboardTour();
    startTour(tour, true); // Force show
  });
}

// Make functions available globally for testing
if (typeof window !== 'undefined') {
  (window as any).resetOnboardingForTesting = resetOnboardingForTesting;
  (window as any).forceShowDashboardTour = forceShowDashboardTour;
  
  console.log('🎯 Onboarding test utilities loaded:');
  console.log('- resetOnboardingForTesting() - Clear all localStorage and reset');
  console.log('- forceShowDashboardTour() - Force show dashboard tour');
  console.log('- onboardingDebug() - Show debug info (if available)');
}