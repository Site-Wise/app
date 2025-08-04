import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue';
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
  // Check if we're in a component context
  const instance = getCurrentInstance();
  
  const { t } = useI18n();
  
  // Only use route if in component context to avoid inject warnings
  let route;
  try {
    route = instance ? useRoute() : null;
  } catch (error) {
    // Fallback if useRoute fails outside component context
    route = null;
  }
  
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

    try {
      // First translate all steps
      const translatedSteps = tourConfig.steps.map(step => ({
        ...step,
        popover: {
          ...step.popover,
          title: t(step.popover.title),
          description: t(step.popover.description)
        }
      }));

      // Add skip onboarding option to first step AFTER translation
      if (translatedSteps.length > 0 && tourConfig.showOnce) {
        translatedSteps[0].popover.description += `<br><br><button class="driver-skip-all" onclick="window.dispatchEvent(new CustomEvent('skip-all-onboarding'))">${t('onboarding.skipAll')}</button>`;
      }

      const driverObj = driver({
        ...getDriverConfig(),
        steps: translatedSteps
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
          description: window.innerWidth < 1024 ? 'onboarding.dashboard.shortcuts.mobileDescription' : 'onboarding.dashboard.shortcuts.description'
        }
      }
    ],
    showOnce: true
  });

  const getItemsViewTour = (): TourConfig => {
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    
    const steps: OnboardingStep[] = [
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
        popover: {
          title: 'onboarding.items.table.title',
          description: 'onboarding.items.table.description',
          side: 'top',
          align: 'center'
        }
      }
    ];
    
    // Add clone button step for desktop only (mobile users see it in the dropdown)
    if (!isMobile) {
      steps.push({
        element: '[data-tour="clone-item-btn"]:first-of-type',
        popover: {
          title: 'onboarding.items.cloneButton.title',
          description: 'onboarding.items.cloneButton.description',
          side: 'left'
        }
      });
    } else {
      // For mobile, add a step pointing to the dropdown menu
      steps.push({
        element: '[data-tour="mobile-actions-menu"]:first-of-type',
        popover: {
          title: 'onboarding.items.cloneButton.title',
          description: 'onboarding.items.cloneButton.mobileDescription',
          side: 'left'
        }
      });
    }
    
    return {
      id: 'items',
      steps,
      showOnce: true
    };
  };

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
        element: '[data-tour="search-bar"]',
        popover: {
          title: 'onboarding.delivery.search.title',
          description: 'onboarding.delivery.search.description',
          side: 'bottom'
        }
      },
      {
        popover: {
          title: 'onboarding.delivery.list.title',
          description: 'onboarding.delivery.list.description',
          side: 'top',
          align: 'center'
        }
      }
    ],
    showOnce: true
  });

  const getVendorsViewTour = (): TourConfig => {
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    
    const steps: OnboardingStep[] = [
      {
        element: isMobile ? '[data-tour="add-vendor-btn"]' : '[data-keyboard-shortcut="n"]',
        popover: {
          title: 'onboarding.vendors.addButton.title',
          description: isMobile ? 'onboarding.vendors.addButton.mobileDescription' : 'onboarding.vendors.addButton.description',
          side: 'left'
        }
      },
      {
        element: '[data-tour="search-bar"]',
        popover: {
          title: 'onboarding.vendors.search.title',
          description: 'onboarding.vendors.search.description',
          side: 'bottom'
        }
      },
      {
        popover: {
          title: 'onboarding.vendors.list.title',
          description: 'onboarding.vendors.list.description',
          side: 'top',
          align: 'center'
        }
      }
    ];
    
    return {
      id: 'vendors',
      steps,
      showOnce: true
    };
  };

  const getServicesViewTour = (): TourConfig => {
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    
    const steps: OnboardingStep[] = [
      {
        element: isMobile ? '[data-tour="add-service-btn"]' : '[data-keyboard-shortcut="n"]',
        popover: {
          title: 'onboarding.services.addButton.title',
          description: isMobile ? 'onboarding.services.addButton.mobileDescription' : 'onboarding.services.addButton.description',
          side: 'left'
        }
      },
      {
        popover: {
          title: 'onboarding.services.list.title',
          description: 'onboarding.services.list.description',
          side: 'top',
          align: 'center'
        }
      }
    ];
    
    return {
      id: 'services',
      steps,
      showOnce: true
    };
  };

  const getAccountsViewTour = (): TourConfig => {
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    
    const steps: OnboardingStep[] = [
      {
        element: isMobile ? '[data-tour="add-account-btn"]' : '[data-keyboard-shortcut="a"]',
        popover: {
          title: 'onboarding.accounts.addButton.title',
          description: isMobile ? 'onboarding.accounts.addButton.mobileDescription' : 'onboarding.accounts.addButton.description',
          side: 'left'
        }
      },
      {
        element: '[data-tour="search-bar"]',
        popover: {
          title: 'onboarding.accounts.search.title',
          description: 'onboarding.accounts.search.description',
          side: 'bottom'
        }
      },
      {
        popover: {
          title: 'onboarding.accounts.list.title',
          description: 'onboarding.accounts.list.description',
          side: 'top',
          align: 'center'
        }
      }
    ];
    
    return {
      id: 'accounts',
      steps,
      showOnce: true
    };
  };

  const getPaymentsViewTour = (): TourConfig => {
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    
    const steps: OnboardingStep[] = [
      {
        element: isMobile ? '[data-tour="record-payment-btn"]' : '[data-keyboard-shortcut="p"]',
        popover: {
          title: 'onboarding.payments.recordButton.title',
          description: isMobile ? 'onboarding.payments.recordButton.mobileDescription' : 'onboarding.payments.recordButton.description',
          side: 'left'
        }
      },
      {
        element: '[data-tour="search-bar"]',
        popover: {
          title: 'onboarding.payments.search.title',
          description: 'onboarding.payments.search.description',
          side: 'bottom'
        }
      },
      {
        popover: {
          title: 'onboarding.payments.list.title',
          description: 'onboarding.payments.list.description',
          side: 'top',
          align: 'center'
        }
      }
    ];
    
    return {
      id: 'payments',
      steps,
      showOnce: true
    };
  };

  const getServiceBookingsViewTour = (): TourConfig => {
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    
    const steps: OnboardingStep[] = [
      {
        element: isMobile ? '[data-tour="book-service-btn"]' : '[data-keyboard-shortcut="b"]',
        popover: {
          title: 'onboarding.serviceBookings.bookButton.title',
          description: isMobile ? 'onboarding.serviceBookings.bookButton.mobileDescription' : 'onboarding.serviceBookings.bookButton.description',
          side: 'left'
        }
      },
      {
        element: '[data-tour="search-bar"]',
        popover: {
          title: 'onboarding.serviceBookings.search.title',
          description: 'onboarding.serviceBookings.search.description',
          side: 'bottom'
        }
      },
      {
        popover: {
          title: 'onboarding.serviceBookings.list.title',
          description: 'onboarding.serviceBookings.list.description',
          side: 'top',
          align: 'center'
        }
      }
    ];
    
    return {
      id: 'serviceBookings',
      steps,
      showOnce: true
    };
  };

  const getQuotationsViewTour = (): TourConfig => {
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    
    const steps: OnboardingStep[] = [
      {
        element: isMobile ? '[data-tour="add-quotation-btn"]' : '[data-keyboard-shortcut="q"]',
        popover: {
          title: 'onboarding.quotations.addButton.title',
          description: isMobile ? 'onboarding.quotations.addButton.mobileDescription' : 'onboarding.quotations.addButton.description',
          side: 'left'
        }
      },
      {
        element: '[data-tour="search-bar"]',
        popover: {
          title: 'onboarding.quotations.search.title',
          description: 'onboarding.quotations.search.description',
          side: 'bottom'
        }
      },
      {
        popover: {
          title: 'onboarding.quotations.list.title',
          description: 'onboarding.quotations.list.description',
          side: 'top',
          align: 'center'
        }
      }
    ];
    
    return {
      id: 'quotations',
      steps,
      showOnce: true
    };
  };

  const getVendorReturnsViewTour = (): TourConfig => {
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    
    const steps: OnboardingStep[] = [
      {
        element: isMobile ? '[data-tour="add-return-btn"]' : '[data-keyboard-shortcut="r"]',
        popover: {
          title: 'onboarding.vendorReturns.addButton.title',
          description: isMobile ? 'onboarding.vendorReturns.addButton.mobileDescription' : 'onboarding.vendorReturns.addButton.description',
          side: 'left'
        }
      },
      {
        element: '[data-tour="search-bar"]',
        popover: {
          title: 'onboarding.vendorReturns.search.title',
          description: 'onboarding.vendorReturns.search.description',
          side: 'bottom'
        }
      },
      {
        popover: {
          title: 'onboarding.vendorReturns.list.title',
          description: 'onboarding.vendorReturns.list.description',
          side: 'top',
          align: 'center'
        }
      }
    ];
    
    return {
      id: 'vendorReturns',
      steps,
      showOnce: true
    };
  };

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
    if (isOnboardingDisabled.value || !route) {
      return;
    }

    let tour: TourConfig | null = null;
    
    switch (route.name) {
      case 'Dashboard':
        tour = getDashboardTour();
        break;
      case 'Items':
        tour = getItemsViewTour();
        break;
      case 'Deliveries':
        tour = getDeliveryViewTour();
        break;
      case 'Vendors':
        tour = getVendorsViewTour();
        break;
      case 'Services':
        tour = getServicesViewTour();
        break;
      case 'Accounts':
        tour = getAccountsViewTour();
        break;
      case 'Payments':
        tour = getPaymentsViewTour();
        break;
      case 'ServiceBookings':
        tour = getServiceBookingsViewTour();
        break;
      case 'Quotations':
        tour = getQuotationsViewTour();
        break;
      case 'VendorReturns':
        tour = getVendorReturnsViewTour();
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

  // Initialize on mount (only if in component context)
  if (instance) {
    onMounted(() => {
      checkOnboardingDisabled();
      setTimeout(() => autoStartTour(), 1000);
    });

    // Watch for route changes to trigger tours (only if in component context and route exists)
    if (route) {
      watch(() => route.name, (newRouteName) => {
        if (newRouteName) {
          autoStartTour();
        }
      });
    }
  }

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
      currentRoute: route ? String(route.name) : 'unknown',
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