import { ref, computed, onMounted, watch } from 'vue';
import { driver, type Config as DriverConfig } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useI18n } from './useI18n';
import { useRoute } from 'vue-router';

interface OnboardingStep {
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
  };
}

interface TourConfig {
  id: string;
  steps: OnboardingStep[];
  showOnce?: boolean;
}

const ONBOARDING_KEY_PREFIX = 'sitewise_onboarding_';
const ONBOARDING_DISABLED_KEY = 'sitewise_onboarding_disabled';
const FEATURE_TOUR_PREFIX = 'sitewise_feature_';

export function useOnboarding() {
  const { t } = useI18n();
  const route = useRoute();
  
  const isOnboardingDisabled = ref(false);
  const currentTourId = ref<string | null>(null);

  // Check if onboarding is globally disabled
  const checkOnboardingDisabled = () => {
    isOnboardingDisabled.value = localStorage.getItem(ONBOARDING_DISABLED_KEY) === 'true';
  };

  // Check if a specific tour has been shown
  const hasTourBeenShown = (tourId: string): boolean => {
    return localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${tourId}`) === 'true';
  };

  // Mark a tour as shown
  const markTourAsShown = (tourId: string) => {
    localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${tourId}`, 'true');
  };

  // Disable all future onboarding
  const disableOnboarding = () => {
    localStorage.setItem(ONBOARDING_DISABLED_KEY, 'true');
    isOnboardingDisabled.value = true;
  };

  // Enable onboarding (for settings page)
  const enableOnboarding = () => {
    localStorage.removeItem(ONBOARDING_DISABLED_KEY);
    isOnboardingDisabled.value = false;
  };

  // Reset all tours (for testing or help menu)
  const resetAllTours = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(ONBOARDING_KEY_PREFIX) || key.startsWith(FEATURE_TOUR_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    enableOnboarding();
  };

  // Reset a specific tour
  const resetTour = (tourId: string) => {
    localStorage.removeItem(`${ONBOARDING_KEY_PREFIX}${tourId}`);
  };

  // Get common driver config with i18n
  const getDriverConfig = (): Partial<DriverConfig> => {
    return {
      showButtons: ['next', 'previous', 'close'],
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.4)',
      smoothScroll: true,
      allowClose: true,
      doneBtnText: t('onboarding.done'),
      nextBtnText: t('onboarding.next'),
      prevBtnText: t('onboarding.previous'),
      progressText: t('onboarding.progressText'),
      onDestroyed: () => {
        if (currentTourId.value) {
          markTourAsShown(currentTourId.value);
          currentTourId.value = null;
        }
      }
    };
  };

  // Check if DOM elements exist for tour
  const checkTourElementsExist = (steps: OnboardingStep[]): boolean => {
    for (const step of steps) {
      if (step.element) {
        const element = document.querySelector(step.element);
        if (!element) {
          return false;
        }
      }
    }
    return true;
  };

  // Start a tour
  const startTour = (tourConfig: TourConfig, forceShow = false) => {
    checkOnboardingDisabled();
    
    // Don't show if globally disabled or already shown (unless forced)
    if (!forceShow && (isOnboardingDisabled.value || hasTourBeenShown(tourConfig.id))) {
      return;
    }

    // Check if tour elements exist
    if (!checkTourElementsExist(tourConfig.steps)) {
      return;
    }

    currentTourId.value = tourConfig.id;

    // Add skip onboarding option to first step
    const stepsWithSkip = [...tourConfig.steps];
    if (stepsWithSkip.length > 0 && tourConfig.showOnce) {
      stepsWithSkip[0].popover.description += `<br><br><button class="driver-skip-all" onclick="window.dispatchEvent(new CustomEvent('skip-all-onboarding'))">${t('onboarding.skipAll')}</button>`;
    }

    try {
      const driverObj = driver({
        ...getDriverConfig(),
        steps: stepsWithSkip.map(step => ({
          ...step,
          popover: {
            ...step.popover,
            title: t(step.popover.title),
            description: t(step.popover.description)
          }
        }))
      });

      // Listen for skip all event
      const handleSkipAll = () => {
        driverObj.destroy();
        disableOnboarding();
        window.removeEventListener('skip-all-onboarding', handleSkipAll);
      };
      window.addEventListener('skip-all-onboarding', handleSkipAll);

      driverObj.drive();
    } catch (error) {
      console.error(`Error starting tour ${tourConfig.id}:`, error);
    }
  };

  // Get tour configuration for specific pages
  const getDashboardTour = (): TourConfig => ({
    id: 'dashboard',
    steps: [
      {
        popover: {
          title: 'onboarding.dashboard.welcome.title',
          description: 'onboarding.dashboard.welcome.description',
          side: 'bottom',
          align: 'center'
        }
      },
      {
        element: '[data-tour="site-selector"]',
        popover: {
          title: 'onboarding.dashboard.siteSelector.title',
          description: 'onboarding.dashboard.siteSelector.description',
          side: 'bottom'
        }
      },
      {
        element: '[data-tour="quick-stats"]',
        popover: {
          title: 'onboarding.dashboard.quickStats.title',
          description: 'onboarding.dashboard.quickStats.description',
          side: 'top'
        }
      },
      {
        element: '[data-tour="recent-activities"]',
        popover: {
          title: 'onboarding.dashboard.recentActivities.title',
          description: 'onboarding.dashboard.recentActivities.description',
          side: 'top'
        }
      },
      {
        popover: {
          title: 'onboarding.dashboard.shortcuts.title',
          description: 'onboarding.dashboard.shortcuts.description'
        }
      }
    ],
    showOnce: true
  });

  const getItemsViewTour = (): TourConfig => ({
    id: 'items',
    steps: [
      {
        element: '[data-tour="add-item-btn"]',
        popover: {
          title: 'onboarding.items.addButton.title',
          description: 'onboarding.items.addButton.description',
          side: 'left'
        }
      },
      {
        element: '[data-tour="search-bar"]',
        popover: {
          title: 'onboarding.items.search.title',
          description: 'onboarding.items.search.description',
          side: 'bottom'
        }
      },
      {
        element: '[data-tour="items-table"]',
        popover: {
          title: 'onboarding.items.table.title',
          description: 'onboarding.items.table.description',
          side: 'top'
        }
      }
    ],
    showOnce: true
  });

  const getDeliveryViewTour = (): TourConfig => ({
    id: 'delivery',
    steps: [
      {
        element: '[data-tour="record-delivery-btn"]',
        popover: {
          title: 'onboarding.delivery.recordButton.title',
          description: 'onboarding.delivery.recordButton.description',
          side: 'left'
        }
      },
      {
        element: '[data-tour="delivery-filters"]',
        popover: {
          title: 'onboarding.delivery.filters.title',
          description: 'onboarding.delivery.filters.description',
          side: 'bottom'
        }
      }
    ],
    showOnce: true
  });

  // Feature tour for new features
  const showFeatureTour = (featureId: string, steps: OnboardingStep[]) => {
    const tourConfig: TourConfig = {
      id: `feature_${featureId}`,
      steps,
      showOnce: false
    };
    
    // Feature tours use a different prefix to avoid being disabled by general onboarding
    if (!hasTourBeenShown(tourConfig.id)) {
      startTour(tourConfig, true);
    }
  };

  // Auto-start tour based on current route
  const autoStartTour = () => {
    if (isOnboardingDisabled.value) {
      return;
    }

    let tour: TourConfig | null = null;
    
    switch (route?.name) {
      case 'Dashboard': // Fix: Use correct route name
        tour = getDashboardTour();
        break;
      case 'Items':
        tour = getItemsViewTour();
        break;
      case 'Deliveries': // Fix: Use correct route name  
        tour = getDeliveryViewTour();
        break;
    }

    if (tour) {
      // Wait for DOM to be ready with retry logic
      const tryStartTour = (attempts = 0) => {
        if (attempts >= 5) {
          return;
        }
        
        setTimeout(() => {
          if (checkTourElementsExist(tour.steps)) {
            startTour(tour);
          } else {
            tryStartTour(attempts + 1);
          }
        }, 500 + (attempts * 200)); // Progressive delay
      };
      
      tryStartTour();
    }
  };

  // Initialize on mount
  onMounted(() => {
    checkOnboardingDisabled();
    setTimeout(() => autoStartTour(), 1000);
  });

  // Watch for route changes to trigger tours
  watch(() => route?.name, (newRouteName) => {
    if (newRouteName) {
      autoStartTour();
    }
  });

  // Debug utility to check onboarding status
  const getOnboardingDebugInfo = () => {
    const allKeys = Object.keys(localStorage);
    const onboardingKeys = allKeys.filter(key => 
      key.startsWith(ONBOARDING_KEY_PREFIX) || 
      key.startsWith(FEATURE_TOUR_PREFIX) ||
      key === ONBOARDING_DISABLED_KEY
    );
    
    return {
      isDisabled: isOnboardingDisabled.value,
      currentRoute: String(route.name),
      dashboardShown: hasTourBeenShown('dashboard'),
      itemsShown: hasTourBeenShown('items'),
      deliveryShown: hasTourBeenShown('delivery'),
      storageKeys: onboardingKeys.map(key => ({
        key,
        value: localStorage.getItem(key)
      }))
    };
  };

  return {
    isOnboardingDisabled: computed(() => isOnboardingDisabled.value),
    startTour,
    showFeatureTour,
    disableOnboarding,
    enableOnboarding,
    resetAllTours,
    resetTour,
    autoStartTour,
    hasTourBeenShown,
    getOnboardingDebugInfo
  };
}