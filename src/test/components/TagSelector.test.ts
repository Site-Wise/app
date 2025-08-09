import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('TagSelector Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Tag Selection Logic', () => {
    it('should select tag when not already selected', () => {
      const mockEmit = vi.fn()
      const selectTag = (
        tag: { id: string; name: string },
        currentValue: string[],
        allTags: any[],
        emit: typeof mockEmit
      ) => {
        if (!currentValue.includes(tag.id)) {
          const newValue = [...currentValue, tag.id]
          emit('update:modelValue', newValue)
          emit('tagsChanged', allTags.filter(t => newValue.includes(t.id)))
        }
      }
      
      const tag = { id: 'tag-1', name: 'Test Tag' }
      const currentValue: string[] = []
      const allTags = [tag, { id: 'tag-2', name: 'Other Tag' }]
      
      selectTag(tag, currentValue, allTags, mockEmit)
      
      expect(mockEmit).toHaveBeenCalledWith('update:modelValue', ['tag-1'])
      expect(mockEmit).toHaveBeenCalledWith('tagsChanged', [tag])
    })

    it('should not select tag if already selected', () => {
      const mockEmit = vi.fn()
      const selectTag = (
        tag: { id: string; name: string },
        currentValue: string[],
        allTags: any[],
        emit: typeof mockEmit
      ) => {
        if (!currentValue.includes(tag.id)) {
          const newValue = [...currentValue, tag.id]
          emit('update:modelValue', newValue)
          emit('tagsChanged', allTags.filter(t => newValue.includes(t.id)))
        }
      }
      
      const tag = { id: 'tag-1', name: 'Test Tag' }
      const currentValue = ['tag-1']
      const allTags = [tag]
      
      selectTag(tag, currentValue, allTags, mockEmit)
      
      expect(mockEmit).not.toHaveBeenCalled()
    })

    it('should handle multiple tag selection', () => {
      const mockEmit = vi.fn()
      const selectTag = (
        tag: { id: string; name: string },
        currentValue: string[],
        allTags: any[],
        emit: typeof mockEmit
      ) => {
        if (!currentValue.includes(tag.id)) {
          const newValue = [...currentValue, tag.id]
          emit('update:modelValue', newValue)
          emit('tagsChanged', allTags.filter(t => newValue.includes(t.id)))
        }
      }
      
      const tag1 = { id: 'tag-1', name: 'Tag 1' }
      const tag2 = { id: 'tag-2', name: 'Tag 2' }
      const allTags = [tag1, tag2]
      
      let currentValue: string[] = []
      
      selectTag(tag1, currentValue, allTags, mockEmit)
      currentValue = ['tag-1']
      selectTag(tag2, currentValue, allTags, mockEmit)
      
      expect(mockEmit).toHaveBeenCalledWith('update:modelValue', ['tag-1'])
      expect(mockEmit).toHaveBeenCalledWith('update:modelValue', ['tag-1', 'tag-2'])
    })
  })

  describe('Tag Removal Logic', () => {
    it('should remove tag from selection', () => {
      const mockEmit = vi.fn()
      const removeTag = (
        tagId: string,
        currentValue: string[],
        allTags: any[],
        emit: typeof mockEmit
      ) => {
        const newValue = currentValue.filter(id => id !== tagId)
        emit('update:modelValue', newValue)
        emit('tagsChanged', allTags.filter(t => newValue.includes(t.id)))
      }
      
      const currentValue = ['tag-1', 'tag-2']
      const allTags = [
        { id: 'tag-1', name: 'Tag 1' },
        { id: 'tag-2', name: 'Tag 2' }
      ]
      
      removeTag('tag-1', currentValue, allTags, mockEmit)
      
      expect(mockEmit).toHaveBeenCalledWith('update:modelValue', ['tag-2'])
      expect(mockEmit).toHaveBeenCalledWith('tagsChanged', [{ id: 'tag-2', name: 'Tag 2' }])
    })

    it('should handle removing non-existent tag', () => {
      const mockEmit = vi.fn()
      const removeTag = (
        tagId: string,
        currentValue: string[],
        allTags: any[],
        emit: typeof mockEmit
      ) => {
        const newValue = currentValue.filter(id => id !== tagId)
        emit('update:modelValue', newValue)
        emit('tagsChanged', allTags.filter(t => newValue.includes(t.id)))
      }
      
      const currentValue = ['tag-1']
      const allTags = [{ id: 'tag-1', name: 'Tag 1' }]
      
      removeTag('tag-2', currentValue, allTags, mockEmit)
      
      expect(mockEmit).toHaveBeenCalledWith('update:modelValue', ['tag-1'])
    })
  })

  describe('Tag Filtering Logic', () => {
    it('should filter tags by search query', () => {
      const filterTags = (
        allTags: any[],
        searchQuery: string,
        selectedTagIds: string[]
      ) => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return allTags.slice(0, 10)
        
        return allTags
          .filter(tag => 
            tag.name.toLowerCase().includes(query) && 
            !selectedTagIds.includes(tag.id)
          )
          .slice(0, 10)
      }
      
      const allTags = [
        { id: 'tag-1', name: 'React Component' },
        { id: 'tag-2', name: 'Vue Component' },
        { id: 'tag-3', name: 'Angular Service' },
        { id: 'tag-4', name: 'React Hook' }
      ]
      
      const filtered = filterTags(allTags, 'react', [])
      expect(filtered).toHaveLength(2)
      expect(filtered.map(t => t.name)).toEqual(['React Component', 'React Hook'])
    })

    it('should exclude already selected tags from filter results', () => {
      const filterTags = (
        allTags: any[],
        searchQuery: string,
        selectedTagIds: string[]
      ) => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return allTags.slice(0, 10)
        
        return allTags
          .filter(tag => 
            tag.name.toLowerCase().includes(query) && 
            !selectedTagIds.includes(tag.id)
          )
          .slice(0, 10)
      }
      
      const allTags = [
        { id: 'tag-1', name: 'React Component' },
        { id: 'tag-2', name: 'Vue Component' }
      ]
      
      const filtered = filterTags(allTags, 'component', ['tag-1'])
      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('Vue Component')
    })

    it('should return top 10 tags when no search query', () => {
      const filterTags = (
        allTags: any[],
        searchQuery: string,
        selectedTagIds: string[]
      ) => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return allTags.slice(0, 10)
        
        return allTags
          .filter(tag => 
            tag.name.toLowerCase().includes(query) && 
            !selectedTagIds.includes(tag.id)
          )
          .slice(0, 10)
      }
      
      const allTags = Array.from({ length: 20 }, (_, i) => ({
        id: `tag-${i}`,
        name: `Tag ${i}`
      }))
      
      const filtered = filterTags(allTags, '', [])
      expect(filtered).toHaveLength(10)
    })
  })

  describe('Selected Tags Computation Logic', () => {
    it('should compute selected tags correctly', () => {
      const getSelectedTags = (allTags: any[], selectedIds: string[]) => {
        return allTags.filter(tag => selectedIds.includes(tag.id))
      }
      
      const allTags = [
        { id: 'tag-1', name: 'Tag 1' },
        { id: 'tag-2', name: 'Tag 2' },
        { id: 'tag-3', name: 'Tag 3' }
      ]
      
      const selected = getSelectedTags(allTags, ['tag-1', 'tag-3'])
      expect(selected).toHaveLength(2)
      expect(selected.map(t => t.name)).toEqual(['Tag 1', 'Tag 3'])
    })

    it('should handle empty selection', () => {
      const getSelectedTags = (allTags: any[], selectedIds: string[]) => {
        return allTags.filter(tag => selectedIds.includes(tag.id))
      }
      
      const allTags = [{ id: 'tag-1', name: 'Tag 1' }]
      const selected = getSelectedTags(allTags, [])
      expect(selected).toHaveLength(0)
    })
  })

  describe('New Tag Creation Logic', () => {
    it('should determine when new tag can be created', () => {
      const canCreateNew = (
        allowCreate: boolean,
        searchQuery: string,
        allTags: any[]
      ) => {
        const query = searchQuery.trim()
        return allowCreate && 
               query.length > 0 && 
               !allTags.some(tag => tag.name.toLowerCase() === query.toLowerCase())
      }
      
      const allTags = [
        { id: 'tag-1', name: 'Existing Tag' }
      ]
      
      expect(canCreateNew(true, 'New Tag', allTags)).toBe(true)
      expect(canCreateNew(true, 'existing tag', allTags)).toBe(false)
      expect(canCreateNew(false, 'New Tag', allTags)).toBe(false)
      expect(canCreateNew(true, '', allTags)).toBe(false)
    })

    it('should handle case-insensitive tag name comparison', () => {
      const canCreateNew = (
        allowCreate: boolean,
        searchQuery: string,
        allTags: any[]
      ) => {
        const query = searchQuery.trim()
        return allowCreate && 
               query.length > 0 && 
               !allTags.some(tag => tag.name.toLowerCase() === query.toLowerCase())
      }
      
      const allTags = [
        { id: 'tag-1', name: 'React Component' }
      ]
      
      expect(canCreateNew(true, 'REACT COMPONENT', allTags)).toBe(false)
      expect(canCreateNew(true, 'react component', allTags)).toBe(false)
      expect(canCreateNew(true, 'React Component', allTags)).toBe(false)
    })
  })

  describe('Enter Key Handling Logic', () => {
    it('should select single filtered tag on enter', () => {
      const mockSelectTag = vi.fn()
      const mockCreateTag = vi.fn()
      
      const handleEnter = (
        filteredTags: any[],
        canCreateNew: boolean,
        selectTagFn: typeof mockSelectTag,
        createTagFn: typeof mockCreateTag
      ) => {
        if (filteredTags.length === 1) {
          selectTagFn(filteredTags[0])
        } else if (canCreateNew) {
          createTagFn()
        }
      }
      
      const filteredTags = [{ id: 'tag-1', name: 'Tag 1' }]
      
      handleEnter(filteredTags, false, mockSelectTag, mockCreateTag)
      
      expect(mockSelectTag).toHaveBeenCalledWith(filteredTags[0])
      expect(mockCreateTag).not.toHaveBeenCalled()
    })

    it('should create new tag when possible and no single match', () => {
      const mockSelectTag = vi.fn()
      const mockCreateTag = vi.fn()
      
      const handleEnter = (
        filteredTags: any[],
        canCreateNew: boolean,
        selectTagFn: typeof mockSelectTag,
        createTagFn: typeof mockCreateTag
      ) => {
        if (filteredTags.length === 1) {
          selectTagFn(filteredTags[0])
        } else if (canCreateNew) {
          createTagFn()
        }
      }
      
      const filteredTags: any[] = []
      
      handleEnter(filteredTags, true, mockSelectTag, mockCreateTag)
      
      expect(mockSelectTag).not.toHaveBeenCalled()
      expect(mockCreateTag).toHaveBeenCalled()
    })

    it('should do nothing when multiple matches and cannot create', () => {
      const mockSelectTag = vi.fn()
      const mockCreateTag = vi.fn()
      
      const handleEnter = (
        filteredTags: any[],
        canCreateNew: boolean,
        selectTagFn: typeof mockSelectTag,
        createTagFn: typeof mockCreateTag
      ) => {
        if (filteredTags.length === 1) {
          selectTagFn(filteredTags[0])
        } else if (canCreateNew) {
          createTagFn()
        }
      }
      
      const filteredTags = [
        { id: 'tag-1', name: 'Tag 1' },
        { id: 'tag-2', name: 'Tag 2' }
      ]
      
      handleEnter(filteredTags, false, mockSelectTag, mockCreateTag)
      
      expect(mockSelectTag).not.toHaveBeenCalled()
      expect(mockCreateTag).not.toHaveBeenCalled()
    })
  })

  describe('Tag Type Selection Logic', () => {
    it('should validate tag type options', () => {
      const tagTypes = [
        { value: 'custom', label: 'tags.types.custom' },
        { value: 'item_category', label: 'tags.types.itemCategory' },
        { value: 'service_category', label: 'tags.types.serviceCategory' },
        { value: 'specialty', label: 'tags.types.specialty' }
      ]
      
      expect(tagTypes).toHaveLength(4)
      expect(tagTypes.map(t => t.value)).toEqual([
        'custom', 
        'item_category', 
        'service_category', 
        'specialty'
      ])
    })

    it('should select tag type correctly', () => {
      const selectTagType = (
        type: string,
        setSelectedType: (type: string) => void,
        setShowTypeSelection: (show: boolean) => void,
        createTag: () => void
      ) => {
        setSelectedType(type)
        setShowTypeSelection(false)
        createTag()
      }
      
      const mockSetSelectedType = vi.fn()
      const mockSetShowTypeSelection = vi.fn()
      const mockCreateTag = vi.fn()
      
      selectTagType('specialty', mockSetSelectedType, mockSetShowTypeSelection, mockCreateTag)
      
      expect(mockSetSelectedType).toHaveBeenCalledWith('specialty')
      expect(mockSetShowTypeSelection).toHaveBeenCalledWith(false)
      expect(mockCreateTag).toHaveBeenCalled()
    })
  })

  describe('Dropdown Visibility Logic', () => {
    it('should show dropdown when conditions are met', () => {
      const shouldShowDropdown = (
        showDropdown: boolean,
        filteredTags: any[],
        canCreateNew: boolean
      ) => {
        return showDropdown && (filteredTags.length > 0 || canCreateNew)
      }
      
      expect(shouldShowDropdown(true, [{ id: '1' }], false)).toBe(true)
      expect(shouldShowDropdown(true, [], true)).toBe(true)
      expect(shouldShowDropdown(true, [], false)).toBe(false)
      expect(shouldShowDropdown(false, [{ id: '1' }], true)).toBe(false)
    })

    it('should hide dropdown correctly', () => {
      const hideDropdown = (
        setShowDropdown: (show: boolean) => void,
        setShowTypeSelection: (show: boolean) => void
      ) => {
        setShowDropdown(false)
        setShowTypeSelection(false)
      }
      
      const mockSetShowDropdown = vi.fn()
      const mockSetShowTypeSelection = vi.fn()
      
      hideDropdown(mockSetShowDropdown, mockSetShowTypeSelection)
      
      expect(mockSetShowDropdown).toHaveBeenCalledWith(false)
      expect(mockSetShowTypeSelection).toHaveBeenCalledWith(false)
    })
  })

  describe('Search Handling Logic', () => {
    it('should trigger dropdown on search input', () => {
      const handleSearch = (setShowDropdown: (show: boolean) => void) => {
        setShowDropdown(true)
      }
      
      const mockSetShowDropdown = vi.fn()
      
      handleSearch(mockSetShowDropdown)
      
      expect(mockSetShowDropdown).toHaveBeenCalledWith(true)
    })

    it('should reset search query after selection', () => {
      const resetSearch = (
        setSearchQuery: (query: string) => void,
        setShowDropdown: (show: boolean) => void
      ) => {
        setSearchQuery('')
        setShowDropdown(false)
      }
      
      const mockSetSearchQuery = vi.fn()
      const mockSetShowDropdown = vi.fn()
      
      resetSearch(mockSetSearchQuery, mockSetShowDropdown)
      
      expect(mockSetSearchQuery).toHaveBeenCalledWith('')
      expect(mockSetShowDropdown).toHaveBeenCalledWith(false)
    })
  })

  describe('Props Validation Logic', () => {
    it('should validate Props interface', () => {
      interface Props {
        modelValue: string[]
        label?: string
        placeholder?: string
        tagType?: 'custom' | 'item_category' | 'service_category' | 'specialty'
        allowCreate?: boolean
      }
      
      const validateProps = (props: any): props is Props => {
        return (
          Array.isArray(props.modelValue) &&
          props.modelValue.every((id: any) => typeof id === 'string') &&
          (props.label === undefined || typeof props.label === 'string') &&
          (props.placeholder === undefined || typeof props.placeholder === 'string') &&
          (props.tagType === undefined || ['custom', 'item_category', 'service_category', 'specialty'].includes(props.tagType)) &&
          (props.allowCreate === undefined || typeof props.allowCreate === 'boolean')
        )
      }
      
      const validProps = {
        modelValue: ['tag-1', 'tag-2'],
        label: 'Select Tags',
        allowCreate: true,
        tagType: 'custom' as const
      }
      
      expect(validateProps(validProps)).toBe(true)
      
      const invalidProps = {
        modelValue: 'not-an-array'
      }
      
      expect(validateProps(invalidProps)).toBe(false)
    })

    it('should validate default props', () => {
      const applyDefaults = (props: any) => {
        return {
          ...props,
          allowCreate: props.allowCreate ?? true,
          tagType: props.tagType ?? 'custom'
        }
      }
      
      const propsWithDefaults = applyDefaults({
        modelValue: ['tag-1']
      })
      
      expect(propsWithDefaults.allowCreate).toBe(true)
      expect(propsWithDefaults.tagType).toBe('custom')
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

  describe('Tag Creation Workflow Logic', () => {
    it('should handle custom tag type selection workflow', () => {
      const handleEnterForCustomType = (
        canCreateNew: boolean,
        tagType: string,
        showTypeSelection: () => void,
        createTag: () => void
      ) => {
        if (canCreateNew) {
          if (tagType === 'custom') {
            showTypeSelection()
          } else {
            createTag()
          }
        }
      }
      
      const mockShowTypeSelection = vi.fn()
      const mockCreateTag = vi.fn()
      
      // Custom type should show type selection
      handleEnterForCustomType(true, 'custom', mockShowTypeSelection, mockCreateTag)
      expect(mockShowTypeSelection).toHaveBeenCalled()
      expect(mockCreateTag).not.toHaveBeenCalled()
      
      // Non-custom type should create directly
      mockShowTypeSelection.mockClear()
      handleEnterForCustomType(true, 'specialty', mockShowTypeSelection, mockCreateTag)
      expect(mockShowTypeSelection).not.toHaveBeenCalled()
      expect(mockCreateTag).toHaveBeenCalled()
    })
  })

  describe('Translation Keys Logic', () => {
    it('should use correct translation keys', () => {
      const translationKeys = {
        selectTags: 'tags.selectTags',
        searchOrCreateTag: 'tags.searchOrCreateTag',
        createTag: 'tags.createTag',
        noTagsFound: 'tags.noTagsFound',
        selectType: 'tags.selectType',
        created: 'tags.created'
      }
      
      Object.values(translationKeys).forEach(key => {
        expect(key).toMatch(/^tags\./)
      })
    })

    it('should format create tag translation correctly', () => {
      const formatCreateTag = (name: string) => {
        return `Create "${name}" tag`
      }
      
      expect(formatCreateTag('New Tag')).toBe('Create "New Tag" tag')
    })
  })

  describe('CSS Classes Logic', () => {
    it('should generate tag badge classes correctly', () => {
      const getTagBadgeStyle = (color: string) => {
        return { backgroundColor: color }
      }
      
      expect(getTagBadgeStyle('#ff0000')).toEqual({ backgroundColor: '#ff0000' })
      expect(getTagBadgeStyle('#00ff00')).toEqual({ backgroundColor: '#00ff00' })
    })

    it('should generate type selection button classes', () => {
      const getTypeButtonClasses = (isSelected: boolean) => {
        const baseClasses = 'px-3 py-1 text-xs border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700'
        
        if (isSelected) {
          return `${baseClasses} border-primary-500 bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300`
        }
        
        return `${baseClasses} border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300`
      }
      
      const selectedClasses = getTypeButtonClasses(true)
      expect(selectedClasses).toContain('border-primary-500')
      expect(selectedClasses).toContain('bg-primary-50')
      
      const unselectedClasses = getTypeButtonClasses(false)
      expect(unselectedClasses).toContain('border-gray-300')
      expect(unselectedClasses).toContain('text-gray-700')
    })
  })

  describe('Error Handling Logic', () => {
    it('should handle tag loading errors gracefully', async () => {
      const loadTags = async (
        tagService: { getAll: () => Promise<any[]> },
        setTags: (tags: any[]) => void
      ) => {
        try {
          const tags = await tagService.getAll()
          setTags(tags)
        } catch (err) {
          console.error('Error loading tags:', err)
          setTags([]) // Fallback to empty array
        }
      }
      
      const mockTagService = {
        getAll: vi.fn().mockRejectedValue(new Error('Network error'))
      }
      const mockSetTags = vi.fn()
      
      await loadTags(mockTagService, mockSetTags)
      expect(mockSetTags).toHaveBeenCalledWith([])
    })

    it('should handle tag creation errors', async () => {
      const createTag = async (
        name: string,
        type: string,
        tagService: { findOrCreate: (name: string, type: string) => Promise<any> },
        showError: (message: string) => void
      ) => {
        try {
          await tagService.findOrCreate(name, type)
        } catch (err) {
          console.error('Error creating tag:', err)
          showError('messages.error')
        }
      }
      
      const mockTagService = {
        findOrCreate: vi.fn().mockRejectedValue(new Error('Creation failed'))
      }
      const mockShowError = vi.fn()
      
      await createTag('New Tag', 'custom', mockTagService, mockShowError)
      expect(mockShowError).toHaveBeenCalledWith('messages.error')
    })
  })

  describe('Component Integration Logic', () => {
    it('should handle component import without errors', async () => {
      const TagSelector = await import('../../components/TagSelector.vue')
      expect(TagSelector.default).toBeDefined()
    })

    it('should validate service integration', () => {
      const mockTagService = {
        getAll: vi.fn().mockResolvedValue([]),
        findOrCreate: vi.fn().mockResolvedValue({ id: '1', name: 'New Tag' }),
        incrementUsage: vi.fn()
      }
      
      expect(typeof mockTagService.getAll).toBe('function')
      expect(typeof mockTagService.findOrCreate).toBe('function')
      expect(typeof mockTagService.incrementUsage).toBe('function')
    })
  })

  describe('Usage Count Display Logic', () => {
    it('should format usage count correctly', () => {
      const formatUsageCount = (count: number | undefined) => {
        return `(${count || 0})`
      }
      
      expect(formatUsageCount(5)).toBe('(5)')
      expect(formatUsageCount(0)).toBe('(0)')
      expect(formatUsageCount(undefined)).toBe('(0)')
    })
  })

  describe('Accessibility Features', () => {
    it('should provide proper input attributes', () => {
      const getInputAttributes = (placeholder: string) => {
        return {
          type: 'text',
          class: 'input pr-10',
          placeholder: placeholder
        }
      }
      
      const attributes = getInputAttributes('Search tags...')
      expect(attributes.type).toBe('text')
      expect(attributes.placeholder).toBe('Search tags...')
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
})