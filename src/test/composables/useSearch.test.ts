import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

// Mock PocketBase - following existing pattern
vi.mock('../../services/pocketbase', () => {
  return {
    pb: {
      collection: vi.fn(() => ({
        getFullList: vi.fn().mockResolvedValue([])
      }))
    },
    getCurrentSiteId: vi.fn(() => 'test-site-123')
  }
})

import { 
  useSearch, 
  searchConfigs,
  useDeliverySearch,
  useServiceBookingSearch,
  useAccountSearch,
  useQuotationSearch,
  useVendorSearch,
  useItemSearch,
  useServiceSearch,
  usePaymentSearch
} from '../../composables/useSearch'
import { pb, getCurrentSiteId } from '../../services/pocketbase'

describe('useSearch Composable', () => {
  let mockGetFullList: any
  let mockCollection: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Setup fresh mocks
    mockGetFullList = vi.fn().mockResolvedValue([])
    mockCollection = vi.fn(() => ({
      getFullList: mockGetFullList
    }))
    
    vi.mocked(pb.collection).mockImplementation(mockCollection)
    vi.mocked(getCurrentSiteId).mockReturnValue('test-site-123')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic Search Functionality', () => {
    it('should initialize with default values', () => {
      const { searchQuery, loading, error, results } = useSearch({
        collection: 'test_collection',
        searchFields: ['name', 'description']
      })

      expect(searchQuery.value).toBe('')
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(results.value).toEqual([])
    })

    it('should build correct filter with site constraint', async () => {
      const options = {
        collection: 'test_collection',
        searchFields: ['name', 'description']
      }

      const { search } = useSearch(options)
      search('test query')

      // Wait for Vue reactivity to process
      await nextTick()
      // Fast forward past debounce
      vi.advanceTimersByTime(300)

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: 'site="test-site-123" && (name~"test query" || description~"test query")',
        expand: undefined,
        sort: '-created'
      })
    })

    it('should debounce search queries', async () => {
      const { search } = useSearch({
        collection: 'test_collection',
        searchFields: ['name']
      })

      search('q')
      search('qu')
      search('que')
      search('query')

      // Wait for Vue reactivity
      await nextTick()
      
      // Before debounce timeout
      vi.advanceTimersByTime(299)
      expect(mockGetFullList).not.toHaveBeenCalled()

      // After debounce timeout
      vi.advanceTimersByTime(1)
      expect(mockGetFullList).toHaveBeenCalledTimes(1)
      expect(mockGetFullList).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('name~"query"')
        })
      )
    })

    it('should handle expand parameter correctly', async () => {
      const { search } = useSearch({
        collection: 'test_collection',
        searchFields: ['name'],
        expand: 'vendor,items'
      })

      search('test')
      await nextTick()
      vi.advanceTimersByTime(300)

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: expect.any(String),
        expand: 'vendor,items',
        sort: '-created'
      })
    })

    it('should handle additional filters', async () => {
      const { search } = useSearch({
        collection: 'test_collection',
        searchFields: ['name'],
        additionalFilter: 'status="active"'
      })

      search('test')
      await nextTick()
      vi.advanceTimersByTime(300)

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: 'site="test-site-123" && (name~"test") && (status="active")',
        expand: undefined,
        sort: '-created'
      })
    })

    it('should handle empty search query (loadAll)', () => {
      const { loadAll } = useSearch({
        collection: 'test_collection',
        searchFields: ['name']
      })

      loadAll()

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: 'site="test-site-123"',
        expand: undefined,
        sort: '-created'
      })
    })

    it('should clear search correctly', () => {
      const { search, clearSearch, searchQuery, results, error } = useSearch({
        collection: 'test_collection',
        searchFields: ['name']
      })

      // Set some data
      search('test')
      results.value = [{ id: 1, name: 'test' }]
      error.value = 'some error'

      // Clear
      clearSearch()

      expect(searchQuery.value).toBe('')
      expect(results.value).toEqual([])
      expect(error.value).toBeNull()
    })

    it('should handle search errors gracefully', async () => {
      const mockError = new Error('Search failed')
      mockGetFullList.mockRejectedValueOnce(mockError)

      const { search, error, results, loading } = useSearch({
        collection: 'test_collection',
        searchFields: ['name']
      })

      search('test')
      vi.advanceTimersByTime(300)

      // Wait for promise to resolve
      await vi.runAllTimersAsync()

      expect(error.value).toBe('Search failed')
      expect(results.value).toEqual([])
      expect(loading.value).toBe(false)
    })

    it('should refresh search with current query', () => {
      const { search, refresh } = useSearch({
        collection: 'test_collection',
        searchFields: ['name']
      })

      search('test')
      vi.advanceTimersByTime(300)
      mockGetFullList.mockClear()

      refresh()

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: 'site="test-site-123" && (name~"test")',
        expand: undefined,
        sort: '-created'
      })
    })
  })

  describe('Search Configurations', () => {
    it('should have correct configuration for deliveries with vendor contact person', () => {
      const config = searchConfigs.deliveries
      
      expect(config.collection).toBe('deliveries')
      expect(config.searchFields).toContain('expand.vendor.name')
      expect(config.searchFields).toContain('expand.vendor.contact_person')
      expect(config.searchFields).toContain('delivery_reference')
      expect(config.searchFields).toContain('notes')
      expect(config.expand).toBe('vendor,delivery_items,delivery_items.item')
    })

    it('should have correct configuration for service_bookings with vendor contact person', () => {
      const config = searchConfigs.service_bookings
      
      expect(config.collection).toBe('service_bookings')
      expect(config.searchFields).toContain('expand.service.name')
      expect(config.searchFields).toContain('expand.vendor.name')
      expect(config.searchFields).toContain('expand.vendor.contact_person')
      expect(config.searchFields).toContain('notes')
      expect(config.expand).toBe('vendor,service')
    })

    it('should have correct configuration for accounts', () => {
      const config = searchConfigs.accounts
      
      expect(config.collection).toBe('accounts')
      expect(config.searchFields).toContain('name')
      expect(config.searchFields).toContain('account_number')
      expect(config.searchFields).toContain('description')
    })

    it('should have correct configuration for quotations', () => {
      const config = searchConfigs.quotations
      
      expect(config.collection).toBe('quotations')
      expect(config.searchFields).toContain('expand.item.name')
      expect(config.searchFields).toContain('expand.vendor.name')
      expect(config.searchFields).toContain('expand.service.name')
      expect(config.searchFields).toContain('notes')
      expect(config.expand).toBe('vendor,item,service')
    })

    it('should have correct configuration for vendors', () => {
      const config = searchConfigs.vendors
      
      expect(config.collection).toBe('vendors')
      expect(config.searchFields).toContain('name')
      expect(config.searchFields).toContain('contact_person')
      expect(config.searchFields).toContain('email')
      expect(config.searchFields).toContain('phone')
      expect(config.searchFields).toContain('address')
    })

    it('should have correct configuration for items', () => {
      const config = searchConfigs.items
      
      expect(config.collection).toBe('items')
      expect(config.searchFields).toContain('name')
      expect(config.searchFields).toContain('description')
    })

    it('should have correct configuration for services', () => {
      const config = searchConfigs.services
      
      expect(config.collection).toBe('services')
      expect(config.searchFields).toContain('name')
      expect(config.searchFields).toContain('description')
      expect(config.searchFields).toContain('tags')
    })

    it('should have correct configuration for payments', () => {
      const config = searchConfigs.payments
      
      expect(config.collection).toBe('payments')
      expect(config.searchFields).toContain('expand.vendor.name')
      expect(config.searchFields).toContain('expand.account.name')
      expect(config.searchFields).toContain('description')
      expect(config.expand).toBe('vendor,account,deliveries,service_bookings')
    })

    it('should have correct configuration for delivery_items', () => {
      const config = searchConfigs.delivery_items
      
      expect(config.collection).toBe('delivery_items')
      expect(config.searchFields).toContain('item')
      expect(config.searchFields).toContain('vendor')
      expect(config.searchFields).toContain('notes')
      expect(config.expand).toBe('vendor,delivery')
    })
  })

  describe('Type-safe Search Hooks', () => {
    it('should create delivery search with correct config', () => {
      const deliverySearch = useDeliverySearch()
      
      expect(deliverySearch).toBeDefined()
      expect(deliverySearch.searchQuery).toBeDefined()
      expect(deliverySearch.search).toBeDefined()
      expect(deliverySearch.loadAll).toBeDefined()
    })

    it('should create service booking search with correct config', () => {
      const serviceBookingSearch = useServiceBookingSearch()
      
      expect(serviceBookingSearch).toBeDefined()
      expect(serviceBookingSearch.searchQuery).toBeDefined()
      expect(serviceBookingSearch.search).toBeDefined()
    })

    it('should create account search with correct config', () => {
      const accountSearch = useAccountSearch()
      
      expect(accountSearch).toBeDefined()
      expect(accountSearch.searchQuery).toBeDefined()
      expect(accountSearch.search).toBeDefined()
    })

    it('should create quotation search with correct config', () => {
      const quotationSearch = useQuotationSearch()
      
      expect(quotationSearch).toBeDefined()
      expect(quotationSearch.searchQuery).toBeDefined()
      expect(quotationSearch.search).toBeDefined()
    })

    it('should create vendor search with correct config', () => {
      const vendorSearch = useVendorSearch()
      
      expect(vendorSearch).toBeDefined()
      expect(vendorSearch.searchQuery).toBeDefined()
      expect(vendorSearch.search).toBeDefined()
    })

    it('should create item search with correct config', () => {
      const itemSearch = useItemSearch()
      
      expect(itemSearch).toBeDefined()
      expect(itemSearch.searchQuery).toBeDefined()
      expect(itemSearch.search).toBeDefined()
    })

    it('should create service search with correct config', () => {
      const serviceSearch = useServiceSearch()
      
      expect(serviceSearch).toBeDefined()
      expect(serviceSearch.searchQuery).toBeDefined()
      expect(serviceSearch.search).toBeDefined()
    })

    it('should create payment search with correct config', () => {
      const paymentSearch = usePaymentSearch()
      
      expect(paymentSearch).toBeDefined()
      expect(paymentSearch.searchQuery).toBeDefined()
      expect(paymentSearch.search).toBeDefined()
    })
  })

  describe('Filter Building Logic', () => {
    it('should build filter with multiple search fields using OR', async () => {
      const { search } = useSearch({
        collection: 'test',
        searchFields: ['field1', 'field2', 'field3']
      })

      search('query')
      await nextTick()
      vi.advanceTimersByTime(300)

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: 'site="test-site-123" && (field1~"query" || field2~"query" || field3~"query")',
        expand: undefined,
        sort: '-created'
      })
    })

    it('should handle expanded field searches correctly', async () => {
      const { search } = useSearch({
        collection: 'test',
        searchFields: ['expand.vendor.name', 'expand.vendor.contact_person', 'notes']
      })

      search('john')
      await nextTick()
      vi.advanceTimersByTime(300)

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: 'site="test-site-123" && (expand.vendor.name~"john" || expand.vendor.contact_person~"john" || notes~"john")',
        expand: undefined,
        sort: '-created'
      })
    })

    it('should escape special characters in search query', async () => {
      const { search } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      search('test "quoted" text')
      await nextTick()
      vi.advanceTimersByTime(300)

      // The query should be properly formatted even with quotes
      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: expect.stringContaining('name~"test "quoted" text"'),
        expand: undefined,
        sort: '-created'
      })
    })

    it('should trim whitespace from search query', async () => {
      const { search } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      search('  test  ')
      await nextTick()
      vi.advanceTimersByTime(300)

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: 'site="test-site-123" && (name~"test")',
        expand: undefined,
        sort: '-created'
      })
    })
  })

  describe('Loading State Management', () => {
    it('should set loading state during search', async () => {
      const { search, loading } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      expect(loading.value).toBe(false)

      search('test')
      await nextTick()
      vi.advanceTimersByTime(300)

      // Loading should be true immediately after search starts
      expect(loading.value).toBe(true)

      // Wait for promise to resolve
      await vi.runAllTimersAsync()

      expect(loading.value).toBe(false)
    })

    it('should handle concurrent searches properly', async () => {
      const { search } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      search('first')
      await nextTick()
      vi.advanceTimersByTime(150) // Half way through debounce
      search('second')
      await nextTick()
      vi.advanceTimersByTime(150) // Another 150ms (total 300ms from second search start)
      
      // Should only search for 'second'
      expect(mockGetFullList).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(150) // Complete debounce for second search
      
      expect(mockGetFullList).toHaveBeenCalledTimes(1)
      expect(mockGetFullList).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('name~"second"')
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle missing site ID gracefully', async () => {
      vi.mocked(getCurrentSiteId).mockReturnValueOnce(null)

      const { loadAll, error, loading } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      // Call loadAll - error will be caught and put in error state
      loadAll()
      
      // Wait for async error handling
      await vi.runAllTimersAsync()

      expect(error.value).toBe('No site selected')
      expect(loading.value).toBe(false)
    })

    it('should handle network errors', async () => {
      mockGetFullList.mockRejectedValueOnce(new Error('Network error'))

      const { search, error, loading } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      search('test')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(error.value).toBe('Network error')
      expect(loading.value).toBe(false)
    })

    it('should handle non-Error exceptions', async () => {
      mockGetFullList.mockRejectedValueOnce('String error')

      const { search, error } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      search('test')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(error.value).toBe('Search failed')
    })
  })

  describe('Results Management', () => {
    it('should update results on successful search', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ]
      mockGetFullList.mockResolvedValueOnce(mockData)

      const { search, results } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      search('test')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(results.value).toEqual(mockData)
    })

    it('should clear results on error', async () => {
      const { search, results } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      // Set initial results
      results.value = [{ id: '1', name: 'Item' }]

      // Trigger error
      mockGetFullList.mockRejectedValueOnce(new Error('Failed'))
      search('test')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(results.value).toEqual([])
    })

    it('should sort results by creation date (newest first)', async () => {
      const { search } = useSearch({
        collection: 'test',
        searchFields: ['name']
      })

      search('test')
      await nextTick()
      vi.advanceTimersByTime(300)

      expect(mockGetFullList).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: '-created'
        })
      )
    })
  })
})