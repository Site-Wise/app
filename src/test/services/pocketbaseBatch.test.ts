import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { BatchRequest, BatchResponse, BatchResult } from '../../services/pocketbaseBatch'

// Mock PocketBase
const mockSend = vi.fn()
vi.mock('../../services/pocketbase', () => ({
  pb: {
    send: mockSend
  }
}))

// Import after mocking
const {
  executeBatch,
  batchCreate,
  batchUpdate,
  batchDelete,
  batchUpsert
} = await import('../../services/pocketbaseBatch')

describe('PocketBase Batch Operations Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeBatch', () => {
    it('should execute batch requests successfully', async () => {
      const requests: BatchRequest[] = [
        {
          method: 'POST',
          url: '/api/collections/items/records',
          body: { name: 'Item 1' }
        },
        {
          method: 'POST',
          url: '/api/collections/items/records',
          body: { name: 'Item 2' }
        }
      ]

      const mockResponse: BatchResponse[] = [
        { status: 200, body: { id: 'item-1', name: 'Item 1' } },
        { status: 200, body: { id: 'item-2', name: 'Item 2' } }
      ]

      mockSend.mockResolvedValue(mockResponse)

      const result = await executeBatch(requests)

      expect(result.success).toBe(true)
      expect(result.responses).toEqual(mockResponse)
      expect(result.errors).toBeUndefined()
      expect(mockSend).toHaveBeenCalledWith('/api/batch', {
        method: 'POST',
        body: { requests },
        headers: { 'Content-Type': 'application/json' }
      })
    })

    it('should handle empty response array', async () => {
      const requests: BatchRequest[] = [
        { method: 'DELETE', url: '/api/collections/items/records/item-1' }
      ]

      mockSend.mockResolvedValue([])

      const result = await executeBatch(requests)

      expect(result.success).toBe(true)
      expect(result.responses).toEqual([])
    })

    it('should handle null/undefined response', async () => {
      const requests: BatchRequest[] = [
        { method: 'GET', url: '/api/collections/items/records' }
      ]

      mockSend.mockResolvedValue(null)

      const result = await executeBatch(requests)

      expect(result.success).toBe(true)
      expect(result.responses).toEqual([])
    })

    it('should handle batch operation failures', async () => {
      const requests: BatchRequest[] = [
        { method: 'POST', url: '/api/collections/items/records', body: {} }
      ]

      const error = new Error('Network error')
      mockSend.mockRejectedValue(error)

      const result = await executeBatch(requests)

      expect(result.success).toBe(false)
      expect(result.responses).toEqual([])
      expect(result.errors).toEqual(['Network error'])
    })

    it('should handle errors without message property', async () => {
      const requests: BatchRequest[] = [
        { method: 'POST', url: '/api/collections/items/records', body: {} }
      ]

      mockSend.mockRejectedValue('String error')

      const result = await executeBatch(requests)

      expect(result.success).toBe(false)
      expect(result.responses).toEqual([])
      expect(result.errors).toEqual(['Batch operation failed'])
    })

    it('should include custom headers in requests', async () => {
      const requests: BatchRequest[] = [
        {
          method: 'POST',
          url: '/api/collections/items/records',
          body: { name: 'Test' },
          headers: { 'X-Custom': 'value' }
        }
      ]

      mockSend.mockResolvedValue([])

      await executeBatch(requests)

      expect(mockSend).toHaveBeenCalledWith('/api/batch', {
        method: 'POST',
        body: { requests },
        headers: { 'Content-Type': 'application/json' }
      })
    })

    it('should handle multiple request types in single batch', async () => {
      const requests: BatchRequest[] = [
        { method: 'POST', url: '/api/collections/items/records', body: { name: 'New' } },
        { method: 'PATCH', url: '/api/collections/items/records/item-1', body: { name: 'Updated' } },
        { method: 'DELETE', url: '/api/collections/items/records/item-2' }
      ]

      const mockResponse = [
        { status: 200, body: { id: 'item-3', name: 'New' } },
        { status: 200, body: { id: 'item-1', name: 'Updated' } },
        { status: 204, body: null }
      ]

      mockSend.mockResolvedValue(mockResponse)

      const result = await executeBatch(requests)

      expect(result.success).toBe(true)
      expect(result.responses).toHaveLength(3)
    })
  })

  describe('batchCreate', () => {
    it('should create multiple records successfully', async () => {
      const records = [
        { name: 'Item 1', site: 'site-1' },
        { name: 'Item 2', site: 'site-1' }
      ]

      const mockResponse = [
        { status: 200, body: { id: 'item-1', name: 'Item 1', site: 'site-1' } },
        { status: 200, body: { id: 'item-2', name: 'Item 2', site: 'site-1' } }
      ]

      mockSend.mockResolvedValue(mockResponse)

      const result = await batchCreate('items', records)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 'item-1', name: 'Item 1', site: 'site-1' })
      expect(result[1]).toEqual({ id: 'item-2', name: 'Item 2', site: 'site-1' })

      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests).toHaveLength(2)
      expect(sentRequests[0].method).toBe('POST')
      expect(sentRequests[0].url).toBe('/api/collections/items/records')
      expect(sentRequests[0].body).toEqual(records[0])
    })

    it('should return empty array for empty input', async () => {
      const result = await batchCreate('items', [])
      expect(result).toEqual([])
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should throw error when batch creation fails', async () => {
      const records = [{ name: 'Item 1' }]

      mockSend.mockRejectedValue(new Error('Creation failed'))

      await expect(batchCreate('items', records)).rejects.toThrow('Batch create failed: Creation failed')
    })

    it('should handle creation of records with complex data', async () => {
      const records = [
        {
          name: 'Complex Item',
          metadata: { key: 'value', nested: { data: true } },
          tags: ['tag1', 'tag2'],
          count: 42
        }
      ]

      mockSend.mockResolvedValue([
        { status: 200, body: { id: 'item-1', ...records[0] } }
      ])

      const result = await batchCreate('items', records)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject(records[0])
    })

    it('should create single record successfully', async () => {
      const records = [{ name: 'Single Item' }]

      mockSend.mockResolvedValue([
        { status: 200, body: { id: 'item-1', name: 'Single Item' } }
      ])

      const result = await batchCreate('items', records)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-1')
    })
  })

  describe('batchUpdate', () => {
    it('should update multiple records successfully', async () => {
      const updates = [
        { id: 'item-1', data: { name: 'Updated 1' } },
        { id: 'item-2', data: { name: 'Updated 2' } }
      ]

      const mockResponse = [
        { status: 200, body: { id: 'item-1', name: 'Updated 1' } },
        { status: 200, body: { id: 'item-2', name: 'Updated 2' } }
      ]

      mockSend.mockResolvedValue(mockResponse)

      const result = await batchUpdate('items', updates)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Updated 1')
      expect(result[1].name).toBe('Updated 2')

      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests).toHaveLength(2)
      expect(sentRequests[0].method).toBe('PATCH')
      expect(sentRequests[0].url).toBe('/api/collections/items/records/item-1')
      expect(sentRequests[0].body).toEqual({ name: 'Updated 1' })
    })

    it('should return empty array for empty input', async () => {
      const result = await batchUpdate('items', [])
      expect(result).toEqual([])
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should throw error when batch update fails', async () => {
      const updates = [{ id: 'item-1', data: { name: 'Updated' } }]

      mockSend.mockRejectedValue(new Error('Update failed'))

      await expect(batchUpdate('items', updates)).rejects.toThrow('Batch update failed: Update failed')
    })

    it('should handle partial updates correctly', async () => {
      const updates = [
        { id: 'item-1', data: { name: 'New Name' } as Partial<any> }
      ]

      mockSend.mockResolvedValue([
        { status: 200, body: { id: 'item-1', name: 'New Name', description: 'Old Description' } }
      ])

      const result = await batchUpdate('items', updates)

      expect(result[0]).toMatchObject({
        id: 'item-1',
        name: 'New Name',
        description: 'Old Description'
      })
    })

    it('should update single record successfully', async () => {
      const updates = [{ id: 'item-1', data: { status: 'active' } }]

      mockSend.mockResolvedValue([
        { status: 200, body: { id: 'item-1', status: 'active' } }
      ])

      const result = await batchUpdate('items', updates)

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('active')
    })
  })

  describe('batchDelete', () => {
    it('should delete multiple records successfully', async () => {
      const ids = ['item-1', 'item-2', 'item-3']

      mockSend.mockResolvedValue([
        { status: 204, body: null },
        { status: 204, body: null },
        { status: 204, body: null }
      ])

      const result = await batchDelete('items', ids)

      expect(result).toBe(true)

      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests).toHaveLength(3)
      expect(sentRequests[0].method).toBe('DELETE')
      expect(sentRequests[0].url).toBe('/api/collections/items/records/item-1')
      expect(sentRequests[1].url).toBe('/api/collections/items/records/item-2')
      expect(sentRequests[2].url).toBe('/api/collections/items/records/item-3')
    })

    it('should return true for empty input', async () => {
      const result = await batchDelete('items', [])
      expect(result).toBe(true)
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should throw error when batch delete fails', async () => {
      const ids = ['item-1']

      mockSend.mockRejectedValue(new Error('Delete failed'))

      await expect(batchDelete('items', ids)).rejects.toThrow('Batch delete failed: Delete failed')
    })

    it('should delete single record successfully', async () => {
      const ids = ['item-1']

      mockSend.mockResolvedValue([
        { status: 204, body: null }
      ])

      const result = await batchDelete('items', ids)

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should handle deletion of many records', async () => {
      const ids = Array.from({ length: 100 }, (_, i) => `item-${i}`)

      mockSend.mockResolvedValue(
        Array.from({ length: 100 }, () => ({ status: 204, body: null }))
      )

      const result = await batchDelete('items', ids)

      expect(result).toBe(true)
      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests).toHaveLength(100)
    })
  })

  describe('batchUpsert', () => {
    it('should create new records without IDs', async () => {
      const records = [
        { name: 'New Item 1' },
        { name: 'New Item 2' }
      ]

      mockSend.mockResolvedValue([
        { status: 200, body: { id: 'item-1', name: 'New Item 1' } },
        { status: 200, body: { id: 'item-2', name: 'New Item 2' } }
      ])

      const result = await batchUpsert('items', records)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('item-1')
      expect(result[1].id).toBe('item-2')

      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests[0].method).toBe('POST')
      expect(sentRequests[0].url).toBe('/api/collections/items/records')
      expect(sentRequests[1].method).toBe('POST')
    })

    it('should update existing records with IDs', async () => {
      const records = [
        { id: 'item-1', name: 'Updated Item 1' },
        { id: 'item-2', name: 'Updated Item 2' }
      ]

      mockSend.mockResolvedValue([
        { status: 200, body: { id: 'item-1', name: 'Updated Item 1' } },
        { status: 200, body: { id: 'item-2', name: 'Updated Item 2' } }
      ])

      const result = await batchUpsert('items', records)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Updated Item 1')

      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests[0].method).toBe('PATCH')
      expect(sentRequests[0].url).toBe('/api/collections/items/records/item-1')
      expect(sentRequests[1].method).toBe('PATCH')
      expect(sentRequests[1].url).toBe('/api/collections/items/records/item-2')
    })

    it('should handle mixed create and update operations', async () => {
      const records = [
        { name: 'New Item' },
        { id: 'item-1', name: 'Updated Item' },
        { name: 'Another New Item' }
      ]

      mockSend.mockResolvedValue([
        { status: 200, body: { id: 'item-3', name: 'New Item' } },
        { status: 200, body: { id: 'item-1', name: 'Updated Item' } },
        { status: 200, body: { id: 'item-4', name: 'Another New Item' } }
      ])

      const result = await batchUpsert('items', records)

      expect(result).toHaveLength(3)

      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests[0].method).toBe('POST')
      expect(sentRequests[1].method).toBe('PATCH')
      expect(sentRequests[2].method).toBe('POST')
    })

    it('should return empty array for empty input', async () => {
      const result = await batchUpsert('items', [])
      expect(result).toEqual([])
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should throw error when batch upsert fails', async () => {
      const records = [{ name: 'Item' }]

      mockSend.mockRejectedValue(new Error('Upsert failed'))

      await expect(batchUpsert('items', records)).rejects.toThrow('Batch upsert failed: Upsert failed')
    })

    it('should correctly route based on presence of id', async () => {
      const records = [
        { id: 'item-1', name: 'Has ID' },
        { name: 'No ID' }
      ]

      mockSend.mockResolvedValue([
        { status: 200, body: { id: 'item-1', name: 'Has ID' } },
        { status: 200, body: { id: 'item-2', name: 'No ID' } }
      ])

      await batchUpsert('items', records)

      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests[0].method).toBe('PATCH')
      expect(sentRequests[0].url).toContain('item-1')
      expect(sentRequests[1].method).toBe('POST')
      expect(sentRequests[1].url).not.toContain('item-')
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('should handle network timeout errors', async () => {
      const error = new Error('Request timeout')
      mockSend.mockRejectedValue(error)

      const requests: BatchRequest[] = [
        { method: 'POST', url: '/api/collections/items/records', body: {} }
      ]

      const result = await executeBatch(requests)

      expect(result.success).toBe(false)
      expect(result.errors).toEqual(['Request timeout'])
    })

    it('should handle malformed error objects', async () => {
      const error = { code: 500, details: 'Server error' }
      mockSend.mockRejectedValue(error)

      const requests: BatchRequest[] = [
        { method: 'POST', url: '/api/collections/items/records', body: {} }
      ]

      const result = await executeBatch(requests)

      expect(result.success).toBe(false)
      expect(result.errors).toEqual(['Batch operation failed'])
    })

    it('should handle undefined response from server', async () => {
      mockSend.mockResolvedValue(undefined)

      const requests: BatchRequest[] = [
        { method: 'GET', url: '/api/collections/items/records' }
      ]

      const result = await executeBatch(requests)

      expect(result.success).toBe(true)
      expect(result.responses).toEqual([])
    })
  })

  describe('Collection Name Handling', () => {
    it('should handle different collection names correctly', async () => {
      const collections = ['items', 'vendors', 'deliveries', 'payments']

      for (const collection of collections) {
        mockSend.mockResolvedValue([])
        await batchCreate(collection, [{ test: 'data' }])

        const sentRequests = mockSend.mock.calls[mockSend.mock.calls.length - 1][1].body.requests
        expect(sentRequests[0].url).toBe(`/api/collections/${collection}/records`)
      }
    })

    it('should handle collection names with special characters', async () => {
      mockSend.mockResolvedValue([])

      await batchCreate('my_collection-name', [{ test: 'data' }])

      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests[0].url).toBe('/api/collections/my_collection-name/records')
    })
  })

  describe('Performance and Limits', () => {
    it('should handle large batch operations', async () => {
      const largeRecordSet = Array.from({ length: 500 }, (_, i) => ({
        name: `Item ${i}`,
        index: i
      }))

      mockSend.mockResolvedValue(
        Array.from({ length: 500 }, (_, i) => ({
          status: 200,
          body: { id: `item-${i}`, name: `Item ${i}`, index: i }
        }))
      )

      const result = await batchCreate('items', largeRecordSet)

      expect(result).toHaveLength(500)
      expect(mockSend).toHaveBeenCalledTimes(1)

      const sentRequests = mockSend.mock.calls[0][1].body.requests
      expect(sentRequests).toHaveLength(500)
    })

    it('should handle batch operations with large payloads', async () => {
      const largePayload = {
        name: 'Item',
        data: 'x'.repeat(10000) // 10KB of data
      }

      mockSend.mockResolvedValue([
        { status: 200, body: { id: 'item-1', ...largePayload } }
      ])

      const result = await batchCreate('items', [largePayload])

      expect(result).toHaveLength(1)
      expect(result[0].data).toHaveLength(10000)
    })
  })
})
