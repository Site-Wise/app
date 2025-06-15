import { ref } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  persistent?: boolean
}

const toasts = ref<Toast[]>([])

export function useToast() {
  let toastId = 0

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastId}`
    const newToast: Toast = {
      id,
      duration: 4000,
      persistent: false,
      ...toast
    }

    toasts.value.push(newToast)

    // Auto remove toast after duration (unless persistent)
    if (!newToast.persistent && newToast.duration) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clearAll = () => {
    toasts.value.splice(0)
  }

  // Convenience methods
  const success = (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    return addToast({ message, type: 'success', ...options })
  }

  const error = (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    return addToast({ message, type: 'error', persistent: true, ...options })
  }

  const warning = (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    return addToast({ message, type: 'warning', ...options })
  }

  const info = (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    return addToast({ message, type: 'info', ...options })
  }

  return {
    toasts: toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info
  }
}