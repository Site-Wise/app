import { ref, watch, onUnmounted } from 'vue'
import { pb, getCurrentSiteId } from '../services/pocketbase'
import type { 
  Delivery,
  ServiceBooking, 
  Account, 
  Quotation, 
  Vendor, 
  Item, 
  Service, 
  Payment 
} from '../services/pocketbase'

export interface SearchOptions {
  collection: string
  searchFields: string[]
  expand?: string
  additionalFilter?: string
}

export interface SearchResult<T = any> {
  items: T[]
  loading: boolean
  error: string | null
  query: string
}

export function useSearch<T = any>(options: SearchOptions) {
  const searchQuery = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const results = ref<T[]>([])
  const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  const buildSearchFilter = (query: string): string => {
    const siteId = getCurrentSiteId()
    if (!siteId) throw new Error('No site selected')

    const siteFilter = `site="${siteId}"`
    
    if (!query) {
      return options.additionalFilter 
        ? `${siteFilter} && (${options.additionalFilter})`
        : siteFilter
    }

    // Build search filter for multiple fields using OR
    const searchConditions = options.searchFields
      .map(field => `${field}~"${query}"`)
      .join(' || ')
    
    const searchFilter = `(${searchConditions})`
    
    // Combine with site filter and any additional filters
    let combinedFilter = `${siteFilter} && ${searchFilter}`
    
    if (options.additionalFilter) {
      combinedFilter += ` && (${options.additionalFilter})`
    }
    
    return combinedFilter
  }

  const performSearch = async (query: string) => {
    loading.value = true
    error.value = null
    
    try {
      // Special handling for collections with vendor search
      if (options.collection === 'deliveries' && query.trim()) {
        await performDeliverySearch(query.trim())
      } else if (options.collection === 'service_bookings' && query.trim()) {
        await performServiceBookingSearch(query.trim())
      } else if (options.collection === 'payments' && query.trim()) {
        await performPaymentSearch(query.trim())
      } else {
        // Standard search for other collections
        const filter = buildSearchFilter(query)
        
        const records = await pb.collection(options.collection).getFullList({
          filter,
          expand: options.expand,
          sort: '-created' // Most recent first
        })
        
        results.value = records as T[]
      }
    } catch (err) {
      console.error('Search error:', err)
      error.value = err instanceof Error ? err.message : 'Search failed'
      results.value = []
    } finally {
      loading.value = false
    }
  }

  const performDeliverySearch = async (query: string) => {
    const siteId = getCurrentSiteId()
    if (!siteId) throw new Error('No site selected')

    // Step 1: Search for vendors that match the query
    const vendorRecords = await pb.collection('vendors').getFullList({
      filter: `site="${siteId}" && (name~"${query}" || contact_person~"${query}")`
    })
    
    const vendorIds = vendorRecords.map(vendor => vendor.id)
    
    // Step 2: Build delivery filter combining vendor IDs with direct field searches
    let deliveryFilter = `site="${siteId}"`
    
    const searchConditions = []
    
    // Add vendor ID conditions if we found matching vendors
    if (vendorIds.length > 0) {
      const vendorConditions = vendorIds.map(id => `vendor="${id}"`).join(' || ')
      searchConditions.push(`(${vendorConditions})`)
    }
    
    // Add direct field searches (delivery_reference and notes)
    searchConditions.push(`delivery_reference~"${query}"`)
    searchConditions.push(`notes~"${query}"`)
    
    if (searchConditions.length > 0) {
      deliveryFilter += ` && (${searchConditions.join(' || ')})`
    }
    
    // Step 3: Get deliveries with the combined filter
    const deliveryRecords = await pb.collection('deliveries').getFullList({
      filter: deliveryFilter,
      expand: options.expand,
      sort: '-delivery_date' // Most recent first for deliveries
    })
    
    results.value = deliveryRecords as T[]
  }

  const performServiceBookingSearch = async (query: string) => {
    const siteId = getCurrentSiteId()
    if (!siteId) throw new Error('No site selected')

    // Step 1: Search for vendors that match the query
    const vendorRecords = await pb.collection('vendors').getFullList({
      filter: `site="${siteId}" && (name~"${query}" || contact_person~"${query}")`
    })
    
    const vendorIds = vendorRecords.map(vendor => vendor.id)
    
    // Step 2: Search for services that match the query
    const serviceRecords = await pb.collection('services').getFullList({
      filter: `site="${siteId}" && name~"${query}"`
    })
    
    const serviceIds = serviceRecords.map(service => service.id)
    
    // Step 3: Build service booking filter combining vendor IDs, service IDs, and direct field searches
    let serviceBookingFilter = `site="${siteId}"`
    
    const searchConditions = []
    
    // Add vendor ID conditions if we found matching vendors
    if (vendorIds.length > 0) {
      const vendorConditions = vendorIds.map(id => `vendor="${id}"`).join(' || ')
      searchConditions.push(`(${vendorConditions})`)
    }
    
    // Add service ID conditions if we found matching services
    if (serviceIds.length > 0) {
      const serviceConditions = serviceIds.map(id => `service="${id}"`).join(' || ')
      searchConditions.push(`(${serviceConditions})`)
    }
    
    // Add direct field searches (notes)
    searchConditions.push(`notes~"${query}"`)
    
    if (searchConditions.length > 0) {
      serviceBookingFilter += ` && (${searchConditions.join(' || ')})`
    }
    
    // Step 4: Get service bookings with the combined filter
    const serviceBookingRecords = await pb.collection('service_bookings').getFullList({
      filter: serviceBookingFilter,
      expand: options.expand,
      sort: '-start_date' // Most recent first for service bookings
    })
    
    results.value = serviceBookingRecords as T[]
  }

  const performPaymentSearch = async (query: string) => {
    const siteId = getCurrentSiteId()
    if (!siteId) throw new Error('No site selected')

    // Step 1: Search for vendors that match the query
    const vendorRecords = await pb.collection('vendors').getFullList({
      filter: `site="${siteId}" && (name~"${query}" || contact_person~"${query}")`
    })
    
    const vendorIds = vendorRecords.map(vendor => vendor.id)
    
    // Step 2: Build payment filter combining vendor IDs with direct field searches
    let paymentFilter = `site="${siteId}"`
    
    const searchConditions = []
    
    // Add vendor ID conditions if we found matching vendors
    if (vendorIds.length > 0) {
      const vendorConditions = vendorIds.map(id => `vendor="${id}"`).join(' || ')
      searchConditions.push(`(${vendorConditions})`)
    }
    
    // Add direct field searches (reference and notes)
    searchConditions.push(`reference~"${query}"`)
    searchConditions.push(`notes~"${query}"`)
    
    if (searchConditions.length > 0) {
      paymentFilter += ` && (${searchConditions.join(' || ')})`
    }
    
    // Step 3: Get payments with the combined filter
    const paymentRecords = await pb.collection('payments').getFullList({
      filter: paymentFilter,
      expand: options.expand,
      sort: '-created' // Most recent first for payments
    })
    
    results.value = paymentRecords as T[]
  }

  // Improved debouncing with proper cleanup and longer delay
  watch(searchQuery, (newQuery) => {
    // Clear existing timer
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
      debounceTimer.value = null
    }
    
    const trimmedQuery = newQuery.trim()
    
    // For empty queries, just clear the results to show all data from useSiteData
    if (!trimmedQuery) {
      results.value = []
      loading.value = false
      error.value = null
      return
    }
    
    // Skip search for very short queries (less than 2 characters) to reduce backend load
    if (trimmedQuery.length < 2) {
      results.value = []
      return
    }
    
    // For non-empty queries, debounce with 600ms delay to prevent backend flooding
    debounceTimer.value = setTimeout(() => {
      performSearch(trimmedQuery)
      debounceTimer.value = null
    }, 600)
  })

  const search = (query: string) => {
    searchQuery.value = query
  }

  const clearSearch = () => {
    searchQuery.value = ''
    results.value = []
    error.value = null
  }

  const refresh = () => {
    performSearch(searchQuery.value)
  }

  // Initial load with empty query (loads all items for the site)
  const loadAll = () => {
    performSearch('')
  }

  // Cleanup timer on unmount to prevent memory leaks
  onUnmounted(() => {
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
      debounceTimer.value = null
    }
  })

  return {
    searchQuery,
    loading,
    error,
    results,
    search,
    clearSearch,
    refresh,
    loadAll
  }
}

