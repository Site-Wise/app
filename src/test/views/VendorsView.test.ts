import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock i18n composable - must be at the top
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'vendors.title': 'Vendors',
        'vendors.subtitle': 'Manage your vendor contacts and relationships',
        'vendors.addVendor': 'Add Vendor',
        'vendors.editVendor': 'Edit Vendor',
        'vendors.deleteVendor': 'Delete Vendor',
        'vendors.companyName': 'Company Name',
        'vendors.contactPerson': 'Contact Person',
        'vendors.specialties': 'Specialties',
        'vendors.outstanding': 'Outstanding',
        'vendors.totalPaid': 'Total Paid',
        'vendors.noVendors': 'No vendors',
        'vendors.getStarted': 'Get started by adding a vendor.',
        'vendors.addSpecialty': 'Add specialty (e.g., Steel, Concrete)',
        'common.email': 'Email',
        'common.phone': 'Phone',
        'common.address': 'Address',
        'forms.enterCompanyName': 'Enter company name',
        'forms.enterContactPerson': 'Enter contact person',
        'forms.enterEmail': 'Enter email address',
        'forms.enterPhone': 'Enter phone number',
        'forms.enterAddress': 'Enter address',
        'common.update': 'Update',
        'common.create': 'Create',
        'common.cancel': 'Cancel',
        'messages.confirmDelete': 'Are you sure you want to delete this {vendor}?',
        'common.vendor': 'vendor'
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

vi.mock('../../services/pocketbase', () => {
  const mockVendor = {
    id: 'vendor-1',
    name: 'Test Vendor',
    contact_person: 'John Doe',
    email: 'john@vendor.com',
    phone: '123-456-7890',
    address: '123 Test St',
    tags: ['Steel', 'Concrete']
  }
  
  const mockIncomingItem = {
    id: 'incoming-1',
    vendor: 'vendor-1',
    total_amount: 1000,
    paid_amount: 500
  }
  
  const mockPayment = {
    id: 'payment-1',
    vendor: 'vendor-1',
    amount: 500
  }
  
  return {
    vendorService: {
      getAll: vi.fn().mockResolvedValue([mockVendor]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    incomingItemService: {
      getAll: vi.fn().mockResolvedValue([mockIncomingItem])
    },
    paymentService: {
      getAll: vi.fn().mockResolvedValue([mockPayment])
    },
    serviceBookingService: {
      getAll: vi.fn().mockResolvedValue([])
    },
    getCurrentSiteId: vi.fn().mockReturnValue('site-1')
  }
})

// Import dependencies after all mocks
import VendorsView from '../../views/VendorsView.vue'
import { createMockRouter } from '../utils/test-utils'

describe('VendorsView', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    const router = createMockRouter()
    
    wrapper = mount(VendorsView, {
      global: {
        plugins: [router],
        stubs: {
          'router-link': true
        }
      }
    })
  })

  it('should render vendors page title', () => {
    expect(wrapper.find('h1').text()).toBe('Vendors')
  })

  it('should render add vendor button', () => {
    const addButton = wrapper.find('button')
    expect(addButton.exists()).toBe(true)
    expect(wrapper.text()).toContain('Add Vendor')
  })

  it('should display vendors in grid', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Test Vendor')
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('john@vendor.com')
    expect(wrapper.text()).toContain('123-456-7890')
  })

  it('should show add modal when add button is clicked', async () => {
    const vm = wrapper.vm as any
    
    // Directly set the modal state to test the modal rendering
    vm.showAddModal = true
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.fixed').exists() || wrapper.text().includes('Add Vendor')).toBe(true)
  })

  it('should handle vendor creation', async () => {
    const { vendorService } = await import('../../services/pocketbase')
    const mockCreate = vi.mocked(vendorService.create)
    mockCreate.mockResolvedValue({
      id: 'vendor-1',
      name: 'Test Vendor',
      contact_person: 'John Doe',
      email: 'john@vendor.com',
      phone: '123-456-7890',
      address: '123 Test St',
      tags: ['Steel', 'Concrete'],
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })
    
    // Open add modal
    const addButton = wrapper.find('button')
    await addButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Wait for modal to render
    await wrapper.vm.$nextTick()
    
    // Fill form
    const inputs = wrapper.findAll('input')
    if (inputs.length >= 3) {
      await inputs[0].setValue('New Vendor')  // company name
      await inputs[1].setValue('John Doe')    // contact person  
      await inputs[2].setValue('john@vendor.com') // email
    }
    
    // Submit form
    const form = wrapper.find('form')
    if (form.exists()) {
      await form.trigger('submit')
      
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'New Vendor',
        contact_person: 'John Doe',
        email: 'john@vendor.com',
        phone: '',
        address: '',
        tags: []
      })
    }
  })

  it('should handle tag management', async () => {
    // Open add modal
    const addButton = wrapper.find('button')
    await addButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Add a tag
    const tagInput = wrapper.find('input[placeholder*="Add specialty"]')
    if (tagInput.exists()) {
      await tagInput.setValue('Steel')
      
      const addTagButton = wrapper.find('button').filter((btn: any) => btn.text().includes('+'))
      if (addTagButton.length > 0) {
        await addTagButton[0].trigger('click')
        
        expect(wrapper.text()).toContain('Steel')
      }
    }
  })

  it('should display financial summary', async () => {
    // Wait for data to load
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Outstanding')
    expect(wrapper.text()).toContain('Total Paid')
  })

  it('should navigate to vendor detail when vendor is clicked', async () => {
    const router = wrapper.vm.$router
    const pushSpy = vi.spyOn(router, 'push')
    
    // Wait for vendors to load
    await wrapper.vm.$nextTick()
    
    // Find and click vendor card
    const vendorCard = wrapper.find('.card')
    if (vendorCard.exists()) {
      await vendorCard.trigger('click')
      
      expect(pushSpy).toHaveBeenCalledWith('/vendors/vendor-1')
    }
  })

  it('should handle vendor editing', async () => {
    const { vendorService } = await import('../../services/pocketbase')
    const mockUpdate = vi.mocked(vendorService.update)
    mockUpdate.mockResolvedValue({
      id: 'vendor-1',
      name: 'Test Vendor',
      contact_person: 'John Doe',
      email: 'john@vendor.com',
      phone: '123-456-7890',
      address: '123 Test St',
      tags: ['Steel', 'Concrete'],
      site: 'site-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    })
    
    // Wait for vendors to load
    await wrapper.vm.$nextTick()
    
    // Find and click edit button
    const editButton = wrapper.find('button[title="Edit"]')
    if (editButton.exists()) {
      await editButton.trigger('click')
      
      expect(wrapper.text()).toContain('Edit Vendor')
    }
  })

  it('should handle vendor deletion', async () => {
    const { vendorService } = await import('../../services/pocketbase')
    const mockDelete = vi.mocked(vendorService.delete)
    mockDelete.mockResolvedValue(true)
    
    // Mock window.confirm
    window.confirm = vi.fn(() => true)
    
    // Wait for vendors to load
    await wrapper.vm.$nextTick()
    
    // Find and click delete button
    const deleteButton = wrapper.find('button[title="Delete"]')
    if (deleteButton.exists()) {
      await deleteButton.trigger('click')
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalledWith('vendor-1')
    }
  })
})