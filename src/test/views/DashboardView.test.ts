import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardView from '../../views/DashboardView.vue'
import { createMockRouter } from '../utils/test-utils'
import { mockSite, mockItem, mockVendor, mockIncomingItem, mockQuotation } from '../mocks/pocketbase'

// Mock the composables and services
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    currentSite: { value: mockSite }
  })
}))

vi.mock('../../services/pocketbase', () => ({
  itemService: {
    getAll: vi.fn().mockResolvedValue([mockItem])
  },
  vendorService: {
    getAll: vi.fn().mockResolvedValue([mockVendor])
  },
  quotationService: {
    getAll: vi.fn().mockResolvedValue([mockQuotation])
  },
  incomingItemService: {
    getAll: vi.fn().mockResolvedValue([mockIncomingItem])
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
    expect(wrapper.text()).toContain(mockSite.name)
    expect(wrapper.text()).toContain(`${mockSite.total_units} units`)
    expect(wrapper.text()).toContain(`${mockSite.total_planned_area.toLocaleString()} sqft`)
  })

  it('should render stats cards', () => {
    expect(wrapper.text()).toContain('Total Items')
    expect(wrapper.text()).toContain('Active Vendors')
    expect(wrapper.text()).toContain('Pending Deliveries')
    expect(wrapper.text()).toContain('Outstanding Amount')
  })

  it('should display correct stats', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('1') // Total items
    expect(wrapper.text()).toContain('1') // Total vendors
  })

  it('should render recent deliveries section', () => {
    expect(wrapper.text()).toContain('Recent Deliveries')
  })

  it('should render pending quotations section', () => {
    expect(wrapper.text()).toContain('Pending Quotations')
  })

  it('should render payment status overview', () => {
    expect(wrapper.text()).toContain('Payment Status Overview')
    expect(wrapper.text()).toContain('Paid')
    expect(wrapper.text()).toContain('Partial')
    expect(wrapper.text()).toContain('Pending')
  })

  it('should load data on mount', async () => {
    const { itemService, vendorService, quotationService, incomingItemService } = await import('../../services/pocketbase')
    
    expect(itemService.getAll).toHaveBeenCalled()
    expect(vendorService.getAll).toHaveBeenCalled()
    expect(quotationService.getAll).toHaveBeenCalled()
    expect(incomingItemService.getAll).toHaveBeenCalled()
  })

  it('should handle site change event', async () => {
    const { itemService } = await import('../../services/pocketbase')
    
    // Clear previous calls
    vi.clearAllMocks()
    
    // Trigger site change event
    window.dispatchEvent(new CustomEvent('site-changed'))
    
    await wrapper.vm.$nextTick()
    
    expect(itemService.getAll).toHaveBeenCalled()
  })
})