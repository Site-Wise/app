import { ref, computed, watch } from 'vue'
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

  // Debounced search
  const debouncedSearch = computed(() => {
    return searchQuery.value.trim()
  })

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
      const filter = buildSearchFilter(query)
      
      const records = await pb.collection(options.collection).getFullList({
        filter,
        expand: options.expand,
        sort: '-created' // Most recent first
      })
      
      results.value = records as T[]
    } catch (err) {
      console.error('Search error:', err)
      error.value = err instanceof Error ? err.message : 'Search failed'
      results.value = []
    } finally {
      loading.value = false
    }
  }

  // Watch for search query changes with debouncing
  watch(debouncedSearch, (newQuery) => {
    // Clear existing timer
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
    }
    
    // Set new timer
    debounceTimer.value = setTimeout(() => {
      performSearch(newQuery)
    }, 300) // 300ms debounce
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
  incoming_items: {
    collection: 'incoming_items' as const,
    searchFields: ['item', 'vendor', 'notes'],
    expand: 'vendor'
  },
  deliveries: {
    collection: 'deliveries' as const,
    searchFields: ['vendor.name', 'delivery_reference', 'notes'],
    expand: 'vendor,delivery_items,delivery_items.item'
  },
  service_bookings: {
    collection: 'service_bookings' as const,
    searchFields: ['expand.service.name', 'expand.vendor.name', 'notes'],
    expand: 'vendor,service'
  },
  accounts: {
    collection: 'accounts' as const,
    searchFields: ['name', 'account_number', 'description']
  },
  quotations: {
    collection: 'quotations' as const,
    searchFields: ['expand.item.name', 'expand.vendor.name', 'expand.service.name', 'notes'],
    expand: 'vendor,item,service'
  },
  vendors: {
    collection: 'vendors' as const,
    searchFields: ['name', 'contact_person', 'email', 'phone', 'address']
  },
  items: {
    collection: 'items' as const,
    searchFields: ['name', 'description', 'category']
  },
  services: {
    collection: 'services' as const,
    searchFields: ['name', 'description', 'tags']
  },
  payments: {
    collection: 'payments' as const,
    searchFields: ['expand.vendor.name', 'expand.account.name', 'description'],
    expand: 'vendor,account,incoming_items,service_bookings'
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