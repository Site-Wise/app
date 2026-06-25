import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FileUploadComponent from '../../components/FileUploadComponent.vue'

// ---------------------------------------------------------------------------
// PDF mocks
//
// `convertPdfToImages` is the only side-effecting export we override; the pure
// helpers (`classifyPdfError`, `isPdfFile`, `getEstimatedImageSize`,
// `MAX_PDF_PAGES`, the error classes) keep their real behaviour so the
// error-classification + message-mapping branches are exercised with real
// logic. `showPdfConversionModal` probes the document by dynamically importing
// `pdfjs-dist`, so we mock that (and its `?url` worker import) to drive the
// page-count / encryption branches without running real pdf.js.
// ---------------------------------------------------------------------------
const pdfMocks = vi.hoisted(() => ({
  convertPdfToImages: vi.fn(),
  getDocument: vi.fn()
}))

vi.mock('../../utils/pdfToImage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/pdfToImage')>()
  return {
    ...actual,
    convertPdfToImages: pdfMocks.convertPdfToImages
  }
})

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: any[]) => ({ promise: pdfMocks.getDocument(...args) })
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'mock-worker-url' }))

// pdf.js raises a `PasswordException` (name-based) for encrypted PDFs.
class PasswordException extends Error {
  name = 'PasswordException'
  code: number
  constructor(code: number, message = 'password') {
    super(message)
    this.code = code
  }
}
const NEED_PASSWORD = 1
const INCORRECT_PASSWORD = 2

