import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { vi } from 'vitest'

// Create a mock router for testing
export const createMockRouter = (routes: any[] = []) => {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
      { path: '/items', component: { template: '<div>Items</div>' } },
      { path: '/vendors', component: { template: '<div>Vendors</div>' } },
      ...routes
    ]
  })
}

// Helper to mount components with common setup
export const mountComponent = (component: any, options: any = {}) => {
  const router = createMockRouter()
  
  return mount(component, {
    global: {
      plugins: [router],
      stubs: {
        'router-link': true,
        'router-view': true,
      },
      ...options.global
    },
    ...options
  })
}

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock window events
export const mockWindowEvent = (eventName: string) => {
  const listeners: Function[] = []
  
  window.addEventListener = vi.fn((event: string, listener: Function) => {
    if (event === eventName) {
      listeners.push(listener)
    }
  })
  
  window.removeEventListener = vi.fn((event: string, listener: Function) => {
    if (event === eventName) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  })
  
  return {
    trigger: (data?: any) => {
      listeners.forEach(listener => listener(data))
    },
    listeners
  }
}

// Helper to create form data for testing
export const createFormData = (data: Record<string, any>) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}