import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setupTestPinia } from '../utils/test-setup'

// Mock useSiteData to return controlled data
vi.mock('../../composables/useSiteData', () => ({
  useSiteData: vi.fn()
}))

// Mock useSite composable
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    currentSiteId: { value: 'site-1' },
    isInitialized: { value: true }
  })
}))

// Mock site store
vi.mock('../../stores/site', () => ({
  useSiteStore: () => ({
    currentSiteId: 'site-1',
    isInitialized: true,
    $patch: vi.fn()
  })
}))

// All mocks must be at the top before any imports
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'services.title': 'Services',
        'services.subtitle': 'Manage your construction services and bookings',
        'services.addService': 'Add Service',
        'services.editService': 'Edit Service',
        'services.deleteService': 'Delete Service',
        'services.noServices': 'No services',
        'services.getStarted': 'Get started by creating a new service.',
        'services.serviceName': 'Service Name',
        'services.serviceType': 'Service Type',
        'services.category': 'Category',
        'services.unit': 'Unit',
        'services.standardRate': 'Standard Rate',
        'services.totalBookings': 'Total Bookings',
        'services.avgRate': 'Avg. Rate',
        'services.totalServices': 'Total Services',
        'services.laborServices': 'Labor Services',
        'services.equipmentServices': 'Equipment Services',
        'services.isActive': 'Is Active',
        'services.activate': 'Activate',
        'services.deactivate': 'Deactivate',
        'services.categories.labor': 'Labor',
        'services.categories.equipment': 'Equipment',
        'services.categories.professional': 'Professional',
        'services.categories.transport': 'Transport',
        'services.categories.other': 'Other',
        'services.units.hour': 'Hour',
        'services.units.day': 'Day',
        'services.units.job': 'Job',
        'services.units.sqft': 'Sq.ft',
        'services.units.month': 'Month',
        'forms.enterServiceName': 'Enter service name',
        'forms.enterServiceType': 'Enter service type',
        'forms.selectCategory': 'Select category',
        'forms.selectUnit': 'Select unit',
        'forms.enterRate': 'Enter rate',
        'forms.enterServiceDescription': 'Enter service description',
        'common.name': 'Name',
        'common.description': 'Description',
        'common.type': 'Type',
        'common.update': 'Update',
        'common.create': 'Create',
        'common.cancel': 'Cancel',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.inactive': 'Inactive',
        'messages.confirmDelete': 'Are you sure you want to delete this {item}?',
        'messages.error': 'An error occurred',
        'tags.serviceTags': 'Service Tags',
        'tags.searchServiceTags': 'Search service tags...'
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

vi.mock('../../composables/usePermissions', () => ({
  usePermissions: () => ({
    canCreate: { value: true },
    canUpdate: { value: true },
    canDelete: { value: true }
  })
}))

vi.mock('../../components/TagSelector.vue', () => ({
  default: {
    name: 'TagSelector',
    template: '<div class="tag-selector-mock">Tag Selector</div>',
    props: ['modelValue', 'label', 'tagType', 'placeholder'],
    emits: ['update:modelValue']
  }
}))

vi.mock('../../services/pocketbase', () => {
  const mockService = {
    id: 'service-1',
    name: 'Test Service',
    service_type: 'Construction',
    category: 'labor' as const,
    unit: 'hour',
    standard_rate: 100,
    description: 'Test service description',
    tags: ['tag-1', 'tag-2'],
    is_active: true,
    site: 'site-1'
  }
  
  const mockServiceBooking = {
    id: 'booking-1',
    service: 'service-1',
    duration: 8,
    total_amount: 800,
    site: 'site-1'
  }
  
  const mockTags = [
    { id: 'tag-1', name: 'Plumbing', color: '#ef4444', type: 'service_category', site: 'site-1', usage_count: 5 },
    { id: 'tag-2', name: 'Electrical', color: '#22c55e', type: 'service_category', site: 'site-1', usage_count: 3 }
  ]
  
  return {
    serviceService: {
      getAll: vi.fn().mockResolvedValue([mockService]),
      create: vi.fn().mockResolvedValue({ id: 'new-service' }),
      update: vi.fn().mockResolvedValue(mockService),
      delete: vi.fn().mockResolvedValue(true)
    },
    serviceBookingService: {
      getAll: vi.fn().mockResolvedValue([mockServiceBooking])
    },
    tagService: {
      getAll: vi.fn().mockResolvedValue(mockTags),
      findOrCreate: vi.fn().mockResolvedValue(mockTags[0]),
      incrementUsage: vi.fn().mockResolvedValue(undefined)
    },
    getCurrentSiteId: vi.fn().mockReturnValue('site-1')
  }
})

