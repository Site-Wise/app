import { ref } from 'vue'
import { vi } from 'vitest'

export const useRegisterSW = () => ({
  needRefresh: ref(false),
  updateServiceWorker: vi.fn()
})