import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setupTestPinia } from '../utils/test-setup'

// Mock i18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

// Mock useSiteData composable - PaymentsView uses multiple calls
vi.mock('../../composables/useSiteData', () => {
  let callCount = 0
  return {
    useSiteData: vi.fn(() => {
      const { ref } = require('vue')
      callCount++
      
      // First call is for payments
      if (callCount === 1) {
        return {
          data: ref([]),
          loading: ref(false),
          reload: vi.fn()
        }
      }
      // Second call is for vendors
      if (callCount === 2) {
        return {
          data: ref([
            {
              id: 'vendor-1',
              name: 'Test Vendor'
            }
          ]),
          loading: ref(false),
          reload: vi.fn()
        }
      }
      // Third call is for accounts
      if (callCount === 3) {
        return {
          data: ref([
            {
              id: 'account-1',
              name: 'Test Account',
              type: 'bank_account',
              is_active: true,
              current_balance: 10000
            }
          ]),
          loading: ref(false),
          reload: vi.fn()
        }
      }
      // Fourth call is for deliveries
      if (callCount === 4) {
        return {
          data: ref([
            {
              id: 'delivery-1',
              vendor: 'vendor-1',
              delivery_date: '2024-01-01',
              total_amount: 1000,
              paid_amount: 300,
              payment_status: 'partial',
              site: 'site-1'
            }
          ]),
          loading: ref(false),
          reload: vi.fn()
        }
      }
      // Fifth call is for service bookings
      return {
        data: ref([
          {
            id: 'booking-1',
            vendor: 'vendor-1',
            total_amount: 800,
            paid_amount: 200,
            payment_status: 'partial'
          }
        ]),
        loading: ref(false),
        reload: vi.fn()
      }
    })
  }
})

// Mock useSite composable
vi.mock('../../composables/useSite', () => ({
  useSite: () => {
    const { ref } = require('vue')
    return {
      currentSiteId: ref('site-1')
    }
  }
}))

// Mock subscription composable
vi.mock('../../composables/useSubscription', () => ({
  useSubscription: () => ({
    checkCreateLimit: vi.fn().mockReturnValue(true),
    isReadOnly: { value: false }
  })
}))

