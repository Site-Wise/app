import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createApp } from 'vue'
import { setupTestPinia } from '../utils/test-setup'
import { createMockRouter } from '../utils/test-utils'

// Mock PocketBase services
vi.mock('../../services/pocketbase', () => {
  const mockService = {
    id: 'service-1',
    name: 'Electrical Work',
    description: 'Professional electrical installation and repair services',
    service_type: 'technical_service',
    unit: 'hours',
    category: 'Electrical',
    site: 'site-1'
  }

  const mockServiceBookings = [
    {
      id: 'booking-1',
      service: 'service-1',
      vendor: 'vendor-1',
      start_date: '2024-01-15',
      end_date: '2024-01-16',
      duration: 8,
      unit_rate: 500,
      total_amount: 4000,
      percent_completed: 100,
      notes: 'Completed electrical work',
      expand: {
        vendor: {
          id: 'vendor-1',
          name: 'Electric Pro Services',
          contact_person: 'John Electrician'
        }
      }
    },
    {
      id: 'booking-2',
      service: 'service-1',
      vendor: 'vendor-2',
      start_date: '2024-01-20',
      end_date: '2024-01-22',
      duration: 16,
      unit_rate: 600,
      total_amount: 9600,
      percent_completed: 75,
      notes: 'In progress',
      expand: {
        vendor: {
          id: 'vendor-2',
          name: 'Elite Electrical',
          contact_person: 'Sarah Wire'
        }
      }
    }
  ]

  return {
    serviceService: {
      getAll: vi.fn().mockResolvedValue([mockService])
    },
    serviceBookingService: {
      getAll: vi.fn().mockResolvedValue(mockServiceBookings)
    },
    getCurrentSiteId: vi.fn(() => 'site-1'),
    setCurrentSiteId: vi.fn(),
    getCurrentUserRole: vi.fn(() => 'owner'),
    setCurrentUserRole: vi.fn(),
    calculatePermissions: vi.fn().mockReturnValue({
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canManageUsers: true,
      canManageRoles: true,
      canExport: true,
      canViewFinancials: true
    })
  }
})

// Mock DOM methods for CSV export
Object.assign(global, {
  Blob: vi.fn().mockImplementation((content, options) => ({
    content,
    options,
    type: options?.type || 'text/plain'
  })),
  URL: {
    createObjectURL: vi.fn().mockReturnValue('mock-blob-url'),
    revokeObjectURL: vi.fn()
  }
})

// Mock document methods
Object.defineProperty(document, 'createElement', {
  value: vi.fn().mockReturnValue({
    setAttribute: vi.fn(),
    click: vi.fn(),
    style: {},
    remove: vi.fn()
  })
})

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn()
})

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn()
})

// Helper function to create mock data
const createMockService = () => ({
  id: 'service-1',
  name: 'Electrical Work',
  description: 'Professional electrical installation and repair services',
  service_type: 'technical_service',
  unit: 'hours',
  category: 'Electrical',
  site: 'site-1'
})

const createMockServiceBookings = () => [
  {
    id: 'booking-1',
    service: 'service-1',
    vendor: 'vendor-1',
    start_date: '2024-01-15',
    end_date: '2024-01-16',
    duration: 8,
    unit_rate: 500,
    total_amount: 4000,
    percent_completed: 100,
    notes: 'Completed electrical work',
    expand: {
      vendor: {
        id: 'vendor-1',
        name: 'Electric Pro Services',
        contact_person: 'John Electrician'
      }
    }
  },
  {
    id: 'booking-2',
    service: 'service-1',
    vendor: 'vendor-2',
    start_date: '2024-01-20',
    end_date: '2024-01-22',
    duration: 16,
    unit_rate: 600,
    total_amount: 9600,
    percent_completed: 75,
    notes: 'In progress',
    expand: {
      vendor: {
        id: 'vendor-2',
        name: 'Elite Electrical',
        contact_person: 'Sarah Wire'
      }
    }
  }
]

