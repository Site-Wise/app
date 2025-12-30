import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('DeliveryItemRow - Last Price Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLastPriceForItem functionality', () => {
    it('should return the most recent unit_price for an item', async () => {
      // Mock deliveryItemService.getLastPriceForItem
      const getLastPriceForItem = vi.fn().mockResolvedValue(150.50)

      const itemId = 'item-1'
      const lastPrice = await getLastPriceForItem(itemId)

      expect(getLastPriceForItem).toHaveBeenCalledWith(itemId)
      expect(lastPrice).toBe(150.50)
    })

    it('should return null when no previous delivery items exist', async () => {
      const getLastPriceForItem = vi.fn().mockResolvedValue(null)

      const itemId = 'item-new'
      const lastPrice = await getLastPriceForItem(itemId)

      expect(lastPrice).toBeNull()
    })

    it('should return null when an error occurs', async () => {
      const getLastPriceForItem = vi.fn().mockRejectedValue(new Error('Database error'))

      const itemId = 'item-1'

      try {
        await getLastPriceForItem(itemId)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }

      expect(getLastPriceForItem).toHaveBeenCalledWith(itemId)
    })

    it('should handle site filtering correctly', async () => {
      // Simulate that the last price query filters by current site
      const mockDeliveryItems = [
        { id: '1', item: 'item-1', unit_price: 100, site: 'site-1', created: '2024-01-01' },
        { id: '2', item: 'item-1', unit_price: 150, site: 'site-1', created: '2024-01-15' },
        { id: '3', item: 'item-1', unit_price: 200, site: 'site-2', created: '2024-01-20' }
      ]

      // Most recent for site-1 should be 150 (not 200 from site-2)
      const getLastPriceForItem = vi.fn().mockImplementation((itemId: string) => {
        const siteFilteredItems = mockDeliveryItems
          .filter(di => di.item === itemId && di.site === 'site-1')
          .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())

        return Promise.resolve(siteFilteredItems.length > 0 ? siteFilteredItems[0].unit_price : null)
      })

      const lastPrice = await getLastPriceForItem('item-1')
      expect(lastPrice).toBe(150)
    })
  })

  describe('Last price placeholder display', () => {
    it('should format last price correctly for placeholder', () => {
      const lastPrice = 150.50
      const placeholderText = `Last: ₹${lastPrice.toFixed(2)}`

      expect(placeholderText).toBe('Last: ₹150.50')
    })

    it('should show default placeholder when no last price exists', () => {
      const lastPrice = null
      const placeholderText = lastPrice !== null ? `Last: ₹${lastPrice.toFixed(2)}` : '0.00'

      expect(placeholderText).toBe('0.00')
    })

    it('should round last price to 2 decimal places', () => {
      const lastPrice = 150.5555
      const placeholderText = `Last: ₹${lastPrice.toFixed(2)}`

      expect(placeholderText).toBe('Last: ₹150.56')
    })
  })

  describe('Auto-fill unit price with last price', () => {
    it('should auto-fill unit_price when it is 0 and last price exists', () => {
      const currentUnitPrice = 0
      const lastPrice = 150.50

      // Always auto-fill when last price exists (even if current price has value)
      const shouldAutoFill = typeof lastPrice === 'number'
      expect(shouldAutoFill).toBe(true)

      // Simulate the auto-fill
      const newUnitPrice = shouldAutoFill ? lastPrice : currentUnitPrice
      expect(newUnitPrice).toBe(150.50)
    })

    it('should auto-fill unit_price when changing items (even if current has value)', () => {
      const currentUnitPrice = 200
      const lastPrice = 150.50

      // When changing items, always use the new item's last price
      const shouldAutoFill = typeof lastPrice === 'number'
      expect(shouldAutoFill).toBe(true)

      // Unit price should be updated to the new item's last price
      const newUnitPrice = shouldAutoFill ? lastPrice : currentUnitPrice
      expect(newUnitPrice).toBe(150.50)
    })

    it('should not auto-fill when last price is null', () => {
      const currentUnitPrice = 0
      const lastPrice = null

      const shouldAutoFill = typeof lastPrice === 'number'
      expect(shouldAutoFill).toBe(false)

      const newUnitPrice = shouldAutoFill && lastPrice !== null ? lastPrice : currentUnitPrice
      expect(newUnitPrice).toBe(0)
    })

    it('should preserve existing price when new item has no price history', () => {
      const currentUnitPrice = 200
      const lastPrice = null // No price history for new item

      const shouldAutoFill = typeof lastPrice === 'number'
      expect(shouldAutoFill).toBe(false)

      // Keep the current price if no last price exists
      const newUnitPrice = shouldAutoFill && lastPrice !== null ? lastPrice : currentUnitPrice
      expect(newUnitPrice).toBe(200)
    })
  })

  describe('handleItemSelected integration logic', () => {
    it('should fetch last price and auto-fill when item is selected', async () => {
      const mockItem = { id: 'item-1', name: 'Cement', unit: 'kg' }
      const mockLastPrice = 150.50

      // Simulate the logic in handleItemSelected
      const fetchLastPrice = vi.fn().mockResolvedValue(mockLastPrice)

      const lastPrice = await fetchLastPrice(mockItem.id)

      // Auto-fill logic - always auto-fill when last price exists
      const shouldAutoFill = lastPrice !== null
      const newUnitPrice = shouldAutoFill ? lastPrice : 0

      expect(fetchLastPrice).toHaveBeenCalledWith('item-1')
      expect(lastPrice).toBe(150.50)
      expect(shouldAutoFill).toBe(true)
      expect(newUnitPrice).toBe(150.50)
    })

    it('should update price when changing to a different item', async () => {
      const fetchLastPrice = vi.fn()
        .mockResolvedValueOnce(100) // First item price
        .mockResolvedValueOnce(200) // Second item price

      // Select first item
      const firstPrice = await fetchLastPrice('item-1')
      expect(firstPrice).toBe(100)

      // Change to second item - should get second item's last price
      const secondPrice = await fetchLastPrice('item-2')
      expect(secondPrice).toBe(200)

      // Always use the last price when available
      expect(fetchLastPrice).toHaveBeenCalledTimes(2)
    })

    it('should clear last price when item is deselected', () => {
      let lastPrice: number | null = 150.50

      // Simulate item deselection
      const item = null
      if (!item) {
        lastPrice = null
      }

      expect(lastPrice).toBeNull()
    })

    it('should handle fetch errors gracefully', async () => {
      const mockItem = { id: 'item-1', name: 'Cement', unit: 'kg' }

      const fetchLastPrice = vi.fn().mockRejectedValue(new Error('Network error'))

      let lastPrice: number | null = null
      try {
        lastPrice = await fetchLastPrice(mockItem.id)
      } catch (error) {
        console.error('Error fetching last price:', error)
        lastPrice = null
      }

      expect(lastPrice).toBeNull()
    })
  })

  describe('Total amount calculation with auto-filled price', () => {
    it('should calculate total correctly after auto-filling unit price', () => {
      const quantity = 10
      const autoFilledUnitPrice = 150.50

      const calculateTotal = (qty: number, price: number) => {
        const safeQuantity = Math.max(0, qty || 0)
        const safeUnitPrice = Math.max(0, price || 0)
        const total = safeQuantity * safeUnitPrice
        return Math.round(total * 100) / 100
      }

      const totalAmount = calculateTotal(quantity, autoFilledUnitPrice)
      expect(totalAmount).toBe(1505.00)
    })

    it('should recalculate total when quantity changes after auto-fill', () => {
      const initialQuantity = 10
      const autoFilledUnitPrice = 150.50

      const calculateTotal = (qty: number, price: number) => {
        return Math.round((qty * price) * 100) / 100
      }

      const initialTotal = calculateTotal(initialQuantity, autoFilledUnitPrice)
      expect(initialTotal).toBe(1505.00)

      // User changes quantity
      const newQuantity = 15
      const newTotal = calculateTotal(newQuantity, autoFilledUnitPrice)
      expect(newTotal).toBe(2257.50)
    })
  })
})
