import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'

// Test wrapper component that properly handles Vue lifecycle
export function createTestWrapper(composable: () => any) {
  const TestComponent = defineComponent({
    setup() {
      const result = composable()
      const composableResult = ref(result)
      return { composableResult }
    },
    template: '<div>{{ composableResult }}</div>'
  })

  return mount(TestComponent)
}

// Helper to wait for async operations
export async function waitForAsync(timeout = 100) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}