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
    wrapper = createWrapper()
    
    // Mock FileReader for this test
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      onload: null,
      result: 'data:image/jpeg;base64,test'
    }
    
    vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)
    
    const imageFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
    
    // Trigger file processing
    wrapper.vm.processFiles([imageFile])
    
    // Simulate FileReader completion
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } } as any)
    }
    
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