// Predefined search configurations for common collections
export const searchConfigs = {
  delivery_items: {
    collection: 'delivery_items' as const,
    searchFields: ['item', 'vendor', 'notes'],
    expand: 'vendor,delivery'
  },
  deliveries: {
    collection: 'deliveries' as const,
    searchFields: ['delivery_reference', 'notes'],
    expand: 'vendor,delivery_items,delivery_items.item'
  },
  service_bookings: {
    collection: 'service_bookings' as const,
    searchFields: ['notes'],
    expand: 'vendor,service'
  },
  accounts: {
    collection: 'accounts' as const,
    searchFields: ['name', 'account_number', 'description']
  },
  quotations: {
    collection: 'quotations' as const,
    searchFields: ['notes'],
    expand: 'vendor,item,service'
  },
  vendors: {
    collection: 'vendors' as const,
    searchFields: ['name', 'contact_person', 'email', 'phone', 'address']
  },
  items: {
    collection: 'items' as const,
    searchFields: ['name', 'description']
  },
  services: {
    collection: 'services' as const,
    searchFields: ['name', 'description', 'tags']
  },
  payments: {
    collection: 'payments' as const,
    searchFields: ['reference', 'notes'],
    expand: 'vendor,account,deliveries,service_bookings,payment_allocations,payment_allocations.delivery,payment_allocations.service_booking,payment_allocations.service_booking.service,credit_notes'
  }
}

// Type-safe search hooks for specific collections
export const useDeliverySearch = () => useSearch<Delivery>(searchConfigs.deliveries)
export const useServiceBookingSearch = () => useSearch<ServiceBooking>(searchConfigs.service_bookings)
export const useAccountSearch = () => useSearch<Account>(searchConfigs.accounts)
export const useQuotationSearch = () => useSearch<Quotation>(searchConfigs.quotations)
export const useVendorSearch = () => useSearch<Vendor>(searchConfigs.vendors)
export const useItemSearch = () => useSearch<Item>(searchConfigs.items)
export const useServiceSearch = () => useSearch<Service>(searchConfigs.services)
export const usePaymentSearch = () => useSearch<Payment>(searchConfigs.payments)