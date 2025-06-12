import { vi } from 'vitest'
import { computed } from 'vue'
import { mockUser, mockSite, mockSiteInvitation } from '../mocks/pocketbase'

// Mock composables with proper return types
export const createMockUseAuth = (overrides: any = {}) => ({
  user: computed(() => overrides.user ?? mockUser),
  isAuthenticated: computed(() => overrides.isAuthenticated ?? true),
  login: vi.fn().mockResolvedValue({ success: true }),
  register: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn(),
  refreshAuth: vi.fn(),
  ...overrides
})

export const createMockUseSite = (overrides: any = {}) => ({
  currentSite: computed(() => overrides.currentSite ?? mockSite),
  userSites: computed(() => overrides.userSites ?? [mockSite]),
  currentUserRole: computed(() => overrides.currentUserRole ?? 'owner'),
  isLoading: computed(() => overrides.isLoading ?? false),
  hasSiteAccess: computed(() => overrides.hasSiteAccess ?? true),
  isCurrentUserAdmin: computed(() => overrides.isCurrentUserAdmin ?? true),
  canManageUsers: computed(() => overrides.canManageUsers ?? true),
  loadUserSites: vi.fn(),
  selectSite: vi.fn(),
  createSite: vi.fn(),
  updateSite: vi.fn(),
  addUserToSite: vi.fn(),
  removeUserFromSite: vi.fn(),
  changeUserRole: vi.fn(),
  isOwnerOfSite: vi.fn().mockResolvedValue(true),
  ...overrides
})

export const createMockUseInvitations = (overrides: any = {}) => ({
  pendingInvitations: computed(() => overrides.pendingInvitations ?? []),
  receivedInvitations: computed(() => overrides.receivedInvitations ?? [mockSiteInvitation]),
  isLoading: computed(() => overrides.isLoading ?? false),
  hasReceivedInvitations: computed(() => overrides.hasReceivedInvitations ?? true),
  receivedInvitationsCount: computed(() => overrides.receivedInvitationsCount ?? 2),
  loadReceivedInvitations: vi.fn(),
  loadSiteInvitations: vi.fn(),
  sendInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
  rejectInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  ...overrides
})

export const createMockUseI18n = (overrides: any = {}) => ({
  currentLanguage: computed(() => overrides.currentLanguage ?? 'en'),
  setLanguage: vi.fn(),
  t: vi.fn((key: string) => overrides.translations?.[key] ?? key),
  availableLanguages: overrides.availableLanguages ?? [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' }
  ],
  ...overrides
})

export const createMockUsePWA = (overrides: any = {}) => ({
  isInstallable: computed(() => overrides.isInstallable ?? false),
  isInstalled: computed(() => overrides.isInstalled ?? false),
  isOnline: computed(() => overrides.isOnline ?? true),
  updateAvailable: computed(() => overrides.updateAvailable ?? false),
  installApp: vi.fn(),
  updateApp: vi.fn(),
  requestNotificationPermission: vi.fn(),
  showNotification: vi.fn(),
  addToOfflineQueue: vi.fn(),
  initializePWA: vi.fn(),
  ...overrides
})

export const createMockUseSubscription = (overrides: any = {}) => ({
  currentSubscription: computed(() => overrides.currentSubscription ?? null),
  currentPlan: computed(() => overrides.currentPlan ?? {
    id: 'plan-1',
    name: 'Free Plan',
    price: 0,
    currency: 'USD',
    features: {
      max_items: 50,
      max_vendors: 10,
      max_incoming_deliveries: 20,
      max_service_bookings: 10,
      max_payments: 30,
      max_sites: 1
    },
    is_active: true,
    is_default: true
  }),
  currentUsage: computed(() => overrides.currentUsage ?? {}),
  usageLimits: computed(() => overrides.usageLimits ?? {
    items: { current: 5, max: 50, exceeded: false },
    vendors: { current: 2, max: 10, exceeded: false },
    incoming_deliveries: { current: 3, max: 20, exceeded: false },
    service_bookings: { current: 1, max: 10, exceeded: false },
    payments: { current: 4, max: 30, exceeded: false }
  }),
  isLoading: computed(() => overrides.isLoading ?? false),
  error: computed(() => overrides.error ?? null),
  isReadOnly: computed(() => overrides.isReadOnly ?? false),
  isSubscriptionActive: computed(() => overrides.isSubscriptionActive ?? true),
  availablePlans: computed(() => overrides.availablePlans ?? []),
  loadSubscription: vi.fn(),
  loadPlans: vi.fn(),
  loadUsage: vi.fn(),
  subscribe: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  checkUsageLimit: vi.fn().mockReturnValue(false),
  formatCurrency: vi.fn().mockReturnValue('$0.00'),
  ...overrides
})

export const createMockUseTheme = (overrides: any = {}) => ({
  theme: computed(() => overrides.theme ?? 'light'),
  toggleTheme: vi.fn(),
  setTheme: vi.fn(),
  ...overrides
})

export const createMockUsePermissions = (overrides: any = {}) => ({
  permissions: computed(() => overrides.permissions ?? {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canManageRoles: true,
    canExport: true,
    canViewFinancials: true
  }),
  hasPermission: vi.fn().mockReturnValue(true),
  ...overrides
})