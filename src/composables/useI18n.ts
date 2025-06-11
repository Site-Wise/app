import { ref, computed } from 'vue';

type Language = 'en' | 'hi';

// interface TranslationKeys {
//   // Common
//   common: {
//     loading: string;
//     save: string;
//     cancel: string;
//     delete: string;
//     edit: string;
//     view: string;
//     create: string;
//     update: string;
//     close: string;
//     yes: string;
//     no: string;
//     search: string;
//     filter: string;
//     export: string;
//     import: string;
//     refresh: string;
//     back: string;
//     next: string;
//     previous: string;
//     submit: string;
//     reset: string;
//     clear: string;
//     select: string;
//     all: string;
//     none: string;
//     optional: string;
//     required: string;
//     total: string;
//     subtotal: string;
//     amount: string;
//     quantity: string;
//     price: string;
//     date: string;
//     time: string;
//     status: string;
//     actions: string;
//     description: string;
//     notes: string;
//     name: string;
//     email: string;
//     phone: string;
//     address: string;
//     type: string;
//     category: string;
//     tags: string;
//     reference: string;
//     balance: string;
//     account: string;
//     vendor: string;
//     item: string;
//     payment: string;
//     delivery: string;
//     site: string;
//     user: string;
//     admin: string;
//     active: string;
//     inactive: string;
//     pending: string;
//     approved: string;
//     rejected: string;
//     expired: string;
//     paid: string;
//     partial: string;
//     completed: string;
//     cancelled: string;
//     draft: string;
//     published: string;
//     archived: string;
//   };

//   // Navigation
//   nav: {
//     dashboard: string;
//     items: string;
//     vendors: string;
//     accounts: string;
//     quotations: string;
//     incoming: string;
//     payments: string;
//     settings: string;
//     profile: string;
//     logout: string;
//   };

//   // Authentication
//   auth: {
//     signIn: string;
//     signOut: string;
//     signUp: string;
//     login: string;
//     register: string;
//     email: string;
//     password: string;
//     confirmPassword: string;
//     fullName: string;
//     forgotPassword: string;
//     rememberMe: string;
//     loginTitle: string;
//     loginSubtitle: string;
//     registerTitle: string;
//     registerSubtitle: string;
//     signingIn: string;
//     creatingAccount: string;
//     loginFailed: string;
//     registrationFailed: string;
//     invalidCredentials: string;
//     emailRequired: string;
//     passwordRequired: string;
//     nameRequired: string;
//     newToApp: string;
//     alreadyHaveAccount: string;
//     createNewAccount: string;
//     backToLogin: string;
//   };

//   // Dashboard
//   dashboard: {
//     title: string;
//     subtitle: string;
//     totalItems: string;
//     activeVendors: string;
//     pendingDeliveries: string;
//     outstandingAmount: string;
//     recentDeliveries: string;
//     recentPayments: string;
//     paymentStatusOverview: string;
//     viewAll: string;
//     noRecentDeliveries: string;
//     noRecentPayments: string;
//     units: string;
//     sqft: string;
//   };

//   // Items
//   items: {
//     title: string;
//     subtitle: string;
//     addItem: string;
//     editItem: string;
//     deleteItem: string;
//     itemName: string;
//     itemDescription: string;
//     unit: string;
//     stockQuantity: string;
//     totalDelivered: string;
//     avgPrice: string;
//     noItems: string;
//     getStarted: string;
//     itemDetails: string;
//     deliveryHistory: string;
//     priceRange: string;
//     lowest: string;
//     highest: string;
//     average: string;
//     unitPriceTrend: string;
//     totalDeliveries: string;
//     exportReport: string;
//     recordDelivery: string;
//     noDeliveryData: string;
//     noDeliveriesRecorded: string;
//     startTracking: string;
//   };

//   // Vendors
//   vendors: {
//     title: string;
//     subtitle: string;
//     addVendor: string;
//     editVendor: string;
//     deleteVendor: string;
//     companyName: string;
//     contactPerson: string;
//     specialties: string;
//     outstanding: string;
//     totalPaid: string;
//     noVendors: string;
//     getStarted: string;
//     vendorDetails: string;
//     transactionHistory: string;
//     contactInformation: string;
//     financialSummary: string;
//     paymentStatusBreakdown: string;
//     exportLedger: string;
//     recordPayment: string;
//     outstandingAmount: string;
//     quickPayment: string;
//     payNow: string;
//     addSpecialty: string;
//   };

//   // Accounts
//   accounts: {
//     title: string;
//     subtitle: string;
//     addAccount: string;
//     editAccount: string;
//     deleteAccount: string;
//     accountName: string;
//     accountType: string;
//     accountNumber: string;
//     bankName: string;
//     openingBalance: string;
//     currentBalance: string;
//     isActive: string;
//     accountDetails: string;
//     transactionHistory: string;
//     totalBalance: string;
//     activeAccounts: string;
//     lowBalance: string;
//     noAccounts: string;
//     getStarted: string;
//     recalculateBalance: string;
//     exportStatement: string;
//     totalTransactions: string;
//     thisMonth: string;
//     avgTransaction: string;
//     noTransactions: string;
//     noTransactionsFound: string;
//     accountTypes: {
//       bank: string;
//       creditCard: string;
//       cash: string;
//       digitalWallet: string;
//       other: string;
//     };
//   };

