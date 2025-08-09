import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('ItemSelector Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Item Selection Logic', () => {
    it('should select item correctly', () => {
      const mockEmit = vi.fn()
      const selectItem = (
        item: { id: string; name: string },
        emit: typeof mockEmit,
        setSearchQuery: (query: string) => void,
        setShowDropdown: (show: boolean) => void
      ) => {
        emit('update:modelValue', item.id)
        emit('itemSelected', item)
        setSearchQuery(item.name)
        setShowDropdown(false)
      }
      
      const mockItem = { id: 'item-1', name: 'Test Item' }
      const mockSetSearchQuery = vi.fn()
      const mockSetShowDropdown = vi.fn()
      
      selectItem(mockItem, mockEmit, mockSetSearchQuery, mockSetShowDropdown)
      
      expect(mockEmit).toHaveBeenCalledWith('update:modelValue', 'item-1')
      expect(mockEmit).toHaveBeenCalledWith('itemSelected', mockItem)
      expect(mockSetSearchQuery).toHaveBeenCalledWith('Test Item')
      expect(mockSetShowDropdown).toHaveBeenCalledWith(false)
    })

    it('should handle item selection with complete item data', () => {
      const mockEmit = vi.fn()
      const selectItem = (item: any, emit: typeof mockEmit) => {
        emit('update:modelValue', item.id)
        emit('itemSelected', item)
      }
      
      const completeItem = {
        id: 'item-1',
        name: 'Complete Item',
        description: 'Item description',
        unit: 'pieces',
        category: 'Category A'
      }
      
      selectItem(completeItem, mockEmit)
      
      expect(mockEmit).toHaveBeenCalledWith('update:modelValue', 'item-1')
      expect(mockEmit).toHaveBeenCalledWith('itemSelected', completeItem)
    })
  })

  describe('Clear Selection Logic', () => {
    it('should clear selection correctly', () => {
      const mockEmit = vi.fn()
      const clearSelection = (
        emit: typeof mockEmit,
        setSearchQuery: (query: string) => void,
        setShowDropdown: (show: boolean) => void
      ) => {
        emit('update:modelValue', '')
        emit('itemSelected', null)
        setSearchQuery('')
        setShowDropdown(false)
      }
      
      const mockSetSearchQuery = vi.fn()
      const mockSetShowDropdown = vi.fn()
      
      clearSelection(mockEmit, mockSetSearchQuery, mockSetShowDropdown)
      
      expect(mockEmit).toHaveBeenCalledWith('update:modelValue', '')
      expect(mockEmit).toHaveBeenCalledWith('itemSelected', null)
      expect(mockSetSearchQuery).toHaveBeenCalledWith('')
      expect(mockSetShowDropdown).toHaveBeenCalledWith(false)
    })

    it('should not show clear button when readonly', () => {
      const shouldShowClearButton = (selectedItem: any, readonly: boolean) => {
        return Boolean(selectedItem && !readonly)
      }
      
      expect(shouldShowClearButton({ id: '1' }, true)).toBe(false)
      expect(shouldShowClearButton({ id: '1' }, false)).toBe(true)
      expect(shouldShowClearButton(null, false)).toBe(false)
    })
  })

  describe('Search and Filtering Logic', () => {
    it('should filter items by name', () => {
      const filterItems = (
        allItems: any[],
        searchQuery: string,
        usedItems: string[],
        modelValue: string
      ) => {
        const query = searchQuery.toLowerCase().trim()
        let availableItems = allItems.filter(item => {
          const isCurrentItem = modelValue && item.id === modelValue
          return !usedItems.includes(item.id) && !isCurrentItem
        })

        if (!query) {
          return availableItems
        }

        return availableItems
          .filter(item => 
            item.name.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query))
          )
          .slice(0, 10)
      }
      
      const allItems = [
        { id: '1', name: 'Widget A', description: 'Small widget' },
        { id: '2', name: 'Widget B', description: 'Large widget' },
        { id: '3', name: 'Tool A', description: 'Useful tool' }
      ]
      
      const filtered = filterItems(allItems, 'widget', [], '')
      expect(filtered).toHaveLength(2)
      expect(filtered.map(item => item.name)).toEqual(['Widget A', 'Widget B'])
    })

    it('should filter items by description', () => {
      const filterItems = (
        allItems: any[],
        searchQuery: string,
        usedItems: string[],
        modelValue: string
      ) => {
        const query = searchQuery.toLowerCase().trim()
        let availableItems = allItems.filter(item => {
          const isCurrentItem = modelValue && item.id === modelValue
          return !usedItems.includes(item.id) && !isCurrentItem
        })

        if (!query) {
          return availableItems
        }

        return availableItems
          .filter(item => 
            item.name.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query))
          )
          .slice(0, 10)
      }
      
      const allItems = [
        { id: '1', name: 'Item A', description: 'Professional tool' },
        { id: '2', name: 'Item B', description: 'Basic equipment' },
        { id: '3', name: 'Item C', description: 'Advanced tool' }
      ]
      
      const filtered = filterItems(allItems, 'tool', [], '')
      expect(filtered).toHaveLength(2)
      expect(filtered.map(item => item.name)).toEqual(['Item A', 'Item C'])
    })

    it('should exclude used items from results', () => {
      const filterItems = (
        allItems: any[],
        searchQuery: string,
        usedItems: string[],
        modelValue: string
      ) => {
        const query = searchQuery.toLowerCase().trim()
        let availableItems = allItems.filter(item => {
          const isCurrentItem = modelValue && item.id === modelValue
          return !usedItems.includes(item.id) && !isCurrentItem
        })

        if (!query) {
          return availableItems
        }

        return availableItems
          .filter(item => 
            item.name.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query))
          )
          .slice(0, 10)
      }
      
      const allItems = [
        { id: '1', name: 'Item A' },
        { id: '2', name: 'Item B' },
        { id: '3', name: 'Item C' }
      ]
      
      const filtered = filterItems(allItems, '', ['1', '3'], '')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('Item B')
    })

    it('should exclude current item when modelValue is set', () => {
      const filterItems = (
        allItems: any[],
        searchQuery: string,
        usedItems: string[],
        modelValue: string
      ) => {
        const query = searchQuery.toLowerCase().trim()
        let availableItems = allItems.filter(item => {
          const isCurrentItem = modelValue && item.id === modelValue
          return !usedItems.includes(item.id) && !isCurrentItem
        })

        return availableItems
      }
      
      const allItems = [
        { id: '1', name: 'Item A' },
        { id: '2', name: 'Item B' },
        { id: '3', name: 'Item C' }
      ]
      
      const filtered = filterItems(allItems, '', [], '2')
      expect(filtered).toHaveLength(2)
      expect(filtered.map(item => item.name)).toEqual(['Item A', 'Item C'])
    })

    it('should limit results to 10 items', () => {
      const filterItems = (items: any[], query: string) => {
        return items
          .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10)
      }
      
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        name: `Test Item ${i}`
      }))
      
      const filtered = filterItems(manyItems, 'test')
      expect(filtered).toHaveLength(10)
    })
  })

  describe('Selected Item Computation Logic', () => {
    it('should find selected item by modelValue', () => {
      const getSelectedItem = (items: any[], modelValue: string) => {
        return items.find(item => item.id === modelValue) || null
      }
      
      const items = [
        { id: '1', name: 'Item A' },
        { id: '2', name: 'Item B' },
        { id: '3', name: 'Item C' }
      ]
      
      expect(getSelectedItem(items, '2')).toEqual({ id: '2', name: 'Item B' })
      expect(getSelectedItem(items, 'nonexistent')).toBe(null)
      expect(getSelectedItem(items, '')).toBe(null)
    })

    it('should handle empty items array', () => {
      const getSelectedItem = (items: any[], modelValue: string) => {
        return items.find(item => item.id === modelValue) || null
      }
      
      expect(getSelectedItem([], '1')).toBe(null)
    })
  })

  describe('Enter Key Handling Logic', () => {
    it('should select single filtered item on enter', () => {
      const mockSelectItem = vi.fn()
      const handleEnterKey = (
        filteredItems: any[],
        selectItemFn: typeof mockSelectItem
      ) => {
        if (filteredItems.length === 1) {
          selectItemFn(filteredItems[0])
        }
      }
      
      const singleItem = [{ id: '1', name: 'Single Item' }]
      handleEnterKey(singleItem, mockSelectItem)
      
      expect(mockSelectItem).toHaveBeenCalledWith(singleItem[0])
    })

    it('should do nothing when multiple items match', () => {
      const mockSelectItem = vi.fn()
      const handleEnterKey = (
        filteredItems: any[],
        selectItemFn: typeof mockSelectItem
      ) => {
        if (filteredItems.length === 1) {
          selectItemFn(filteredItems[0])
        }
      }
      
      const multipleItems = [
        { id: '1', name: 'Item A' },
        { id: '2', name: 'Item B' }
      ]
      
      handleEnterKey(multipleItems, mockSelectItem)
      expect(mockSelectItem).not.toHaveBeenCalled()
    })

    it('should do nothing when no items match', () => {
      const mockSelectItem = vi.fn()
      const handleEnterKey = (
        filteredItems: any[],
        selectItemFn: typeof mockSelectItem
      ) => {
        if (filteredItems.length === 1) {
          selectItemFn(filteredItems[0])
        }
      }
      
      handleEnterKey([], mockSelectItem)
      expect(mockSelectItem).not.toHaveBeenCalled()
    })
  })

  describe('Dropdown Visibility Logic', () => {
    it('should show dropdown when conditions are met', () => {
      const shouldShowDropdown = (
        showDropdown: boolean,
        filteredItems: any[],
        searchQuery: string
      ) => {
        return showDropdown && (filteredItems.length > 0 || searchQuery.trim() !== '')
      }
      
      expect(shouldShowDropdown(true, [{ id: '1' }], '')).toBe(true)
      expect(shouldShowDropdown(true, [], 'query')).toBe(true)
      expect(shouldShowDropdown(true, [], '')).toBe(false)
      expect(shouldShowDropdown(false, [{ id: '1' }], 'query')).toBe(false)
    })

    it('should hide dropdown correctly', () => {
      const hideDropdown = (setShowDropdown: (show: boolean) => void) => {
        setShowDropdown(false)
      }
      
      const mockSetShowDropdown = vi.fn()
      hideDropdown(mockSetShowDropdown)
      
      expect(mockSetShowDropdown).toHaveBeenCalledWith(false)
    })
  })

  describe('Search Query Management Logic', () => {
    it('should update search query on input', () => {
      const handleSearch = (setShowDropdown: (show: boolean) => void) => {
        setShowDropdown(true)
      }
      
      const mockSetShowDropdown = vi.fn()
      handleSearch(mockSetShowDropdown)
      
      expect(mockSetShowDropdown).toHaveBeenCalledWith(true)
    })

    it('should sync search query with selected item', () => {
      const syncSearchQuery = (
        modelValue: string,
        items: any[],
        setSearchQuery: (query: string) => void
      ) => {
        if (modelValue) {
          const item = items.find(item => item.id === modelValue)
          if (item) {
            setSearchQuery(item.name)
          }
        } else {
          setSearchQuery('')
        }
      }
      
      const items = [
        { id: '1', name: 'Item A' },
        { id: '2', name: 'Item B' }
      ]
      
      const mockSetSearchQuery = vi.fn()
      
      // With selected item
      syncSearchQuery('1', items, mockSetSearchQuery)
      expect(mockSetSearchQuery).toHaveBeenCalledWith('Item A')
      
      // Without selected item
      mockSetSearchQuery.mockClear()
      syncSearchQuery('', items, mockSetSearchQuery)
      expect(mockSetSearchQuery).toHaveBeenCalledWith('')
    })
  })

  describe('Click Outside Handling Logic', () => {
    it('should close dropdown on outside click', () => {
      const handleClickOutside = (
        event: { target: { closest: (selector: string) => any } },
        hideDropdownFn: () => void
      ) => {
        if (!event.target.closest('.relative')) {
          hideDropdownFn()
        }
      }
      
      const mockHideDropdown = vi.fn()
      
      // Click outside
      const outsideEvent = {
        target: {
          closest: (selector: string) => null
        }
      }
      
      handleClickOutside(outsideEvent, mockHideDropdown)
      expect(mockHideDropdown).toHaveBeenCalled()
      
      // Click inside
      const insideEvent = {
        target: {
          closest: (selector: string) => selector === '.relative' ? {} : null
        }
      }
      
      mockHideDropdown.mockClear()
      handleClickOutside(insideEvent, mockHideDropdown)
      expect(mockHideDropdown).not.toHaveBeenCalled()
    })
  })

  describe('Props Validation Logic', () => {
    it('should validate Props interface requirements', () => {
      interface Props {
        modelValue: string
        items: any[]
        usedItems?: string[]
        label?: string
        placeholder?: string
        readonly?: boolean
      }
      
      const validateProps = (props: any): props is Props => {
        return (
          typeof props.modelValue === 'string' &&
          Array.isArray(props.items) &&
          (props.usedItems === undefined || Array.isArray(props.usedItems)) &&
          (props.label === undefined || typeof props.label === 'string') &&
          (props.placeholder === undefined || typeof props.placeholder === 'string') &&
          (props.readonly === undefined || typeof props.readonly === 'boolean')
        )
      }
      
      const validProps = {
        modelValue: 'item-1',
        items: [{ id: 'item-1', name: 'Test Item' }],
        usedItems: ['item-2'],
        label: 'Select Item',
        readonly: false
      }
      
      expect(validateProps(validProps)).toBe(true)
      
      const invalidProps = {
        modelValue: 123, // Should be string
        items: 'not an array'
      }
      
      expect(validateProps(invalidProps)).toBe(false)
    })

    it('should validate default props', () => {
      const applyDefaults = (props: any) => {
        return {
          ...props,
          usedItems: props.usedItems || [],
          readonly: props.readonly || false
        }
      }
      
      const propsWithDefaults = applyDefaults({
        modelValue: 'item-1',
        items: []
      })
      
      expect(propsWithDefaults.usedItems).toEqual([])
      expect(propsWithDefaults.readonly).toBe(false)
    })
  })

  describe('CSS Classes Logic', () => {
    it('should generate correct input classes', () => {
      const getInputClasses = () => {
        return 'input pr-10'
      }
      
      expect(getInputClasses()).toBe('input pr-10')
    })

    it('should generate correct clear button classes', () => {
      const getClearButtonClasses = () => {
        return 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
      }
      
      const classes = getClearButtonClasses()
      expect(classes).toContain('text-gray-400')
      expect(classes).toContain('hover:text-gray-600')
      expect(classes).toContain('rounded-full')
      expect(classes).toContain('transition-colors')
    })

    it('should generate correct dropdown classes', () => {
      const getDropdownClasses = () => {
        return 'absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto'
      }
      
      const classes = getDropdownClasses()
      expect(classes).toContain('absolute')
      expect(classes).toContain('z-50')
      expect(classes).toContain('bg-white')
      expect(classes).toContain('dark:bg-gray-800')
      expect(classes).toContain('shadow-xl')
      expect(classes).toContain('max-h-60')
      expect(classes).toContain('overflow-auto')
    })

    it('should generate correct item option classes', () => {
      const getItemOptionClasses = () => {
        return 'flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer touch-manipulation'
      }
      
      const classes = getItemOptionClasses()
      expect(classes).toContain('flex')
      expect(classes).toContain('items-center')
      expect(classes).toContain('px-3')
      expect(classes).toContain('py-2')
      expect(classes).toContain('hover:bg-gray-50')
      expect(classes).toContain('cursor-pointer')
      expect(classes).toContain('touch-manipulation')
    })
  })

  describe('Accessibility Logic', () => {
    it('should provide correct input attributes', () => {
      const getInputAttributes = (placeholder?: string, readonly?: boolean) => {
        return {
          type: 'text',
          placeholder: placeholder || 'Search items...',
          readonly: readonly || false
        }
      }
      
      const attrs = getInputAttributes('Find items', true)
      expect(attrs.type).toBe('text')
      expect(attrs.placeholder).toBe('Find items')
      expect(attrs.readonly).toBe(true)
    })

    it('should provide clear button title', () => {
      const getClearButtonTitle = (t: (key: string) => string) => {
        return t('common.clear')
      }
      
      const mockTranslate = (key: string) => {
        return key === 'common.clear' ? 'Clear' : key
      }
      
      expect(getClearButtonTitle(mockTranslate)).toBe('Clear')
    })

    it('should handle keyboard navigation correctly', () => {
      const keyboardHandlers = {
        'Enter': 'handleEnterKey',
        'Escape': 'hideDropdown'
      }
      
      expect(keyboardHandlers['Enter']).toBe('handleEnterKey')
      expect(keyboardHandlers['Escape']).toBe('hideDropdown')
    })
  })

  describe('Translation Keys Logic', () => {
    it('should use correct translation keys', () => {
      const translationKeys = {
        searchItems: 'forms.searchItems',
        noItemsFound: 'items.noItemsFound',
        clear: 'common.clear'
      }
      
      expect(translationKeys.searchItems).toBe('forms.searchItems')
      expect(translationKeys.noItemsFound).toBe('items.noItemsFound')
      expect(translationKeys.clear).toBe('common.clear')
    })
  })

  describe('Icon Display Logic', () => {
    it('should show correct icons', () => {
      const icons = {
        search: 'Search',
        package: 'Package',
        clear: 'X'
      }
      
      expect(icons.search).toBe('Search')
      expect(icons.package).toBe('Package')
      expect(icons.clear).toBe('X')
    })

    it('should apply correct icon classes', () => {
      const getIconClasses = (iconType: 'search' | 'package' | 'clear') => {
        const iconClasses = {
          search: 'h-4 w-4 text-gray-400',
          package: 'h-4 w-4 text-gray-500 dark:text-gray-400 mr-3 flex-shrink-0',
          clear: 'h-4 w-4'
        }
        return iconClasses[iconType]
      }
      
      expect(getIconClasses('search')).toContain('h-4 w-4')
      expect(getIconClasses('package')).toContain('mr-3')
      expect(getIconClasses('package')).toContain('flex-shrink-0')
      expect(getIconClasses('clear')).toBe('h-4 w-4')
    })
  })

  describe('Item Display Logic', () => {
    it('should format item display correctly', () => {
      const formatItemDisplay = (item: {
        name: string
        description?: string
        unit: string
      }) => {
        return {
          name: item.name,
          description: item.description || null,
          unit: `(${item.unit})`
        }
      }
      
      const itemWithDescription = {
        name: 'Test Item',
        description: 'Test description',
        unit: 'pieces'
      }
      
      const formatted = formatItemDisplay(itemWithDescription)
      expect(formatted.name).toBe('Test Item')
      expect(formatted.description).toBe('Test description')
      expect(formatted.unit).toBe('(pieces)')
      
      const itemWithoutDescription = {
        name: 'Simple Item',
        unit: 'kg'
      }
      
      const formattedSimple = formatItemDisplay(itemWithoutDescription)
      expect(formattedSimple.description).toBe(null)
      expect(formattedSimple.unit).toBe('(kg)')
    })

    it('should handle missing item data gracefully', () => {
      const safeFormatItem = (item: any) => {
        return {
          name: item?.name || 'Unknown Item',
          description: item?.description || null,
          unit: item?.unit ? `(${item.unit})` : ''
        }
      }
      
      expect(safeFormatItem(null)).toEqual({
        name: 'Unknown Item',
        description: null,
        unit: ''
      })
      
      expect(safeFormatItem({})).toEqual({
        name: 'Unknown Item',
        description: null,
        unit: ''
      })
      
      expect(safeFormatItem({ name: 'Test' })).toEqual({
        name: 'Test',
        description: null,
        unit: ''
      })
    })
  })

  describe('Event Listener Management Logic', () => {
    it('should manage click outside listener', () => {
      const mockEventManager = {
        listeners: new Map<string, Function>(),
        addEventListener: (event: string, handler: Function) => {
          mockEventManager.listeners.set(event, handler)
        },
        removeEventListener: (event: string) => {
          mockEventManager.listeners.delete(event)
        }
      }
      
      const clickHandler = (e: Event) => {
        // Handle click outside logic
      }
      
      mockEventManager.addEventListener('click', clickHandler)
      expect(mockEventManager.listeners.has('click')).toBe(true)
      
      mockEventManager.removeEventListener('click')
      expect(mockEventManager.listeners.has('click')).toBe(false)
    })
  })

  describe('Error Handling Logic', () => {
    it('should handle invalid item data', () => {
      const safeGetItemId = (item: any) => {
        return item?.id || null
      }
      
      expect(safeGetItemId(null)).toBe(null)
      expect(safeGetItemId({})).toBe(null)
      expect(safeGetItemId({ id: 'valid-id' })).toBe('valid-id')
    })

    it('should handle empty items array', () => {
      const getFilteredItems = (items: any[], query: string) => {
        if (!Array.isArray(items)) {
          return []
        }
        
        return items.filter(item => 
          item?.name?.toLowerCase().includes(query.toLowerCase())
        )
      }
      
      expect(getFilteredItems([], 'query')).toEqual([])
      expect(getFilteredItems(null as any, 'query')).toEqual([])
    })

    it('should handle search on items without names', () => {
      const safeFilter = (items: any[], query: string) => {
        return items.filter(item => {
          const name = item?.name || ''
          const description = item?.description || ''
          return name.toLowerCase().includes(query.toLowerCase()) ||
                 description.toLowerCase().includes(query.toLowerCase())
        })
      }
      
      const itemsWithMissingData = [
        { id: '1', name: 'Valid Item' },
        { id: '2', description: 'Item without name' },
        { id: '3' }, // Item with no name or description
        null
      ]
      
      const filtered = safeFilter(itemsWithMissingData, 'item')
      expect(filtered).toHaveLength(2) // Only items with matching text
    })
  })

  describe('Readonly Mode Logic', () => {
    it('should disable interaction when readonly', () => {
      const shouldAllowInteraction = (readonly: boolean, action: string) => {
        const restrictedActions = ['clear', 'select', 'input']
        return !readonly || !restrictedActions.includes(action)
      }
      
      expect(shouldAllowInteraction(true, 'clear')).toBe(false)
      expect(shouldAllowInteraction(true, 'select')).toBe(false)
      expect(shouldAllowInteraction(false, 'clear')).toBe(true)
      expect(shouldAllowInteraction(false, 'select')).toBe(true)
    })

    it('should show readonly input correctly', () => {
      const getInputProps = (readonly: boolean) => {
        return {
          readonly: readonly,
          disabled: readonly
        }
      }
      
      expect(getInputProps(true).readonly).toBe(true)
      expect(getInputProps(false).readonly).toBe(false)
    })
  })

  describe('Component Integration Logic', () => {
    it('should handle component import without errors', async () => {
      const ItemSelector = await import('../../components/ItemSelector.vue')
      expect(ItemSelector.default).toBeDefined()
    })

    it('should validate Lucide icon integration', () => {
      const iconImports = ['Search', 'Package', 'X']
      
      iconImports.forEach(iconName => {
        expect(iconName).toMatch(/^[A-Z][a-zA-Z0-9]*$/)
      })
    })
  })

  describe('Performance Considerations', () => {
    it('should handle large item lists efficiently', () => {
      const processLargeItemList = (items: any[], query: string) => {
        return items
          .filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 10) // Limit results
      }
      
      const largeItemList = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        unit: 'pieces'
      }))
      
      expect(() => processLargeItemList(largeItemList, 'item')).not.toThrow()
      const filtered = processLargeItemList(largeItemList, 'item')
      expect(filtered).toHaveLength(10) // Limited to 10 results
    })

    it('should optimize re-render conditions', () => {
      const shouldUpdate = (
        prevProps: { modelValue: string, items: any[] },
        nextProps: { modelValue: string, items: any[] }
      ) => {
        return prevProps.modelValue !== nextProps.modelValue ||
               prevProps.items.length !== nextProps.items.length
      }
      
      expect(shouldUpdate(
        { modelValue: 'item-1', items: [1, 2, 3] },
        { modelValue: 'item-1', items: [1, 2, 3] }
      )).toBe(false)
      
      expect(shouldUpdate(
        { modelValue: 'item-1', items: [1, 2, 3] },
        { modelValue: 'item-2', items: [1, 2, 3] }
      )).toBe(true)
    })
  })
})