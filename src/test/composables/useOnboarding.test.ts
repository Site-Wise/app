import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useOnboarding } from '../../composables/useOnboarding';
import { driver } from 'driver.js';

vi.mock('driver.js', () => ({
  driver: vi.fn(() => ({
    drive: vi.fn(),
    destroy: vi.fn()
  }))
}));

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    name: 'dashboard'
  })
}));

describe('useOnboarding', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = {};
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        })
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize without errors', () => {
    const { isOnboardingDisabled } = useOnboarding();
    expect(isOnboardingDisabled.value).toBe(false);
  });

  it('should check if onboarding is disabled', () => {
    localStorageMock['sitewise_onboarding_disabled'] = 'true';
    const { isOnboardingDisabled } = useOnboarding();
    expect(isOnboardingDisabled.value).toBe(false); // Initially false until checked
  });

  it('should disable onboarding globally', () => {
    const { disableOnboarding, isOnboardingDisabled } = useOnboarding();
    
    disableOnboarding();
    
    expect(localStorage.setItem).toHaveBeenCalledWith('sitewise_onboarding_disabled', 'true');
    expect(isOnboardingDisabled.value).toBe(true);
  });

  it('should enable onboarding', () => {
    const { enableOnboarding, isOnboardingDisabled } = useOnboarding();
    
    // First disable it
    localStorageMock['sitewise_onboarding_disabled'] = 'true';
    
    // Then enable it
    enableOnboarding();
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('sitewise_onboarding_disabled');
    expect(isOnboardingDisabled.value).toBe(false);
  });

  it('should mark tour as shown', () => {
    const { startTour } = useOnboarding();
    const mockTour = {
      id: 'test-tour',
      steps: [
        {
          popover: {
            title: 'Test Title',
            description: 'Test Description'
          }
        }
      ],
      showOnce: true
    };

    startTour(mockTour);
    
    expect(driver).toHaveBeenCalled();
  });

  it('should not show tour if already shown', () => {
    localStorageMock['sitewise_onboarding_test-tour'] = 'true';
    const { startTour } = useOnboarding();
    const mockTour = {
      id: 'test-tour',
      steps: [
        {
          popover: {
            title: 'Test Title',
            description: 'Test Description'
          }
        }
      ],
      showOnce: true
    };

    startTour(mockTour);
    
    expect(driver).not.toHaveBeenCalled();
  });

  it('should reset specific tour', () => {
    localStorageMock['sitewise_onboarding_dashboard'] = 'true';
    const { resetTour } = useOnboarding();
    
    resetTour('dashboard');
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('sitewise_onboarding_dashboard');
  });

  it('should reset all tours', () => {
    localStorageMock['sitewise_onboarding_dashboard'] = 'true';
    localStorageMock['sitewise_onboarding_items'] = 'true';
    localStorageMock['sitewise_feature_new_feature'] = 'true';
    localStorageMock['sitewise_onboarding_disabled'] = 'true';
    
    const { resetAllTours } = useOnboarding();
    
    resetAllTours();
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('sitewise_onboarding_dashboard');
    expect(localStorage.removeItem).toHaveBeenCalledWith('sitewise_onboarding_items');
    expect(localStorage.removeItem).toHaveBeenCalledWith('sitewise_feature_new_feature');
    expect(localStorage.removeItem).toHaveBeenCalledWith('sitewise_onboarding_disabled');
  });

  it('should show feature tour even if onboarding is disabled', () => {
    localStorageMock['sitewise_onboarding_disabled'] = 'true';
    const { showFeatureTour } = useOnboarding();
    
    showFeatureTour('new_feature', [
      {
        popover: {
          title: 'New Feature',
          description: 'Check out this new feature!'
        }
      }
    ]);
    
    expect(driver).toHaveBeenCalled();
  });

  it('should handle tour with custom element selector', () => {
    const { startTour } = useOnboarding();
    const mockTour = {
      id: 'element-tour',
      steps: [
        {
          element: '[data-tour="test-element"]',
          popover: {
            title: 'Element Tour',
            description: 'This highlights a specific element',
            side: 'bottom' as const
          }
        }
      ]
    };

    startTour(mockTour);
    
    expect(driver).toHaveBeenCalled();
    const driverCall = vi.mocked(driver).mock.calls[0][0];
    expect(driverCall.steps[0].element).toBe('[data-tour="test-element"]');
  });
});