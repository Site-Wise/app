import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PhotoGallery from '../../components/PhotoGallery.vue'

// Mock the useI18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key}(${JSON.stringify(params)})`
      }
      return key
    }
  })
}))

// Mock PocketBase service
vi.mock('../../services/pocketbase', () => ({
  pb: {
    baseUrl: 'http://localhost:8090'
  }
}))

describe('PhotoGallery', () => {
  let wrapper: any
  const mockPhotos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg']

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock window methods
    window.confirm = vi.fn().mockReturnValue(true)
    window.focus = vi.fn()
    
    // Mock DOM methods
    document.createElement = vi.fn().mockImplementation((tagName) => {
      const element = {
        tagName: tagName.toUpperCase(),
        href: '',
        download: '',
        target: '',
        click: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn()
      }
      return element as any
    })
    
    document.body.appendChild = vi.fn()
    document.body.removeChild = vi.fn()
    document.querySelector = vi.fn()
    
    // Mock event listeners
    document.addEventListener = vi.fn()
    document.removeEventListener = vi.fn()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Photo Grid Rendering', () => {
    it('should render photo grid when photos are provided', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      expect(wrapper.find('.grid').exists()).toBe(true)
      expect(wrapper.findAll('.cursor-pointer').length).toBe(3)
    })

    it('should render empty state when no photos', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: []
        }
      })

      expect(wrapper.find('.text-center.py-8').exists()).toBe(true)
      expect(wrapper.text()).toContain('incoming.noPhotos')
      expect(wrapper.text()).toContain('incoming.noPhotosMessage')
      
      const cameraIcon = wrapper.findComponent({ name: 'Camera' })
      expect(cameraIcon.exists()).toBe(true)
    })

    it('should show photo count indicator on first photo when multiple photos', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      const indicator = wrapper.find('.absolute.top-2.right-2')
      expect(indicator.exists()).toBe(true)
      expect(indicator.text()).toBe('+2') // photos.length - 1
    })

    it('should not show count indicator with single photo', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: ['single-photo.jpg'],
          itemId: 'test-item-id'
        }
      })

      const indicator = wrapper.find('.absolute.top-2.right-2')
      expect(indicator.exists()).toBe(false)
    })

    it('should display hover effects on photo cards', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      const photoCard = wrapper.find('.group.cursor-pointer')
      expect(photoCard.classes()).toContain('group')
      expect(photoCard.classes()).toContain('cursor-pointer')
      
      const eyeIcon = wrapper.findComponent({ name: 'Eye' })
      expect(eyeIcon.exists()).toBe(true)
    })
  })

  describe('Photo URL Generation', () => {
    it('should generate correct PocketBase URL when itemId is provided', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      const url = wrapper.vm.getPhotoUrl('photo1.jpg')
      expect(url).toBe('http://localhost:8090/api/files/incoming_items/test-item-id/photo1.jpg')
    })

    it('should return filename directly when no itemId', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos
        }
      })

      const url = wrapper.vm.getPhotoUrl('photo1.jpg')
      expect(url).toBe('photo1.jpg')
    })
  })

  describe('Gallery Modal', () => {
    it('should open gallery when photo is clicked', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      const firstPhoto = wrapper.find('.cursor-pointer')
      await firstPhoto.trigger('click')

      expect(wrapper.vm.showGallery).toBe(true)
      expect(wrapper.vm.currentPhotoIndex).toBe(0)
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
    })

    it('should close gallery when close button is clicked', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      const closeButton = wrapper.find('.absolute.top-4.right-4 button')
      await closeButton.trigger('click')

      expect(wrapper.vm.showGallery).toBe(false)
    })

    it('should close gallery when overlay is clicked', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      const overlay = wrapper.find('.fixed.inset-0')
      await overlay.trigger('click')

      expect(wrapper.vm.showGallery).toBe(false)
    })

    it('should display photo counter', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(1)

      const counter = wrapper.find('.absolute.top-4.left-4')
      expect(counter.text()).toBe('2 / 3')
    })

    it('should show navigation buttons for multiple photos', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(1)

      const prevButton = wrapper.find('.absolute.left-4 button')
      const nextButton = wrapper.find('.absolute.right-4 button')
      
      expect(prevButton.exists()).toBe(true)
      expect(nextButton.exists()).toBe(true)
    })

    it('should not show navigation buttons for single photo', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: ['single-photo.jpg'],
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)

      const navButtons = wrapper.findAll('.absolute button').filter(btn => 
        btn.classes().includes('left-4') || btn.classes().includes('right-4')
      )
      expect(navButtons.length).toBe(0)
    })
  })

  describe('Photo Navigation', () => {
    it('should navigate to next photo', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      const nextButton = wrapper.find('.absolute.right-4 button')
      await nextButton.trigger('click')

      expect(wrapper.vm.currentPhotoIndex).toBe(1)
    })

    it('should navigate to previous photo', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(1)
      
      const prevButton = wrapper.find('.absolute.left-4 button')
      await prevButton.trigger('click')

      expect(wrapper.vm.currentPhotoIndex).toBe(0)
    })

    it('should disable previous button on first photo', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      const prevButton = wrapper.find('.absolute.left-4 button')
      expect(prevButton.attributes('disabled')).toBeDefined()
      expect(prevButton.classes()).toContain('opacity-50')
      expect(prevButton.classes()).toContain('cursor-not-allowed')
    })

    it('should disable next button on last photo', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(2) // Last photo
      
      const nextButton = wrapper.find('.absolute.right-4 button')
      expect(nextButton.attributes('disabled')).toBeDefined()
      expect(nextButton.classes()).toContain('opacity-50')
    })

    it('should navigate via thumbnail strip', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      const thumbnails = wrapper.findAll('.flex-shrink-0.w-16.h-16')
      await thumbnails[2].trigger('click')

      expect(wrapper.vm.currentPhotoIndex).toBe(2)
    })

    it('should highlight active thumbnail', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(1)
      
      const thumbnails = wrapper.findAll('.flex-shrink-0.w-16.h-16')
      expect(thumbnails[1].classes()).toContain('border-white')
    })
  })

  describe('Zoom Functionality', () => {
    it('should toggle zoom when zoom button is clicked', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      const zoomButton = wrapper.find('[title="photos.zoomIn"]')
      await zoomButton.trigger('click')

      expect(wrapper.vm.isZoomed).toBe(true)
      expect(wrapper.vm.zoomLevel).toBe(2)
    })

    it('should reset zoom when toggling off', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      wrapper.vm.isZoomed = true
      wrapper.vm.zoomLevel = 2

      const zoomButton = wrapper.find('[title="photos.zoomOut"]')
      await zoomButton.trigger('click')

      expect(wrapper.vm.isZoomed).toBe(false)
      expect(wrapper.vm.zoomLevel).toBe(1)
      expect(wrapper.vm.zoomX).toBe(0)
      expect(wrapper.vm.zoomY).toBe(0)
    })

    it('should toggle zoom when photo is clicked', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      const photoImg = wrapper.find('img[alt="incoming.photos 1"]')
      await photoImg.trigger('click')

      expect(wrapper.vm.isZoomed).toBe(true)
    })

    it('should show correct cursor based on zoom state', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      const photoImg = wrapper.find('img[alt="incoming.photos 1"]')
      expect(photoImg.classes()).toContain('cursor-zoom-in')

      await photoImg.trigger('click')
      expect(photoImg.classes()).toContain('cursor-zoom-out')
    })

    it('should apply zoom styles correctly', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      wrapper.vm.isZoomed = true
      wrapper.vm.zoomLevel = 2
      wrapper.vm.zoomX = 10
      wrapper.vm.zoomY = 20

      const zoomStyle = wrapper.vm.zoomStyle
      expect(zoomStyle.transform).toBe('scale(2) translate(10px, 20px)')
      expect(zoomStyle.transformOrigin).toBe('center center')
    })
  })

  describe('Photo Actions', () => {
    it('should download photo when download button is clicked', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      const downloadButton = wrapper.find('[title="files.download"]')
      await downloadButton.trigger('click')

      expect(document.createElement).toHaveBeenCalledWith('a')
    })

    it('should show delete button when showDeleteButton prop is true', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id',
          showDeleteButton: true
        }
      })

      await wrapper.vm.openGallery(0)
      
      const deleteButton = wrapper.find('[title="files.delete"]')
      expect(deleteButton.exists()).toBe(true)
    })

    it('should not show delete button when showDeleteButton prop is false', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id',
          showDeleteButton: false
        }
      })

      await wrapper.vm.openGallery(0)
      
      const deleteButton = wrapper.find('[title="files.delete"]')
      expect(deleteButton.exists()).toBe(false)
    })

    it('should emit photoDeleted event when delete is confirmed', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id',
          showDeleteButton: true
        }
      })

      await wrapper.vm.openGallery(1)
      
      const deleteButton = wrapper.find('[title="files.delete"]')
      await deleteButton.trigger('click')

      expect(wrapper.emitted('photoDeleted')).toBeTruthy()
      expect(wrapper.emitted('photoDeleted')[0]).toEqual([1])
    })

    it('should not delete photo when user cancels', async () => {
      window.confirm = vi.fn().mockReturnValue(false)
      
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id',
          showDeleteButton: true
        }
      })

      await wrapper.vm.openGallery(0)
      
      const deleteButton = wrapper.find('[title="files.delete"]')
      await deleteButton.trigger('click')

      expect(wrapper.emitted('photoDeleted')).toBeFalsy()
    })

    it('should close gallery when deleting last photo', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: ['single-photo.jpg'],
          itemId: 'test-item-id',
          showDeleteButton: true
        }
      })

      await wrapper.vm.openGallery(0)
      
      const deleteButton = wrapper.find('[title="files.delete"]')
      await deleteButton.trigger('click')

      expect(wrapper.vm.showGallery).toBe(false)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should setup and cleanup keyboard event listeners', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))

      wrapper.unmount()

      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should handle arrow key navigation', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(1)

      // Simulate ArrowRight
      wrapper.vm.handleKeydown({ key: 'ArrowRight', preventDefault: vi.fn() })
      expect(wrapper.vm.currentPhotoIndex).toBe(2)

      // Simulate ArrowLeft
      wrapper.vm.handleKeydown({ key: 'ArrowLeft', preventDefault: vi.fn() })
      expect(wrapper.vm.currentPhotoIndex).toBe(1)
    })

    it('should handle escape key to close gallery', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)

      wrapper.vm.handleKeydown({ key: 'Escape', preventDefault: vi.fn() })
      expect(wrapper.vm.showGallery).toBe(false)
    })

    it('should handle space key to toggle zoom', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)

      wrapper.vm.handleKeydown({ key: ' ', preventDefault: vi.fn() })
      expect(wrapper.vm.isZoomed).toBe(true)
    })

    it('should handle delete key when delete is enabled', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id',
          showDeleteButton: true
        }
      })

      await wrapper.vm.openGallery(0)

      wrapper.vm.handleKeydown({ key: 'Delete', preventDefault: vi.fn() })
      expect(wrapper.emitted('photoDeleted')).toBeTruthy()
    })

    it('should ignore keys when gallery is closed', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      const preventDefault = vi.fn()
      wrapper.vm.handleKeydown({ key: 'ArrowRight', preventDefault })
      
      expect(preventDefault).not.toHaveBeenCalled()
      expect(wrapper.vm.currentPhotoIndex).toBe(0)
    })
  })

  describe('Mouse and Touch Events', () => {
    it('should setup mouse event listeners for zoom and pan', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      expect(document.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function))
      expect(document.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false })
    })

    it('should handle wheel zoom', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)

      // Zoom in
      wrapper.vm.handleWheel({ deltaY: -100, preventDefault: vi.fn() })
      expect(wrapper.vm.zoomLevel).toBeGreaterThan(1)
      expect(wrapper.vm.isZoomed).toBe(true)

      // Zoom out
      wrapper.vm.handleWheel({ deltaY: 100, preventDefault: vi.fn() })
      expect(wrapper.vm.zoomLevel).toBeLessThan(2)
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner when photo is loading', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      wrapper.vm.photoLoading = true

      await nextTick()

      const loader = wrapper.findComponent({ name: 'Loader2' })
      expect(loader.exists()).toBe(true)
      expect(loader.classes()).toContain('animate-spin')
    })

    it('should hide loading spinner when photo loads', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      wrapper.vm.photoLoading = true
      
      wrapper.vm.onPhotoLoad()
      
      expect(wrapper.vm.photoLoading).toBe(false)
    })
  })

  describe('Focus Management', () => {
    it('should focus gallery element when opened', async () => {
      const mockElement = { focus: vi.fn() }
      document.querySelector = vi.fn().mockReturnValue(mockElement)

      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      await nextTick()

      expect(document.querySelector).toHaveBeenCalledWith('[tabindex="0"]')
      expect(mockElement.focus).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty photo array gracefully', () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: []
        }
      })

      expect(wrapper.find('.grid').exists()).toBe(false)
      expect(wrapper.find('.text-center.py-8').exists()).toBe(true)
    })

    it('should prevent navigation beyond bounds', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      
      // Try to go before first photo
      wrapper.vm.previousPhoto()
      expect(wrapper.vm.currentPhotoIndex).toBe(0)

      // Go to last photo
      await wrapper.vm.openGallery(2)
      
      // Try to go beyond last photo
      wrapper.vm.nextPhoto()
      expect(wrapper.vm.currentPhotoIndex).toBe(2)
    })

    it('should reset zoom when navigating between photos', async () => {
      wrapper = mount(PhotoGallery, {
        props: {
          photos: mockPhotos,
          itemId: 'test-item-id'
        }
      })

      await wrapper.vm.openGallery(0)
      wrapper.vm.isZoomed = true
      wrapper.vm.zoomLevel = 2

      wrapper.vm.nextPhoto()

      expect(wrapper.vm.isZoomed).toBe(false)
      expect(wrapper.vm.zoomLevel).toBe(1)
    })
  })
})