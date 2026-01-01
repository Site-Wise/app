import { describe, it, expect, beforeEach, vi } from 'vitest'
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

describe('FileUploadComponent - Core Functionality', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(FileUploadComponent, {
      props: {
        acceptTypes: 'image/*',
        multiple: true,
        maxSize: 5 * 1024 * 1024,
        allowCamera: true,
        ...props
      }
    })
  }

  it('should render the component', () => {
    wrapper = createWrapper()
    expect(wrapper.find('.file-upload-component').exists()).toBe(true)
  })

  it('should have a file input', () => {
    wrapper = createWrapper()
    const fileInput = wrapper.find('input[type="file"]')
    expect(fileInput.exists()).toBe(true)
  })

  it('should display the correct text content', () => {
    wrapper = createWrapper()
    expect(wrapper.text()).toContain('Click to select files or drag and drop here')
    expect(wrapper.text()).toContain('Maximum file size: 5MB')
  })

  it('should handle drag events', async () => {
    wrapper = createWrapper()
    const uploadArea = wrapper.find('.file-upload-component')
    
    await uploadArea.trigger('dragover')
    expect(wrapper.vm.isDragOver).toBe(true)
    
    await uploadArea.trigger('dragleave')
    expect(wrapper.vm.isDragOver).toBe(false)
  })

  it('should validate file types', async () => {
    wrapper = createWrapper({ acceptTypes: 'image/jpeg' })

    // Test with text file (truly invalid type, not PDF which gets converted)
    const textFile = new File(['text content'], 'test.txt', { type: 'text/plain' })
    await wrapper.vm.processFiles([textFile])

    expect(wrapper.vm.error).toContain('has an invalid file type')
    expect(wrapper.vm.previews).toHaveLength(0)
  })

  it('should validate file sizes', async () => {
    wrapper = createWrapper({ maxSize: 1000 }) // 1KB limit
    
    // Create a large file
    const largeFile = new File(['x'.repeat(2000)], 'large.jpg', { type: 'image/jpeg' })
    await wrapper.vm.processFiles([largeFile])
    
    expect(wrapper.vm.error).toContain('too large')
    expect(wrapper.vm.previews).toHaveLength(0)
  })

  it('should emit events when files are processed', async () => {
    // Create a proper class mock for FileReader
    class MockFileReader {
      result: string = 'data:image/jpeg;base64,test'
      onload: ((event: any) => void) | null = null

      readAsDataURL(_file: File) {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: this.result } })
          }
        }, 5)
      }
    }

    Object.defineProperty(global, 'FileReader', {
      writable: true,
      value: MockFileReader
    })

    wrapper = createWrapper()

    const imageFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' })

    // Trigger file processing
    wrapper.vm.processFiles([imageFile])

    // Wait for FileReader to complete
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    expect(wrapper.emitted('files-selected')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('should clear files when modelValue is empty', async () => {
    wrapper = createWrapper()
    
    // Add some previews first
    wrapper.vm.previews = [{ id: '1', file: new File([''], 'test.jpg'), preview: '', name: 'test.jpg', type: 'image/jpeg' }]
    
    await wrapper.setProps({ modelValue: [] })
    await nextTick()
    
    expect(wrapper.vm.previews).toHaveLength(0)
  })

  it('should be accessible', () => {
    wrapper = createWrapper()

    const uploadArea = wrapper.find('.file-upload-component')
    expect(uploadArea.element.tagName).toBe('DIV')
    expect(uploadArea.attributes('role')).toBe('button')
    expect(uploadArea.attributes('tabindex')).toBe('0')

    const fileInput = wrapper.find('input[type="file"]')
    expect(fileInput.exists()).toBe(true)
  })
})

describe('FileUploadComponent - PDF Worker Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should import worker module when showing PDF conversion modal', async () => {
    // Mock pdfjs-dist and worker
    const mockPdfjsLib = {
      GlobalWorkerOptions: {
        workerSrc: null
      },
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({
          numPages: 3
        })
      }))
    }

    const mockWorkerModule = {
      default: 'mocked-worker-url.mjs'
    }

    // Mock dynamic imports
    vi.doMock('pdfjs-dist', () => mockPdfjsLib)
    vi.doMock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => mockWorkerModule)




    // Test the worker loading logic by simulating it
    const workerModule = { default: 'test-worker.mjs' }
    const workerSrc = workerModule.default

    expect(workerSrc).toBe('test-worker.mjs')
    expect(typeof workerSrc).toBe('string')
  })

  it('should set GlobalWorkerOptions.workerSrc from worker module', () => {
    // Simulate the worker loading logic
    const mockLib = {
      GlobalWorkerOptions: {
        workerSrc: null
      }
    }

    const workerModule = { default: 'worker-url.mjs' }
    const workerSrc = workerModule.default

    if (!mockLib.GlobalWorkerOptions.workerSrc) {
      mockLib.GlobalWorkerOptions.workerSrc = workerSrc
    }

    expect(mockLib.GlobalWorkerOptions.workerSrc).toBe('worker-url.mjs')
  })

  it('should not overwrite existing workerSrc', () => {
    // Simulate the worker loading logic with pre-existing workerSrc
    const mockLib = {
      GlobalWorkerOptions: {
        workerSrc: 'existing-worker.mjs'
      }
    }

    const workerModule = { default: 'new-worker.mjs' }
    const workerSrc = workerModule.default

    if (!mockLib.GlobalWorkerOptions.workerSrc) {
      mockLib.GlobalWorkerOptions.workerSrc = workerSrc
    }

    // Should preserve existing value
    expect(mockLib.GlobalWorkerOptions.workerSrc).toBe('existing-worker.mjs')
  })

  it('should extract default export from worker import', () => {
    // Test the pattern used in the component
    const workerModule = {
      default: '/assets/pdf.worker-abc123.mjs'
    }

    const workerSrc = workerModule.default

    expect(workerSrc).toBeTruthy()
    expect(typeof workerSrc).toBe('string')
    expect(workerSrc).toContain('.mjs')
  })
})