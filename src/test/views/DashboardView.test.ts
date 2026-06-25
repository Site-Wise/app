import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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
        'dashboard.pendingRecovery': 'Pending Recovery',
        'dashboard.payments': 'Payments',
        'dashboard.last7Days': 'Last 7 days',
        'dashboard.last30Days': 'Last 30 days',
        'dashboard.expensePerSqft': 'Expense / Sqft',
        'dashboard.advances': 'Advances',
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
      }),
      calculateOutstandingAmountFromData: vi.fn().mockImplementation((booking, paidAmount) => {
        const progressAmount = (booking.total_amount * (booking.percent_completed || 0)) / 100;
        const outstanding = progressAmount - paidAmount;
        return outstanding > 0 ? outstanding : 0;
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
          updated: '2024-01-01T00:00:00Z',
          // Outstanding is attributed via the payment_allocations pivot, not payment.amount.
          // This 10000 is fully allocated to booking-1 (its progress-based due), leaving
          // delivery-1's 22500 unpaid → outstanding 22500.
          expand: {
            payment_allocations: [{
              id: 'alloc-1',
              payment: 'payment-1',
              service_booking: 'booking-1',
              allocated_amount: 10000,
              site: 'site-1'
            }]
          }
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
    // "Dashboard" moved into the eyebrow label ("Dashboard · <Month Year>");
    // the h1 now shows the site subtitle.
    expect(wrapper.find('.sw-eyebrow').text()).toContain('Dashboard')
    expect(wrapper.find('h1').text()).toContain('Overview of Test Construction Site management')
  })

  it('should display current site information', () => {
    const text = wrapper.text()
    expect(text).toContain('Test Construction Site')
    // Site stats render as separate spans (value + label)
    expect(text).toContain('100')
    expect(text).toContain('units')
    expect(text).toContain('50,000')
    expect(text).toContain('sqft')
  })

  it('should render expense stats cards', async () => {
    // Wait for component to mount and data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(wrapper.text()).toContain('Total Expenses')
    expect(wrapper.text()).toContain('Pending Recovery')
    expect(wrapper.text()).toContain('Advances')
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
    expect(wrapper.text()).toContain('Payments')
    expect(wrapper.text()).toContain('Last 7 days')
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

  it('should render chart component', async () => {
    // The chart is now lazy-loaded via defineAsyncComponent; let the async
    // component loader resolve before asserting it rendered.
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Check that the chart component is rendered
    expect(wrapper.find('.mock-chart').exists()).toBe(true)
  })

  describe('Recent Transactions row navigation', () => {
    let router: any
    let pushSpy: any
    let localWrapper: any

    beforeEach(async () => {
      const { pinia: testPinia } = setupTestPinia()
      router = createMockRouter()
      pushSpy = vi.spyOn(router, 'push').mockResolvedValue(undefined as any)

      localWrapper = mount(DashboardView, {
        global: {
          plugins: [router, testPinia],
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
      await flushPromises()
      await localWrapper.vm.$nextTick()
    })

    afterEach(() => {
      localWrapper?.unmount()
      pushSpy?.mockRestore()
    })

    // Rows are sorted by date desc. Mock data dates:
    //   payment  -> 2024-01-20
    //   delivery -> 2024-01-15
    //   booking  -> 2024-01-10
    // So clickable ledger rows render in order: [payment, delivery, booking].
    const getLedgerRows = () => localWrapper.findAll('tbody tr')

    it('navigates a payment row to /payments?paymentId=<id>', async () => {
      const rows = getLedgerRows()
      expect(rows.length).toBeGreaterThanOrEqual(3)
      await rows[0].trigger('click')
      expect(pushSpy).toHaveBeenCalledWith({
        path: '/payments',
        query: { paymentId: 'payment-1' }
      })
    })

    it('navigates a delivery row to /deliveries?id=<id>', async () => {
      const rows = getLedgerRows()
      await rows[1].trigger('click')
      expect(pushSpy).toHaveBeenCalledWith({
        path: '/deliveries',
        query: { id: 'delivery-1' }
      })
    })

    it('navigates a service booking row to /service-bookings?id=<id>', async () => {
      const rows = getLedgerRows()
      await rows[2].trigger('click')
      expect(pushSpy).toHaveBeenCalledWith({
        path: '/service-bookings',
        query: { id: 'booking-1' }
      })
    })

    it('marks navigable rows with cursor-pointer', () => {
      const rows = getLedgerRows()
      expect(rows[0].classes()).toContain('cursor-pointer')
    })
  })
})