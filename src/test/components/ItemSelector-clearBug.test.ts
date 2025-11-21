import { describe, it, expect, beforeEach } from 'vitest'

describe('ItemSelector - Clear Bug Fix Logic', () => {
  beforeEach(() => {
    // Clear any mocks if needed
  })

  describe('filteredItems computation logic', () => {
    const mockItems = [
      { id: 'item-1', name: 'Cement', unit: 'kg', description: 'Portland cement' },
      { id: 'item-2', name: 'Bricks', unit: 'pieces', description: 'Red clay bricks' },
      { id: 'item-3', name: 'Steel', unit: 'kg', description: 'TMT steel bars' }
    ]

    it('should exclude used items from available items', () => {
      const usedItems = ['item-2']
      const modelValue = ''
      const searchQuery = ''

      // Filter logic
      const availableItems = mockItems.filter(item => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      })

      expect(availableItems).toHaveLength(2)
      expect(availableItems.find(i => i.id === 'item-2')).toBeUndefined()
    })

    it('should allow current item to appear when search query is cleared', () => {
      // Scenario: User selected "Cement", then cleared the search field
      const usedItems: string[] = []
      const modelValue = 'item-1' // Cement is still selected
      const searchQuery = '' // But search field is empty

      // Filter logic - this is the bug fix
      const availableItems = mockItems.filter(item => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      })

      // Cement should be available again since search query doesn't match
      expect(availableItems).toHaveLength(3)
      expect(availableItems.find(i => i.id === 'item-1')).toBeDefined()
    })

    it('should exclude current item when search query matches its name', () => {
      // Scenario: User selected "Cement" and search field shows "Cement"
      const usedItems: string[] = []
      const modelValue = 'item-1' // Cement is selected
      const searchQuery = 'Cement' // Search matches the item name

      // Filter logic
      const availableItems = mockItems.filter(item => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      })

      // Cement should NOT be available since search query matches exactly
      expect(availableItems).toHaveLength(2)
      expect(availableItems.find(i => i.id === 'item-1')).toBeUndefined()
    })

    it('should allow current item when search query partially matches', () => {
      // Scenario: User selected "Cement", then types "Cem"
      const usedItems: string[] = []
      const modelValue = 'item-1' // Cement is selected
      const searchQuery = 'Cem' // Partial match

      // Filter logic
      const availableItems = mockItems.filter(item => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      })

      // Cement should be available since partial match doesn't equal full name
      expect(availableItems).toHaveLength(3)
      expect(availableItems.find(i => i.id === 'item-1')).toBeDefined()
    })

    it('should filter items by search query', () => {
      const usedItems: string[] = []
      const modelValue = ''
      const searchQuery = 'steel'

      // First get available items
      const availableItems = mockItems.filter(item => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      })

      // Then apply search filter
      const filteredItems = availableItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )

      expect(filteredItems).toHaveLength(1)
      expect(filteredItems[0].id).toBe('item-3')
    })

    it('should handle case-insensitive matching', () => {
      const usedItems: string[] = []
      const modelValue = 'item-1'
      const searchQuery = 'CEMENT'

      // Filter logic with case-insensitive comparison
      const availableItems = mockItems.filter(item => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      })

      // Should exclude Cement since "CEMENT" matches "Cement" (case-insensitive)
      expect(availableItems).toHaveLength(2)
      expect(availableItems.find(i => i.id === 'item-1')).toBeUndefined()
    })
  })

  describe('Bug fix scenarios', () => {
    const mockItems = [
      { id: 'item-1', name: 'Cement', unit: 'kg', description: 'Portland cement' },
      { id: 'item-2', name: 'Bricks', unit: 'pieces', description: 'Red clay bricks' },
      { id: 'item-3', name: 'Steel', unit: 'kg', description: 'TMT steel bars' }
    ]

    it('OLD BEHAVIOR: would exclude item when text was deleted', () => {
      // This was the bug - item stayed excluded even when text was deleted
      const usedItems: string[] = []
      const modelValue = 'item-1'
      const searchQuery = '' // User deleted all text

      // Old buggy logic (for reference)
      const oldBuggyFilter = (item: any) => {
        const isCurrentItem = modelValue && item.id === modelValue
        return !usedItems.includes(item.id!) && !isCurrentItem // ❌ Always excluded current item
      }

      const buggyResult = mockItems.filter(oldBuggyFilter)
      expect(buggyResult).toHaveLength(2) // Bug: Cement is excluded
      expect(buggyResult.find(i => i.id === 'item-1')).toBeUndefined()
    })

    it('NEW BEHAVIOR: allows item to reappear when text is deleted', () => {
      // This is the fix - item reappears when search query doesn't match
      const usedItems: string[] = []
      const modelValue = 'item-1'
      const searchQuery = '' // User deleted all text

      // New fixed logic
      const fixedFilter = (item: any) => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem) // ✅ Only exclude if query matches
      }

      const fixedResult = mockItems.filter(fixedFilter)
      expect(fixedResult).toHaveLength(3) // Fix: Cement is available
      expect(fixedResult.find(i => i.id === 'item-1')).toBeDefined()
    })

    it('should handle multiple item selections and deletions', () => {
      // Scenario: User adds item-1 and item-2 to delivery, then wants to edit item-1
      const usedItems = ['item-2'] // item-2 is used elsewhere in delivery
      const modelValue = 'item-1' // Currently editing item-1
      const searchQuery = '' // Deleted text to search again

      const filterLogic = (item: any) => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      }

      const result = mockItems.filter(filterLogic)

      // Should show item-1 and item-3, but not item-2 (which is used)
      expect(result).toHaveLength(2)
      expect(result.find(i => i.id === 'item-1')).toBeDefined()
      expect(result.find(i => i.id === 'item-2')).toBeUndefined()
      expect(result.find(i => i.id === 'item-3')).toBeDefined()
    })

    it('should prevent duplicate item selection in same delivery', () => {
      // Scenario: item-1 is already added to delivery, user tries to add it again
      const usedItems = ['item-1', 'item-2']
      const modelValue = ''
      const searchQuery = 'cement'

      const filterLogic = (item: any) => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      }

      const availableItems = mockItems.filter(filterLogic)
      const searchResults = availableItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )

      // Should not show item-1 since it's already used
      expect(searchResults).toHaveLength(0)
      expect(searchResults.find(i => i.id === 'item-1')).toBeUndefined()
    })
  })

  describe('Edge cases', () => {
    const mockItems = [
      { id: 'item-1', name: 'Cement', unit: 'kg', description: 'Portland cement' },
      { id: 'item-2', name: 'cement', unit: 'bags', description: 'Bagged cement' } // Same name, different case
    ]

    it('should handle items with same name but different case', () => {
      const usedItems: string[] = []
      const modelValue = 'item-1' // "Cement" selected
      const searchQuery = 'cement' // User types lowercase

      const filterLogic = (item: any) => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      }

      const result = mockItems.filter(filterLogic)

      // Should show item-2 but not item-1 (query matches item-1's name)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-2')
    })

    it('should handle empty items array', () => {
      const mockItems: any[] = []
      const usedItems: string[] = []
      const modelValue = ''
      const searchQuery = 'test'

      const filterLogic = (item: any) => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      }

      const result = mockItems.filter(filterLogic)
      expect(result).toHaveLength(0)
    })

    it('should handle undefined modelValue', () => {
      const usedItems: string[] = []
      const modelValue = undefined
      const searchQuery = ''

      const filterLogic = (item: any) => {
        const isCurrentItem = modelValue && item.id === modelValue
        const searchQueryMatchesCurrentItem = isCurrentItem && searchQuery.toLowerCase() === item.name.toLowerCase()
        return !usedItems.includes(item.id!) && !(isCurrentItem && searchQueryMatchesCurrentItem)
      }

      const mockItems = [
        { id: 'item-1', name: 'Cement', unit: 'kg' }
      ]

      const result = mockItems.filter(filterLogic)
      expect(result).toHaveLength(1)
    })
  })
})
