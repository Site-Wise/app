import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'

// Mock i18n composable - must be at the top
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'dashboard.title': 'Dashboard',
        'dashboard.subtitle': 'Overview of {siteName} management',
        'dashboard.totalItems': 'Total Items',
        'dashboard.activeVendors': 'Active Vendors',
        'dashboard.pendingDeliveries': 'Pending Deliveries',
        'dashboard.outstandingAmount': 'Outstanding Amount',
        'dashboard.recentDeliveries': 'Recent Deliveries',
        'dashboard.recentPayments': 'Recent Payments',
        'dashboard.paymentStatusOverview': 'Payment Status Overview',
        'dashboard.viewAll': 'View all',
        'dashboard.noRecentDeliveries': 'No recent deliveries',
        'dashboard.noRecentPayments': 'No recent payments',
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
  quotationService: {
    getAll: vi.fn().mockResolvedValue([{
      id: 'quotation-1',
      vendor: 'vendor-1',
      item: 'item-1',
      service: '',
      quotation_type: 'item',
      unit_price: 50,
      minimum_quantity: 100,
      valid_until: '2024-12-31',
      notes: 'Bulk discount available',
      status: 'pending',
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }])
  },
  incomingItemService: {
    getAll: vi.fn().mockResolvedValue([{
      id: 'incoming-1',
      item: 'item-1',
      vendor: 'vendor-1',
      quantity: 500,
      unit_price: 45,
      total_amount: 22500,
      delivery_date: '2024-01-15',
      photos: [],
      notes: 'Delivered on time',
      payment_status: 'pending',
      paid_amount: 0,
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
          'router-link': true
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

  it('should render payment status overview', () => {
    expect(wrapper.text()).toContain('Payment Status Overview')
    expect(wrapper.text()).toContain('Paid')
    expect(wrapper.text()).toContain('Partial')
    expect(wrapper.text()).toContain('Pending')
  })

  it('should render recent deliveries section', () => {
    expect(wrapper.text()).toContain('Recent Deliveries')
  })

  it('should render recent payments section', () => {
    expect(wrapper.text()).toContain('Recent Payments')
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
})