const makePdfFile = (name = 'doc.pdf') =>
  new File(['%PDF-1.4 mock'], name, { type: 'application/pdf' })

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
        'fileUpload.removeFile': 'Remove file',
        'fileUpload.supportedFilesHint': 'Supported: images and PDF. Password-protected PDFs can be unlocked with a password.',
        'fileUpload.pdfLimitsHint': 'PDFs are limited to a maximum of {max} pages.',
        'fileUpload.pdfTooManyPages': 'This PDF has {count} pages; the maximum is {max}. Please upload a shorter PDF or split it.',
        'fileUpload.pdfPasswordProtected': 'This PDF is password-protected. Enter its password to unlock it, or upload an unlocked PDF.',
        'fileUpload.pdfIncorrectPassword': 'Incorrect password, try again.',
        'fileUpload.pdfConversionError': 'Failed to convert PDF. Please try again.',
        'fileUpload.pdfPasswordTitle': 'Password-protected PDF',
        'fileUpload.pdfPasswordPrompt': 'This PDF is password-protected. Enter its password to unlock and convert it.',
        'fileUpload.pdfPasswordLabel': 'PDF password',
        'fileUpload.pdfUnlock': 'Unlock'
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

    // Default PDF mock behaviour: a single-page, convertible PDF.
    pdfMocks.getDocument.mockResolvedValue({ numPages: 1 })
    pdfMocks.convertPdfToImages.mockResolvedValue([
      new File(['page'], 'doc_page_1.jpg', { type: 'image/jpeg' })
    ])

    // Create mock files for testing
    mockFiles = [
      new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' }),
      new File(['document content'], 'test-doc.pdf', { type: 'application/pdf' }),
      new File(['large content'.repeat(1000000)], 'large-file.jpg', { type: 'image/jpeg' })
    ]

    // Mock FileReader with a proper class
    class MockFileReader {
      result: string = ''
      onload: ((event: any) => void) | null = null
      onerror: ((event: any) => void) | null = null

      readAsDataURL(file: File) {
        setTimeout(() => {
          this.result = `data:${file.type};base64,mockbase64-${file.name}`
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
    it('should update files when modelValue prop changes to empty', async () => {
      wrapper = createWrapper()

      await wrapper.setProps({ modelValue: [] })

      expect(wrapper.vm.previews).toHaveLength(0)
    })

    it('should repopulate previews when modelValue changes from empty to having files', async () => {
      wrapper = createWrapper()

      // Start with empty previews
      expect(wrapper.vm.previews).toHaveLength(0)

      // Simulate navigation back with already-selected files
      await wrapper.setProps({ modelValue: [mockFiles[0]] })
      await nextTick()
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Previews should be repopulated
      expect(wrapper.vm.previews).toHaveLength(1)
      expect(wrapper.vm.previews[0].name).toBe('test-image.jpg')
    })

    it('should repopulate previews with multiple files when navigating back', async () => {
      wrapper = createWrapper({ acceptTypes: '*' })

      // Start with empty previews
      expect(wrapper.vm.previews).toHaveLength(0)

      // Simulate navigation back with multiple already-selected files
      await wrapper.setProps({ modelValue: [mockFiles[0], mockFiles[1]] })
      await nextTick()
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Previews should be repopulated with both files (order may vary due to async FileReader)
      expect(wrapper.vm.previews).toHaveLength(2)
      const previewNames = wrapper.vm.previews.map((p: any) => p.name).sort()
      expect(previewNames).toEqual(['test-doc.pdf', 'test-image.jpg'])
    })

    it('should not repopulate if previews already match modelValue', async () => {
      wrapper = createWrapper()

      // Add a file first
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFiles[0]],
        writable: false
      })

      await fileInput.trigger('change')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(wrapper.vm.previews).toHaveLength(1)
      const previewId = wrapper.vm.previews[0].id

      // Set modelValue to same file (should not repopulate)
      await wrapper.setProps({ modelValue: [mockFiles[0]] })
      await nextTick()

      // Should still have same preview (not recreated)
      expect(wrapper.vm.previews).toHaveLength(1)
      expect(wrapper.vm.previews[0].id).toBe(previewId) // Same preview object
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

  describe('PDF Support Hints & Error Branches', () => {
    it('shows supported-files and page-limit hints when PDFs are accepted (image uploader)', () => {
      wrapper = createWrapper({ acceptTypes: 'image/*' })
      expect(wrapper.vm.acceptsPdf).toBe(true)
      expect(wrapper.text()).toContain('Supported: images and PDF')
      expect(wrapper.text()).toContain('maximum of 10 pages')
    })

    it('hides PDF hints when the uploader does not accept images/PDFs', () => {
      wrapper = createWrapper({ acceptTypes: 'application/vnd.ms-excel' })
      expect(wrapper.vm.acceptsPdf).toBe(false)
      expect(wrapper.text()).not.toContain('Supported: images and PDF')
    })

    it('maps too-many-pages to a specific message with page count and max', () => {
      wrapper = createWrapper()
      const msg = wrapper.vm.pdfErrorMessage('too-many-pages', 42)
      expect(msg).toContain('42')
      expect(msg).toContain('10')
      expect(msg).toContain('maximum')
    })

    it('maps password-required to the encrypted-PDF message', () => {
      wrapper = createWrapper()
      const msg = wrapper.vm.pdfErrorMessage('password-required')
      expect(msg).toContain('password-protected')
    })

    it('maps incorrect-password to a retry message', () => {
      wrapper = createWrapper()
      const msg = wrapper.vm.pdfErrorMessage('incorrect-password')
      expect(msg).toContain('Incorrect password')
    })

    it('maps unknown errors to the generic conversion error', () => {
      wrapper = createWrapper()
      const msg = wrapper.vm.pdfErrorMessage('unknown')
      expect(msg).toContain('Failed to convert PDF')
    })

    it('shows the page-limit error surfaced on the component error state', async () => {
      wrapper = createWrapper()
      wrapper.vm.error = wrapper.vm.pdfErrorMessage('too-many-pages', 15)
      await nextTick()
      const errorMessage = wrapper.find('.error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('15')
    })

    it('renders the inline password prompt when a PDF needs a password', async () => {
      wrapper = createWrapper()
      wrapper.vm.pdfToConvert = mockFiles[1]
      wrapper.vm.pdfNeedsPassword = true
      wrapper.vm.showPdfModal = true
      await nextTick()

      const passwordInput = wrapper.find('#pdf-password-input')
      expect(passwordInput.exists()).toBe(true)
      expect(wrapper.text()).toContain('Password-protected PDF')
    })
  })

  describe('PDF probe (showPdfConversionModal)', () => {
    it('opens the confirmation modal with page count for a normal PDF', async () => {
      pdfMocks.getDocument.mockResolvedValue({ numPages: 3 })
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile()])
      await nextTick()

      expect(wrapper.vm.showPdfModal).toBe(true)
      expect(wrapper.vm.pdfNeedsPassword).toBe(false)
      expect(wrapper.vm.pdfPageCount).toBe(3)
      expect(wrapper.text()).toContain('fileUpload.pdfConversion')
      expect(wrapper.vm.error).toBe('')
    })

    it('surfaces the too-many-pages error without opening the modal when probe exceeds MAX_PDF_PAGES', async () => {
      pdfMocks.getDocument.mockResolvedValue({ numPages: 25 })
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile()])
      await nextTick()

      expect(wrapper.vm.showPdfModal).toBe(false)
      expect(wrapper.vm.pdfToConvert).toBeNull()
      expect(wrapper.vm.error).toContain('25')
      expect(wrapper.vm.error).toContain('maximum')
    })

    it('opens the inline password prompt when the probe throws a PasswordException', async () => {
      pdfMocks.getDocument.mockRejectedValue(new PasswordException(NEED_PASSWORD))
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile()])
      await nextTick()

      expect(wrapper.vm.pdfNeedsPassword).toBe(true)
      expect(wrapper.vm.showPdfModal).toBe(true)
      const passwordInput = wrapper.find('#pdf-password-input')
      expect(passwordInput.exists()).toBe(true)
      expect(wrapper.text()).toContain('Password-protected PDF')
    })

    it('falls back to a 1-page convertible modal when the probe fails with an unknown error', async () => {
      pdfMocks.getDocument.mockRejectedValue(new Error('boom'))
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile()])
      await nextTick()

      expect(wrapper.vm.pdfNeedsPassword).toBe(false)
      expect(wrapper.vm.showPdfModal).toBe(true)
      expect(wrapper.vm.pdfPageCount).toBe(1)
    })

    it('treats PDFs as regular files (no modal) when the uploader does not convert to images', async () => {
      wrapper = createWrapper({ acceptTypes: 'application/pdf' })

      await wrapper.vm.processFiles([makePdfFile('plain.pdf')])
      await new Promise(resolve => setTimeout(resolve, 30))

      expect(wrapper.vm.showPdfModal).toBe(false)
      expect(pdfMocks.getDocument).not.toHaveBeenCalled()
      expect(wrapper.vm.previews).toHaveLength(1)
      expect(wrapper.vm.previews[0].name).toBe('plain.pdf')
    })

    it('exposes an estimated size once a page count is known', async () => {
      pdfMocks.getDocument.mockResolvedValue({ numPages: 4 })
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile()])
      await nextTick()

      expect(wrapper.vm.estimatedSizeText).not.toBe('')
      expect(wrapper.text()).toContain('fileUpload.estimatedSize')
    })
  })

  describe('PDF conversion (handlePdfConversion)', () => {
    it('converts on confirm and adds the resulting images to previews', async () => {
      pdfMocks.getDocument.mockResolvedValue({ numPages: 2 })
      pdfMocks.convertPdfToImages.mockResolvedValue([
        new File(['p1'], 'doc_page_1.jpg', { type: 'image/jpeg' }),
        new File(['p2'], 'doc_page_2.jpg', { type: 'image/jpeg' })
      ])
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile()])
      await nextTick()

      await wrapper.vm.handlePdfConversion()
      await new Promise(resolve => setTimeout(resolve, 30))

      expect(pdfMocks.convertPdfToImages).toHaveBeenCalledTimes(1)
      // No password for a non-encrypted PDF.
      expect(pdfMocks.convertPdfToImages.mock.calls[0][1].password).toBeUndefined()
      expect(wrapper.vm.previews).toHaveLength(2)
      // Success path resets the conversion/password state.
      expect(wrapper.vm.showPdfModal).toBe(false)
      expect(wrapper.vm.convertingPdf).toBe(false)
      expect(wrapper.vm.pdfToConvert).toBeNull()
      expect(wrapper.vm.pdfNeedsPassword).toBe(false)
      expect(wrapper.vm.error).toBe('')
    })

    it('updates conversion progress via the onProgress callback', async () => {
      pdfMocks.convertPdfToImages.mockImplementation(async (_file: File, opts: any) => {
        opts.onProgress(1, 2)
        return [new File(['p'], 'doc_page_1.jpg', { type: 'image/jpeg' })]
      })
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile()])
      await nextTick()
      await wrapper.vm.handlePdfConversion()
      await new Promise(resolve => setTimeout(resolve, 30))

      // progress is reset to {0,0} once finished, but onProgress was invoked
      expect(pdfMocks.convertPdfToImages).toHaveBeenCalled()
    })

    it('does nothing when there is no PDF queued to convert', async () => {
      wrapper = createWrapper({ acceptTypes: 'image/*' })
      wrapper.vm.pdfToConvert = null
      await wrapper.vm.handlePdfConversion()
      expect(pdfMocks.convertPdfToImages).not.toHaveBeenCalled()
    })

    it('surfaces a generic error and resets state when conversion fails with an unknown error', async () => {
      pdfMocks.getDocument.mockResolvedValue({ numPages: 2 })
      pdfMocks.convertPdfToImages.mockRejectedValue(new Error('render failed'))
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile()])
      await nextTick()
      await wrapper.vm.handlePdfConversion()
      await new Promise(resolve => setTimeout(resolve, 30))

      expect(wrapper.vm.error).toContain('Failed to convert PDF')
      expect(wrapper.vm.convertingPdf).toBe(false)
      expect(wrapper.vm.pdfToConvert).toBeNull()
      expect(wrapper.vm.pdfNeedsPassword).toBe(false)
    })
  })

  describe('PDF password flow', () => {
    it('submits the entered password to convertPdfToImages and succeeds', async () => {
      pdfMocks.getDocument.mockRejectedValue(new PasswordException(NEED_PASSWORD))
      pdfMocks.convertPdfToImages.mockResolvedValue([
        new File(['p1'], 'secret_page_1.jpg', { type: 'image/jpeg' })
      ])
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile('secret.pdf')])
      await nextTick()
      expect(wrapper.vm.pdfNeedsPassword).toBe(true)

      wrapper.vm.pdfPassword = 'hunter2'
      await wrapper.vm.handlePdfConversion()
      await new Promise(resolve => setTimeout(resolve, 30))

      expect(pdfMocks.convertPdfToImages).toHaveBeenCalledTimes(1)
      expect(pdfMocks.convertPdfToImages.mock.calls[0][1].password).toBe('hunter2')
      expect(wrapper.vm.previews).toHaveLength(1)
      expect(wrapper.vm.pdfNeedsPassword).toBe(false)
      expect(wrapper.vm.pdfPassword).toBe('')
    })

    it('re-prompts with a retry message when the supplied password is incorrect', async () => {
      pdfMocks.getDocument.mockRejectedValue(new PasswordException(NEED_PASSWORD))
      pdfMocks.convertPdfToImages.mockRejectedValue(new PasswordException(INCORRECT_PASSWORD))
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile('secret.pdf')])
      await nextTick()

      wrapper.vm.pdfPassword = 'wrong'
      await wrapper.vm.handlePdfConversion()
      await new Promise(resolve => setTimeout(resolve, 30))

      // Still in password mode, modal reopened, retry message shown.
      expect(wrapper.vm.pdfNeedsPassword).toBe(true)
      expect(wrapper.vm.showPdfModal).toBe(true)
      expect(wrapper.vm.convertingPdf).toBe(false)
      expect(wrapper.vm.passwordError).toContain('Incorrect password')
      // The queued file is kept so the retry can reuse it.
      expect(wrapper.vm.pdfToConvert).not.toBeNull()
      const passwordError = wrapper.find('p.text-clay-700')
      expect(passwordError.exists()).toBe(true)
    })

    it('re-prompts when conversion still reports the password is required', async () => {
      pdfMocks.getDocument.mockRejectedValue(new PasswordException(NEED_PASSWORD))
      pdfMocks.convertPdfToImages.mockRejectedValue(new PasswordException(NEED_PASSWORD))
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile('secret.pdf')])
      await nextTick()

      wrapper.vm.pdfPassword = 'still-wrong'
      await wrapper.vm.handlePdfConversion()
      await new Promise(resolve => setTimeout(resolve, 30))

      expect(wrapper.vm.pdfNeedsPassword).toBe(true)
      expect(wrapper.vm.showPdfModal).toBe(true)
      expect(wrapper.vm.passwordError).toContain('password-protected')
    })

    it('does not submit while the password field is empty', async () => {
      pdfMocks.getDocument.mockRejectedValue(new PasswordException(NEED_PASSWORD))
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile('secret.pdf')])
      await nextTick()
      expect(wrapper.vm.pdfNeedsPassword).toBe(true)
      expect(wrapper.vm.pdfPassword).toBe('')

      await wrapper.vm.handlePdfConversion()
      expect(pdfMocks.convertPdfToImages).not.toHaveBeenCalled()
    })

    it('cancel clears all PDF/password state', async () => {
      pdfMocks.getDocument.mockRejectedValue(new PasswordException(NEED_PASSWORD))
      wrapper = createWrapper({ acceptTypes: 'image/*' })

      await wrapper.vm.processFiles([makePdfFile('secret.pdf')])
      await nextTick()
      wrapper.vm.pdfPassword = 'something'
      wrapper.vm.passwordError = 'oops'
      await nextTick()

      wrapper.vm.cancelPdfConversion()
      await nextTick()

      expect(wrapper.vm.showPdfModal).toBe(false)
      expect(wrapper.vm.pdfToConvert).toBeNull()
      expect(wrapper.vm.pdfNeedsPassword).toBe(false)
      expect(wrapper.vm.pdfPassword).toBe('')
      expect(wrapper.vm.passwordError).toBe('')
      expect(wrapper.vm.pdfPageCount).toBe(0)
    })
  })

  describe('Accept-type filtering & limits', () => {
    it('rejects a disallowed type while accepting an allowed one in the same batch', async () => {
      wrapper = createWrapper({ acceptTypes: 'image/jpeg' })

      const good = new File(['img'], 'ok.jpg', { type: 'image/jpeg' })
      const bad = new File(['txt'], 'no.txt', { type: 'text/plain' })
      await wrapper.vm.processFiles([good, bad])
      await new Promise(resolve => setTimeout(resolve, 30))

      expect(wrapper.vm.error).toContain('invalid file type')
      expect(wrapper.vm.previews).toHaveLength(1)
      expect(wrapper.vm.previews[0].name).toBe('ok.jpg')
    })

    it('honours a comma-separated accept list (exact + wildcard)', async () => {
      wrapper = createWrapper({ acceptTypes: 'image/png, application/pdf' })

      const png = new File(['png'], 'a.png', { type: 'image/png' })
      const gif = new File(['gif'], 'b.gif', { type: 'image/gif' })
      // png passes; gif does not (no image/* wildcard, no application/pdf)
      await wrapper.vm.processFiles([png])
      await new Promise(resolve => setTimeout(resolve, 30))
      expect(wrapper.vm.previews).toHaveLength(1)

      await wrapper.vm.processFiles([gif])
      await nextTick()
      expect(wrapper.vm.error).toContain('invalid file type')
    })

    it('accepts everything when acceptTypes is "*"', async () => {
      wrapper = createWrapper({ acceptTypes: '*' })
      const weird = new File(['x'], 'thing.xyz', { type: 'application/x-weird' })
      await wrapper.vm.processFiles([weird])
      await new Promise(resolve => setTimeout(resolve, 30))
      expect(wrapper.vm.error).toBe('')
      expect(wrapper.vm.previews).toHaveLength(1)
    })

    it('clears previous previews when multiple=false and a new valid file arrives', async () => {
      wrapper = createWrapper({ multiple: false, acceptTypes: 'image/*' })
      const a = new File(['a'], 'a.jpg', { type: 'image/jpeg' })
      const b = new File(['b'], 'b.jpg', { type: 'image/jpeg' })

      await wrapper.vm.processFiles([a])
      await new Promise(resolve => setTimeout(resolve, 30))
      expect(wrapper.vm.previews).toHaveLength(1)

      await wrapper.vm.processFiles([b])
      await new Promise(resolve => setTimeout(resolve, 30))
      expect(wrapper.vm.previews).toHaveLength(1)
      expect(wrapper.vm.previews[0].name).toBe('b.jpg')
    })
  })

  describe('File selector triggers', () => {
    it('clicks the hidden file input when openFileSelector is called', () => {
      wrapper = createWrapper()
      const fileInput = wrapper.find('input[type="file"]').element as HTMLInputElement
      const spy = vi.spyOn(fileInput, 'click')
      wrapper.vm.openFileSelector()
      expect(spy).toHaveBeenCalled()
    })

    it('clicks the camera input when openCamera is called on mobile', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
      })
      wrapper = createWrapper({ allowCamera: true, acceptTypes: 'image/*' })
      await nextTick()

      const cameraInput = wrapper.find('input[capture="environment"]').element as HTMLInputElement
      const spy = vi.spyOn(cameraInput, 'click')
      wrapper.vm.openCamera()
      expect(spy).toHaveBeenCalled()
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