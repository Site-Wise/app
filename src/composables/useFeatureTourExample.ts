/**
 * Example of how to use feature tours to highlight new features
 * This can be called when launching new features
 */
import { useOnboarding } from './useOnboarding';

export function showTallyExportFeatureTour() {
  const { showFeatureTour } = useOnboarding();
  
  // Define the tour steps for the new Tally export feature
  const tallyExportSteps = [
    {
      popover: {
        title: 'features.tallyExport.intro.title',
        description: 'features.tallyExport.intro.description',
        side: 'bottom' as const,
        align: 'center' as const
      }
    },
    {
      element: '[data-tour="export-dropdown"]',
      popover: {
        title: 'features.tallyExport.button.title',
        description: 'features.tallyExport.button.description',
        side: 'left' as const
      }
    }
  ];
  
  // Show the feature tour
  showFeatureTour('tally_export_beta', tallyExportSteps);
}

export function showPaymentEnhancementsFeatureTour() {
  const { showFeatureTour } = useOnboarding();
  
  const paymentSteps = [
    {
      element: '[data-tour="payment-button"]',
      popover: {
        title: 'features.paymentEnhancements.button.title',
        description: 'features.paymentEnhancements.button.description',
        side: 'left' as const
      }
    },
    {
      element: '[data-tour="credit-notes"]',
      popover: {
        title: 'features.paymentEnhancements.creditNotes.title',
        description: 'features.paymentEnhancements.creditNotes.description',
        side: 'top' as const
      }
    }
  ];
  
  showFeatureTour('payment_enhancements_v2', paymentSteps);
}

// Example usage in a component:
// 
// import { onMounted } from 'vue';
// import { showTallyExportFeatureTour } from '../composables/useFeatureTourExample';
// 
// onMounted(() => {
//   // Show feature tour after a short delay to ensure DOM is ready
//   setTimeout(() => {
//     showTallyExportFeatureTour();
//   }, 1000);
// });