// Import dependencies after all mocks
import ServicesView from '../../views/ServicesView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('ServicesView', () => {
  let wrapper: any
  let pinia: any
  let siteStore: any

  const createWrapper = () => {
    const router = createMockRouter()
    
    return mount(ServicesView, {
      global: {
        plugins: [router, pinia],
        stubs: {
          'router-link': true,
          'TagSelector': {
            template: '<div class="tag-selector">Tag Selector Mock</div>',
            props: ['modelValue', 'label', 'tagType', 'placeholder'],
            emits: ['update:modelValue']
          }
        }
      }
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    
    pinia = createPinia()
    setActivePinia(pinia)
    
    const { useSiteStore } = await import('../../stores/site')
    siteStore = useSiteStore()
    siteStore.currentSiteId = 'site-1'
    siteStore.isInitialized = true
    
    // Mock data
    const mockServices = [{
      id: 'service-1',
      name: 'Test Service',
      service_type: 'Construction',
      category: 'labor' as const,
      unit: 'hour',
      standard_rate: 100,
      description: 'Test service description',
      tags: ['tag-1', 'tag-2'],
      is_active: true,
      site: 'site-1'
    }]
    
    const mockServiceBookings = [{
      id: 'booking-1',
      service: 'service-1',
      duration: 8,
      total_amount: 800,
      site: 'site-1'
    }]
    
    const mockTags = [
      { id: 'tag-1', name: 'Plumbing', color: '#ef4444', type: 'service_category', site: 'site-1', usage_count: 5 },
      { id: 'tag-2', name: 'Electrical', color: '#22c55e', type: 'service_category', site: 'site-1', usage_count: 3 }
    ]
    
    // Mock useSiteData to return different data based on the service function passed
    const { useSiteData } = await import('../../composables/useSiteData')
    const reloadServices = vi.fn()
    
    vi.mocked(useSiteData).mockImplementation((serviceFunction) => {
      const { ref } = require('vue')
      
      // Check the function to determine which data to return
      const funcString = serviceFunction.toString()
      
      if (funcString.includes('serviceService.getAll')) {
        return {
          data: ref(mockServices),
          loading: ref(false),
          error: ref(null),
          reload: reloadServices
        }
      } else if (funcString.includes('serviceBookingService.getAll')) {
        return {
          data: ref(mockServiceBookings),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      } else if (funcString.includes('tagService.getAll')) {
        return {
          data: ref(mockTags),
          loading: ref(false),
          error: ref(null),
          reload: vi.fn()
        }
      }
      
      // Default fallback
      return {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        reload: vi.fn()
      }
    })
    
    wrapper = createWrapper()
    
    // Store reload function for later tests
    ;(wrapper as any).reloadServices = reloadServices
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('should render services page title', () => {
    expect(wrapper.find('h1').text()).toBe('Services')
  })

  it('should render add service button', () => {
    const buttons = wrapper.findAll('button')
    const addButton = buttons.find((btn: any) => btn.text().includes('Add Service'))
    expect(addButton).toBeDefined()
    expect(addButton.exists()).toBe(true)
  })

  it('should display services in grid', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(wrapper.text()).toContain('Test Service')
    expect(wrapper.text()).toContain('Construction')
    expect(wrapper.text()).toContain('hour')
  })

  it('should display service tags with colors', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Check that tags are displayed
    expect(wrapper.text()).toContain('Plumbing')
    expect(wrapper.text()).toContain('Electrical')
    
    // Check for tag spans with correct styling
    const tagElements = wrapper.findAll('span[style*="background"]')
    expect(tagElements.length).toBeGreaterThan(0)
  })

  it('should show add modal when add button is clicked', async () => {
    // Wait for component to mount
    await wrapper.vm.$nextTick()
    
    const buttons = wrapper.findAll('button')
    const addButton = buttons.find((btn: any) => btn.text().includes('Add Service'))
    expect(addButton).toBeDefined()
    
    await addButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.fixed').exists()).toBe(true)
    expect(wrapper.text()).toContain('Add Service')
  })

  it('should render TagSelector in modal form', async () => {
    // Open modal
    const buttons = wrapper.findAll('button')
    const addButton = buttons.find((btn: any) => btn.text().includes('Add Service'))
    await addButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Check that TagSelector is present
    expect(wrapper.find('.tag-selector').exists()).toBe(true)
  })

  it('should handle service creation with tags', async () => {
    const { serviceService } = await import('../../services/pocketbase')
    const mockCreate = vi.mocked(serviceService.create)
    
    // Capture the original create function to spy on actual arguments
    let capturedFormData: any = null
    mockCreate.mockImplementation((formData) => {
      capturedFormData = { ...formData }
      return Promise.resolve({ id: 'new-service' })
    })
    
    // Open modal
    const buttons = wrapper.findAll('button')
    const addButton = buttons.find((btn: any) => btn.text().includes('Add Service'))
    await addButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Set form data including tags using the specific properties
    wrapper.vm.form.name = 'New Service'
    wrapper.vm.form.service_type = 'New Type'
    wrapper.vm.form.category = 'labor'
    wrapper.vm.form.unit = 'hour'
    wrapper.vm.form.standard_rate = 150
    wrapper.vm.form.tags = ['tag-1', 'tag-2']
    await wrapper.vm.$nextTick()
    
    // Verify form data is set correctly before submit
    expect(wrapper.vm.form.name).toBe('New Service')
    expect(wrapper.vm.form.tags).toEqual(['tag-1', 'tag-2'])
    
    // Submit form
    await wrapper.vm.saveService()
    
    // Check that the service was called with the form data
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(capturedFormData).toBeDefined()
    expect(capturedFormData.name).toBe('New Service')
    expect(capturedFormData.service_type).toBe('New Type')
    expect(capturedFormData.category).toBe('labor')
    expect(capturedFormData.tags).toEqual(['tag-1', 'tag-2'])
    
    // Verify reload was called - use the stored reload function
    expect((wrapper as any).reloadServices).toHaveBeenCalled()
  })

  it('should handle service editing with tag preservation', async () => {
    const { serviceService } = await import('../../services/pocketbase')
    const mockUpdate = vi.mocked(serviceService.update)
    
    // Capture the update function to spy on actual arguments
    let capturedId: string | null = null
    let capturedFormData: any = null
    mockUpdate.mockImplementation((id, formData) => {
      capturedId = id
      capturedFormData = { ...formData }
      return Promise.resolve(formData)
    })
    
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Mock service with tags
    const mockService = {
      id: 'service-1',
      name: 'Test Service',
      service_type: 'Construction',
      category: 'labor' as const,
      unit: 'hour',
      standard_rate: 100,
      description: 'Test description',
      tags: ['tag-1', 'tag-2'],
      is_active: true
    }
    
    // Call edit method
    wrapper.vm.editService(mockService)
    await wrapper.vm.$nextTick()
    
    // Verify form is populated with tags
    expect(wrapper.vm.form.tags).toEqual(['tag-1', 'tag-2'])
    expect(wrapper.vm.form.name).toBe('Test Service')
    
    // Update only the name
    wrapper.vm.form.name = 'Updated Service'
    await wrapper.vm.$nextTick()
    
    await wrapper.vm.saveService()
    
    // Check that the service was called with the updated form data
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(capturedId).toBe('service-1')
    expect(capturedFormData).toBeDefined()
    expect(capturedFormData.name).toBe('Updated Service')
    expect(capturedFormData.service_type).toBe('Construction')
    expect(capturedFormData.category).toBe('labor')
    expect(capturedFormData.tags).toEqual(['tag-1', 'tag-2'])
  })

  it('should toggle service status', async () => {
    const { serviceService } = await import('../../services/pocketbase')
    const mockUpdate = vi.mocked(serviceService.update)
    
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const mockService = {
      id: 'service-1',
      is_active: true
    }
    
    await wrapper.vm.toggleServiceStatus(mockService)
    
    expect(mockUpdate).toHaveBeenCalledWith('service-1', { is_active: false })
  })

  it('should delete service with confirmation', async () => {
    const { serviceService } = await import('../../services/pocketbase')
    const mockDelete = vi.mocked(serviceService.delete)
    
    // Mock window.confirm
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    
    await wrapper.vm.deleteService('service-1')
    
    expect(mockDelete).toHaveBeenCalledWith('service-1')
  })

  it('should calculate service statistics correctly', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Check computed properties
    expect(wrapper.vm.activeServicesCount).toBe(1)
    expect(wrapper.vm.laborServicesCount).toBe(1)
    expect(wrapper.vm.equipmentServicesCount).toBe(0)
    expect(wrapper.vm.totalBookingsCount).toBe(1)
  })

  it('should handle service bookings count calculation', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const count = wrapper.vm.getServiceBookingsCount('service-1')
    expect(count).toBe(1)
  })

  it('should calculate average rate correctly', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const avgRate = wrapper.vm.getServiceAverageRate('service-1')
    expect(avgRate).toBe(100) // 800 total amount / 8 duration
  })

  it('should handle navigation to service detail', async () => {
    const router = wrapper.vm.$router
    const pushSpy = vi.spyOn(router, 'push')
    
    await wrapper.vm.viewServiceDetail('service-1')
    
    expect(pushSpy).toHaveBeenCalledWith('/services/service-1')
  })

  it('should close modal and reset form', async () => {
    // Open modal
    wrapper.vm.showAddModal = true
    wrapper.vm.form.name = 'Test'
    wrapper.vm.form.tags = ['tag-1']
    await wrapper.vm.$nextTick()
    
    // Close modal
    wrapper.vm.closeModal()
    await wrapper.vm.$nextTick()
    
    expect(wrapper.vm.showAddModal).toBe(false)
    expect(wrapper.vm.form.name).toBe('')
    expect(wrapper.vm.form.tags).toEqual([])
  })

  it('should handle quick action for add modal', async () => {
    wrapper.vm.handleQuickAction()
    await wrapper.vm.$nextTick()
    
    expect(wrapper.vm.showAddModal).toBe(true)
  })

  it('should load tags and map them to services correctly', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Check that serviceTags map is populated
    const serviceTagsMap = wrapper.vm.serviceTags
    expect(serviceTagsMap.has('service-1')).toBe(true)
    
    const serviceTags = serviceTagsMap.get('service-1')
    expect(serviceTags).toBeDefined()
    expect(serviceTags.length).toBe(2)
    expect(serviceTags[0].name).toBe('Plumbing')
    expect(serviceTags[1].name).toBe('Electrical')
  })

  it('should display summary cards with correct data', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(wrapper.text()).toContain('Total Services')
    expect(wrapper.text()).toContain('Labor Services')
    expect(wrapper.text()).toContain('Equipment Services')
    expect(wrapper.text()).toContain('Total Bookings')
  })
})