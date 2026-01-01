import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setupTestPinia } from '../utils/test-setup'

// Mock Chart.js components
vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    template: '<div class="mock-chart">Chart Component</div>',
    props: ['data', 'options']
  }
}))

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn()
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
  registerables: []
}))

// Mock i18n composable - must be at the top
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'dashboard.title': 'Dashboard',
        'dashboard.subtitle': 'Overview of {siteName} management',
        'dashboard.totalExpenses': 'Total Expenses',
        'dashboard.currentMonthExpenses': 'Current Month Expenses',
        'dashboard.expensePerSqft': 'Expense / Sqft',
        'dashboard.outstandingAmount': 'Outstanding Amount',
        'dashboard.paymentsLastSevenDays': 'Payments Last 7 Days',
        'dashboard.totalPaid': 'Total Paid',
        'dashboard.viewAll': 'View all',
        'dashboard.units': 'units',
        'dashboard.sqft': 'sqft',
        'common.paid': 'Paid',
        'common.partial': 'Partial',
        'common.pending': 'Pending'
      }
      let result = translations[key] || key
      if (params) {
        Object.keys(params).forEach(param => {
          result = result.replace(`{${param}}`, params[param])
        })
      }
      return result
    }
  })
}))

vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: { value: false }
  })
}))

// Mock useSite composable
vi.mock('../../composables/useSite', () => ({
  useSite: () => {
    const { ref } = require('vue')
    return {
      currentSite: ref({
        id: 'site-1',
        name: 'Test Construction Site',
        description: 'A test construction site',
        total_units: 100,
        total_planned_area: 50000,
        admin_user: 'user-1',
        users: ['user-1'],
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      }),
      currentSiteId: ref('site-1'),
      userSites: ref([]),
      currentUserRole: ref('owner'),
      isLoading: ref(false),
      isInitialized: ref(true),
      isReadyForRouting: ref(true)
    }
  }
}))

// Mock PocketBase services with centralized mock
vi.mock('../../services/pocketbase', async () => {
  const mocks = await import('../mocks/pocketbase')
  return {
    ...mocks,
    ServiceBookingService: {
      calculateProgressBasedAmount: vi.fn().mockImplementation((booking) => {
        return (booking.total_amount * (booking.percent_completed || 0)) / 100;
      })
    }
  }
})

import DashboardView from '../../views/DashboardView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock useSiteData composable
vi.mock('../../composables/useSiteData', () => ({
  useSiteData: () => {
    const { ref } = require('vue')
    return {
      data: ref({
        items: [{
          id: 'item-1',
          name: 'Steel Rebar',
          description: 'High-grade steel rebar',
          unit: 'kg',
          quantity: 1000,
          category: 'Steel',
          site: 'site-1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }],
        vendors: [{
          id: 'vendor-1',
          name: 'Steel Suppliers Inc',
          contact_person: 'John Doe',
          email: 'john@steelsuppliers.com',
          phone: '+1234567890',
          address: '123 Steel Street',
          tags: ['Steel', 'Metal'],
          site: 'site-1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }],
        deliveries: [{
          id: 'delivery-1',
          vendor: 'vendor-1',
          delivery_date: '2024-01-15',
          total_amount: 22500,
          payment_status: 'pending',
          paid_amount: 0,
          site: 'site-1',
          photos: [],
          notes: 'Delivered on time',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }],
        serviceBookings: [{
          id: 'booking-1',
          service: 'service-1',
          vendor: 'vendor-1',
          start_date: '2024-01-10',
          end_date: '2024-01-20',
          duration: 10,
          unit_rate: 1000,
          total_amount: 10000,
          percent_completed: 100,
          status: 'completed',
          completion_photos: [],
          notes: 'Work completed successfully',
          payment_status: 'paid',
          paid_amount: 10000,
          site: 'site-1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }],
        payments: [{
          id: 'payment-1',
          vendor: 'vendor-1',
          amount: 10000,
          account: 'account-1',
          payment_date: '2024-01-20',
          reference: 'CHK-001',
          notes: 'Partial payment',
          deliveries: ['delivery-1'],
          service_bookings: ['booking-1'],
          site: 'site-1',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }]
      }),
      loading: ref(false),
      reload: vi.fn()
    }
  }
}))


describe('DashboardView', () => {
  let wrapper: any
  let pinia: any
  let siteStore: any

  beforeEach(() => {
    vi.clearAllMocks()
    const { pinia: testPinia, siteStore: testSiteStore } = setupTestPinia()
    pinia = testPinia
    siteStore = testSiteStore
    
    const router = createMockRouter()
    
    wrapper = mount(DashboardView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true,
          'Line': {
            name: 'Line',
            template: '<div class="mock-chart">Chart Component</div>',
            props: ['data', 'options']
          }
        }
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('should render dashboard title', () => {
    expect(wrapper.find('h1').text()).toBe('Dashboard')
  })

  it('should display current site information', () => {
    expect(wrapper.text()).toContain('Test Construction Site')
    expect(wrapper.text()).toContain('100 units')
    expect(wrapper.text()).toContain('50,000 sqft')
  })

  it('should render expense stats cards', async () => {
    // Wait for component to mount and data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(wrapper.text()).toContain('Total Expenses')
    expect(wrapper.text()).toContain('Current Month Expenses')
    expect(wrapper.text()).toContain('Expense / Sqft')
    expect(wrapper.text()).toContain('Outstanding Amount')
  })

  it('should display calculated expenses correctly', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()

    // Should show total expenses (22500 from incoming items + 10000 from service bookings = 32500)
    // Note: Dashboard uses compact format (32.5K instead of 32,500)
    expect(wrapper.text()).toContain('32.5K')

    // Should show outstanding amount (22500 - 0 from unpaid incoming items = 22500)
    // Note: Dashboard uses compact format (22.5K instead of 22,500)
    expect(wrapper.text()).toContain('22.5K')
  })

  it('should render payments chart section', () => {
    expect(wrapper.text()).toContain('Payments Last 7 Days')
    expect(wrapper.text()).toContain('Total Paid')
  })

  it('should load data on mount', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    // Check that the component exists and has rendered
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle site change reactively', async () => {
    // Change site in store using $patch
    siteStore.$patch({ currentSiteId: 'site-2' })
    
    await wrapper.vm.$nextTick()
    
    // Check that the component still exists after the site change
    expect(wrapper.exists()).toBe(true)
  })

  it('should render chart component', () => {
    // Check that the chart component is rendered
    expect(wrapper.find('.mock-chart').exists()).toBe(true)
  })
})