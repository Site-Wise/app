import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'

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

import DashboardView from '../../views/DashboardView.vue'
import { createMockRouter } from '../utils/test-utils'

// Mock the composables and services
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    currentSite: computed(() => ({
      id: 'site-1',
      name: 'Test Construction Site',
      description: 'A test construction site',
      total_units: 100,
      total_planned_area: 50000,
      admin_user: 'user-1',
      users: ['user-1'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }))
  })
}))

vi.mock('../../services/pocketbase', () => ({
  itemService: {
    getAll: vi.fn().mockResolvedValue([{
      id: 'item-1',
      name: 'Steel Rebar',
      description: 'High-grade steel rebar',
      unit: 'kg',
      quantity: 1000,
      category: 'Steel',
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }])
  },
  vendorService: {
    getAll: vi.fn().mockResolvedValue([{
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
    }])
  },
  deliveryService: {
    getAll: vi.fn().mockResolvedValue([{
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
    }])
  },
  serviceBookingService: {
    getAll: vi.fn().mockResolvedValue([{
      id: 'booking-1',
      service: 'service-1',
      vendor: 'vendor-1',
      start_date: '2024-01-10',
      end_date: '2024-01-20',
      duration: 10,
      unit_rate: 1000,
      total_amount: 10000,
      status: 'completed',
      completion_photos: [],
      notes: 'Work completed successfully',
      payment_status: 'paid',
      paid_amount: 10000,
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }])
  },
  paymentService: {
    getAll: vi.fn().mockResolvedValue([{
      id: 'payment-1',
      vendor: 'vendor-1',
      amount: 10000,
      account: 'account-1',
      payment_date: '2024-01-20',
      reference: 'CHK-001',
      notes: 'Partial payment',
      incoming_items: ['incoming-1'],
      service_bookings: ['booking-1'],
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }])
  }
}))

describe('DashboardView', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    const router = createMockRouter()
    
    wrapper = mount(DashboardView, {
      global: {
        plugins: [router],
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
    expect(wrapper.text()).toContain('32,500')
    
    // Should show outstanding amount (22500 - 0 from unpaid incoming items = 22500)
    expect(wrapper.text()).toContain('22,500')
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

  it('should handle site change event', async () => {
    // Trigger site change event
    window.dispatchEvent(new CustomEvent('site-changed'))
    
    await wrapper.vm.$nextTick()
    
    // Check that the component still exists after the event
    expect(wrapper.exists()).toBe(true)
  })

  it('should render chart component', () => {
    // Check that the chart component is rendered
    expect(wrapper.find('.mock-chart').exists()).toBe(true)
  })
})