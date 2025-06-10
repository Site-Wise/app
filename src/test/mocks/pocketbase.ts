import { vi } from 'vitest'
import type { User, Site, Item, Vendor, Quotation, IncomingItem, Payment } from '../../services/pocketbase'

export const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  sites: ['site-1'],
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockSite: Site = {
  id: 'site-1',
  name: 'Test Construction Site',
  description: 'A test construction site',
  total_units: 100,
  total_planned_area: 50000,
  admin_user: 'user-1',
  users: ['user-1'],
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockItem: Item = {
  id: 'item-1',
  name: 'Steel Rebar',
  description: 'High-grade steel rebar',
  unit: 'kg',
  quantity: 1000,
  category: 'Steel',
  site: 'site-1',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockVendor: Vendor = {
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
}

export const mockQuotation: Quotation = {
  id: 'quotation-1',
  vendor: 'vendor-1',
  item: 'item-1',
  unit_price: 50,
  minimum_quantity: 100,
  valid_until: '2024-12-31',
  notes: 'Bulk discount available',
  status: 'pending',
  site: 'site-1',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const mockIncomingItem: IncomingItem = {
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
}

export const mockPayment: Payment = {
  id: 'payment-1',
  vendor: 'vendor-1',
  amount: 10000,
  payment_date: '2024-01-20',
  reference: 'CHK-001',
  notes: 'Partial payment',
  incoming_items: ['incoming-1'],
  site: 'site-1',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
}

export const createMockPocketBase = () => {
  const collections = new Map()
  
  // Initialize with mock data
  collections.set('users', [mockUser])
  collections.set('sites', [mockSite])
  collections.set('items', [mockItem])
  collections.set('vendors', [mockVendor])
  collections.set('quotations', [mockQuotation])
  collections.set('incoming_items', [mockIncomingItem])
  collections.set('payments', [mockPayment])
  
  return {
    authStore: {
      isValid: true,
      model: mockUser,
      clear: vi.fn(),
    },
    collection: vi.fn((name: string) => ({
      getFullList: vi.fn().mockResolvedValue(collections.get(name) || []),
      getOne: vi.fn().mockImplementation((id: string) => {
        const items = collections.get(name) || []
        const item = items.find((item: any) => item.id === id)
        return Promise.resolve(item)
      }),
      create: vi.fn().mockImplementation((data: any) => {
        const newItem = { ...data, id: `${name}-${Date.now()}` }
        const items = collections.get(name) || []
        items.push(newItem)
        collections.set(name, items)
        return Promise.resolve(newItem)
      }),
      update: vi.fn().mockImplementation((id: string, data: any) => {
        const items = collections.get(name) || []
        const index = items.findIndex((item: any) => item.id === id)
        if (index !== -1) {
          items[index] = { ...items[index], ...data }
          collections.set(name, items)
          return Promise.resolve(items[index])
        }
        throw new Error('Item not found')
      }),
      delete: vi.fn().mockImplementation((id: string) => {
        const items = collections.get(name) || []
        const filteredItems = items.filter((item: any) => item.id !== id)
        collections.set(name, filteredItems)
        return Promise.resolve(true)
      }),
      authWithPassword: vi.fn().mockResolvedValue({
        record: mockUser,
        token: 'mock-token'
      }),
    })),
    autoCancellation: vi.fn(),
    baseUrl: 'http://localhost:8090'
  }
}