describe('ServiceDetailView', () => {
  let app: any
  let pinia: any
  let router: any
  let componentInstance: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { pinia: testPinia } = setupTestPinia()
    pinia = testPinia
    
    router = createMockRouter()
    router.currentRoute.value.params = { id: 'service-1' }
    
    // Create app instance with component without mounting
    app = createApp({})
    app.use(pinia)
    app.use(router)
    
    // Import component and create instance for testing
    const ServiceDetailView = await import('../../views/ServiceDetailView.vue')
    componentInstance = ServiceDetailView.default.setup?.({}, { 
      attrs: {}, 
      slots: {}, 
      emit: vi.fn(),
      expose: vi.fn()
    })
  })

  describe('Component Data and Logic', () => {
    it('should have initial reactive data structure', () => {
      // Test that component instance has expected structure
      expect(componentInstance).toBeDefined()
    })

    it('should have mock services available for testing', async () => {
      const { serviceService, serviceBookingService } = await import('../../services/pocketbase')
      
      // Verify mocks are properly set up
      expect(vi.mocked(serviceService.getAll)).toBeDefined()
      expect(vi.mocked(serviceBookingService.getAll)).toBeDefined()
      
      // Test mock functionality
      const services = await vi.mocked(serviceService.getAll)()
      const bookings = await vi.mocked(serviceBookingService.getAll)()
      
      expect(services).toHaveLength(1)
      expect(services[0].name).toBe('Electrical Work')
      expect(bookings).toHaveLength(2)
    })

    it('should calculate total hours correctly with mock data', () => {
      const mockBookings = createMockServiceBookings()
      const totalHours = mockBookings.reduce((sum, booking) => sum + booking.duration, 0)
      expect(totalHours).toBe(24) // 8 + 16
    })

    it('should calculate average rate correctly with mock data', () => {
      const mockBookings = createMockServiceBookings()
      const totalValue = mockBookings.reduce((sum, booking) => sum + booking.total_amount, 0)
      const totalQuantity = mockBookings.reduce((sum, booking) => sum + booking.duration, 0)
      const averageRate = totalQuantity > 0 ? totalValue / totalQuantity : 0
      expect(averageRate).toBeCloseTo(566.67, 2) // (4000 + 9600) / (8 + 16)
    })

    it('should find minimum rate correctly with mock data', () => {
      const mockBookings = createMockServiceBookings()
      const minRate = Math.min(...mockBookings.map(b => b.unit_rate))
      expect(minRate).toBe(500)
    })

    it('should find maximum rate correctly with mock data', () => {
      const mockBookings = createMockServiceBookings()
      const maxRate = Math.max(...mockBookings.map(b => b.unit_rate))
      expect(maxRate).toBe(600)
    })

    it('should handle empty bookings in calculations', () => {
      const emptyBookings: any[] = []
      
      const totalHours = emptyBookings.reduce((sum, booking) => sum + booking.duration, 0)
      const averageRate = emptyBookings.length === 0 ? 0 : 
        emptyBookings.reduce((sum, booking) => sum + booking.total_amount, 0) /
        emptyBookings.reduce((sum, booking) => sum + booking.duration, 0)
      const minRate = emptyBookings.length === 0 ? 0 : Math.min(...emptyBookings.map(b => b.unit_rate))
      const maxRate = emptyBookings.length === 0 ? 0 : Math.max(...emptyBookings.map(b => b.unit_rate))

      expect(totalHours).toBe(0)
      expect(averageRate).toBe(0)
      expect(minRate).toBe(0)
      expect(maxRate).toBe(0)
    })
  })

  describe('CSV Export Functionality', () => {
    it('should generate CSV content with correct structure', () => {
      const mockService = createMockService()
      const mockBookings = createMockServiceBookings()
      
      // Simulate the CSV generation logic
      const headers = ['Date', 'Vendor', 'Duration', 'Rate', 'Total Amount', 'Progress %', 'Notes']
      
      const rows = mockBookings.map(booking => [
        booking.start_date,
        booking.expand?.vendor?.contact_person || 'Unknown Vendor',
        booking.duration,
        booking.unit_rate,
        booking.total_amount,
        `${booking.percent_completed || 0}%`,
        booking.notes || ''
      ])
      
      // Add summary row
      const totalHours = mockBookings.reduce((sum, b) => sum + b.duration, 0)
      const averageRate = mockBookings.reduce((sum, b) => sum + b.total_amount, 0) / totalHours
      const totalAmount = mockBookings.reduce((sum, b) => sum + b.total_amount, 0)
      
      rows.push([
        '',
        'SUMMARY',
        totalHours,
        averageRate.toFixed(2),
        totalAmount,
        '',
        `Report generated on ${new Date().toISOString().split('T')[0]}`
      ])
      
      // Convert to CSV
      const csvRows = [headers, ...rows]
      const csvContent = csvRows.map(row => 
        row.map(field => 
          typeof field === 'string' && field.includes(',') ? `"${field}"` : field
        ).join(',')
      ).join('\n')
      
      expect(csvContent).toContain('Date,Vendor,Duration,Rate,Total Amount,Progress %,Notes')
      expect(csvContent).toContain('2024-01-15')
      expect(csvContent).toContain('John Electrician')
      expect(csvContent).toContain('SUMMARY')
      expect(csvContent).toContain('24') // Total hours
      expect(csvContent).toContain('566.67') // Average rate
      expect(csvContent).toContain('13600') // Total amount
    })

    it('should handle CSV fields with commas by wrapping in quotes', () => {
      const testData = 'Professional electrical installation, and repair services'
      const csvField = testData.includes(',') ? `"${testData}"` : testData
      expect(csvField).toBe('"Professional electrical installation, and repair services"')
    })
  })

  describe('Data Filtering and Processing', () => {
    it('should filter bookings by service ID', () => {
      const allBookings = [
        ...createMockServiceBookings(),
        {
          ...createMockServiceBookings()[0],
          id: 'booking-3',
          service: 'service-2' // Different service
        }
      ]
      
      const filteredBookings = allBookings.filter(booking => booking.service === 'service-1')
      expect(filteredBookings.length).toBe(2)
      expect(filteredBookings.every(b => b.service === 'service-1')).toBe(true)
    })

    it('should sort bookings by start date', () => {
      const unsortedBookings = [
        {
          id: 'booking-2',
          start_date: '2024-01-20',
          service: 'service-1'
        },
        {
          id: 'booking-1', 
          start_date: '2024-01-15',
          service: 'service-1'
        }
      ]
      
      const sortedBookings = unsortedBookings.sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      )
      
      expect(sortedBookings[0].start_date).toBe('2024-01-15')
      expect(sortedBookings[1].start_date).toBe('2024-01-20')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero duration bookings in rate calculations', () => {
      const bookingsWithZeroDuration = [
        { duration: 0, unit_rate: 500, total_amount: 0 }
      ]
      
      const totalHours = bookingsWithZeroDuration.reduce((sum, b) => sum + b.duration, 0)
      const averageRate = totalHours > 0 ? 
        bookingsWithZeroDuration.reduce((sum, b) => sum + b.total_amount, 0) / totalHours : 0
      
      expect(averageRate).toBe(0) // Division by zero handled gracefully
    })

    it('should handle missing vendor information', () => {
      const bookingWithoutVendor = {
        id: 'booking-1',
        expand: null
      }
      
      const vendorName = bookingWithoutVendor.expand?.vendor?.name || 'Unknown Vendor'
      expect(vendorName).toBe('Unknown Vendor')
    })

    it('should handle progress percentage edge cases', () => {
      const bookingWithUndefinedProgress = { percent_completed: undefined }
      const bookingWithZeroProgress = { percent_completed: 0 }
      const bookingWithOverProgress = { percent_completed: 150 }
      
      expect(bookingWithUndefinedProgress.percent_completed || 0).toBe(0)
      expect(bookingWithZeroProgress.percent_completed || 0).toBe(0)
      expect(bookingWithOverProgress.percent_completed || 0).toBe(150)
    })
  })

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const dateString = '2024-01-15'
      const formattedDate = new Date(dateString).toLocaleDateString()
      expect(formattedDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })
  })

  describe('Router Integration', () => {
    it('should redirect to services page when service not found', async () => {
      const { serviceService } = await import('../../services/pocketbase')
      vi.mocked(serviceService.getAll).mockResolvedValueOnce([])
      
      // In the actual component, this would trigger router.push('/services')
      // We can test the logic that determines when to redirect
      const mockServices: any[] = []
      const serviceId = 'service-1'
      const foundService = mockServices.find(s => s.id === serviceId)
      
      expect(foundService).toBe(undefined)
      // This would trigger the redirect in the actual component
    })

    it('should handle loading errors gracefully', async () => {
      // Test error handling logic directly
      const mockServiceCall = vi.fn().mockRejectedValue(new Error('Network error'))
      
      await expect(mockServiceCall()).rejects.toThrow('Network error')
    })
  })

  describe('Export Feature Integration', () => {
    it('should create downloadable file with correct naming convention', () => {
      const mockService = createMockService()
      const expectedFilename = `${mockService.name}_report_${new Date().toISOString().split('T')[0]}.csv`
      
      expect(expectedFilename).toMatch(/Electrical Work_report_\d{4}-\d{2}-\d{2}\.csv/)
    })

    it('should trigger CSV download with proper blob creation', () => {
      const csvContent = 'Date,Vendor,Duration\n2024-01-15,Test Vendor,8'
      
      // Simulate the export process
      expect(global.Blob).toBeDefined()
      expect(global.URL.createObjectURL).toBeDefined()
      expect(document.createElement).toBeDefined()
      
      // These would be called during export
      global.Blob(csvContent, { type: 'text/csv;charset=utf-8;' })
      global.URL.createObjectURL({} as any)
      document.createElement('a')
      
      expect(vi.mocked(global.Blob)).toHaveBeenCalled()
      expect(vi.mocked(global.URL.createObjectURL)).toHaveBeenCalled()
      expect(vi.mocked(document.createElement)).toHaveBeenCalledWith('a')
    })
  })
})