//   // Quotations
//   quotations: {
//     title: string;
//     subtitle: string;
//     addQuotation: string;
//     editQuotation: string;
//     deleteQuotation: string;
//     unitPrice: string;
//     minimumQuantity: string;
//     validUntil: string;
//     noQuotations: string;
//     getStarted: string;
//     additionalNotes: string;
//   };

//   // Incoming Items
//   incoming: {
//     title: string;
//     subtitle: string;
//     recordDelivery: string;
//     editDelivery: string;
//     deleteDelivery: string;
//     deliveryDate: string;
//     paymentStatus: string;
//     paidAmount: string;
//     photos: string;
//     deliveryNotes: string;
//     deliveryDetails: string;
//     existingPhotos: string;
//     noDeliveries: string;
//     startTracking: string;
//     itemsAffected: string;
//   };

//   // Payments
//   payments: {
//     title: string;
//     subtitle: string;
//     recordPayment: string;
//     deletePayment: string;
//     paymentAccount: string;
//     paymentDate: string;
//     outstandingAmountsByVendor: string;
//     pendingDeliveries: string;
//     noPayments: string;
//     startTracking: string;
//     noOutstandingAmounts: string;
//     paymentFor: string;
//     outstandingAmountVendor: string;
//     paymentDetails: string;
//   };

//   // Site Management
//   site: {
//     selectSite: string;
//     createSite: string;
//     manageSite: string;
//     siteName: string;
//     siteDescription: string;
//     totalUnits: string;
//     plannedArea: string;
//     noSites: string;
//     createFirstSite: string;
//     siteInformation: string;
//     users: string;
//     currentSite: string;
//     otherSites: string;
//     noOtherSites: string;
//     createNewSite: string;
//   };

//   // Quick Actions
//   quickActions: {
//     addItem: string;
//     addVendor: string;
//     addAccount: string;
//     recordDelivery: string;
//     recordPayment: string;
//   };

//   // Messages
//   messages: {
//     confirmDelete: string;
//     deleteSuccess: string;
//     saveSuccess: string;
//     updateSuccess: string;
//     createSuccess: string;
//     error: string;
//     networkError: string;
//     validationError: string;
//     permissionDenied: string;
//     notFound: string;
//     serverError: string;
//     offline: string;
//     selectSiteFirst: string;
//     noDataToDisplay: string;
//     loadingData: string;
//     savingData: string;
//     deletingData: string;
//     exportingData: string;
//     importingData: string;
//     processingRequest: string;
//     operationCompleted: string;
//     operationFailed: string;
//     unsavedChanges: string;
//     discardChanges: string;
//     dataLoss: string;
//     cannotUndo: string;
//     mayAffectItems: string;
//   };

//   // Forms
//   forms: {
//     enterItemName: string;
//     enterDescription: string;
//     enterQuantity: string;
//     enterUnit: string;
//     enterCategory: string;
//     enterCompanyName: string;
//     enterContactPerson: string;
//     enterEmail: string;
//     enterPhone: string;
//     enterAddress: string;
//     enterAccountName: string;
//     selectAccountType: string;
//     enterAccountNumber: string;
//     enterBankName: string;
//     enterOpeningBalance: string;
//     enterAmount: string;
//     selectItem: string;
//     selectVendor: string;
//     selectAccount: string;
//     selectDate: string;
//     enterReference: string;
//     enterNotes: string;
//     addNotes: string;
//     deliveryNotes: string;
//     paymentNotes: string;
//     additionalNotes: string;
//     optional: string;
//   };

//   // PWA
//   pwa: {
//     installApp: string;
//     installTitle: string;
//     installMessage: string;
//     install: string;
//     installing: string;
//     later: string;
//     updateAvailable: string;
//     updateTitle: string;
//     updateMessage: string;
//     updateNow: string;
//     updating: string;
//     youreOffline: string;
//   };

//   // Theme
//   theme: {
//     light: string;
//     dark: string;
//     system: string;
//   };

//   // Time
//   time: {
//     today: string;
//     yesterday: string;
//     thisWeek: string;
//     thisMonth: string;
//     thisQuarter: string;
//     thisYear: string;
//     lastWeek: string;
//     lastMonth: string;
//     lastQuarter: string;
//     lastYear: string;
//     allTime: string;
//     custom: string;
//   };

//   // File operations
//   files: {
//     upload: string;
//     download: string;
//     delete: string;
//     preview: string;
//     selectFiles: string;
//     dragAndDrop: string;
//     maxFileSize: string;
//     allowedFormats: string;
//     uploadSuccess: string;
//     uploadFailed: string;
//     fileTooBig: string;
//     invalidFormat: string;
//     noFilesSelected: string;
//   };
// }

const currentLanguage = ref<Language>('en');

// Load saved language preference
const savedLanguage = localStorage.getItem('language') as Language;
if (savedLanguage && ['en', 'hi'].includes(savedLanguage)) {
  currentLanguage.value = savedLanguage;
}

export function useI18n() {
  const setLanguage = (lang: Language) => {
    currentLanguage.value = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
  };

  const t = (key: string, _values?: Record<string, unknown>): string => {
    const keys = key.split('.');
    let value: any = translations[currentLanguage.value];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key} for language: ${currentLanguage.value}`);
        return key; // Return the key if translation is not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const availableLanguages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' }
  ];

  return {
    currentLanguage: computed(() => currentLanguage.value),
    setLanguage,
    t,
    availableLanguages
  };
}

// Import translations
import { translations } from '../locales';