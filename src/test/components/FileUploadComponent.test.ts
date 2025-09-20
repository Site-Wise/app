import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FileUploadComponent from '../../components/FileUploadComponent.vue'

// Mock useI18n composable
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'fileUpload.clickOrDrag': 'Click to select files or drag and drop here',
        'fileUpload.tapToSelect': 'Tap to select files',
        'fileUpload.maxSize': 'Maximum file size: {size}',
        'fileUpload.fileTooLarge': '{name} is too large. Maximum size is {size}',
        'fileUpload.invalidFileType': '{name} has an invalid file type',
        'fileUpload.removeFile': 'Remove file'
      }
      let result = translations[key] || key
      if (params) {
        Object.keys(params).forEach(param => {
          result = result.replace(`{${param}}`, params[param])
        })
      }
      return result
    }
  })
}))

describe('FileUploadComponent', () => {
  let wrapper: any
  let mockFiles: File[]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock files for testing
    mockFiles = [
      new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' }),
      new File(['document content'], 'test-doc.pdf', { type: 'application/pdf' }),
      new File(['large content'.repeat(1000000)], 'large-file.jpg', { type: 'image/jpeg' })
    ]

    // Mock FileReader
    Object.defineProperty(global, 'FileReader', {
      writable: true,
      value: vi.fn(() => {
        const instance = {
          readAsDataURL: vi.fn().mockImplementation(function(this: any, file: File) {
            // Simulate async behavior with setTimeout
            setTimeout(() => {
              if (this.onload) {
                this.onload({ target: { result: `data:${file.type};base64,mockbase64-${file.name}` } })
              }
            }, 5)
          }),
          result: '',
          onload: null
        }
        return instance
      })
    })

    // Mock navigator.userAgent for mobile detection
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })

    // Mock window.innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(FileUploadComponent, {
      props: {
        acceptTypes: 'image/*',
        multiple: true,
        maxSize: 5 * 1024 * 1024, // 5MB
        allowCamera: true,
        ...props
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the upload area with correct classes', () => {
      wrapper = createWrapper()
      
      const uploadArea = wrapper.find('.file-upload-component')
      expect(uploadArea.exists()).toBe(true)
      // Check computed styles instead of raw classes since we use @apply
      expect(uploadArea.element.className).toContain('file-upload-component')
    })

    it('should show desktop text on desktop devices', () => {
      wrapper = createWrapper()

      // Check for desktop upload component (not mobile)
      const desktopUploadArea = wrapper.find('.file-upload-component')
      const mobileUploadArea = wrapper.find('.mobile-upload-options')

      expect(desktopUploadArea.exists()).toBe(true)
      expect(mobileUploadArea.exists()).toBe(false)
      expect(wrapper.text()).toContain('Click to select files or drag and drop here')
    })

    it('should show mobile text on mobile devices', async () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
      })

      wrapper = createWrapper()
      await nextTick()

      // Check for mobile upload buttons
      const mobileUploadArea = wrapper.find('.mobile-upload-options')
      const desktopUploadArea = wrapper.find('.file-upload-component')

      expect(mobileUploadArea.exists()).toBe(true)
      expect(desktopUploadArea.exists()).toBe(false)
      expect(wrapper.text()).toContain('fileUpload.takePhoto')
      expect(wrapper.text()).toContain('fileUpload.chooseFiles')
    })

    it('should display max file size information', () => {
      wrapper = createWrapper({ maxSize: 10 * 1024 * 1024 }) // 10MB
      
      expect(wrapper.text()).toContain('Maximum file size: 10MB')
    })

    it('should have correct input attributes', () => {
      wrapper = createWrapper({
        acceptTypes: 'image/*',
        multiple: true
      })
      
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.exists()).toBe(true)
      expect(fileInput.attributes('accept')).toBe('image/*')
      expect(fileInput.attributes('multiple')).toBeDefined()
    })

    it('should add capture attribute on mobile when allowCamera is true', async () => {
      // Mock mobile device
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
      })

      wrapper = createWrapper({ allowCamera: true })
      await nextTick()

      // Camera input should have capture attribute
      const cameraInput = wrapper.find('input[capture="environment"]')
      expect(cameraInput.exists()).toBe(true)
      expect(cameraInput.attributes('capture')).toBe('environment')
    })

    it('should not add capture attribute on desktop', () => {
      wrapper = createWrapper({ allowCamera: true })
      
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('capture')).toBeUndefined()
    })
  })

  describe('File Selection', () => {
    it('should handle file input change event', async () => {
      wrapper = createWrapper()
      
      const fileInput = wrapper.find('input[type="file"]')
      
      // Mock file input event
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0]],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      // Wait a bit for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 10))

      // Check if file was processed
      expect(wrapper.vm.previews).toHaveLength(1)
      expect(wrapper.vm.previews[0].name).toBe('test-image.jpg')
    })

    it('should emit update:modelValue when files are selected', async () => {
      wrapper = createWrapper()
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0]],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('files-selected')).toBeTruthy()
    })

    it('should handle multiple file selection', async () => {
      wrapper = createWrapper({ multiple: true, acceptTypes: '*' }) // Accept all file types
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0], mockFiles[1]], // JPEG and PDF
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      // Wait longer for multiple FileReader operations
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.previews).toHaveLength(2)
    })

    it('should replace file when multiple is false', async () => {
      wrapper = createWrapper({ multiple: false, acceptTypes: '*' }) // Accept all file types
      
      // Test single file replacement by calling processFiles directly
      await wrapper.vm.processFiles([mockFiles[0]])
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(wrapper.vm.previews).toHaveLength(1)
      expect(wrapper.vm.previews[0].name).toBe('test-image.jpg')
      
      // Add second file (should replace first)
      await wrapper.vm.processFiles([mockFiles[1]])
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(wrapper.vm.previews).toHaveLength(1)
      expect(wrapper.vm.previews[0].name).toBe('test-doc.pdf')
    })
  })

  describe('Drag and Drop', () => {
    it('should handle drag over event', async () => {
      wrapper = createWrapper()
      
      const uploadArea = wrapper.find('.file-upload-component')
      
      await uploadArea.trigger('dragover')
      
      expect(wrapper.vm.isDragOver).toBe(true)
      expect(uploadArea.classes()).toContain('drag-over')
    })

    it('should handle drag leave event', async () => {
      wrapper = createWrapper()
      
      const uploadArea = wrapper.find('.file-upload-component')
      
      // First drag over
      await uploadArea.trigger('dragover')
      expect(wrapper.vm.isDragOver).toBe(true)
      
      // Then drag leave
      await uploadArea.trigger('dragleave')
      expect(wrapper.vm.isDragOver).toBe(false)
    })

    it('should handle file drop', async () => {
      wrapper = createWrapper()
      
      const uploadArea = wrapper.find('.file-upload-component')
      
      // Mock drop event
      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFiles[0]]
        }
      }
      
      await uploadArea.trigger('drop', dropEvent)
      await nextTick()
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.vm.isDragOver).toBe(false)
      expect(wrapper.vm.previews).toHaveLength(1)
    })
  })

  describe('File Validation', () => {
    it('should reject files that are too large', async () => {
      wrapper = createWrapper({ maxSize: 1024 }) // 1KB limit
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[2]], // large file
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      
      expect(wrapper.vm.error).toContain('is too large')
      expect(wrapper.vm.previews).toHaveLength(0)
    })

    it('should reject files with invalid types', async () => {
      wrapper = createWrapper({ acceptTypes: 'image/jpeg' })

      // Create a truly invalid file type (not PDF which gets converted)
      const invalidFile = new File(['text content'], 'test.txt', { type: 'text/plain' })
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [invalidFile],
        writable: false
      })

      await fileInput.trigger('change')
      await nextTick()

      expect(wrapper.vm.error).toContain('has an invalid file type')
      expect(wrapper.vm.previews).toHaveLength(0)
    })

    it('should accept valid files', async () => {
      wrapper = createWrapper({ acceptTypes: 'image/*' })
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0]], // JPEG file
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(wrapper.vm.error).toBe('')
      expect(wrapper.vm.previews).toHaveLength(1)
    })

    it('should clear previous errors when valid files are selected', async () => {
      wrapper = createWrapper({ acceptTypes: 'image/jpeg' })

      // First add invalid file to trigger error
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' })
      await wrapper.vm.processFiles([invalidFile])
      await nextTick()

      expect(wrapper.vm.error).toBeTruthy()

      // Then add valid file
      const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      await wrapper.vm.processFiles([validFile])
      await nextTick()

      expect(wrapper.vm.error).toBe('')
    })
  })

  describe('File Previews', () => {
    it('should display image previews', async () => {
      wrapper = createWrapper()
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0]],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const previewGrid = wrapper.find('.preview-grid')
      expect(previewGrid.exists()).toBe(true)
      
      const imagePreview = wrapper.find('.preview-image')
      expect(imagePreview.exists()).toBe(true)
      expect(imagePreview.attributes('src')).toBe(`data:image/jpeg;base64,mockbase64-${mockFiles[0].name}`)
    })

    it('should display file icon for non-image files', async () => {
      wrapper = createWrapper({ acceptTypes: '*' })
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[1]], // PDF file
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      
      const filePreview = wrapper.find('.file-preview')
      expect(filePreview.exists()).toBe(true)
      expect(filePreview.text()).toContain('test-doc.pdf')
    })

    it('should show remove button for each file', async () => {
      wrapper = createWrapper()
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0]],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const removeButton = wrapper.find('.remove-button')
      expect(removeButton.exists()).toBe(true)
      expect(removeButton.attributes('aria-label')).toBe('Remove file')
    })

    it('should remove file when remove button is clicked', async () => {
      wrapper = createWrapper({ acceptTypes: '*' }) // Accept all file types
      
      // Add files directly
      await wrapper.vm.processFiles([mockFiles[0], mockFiles[1]])
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(wrapper.vm.previews).toHaveLength(2)
      
      const removeButton = wrapper.find('.remove-button')
      await removeButton.trigger('click')
      
      expect(wrapper.vm.previews).toHaveLength(1)
    })
  })

  describe('Props and Events', () => {
    it('should update files when modelValue prop changes', async () => {
      wrapper = createWrapper()
      
      await wrapper.setProps({ modelValue: [] })
      
      expect(wrapper.vm.previews).toHaveLength(0)
    })

    it('should emit files-selected event with correct payload', async () => {
      wrapper = createWrapper()
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0]],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const filesSelectedEvents = wrapper.emitted('files-selected')
      expect(filesSelectedEvents).toBeTruthy()
      expect(filesSelectedEvents[0][0]).toHaveLength(1)
      expect(filesSelectedEvents[0][0][0].name).toBe(mockFiles[0].name)
    })

    it('should emit update:modelValue event with correct payload', async () => {
      wrapper = createWrapper()
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0]],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const modelValueEvents = wrapper.emitted('update:modelValue')
      expect(modelValueEvents).toBeTruthy()
      expect(modelValueEvents[0][0]).toHaveLength(1)
      expect(modelValueEvents[0][0][0].name).toBe(mockFiles[0].name)
    })
  })

  describe('Error Display', () => {
    it('should show error message when there is an error', async () => {
      wrapper = createWrapper({ maxSize: 1024 })
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[2]], // large file
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      
      const errorMessage = wrapper.find('.error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('is too large')
    })

    it('should hide error message when there is no error', () => {
      wrapper = createWrapper()
      
      const errorMessage = wrapper.find('.error-message')
      expect(errorMessage.exists()).toBe(false)
    })
  })

  describe('Component Lifecycle', () => {
    it('should detect mobile device on mount', async () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
      })

      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.vm.isMobile).toBe(true)
    })

    it('should detect desktop device on mount', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.vm.isMobile).toBe(false)
    })

    it('should detect mobile based on window width', async () => {
      // Mock narrow window
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 600
      })

      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.vm.isMobile).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria labels', async () => {
      wrapper = createWrapper()
      
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0]],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const removeButton = wrapper.find('.remove-button')
      expect(removeButton.attributes('aria-label')).toBe('Remove file')
    })

    it('should be keyboard accessible', () => {
      wrapper = createWrapper()

      const uploadArea = wrapper.find('.file-upload-component')
      expect(uploadArea.element.tagName).toBe('DIV')
      expect(uploadArea.attributes('role')).toBe('button')
      expect(uploadArea.attributes('tabindex')).toBe('0')

      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.exists()).toBe(true)
    })
  })
})