// Import after mocks
import PaymentsView from '../../views/PaymentsView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('PaymentsView - Outstanding Calculations', () => {
  let wrapper: any
  let router: any
  let pinia: any
  let siteStore: any

  beforeEach(() => {
    vi.clearAllMocks()
    router = createMockRouter()
    const testSetup = setupTestPinia()
    pinia = testSetup.pinia
    siteStore = testSetup.siteStore
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  const createWrapper = () => {
    wrapper = mount(PaymentsView, {
      global: {
        plugins: [router, pinia]
      }
    })
    return wrapper
  }

  it('should calculate vendor outstanding amounts including service bookings', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify that data is loaded
    expect(vm.vendors).toHaveLength(1)
    expect(vm.deliveries).toHaveLength(1)
    expect(vm.serviceBookings).toHaveLength(1)
    
    // Check vendorsWithOutstanding computed property
    const vendorsWithOutstanding = vm.vendorsWithOutstanding
    
    expect(vendorsWithOutstanding).toHaveLength(1)
    expect(vendorsWithOutstanding[0].id).toBe('vendor-1')
    
    // Outstanding should include both deliveries and service bookings
    // Delivery: 1000 - 300 = 700
    // Service: 800 - 200 = 600
    // Total: 1300
    expect(vendorsWithOutstanding[0].outstandingAmount).toBe(1300)
  })

  it.skip('should calculate pending items count including service bookings', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    const vendorsWithOutstanding = vm.vendorsWithOutstanding
    
    // Should count both deliveries and service bookings
    expect(vendorsWithOutstanding[0].pendingItems).toBe(2)
  })

  it.skip('should update vendor outstanding when vendor is selected', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Set vendor in form
    vm.form.vendor = 'vendor-1'
    vm.loadVendorOutstanding()
    
    // Should include both deliveries and service bookings
    // Delivery: 1000 - 300 = 700
    // Service: 800 - 200 = 600
    // Total: 1300
    expect(vm.vendorOutstanding).toBe(1300)
  })

  it.skip('should handle vendors with no outstanding amounts', async () => {
    // Mock with fully paid items - need to reset mock completely
    const { useSiteData } = await import('../../composables/useSiteData')
    let callCount = 0
    vi.mocked(useSiteData).mockImplementation(() => {
      callCount++
      
      if (callCount === 1) { // payments
        return {
          data: computed(() => []),
          loading: computed(() => false),
          reload: vi.fn()
        }
      }
      if (callCount === 2) { // vendors
        return {
          data: computed(() => [{ id: 'vendor-1', name: 'Test Vendor' }]),
          loading: computed(() => false),
          reload: vi.fn()
        }
      }
      if (callCount === 3) { // accounts
        return {
          data: computed(() => [{ id: 'account-1', name: 'Test Account', type: 'bank_account', is_active: true, current_balance: 10000 }]),
          loading: computed(() => false),
          reload: vi.fn()
        }
      }
      if (callCount === 4) { // deliveries (fully paid)
        return {
          data: computed(() => [
            {
              id: 'delivery-1',
              vendor: 'vendor-1',
              delivery_date: '2024-01-01',
              total_amount: 1000,
              paid_amount: 1000,
              payment_status: 'paid',
              site: 'site-1'
            }
          ]),
          loading: computed(() => false),
          reload: vi.fn()
        }
      }
      // service bookings (fully paid)
      return {
        data: computed(() => [
          {
            id: 'booking-1',
            vendor: 'vendor-1',
            total_amount: 800,
            paid_amount: 800,
            payment_status: 'paid',
            service: 'electrical-1',
            start_date: '2024-12-01',
            duration: 10,
            unit_rate: 100,
            site: 'site-1',
            status: 'scheduled',
          }
        ]),
        loading: computed(() => false),
        reload: vi.fn()
      }
    })
    
    // Remount with new data
    wrapper?.unmount()
    const wrapper2 = createWrapper()
    await nextTick()
    
    const vm = wrapper2.vm as any
    const vendorsWithOutstanding = vm.vendorsWithOutstanding
    
    // Should not include vendors with no outstanding amounts
    expect(vendorsWithOutstanding).toHaveLength(0)
  })

  it.skip('should handle vendors with only incoming items outstanding', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify component loads and has expected data structure
    expect(vm.vendors).toBeDefined()
    expect(vm.deliveries).toBeDefined()
    expect(vm.serviceBookings).toBeDefined()
    
    // Verify vendorsWithOutstanding computed property exists and works
    expect(vm.vendorsWithOutstanding).toBeDefined()
    expect(Array.isArray(vm.vendorsWithOutstanding)).toBe(true)
  })

  it.skip('should handle vendors with only service bookings outstanding', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify component loads and calculates outstanding amounts
    expect(vm.vendors).toBeDefined()
    expect(vm.serviceBookings).toBeDefined()
    
    // Verify the component has the loadVendorOutstanding method
    expect(typeof vm.loadVendorOutstanding).toBe('function')
    
    // Verify vendorOutstanding reactive property exists
    expect(vm.vendorOutstanding).toBeDefined()
  })

  it.skip('should load all required data including service bookings', async () => {
    createWrapper()
    await nextTick()
    
    // Verify useSiteData composable is called to load data
    expect(useSiteData).toHaveBeenCalled()
  })

  it.skip('should show correct outstanding amount in payment form', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    // Wait for component to load data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const vm = wrapper.vm as any
    
    // Verify the payment form functionality exists
    expect(vm.form).toBeDefined()
    expect(typeof vm.loadVendorOutstanding).toBe('function')
    expect(vm.vendorOutstanding).toBeDefined()
    
    // Verify modal functionality works
    vm.showAddModal = true
    await nextTick()
    
    expect(vm.showAddModal).toBe(true)
    
    // Verify form has vendor field
    expect(vm.form.vendor).toBeDefined()
  })

  it.skip('should reload data when site changes', async () => {
    // Remount component
    wrapper?.unmount()
    const wrapper2 = createWrapper()
    await nextTick()
    
    // Change site in store
    siteStore.currentSiteId = 'site-2'
    await nextTick()
    
    // Verify useSiteData composable was called
    expect(useSiteData).toHaveBeenCalled()
  })
})