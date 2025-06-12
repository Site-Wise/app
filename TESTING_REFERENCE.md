# Vue 3 + TypeScript + Vitest Testing Reference Guide

This document contains all the patterns, best practices, and solutions we've discovered for testing in our Vue 3 + TypeScript + Vitest setup.

## Table of Contents
1. [Basic Test Setup](#basic-test-setup)
2. [TypeScript Issues & Solutions](#typescript-issues--solutions)
3. [Element Finding Patterns](#element-finding-patterns)
4. [Mock Patterns](#mock-patterns)
5. [Component Testing Patterns](#component-testing-patterns)
6. [Async Testing](#async-testing)
7. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

## Basic Test Setup

### Standard Test File Structure
```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ComponentName from '../../components/ComponentName.vue'

// Mocks go here (see Mock Patterns section)

describe('ComponentName', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup code here
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  // Tests go here
})
```

## TypeScript Issues & Solutions

### 1. Button Finding with TypeScript
**❌ Wrong:**
```typescript
const button = buttons.find(btn => btn.text().includes('text'))
```

**✅ Correct:**
```typescript
const button = buttons.find((btn: any) => btn.text().includes('text'))
```

### 2. Mock Function Types
**❌ Wrong:**
```typescript
vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    // This will cause type issues
  })
}))
```

**✅ Correct:**
```typescript
vi.mock('../../composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: computed(() => mockUser),
    isAuthenticated: computed(() => true),
    login: vi.fn(),
    logout: vi.fn()
  }))
}))
```

### 3. Complex Mock Types
For complex mocks that cause type issues, use `vi.fn()` wrapper:

```typescript
const mockUseSubscription = vi.fn(() => ({
  currentSubscription: computed(() => null),
  currentUsage: computed(() => null),
  currentPlan: computed(() => ({ 
    id: 'plan-1', 
    name: 'Free Plan',
    // ... other properties
  })),
  // ... other methods
}))

vi.mock('../../composables/useSubscription', () => ({
  useSubscription: mockUseSubscription
}))
```

## Element Finding Patterns

### 1. Finding Buttons by Text
```typescript
// For buttons with specific text
const buttons = wrapper.findAll('button')
const installButton = buttons.find((btn: any) => btn.text().includes('Install'))

// For buttons with translation keys
const loginButton = buttons.find((btn: any) => btn.text().includes('auth.signIn'))
```

### 2. Finding Elements by Class
```typescript
// Single class
const modal = wrapper.find('.modal')

// Multiple classes (must have all)
const primaryButton = wrapper.find('.btn.btn-primary')

// CSS selector
const closeButton = wrapper.find('button.text-gray-400')
```

### 3. Finding Elements by Data Attributes
```typescript
// Best practice: Use data-testid for testing
const submitButton = wrapper.find('[data-testid="submit-button"]')

// Vue component attributes
const userMenu = wrapper.find('[data-component="user-menu"]')
```

### 4. Finding by Component
```typescript
// Finding child components
const childComponent = wrapper.findComponent(ChildComponent)

// Finding multiple components
const allButtons = wrapper.findAllComponents('button')
```

### 5. Complex Element Finding
```typescript
// Finding nested elements
const menuItems = wrapper.findAll('.menu-item')
const activeItem = menuItems.find((item: any) => item.classes().includes('active'))

// Finding by content and classes
const errorMessage = wrapper.findAll('.error')
  .find((el: any) => el.text().includes('validation failed'))
```

## Mock Patterns

### 1. Simple Composable Mock
```typescript
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'auth.signIn': 'Sign In',
        'auth.signOut': 'Sign Out'
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
```

### 2. Service Mock with Methods
```typescript
vi.mock('../../services/pocketbase', () => ({
  itemService: {
    getAll: vi.fn().mockResolvedValue([{
      id: 'item-1',
      name: 'Test Item',
      // ... other properties
    }]),
    create: vi.fn().mockResolvedValue({ id: 'new-item' }),
    update: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true)
  }
}))
```

### 3. Reactive Composable Mock
```typescript
vi.mock('../../composables/useSite', () => ({
  useSite: () => ({
    currentSite: computed(() => ({
      id: 'site-1',
      name: 'Test Site',
      total_planned_area: 50000
    })),
    sites: computed(() => []),
    loading: computed(() => false),
    switchSite: vi.fn(),
    loadSites: vi.fn()
  })
}))
```

### 4. Chart.js Mock
```typescript
// Mock vue-chartjs
vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    template: '<div class="mock-chart">Chart Component</div>',
    props: ['data', 'options']
  }
}))

// Mock Chart.js core
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn()
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
  registerables: []
}))
```

### 5. Router Mock
```typescript
import { createMockRouter } from '../utils/test-utils'

// In test setup
const router = createMockRouter()

// In wrapper setup
wrapper = mount(Component, {
  global: {
    plugins: [router],
    stubs: {
      'router-link': true,
      'router-view': true
    }
  }
})

// Testing navigation
const pushSpy = vi.spyOn(router, 'push')
await button.trigger('click')
expect(pushSpy).toHaveBeenCalledWith('/expected-route')
```

## Component Testing Patterns

### 1. Props Testing
```typescript
it('should render with correct props', () => {
  wrapper = mount(Component, {
    props: {
      title: 'Test Title',
      count: 42,
      isActive: true
    }
  })
  
  expect(wrapper.text()).toContain('Test Title')
  expect(wrapper.vm.count).toBe(42)
})
```

### 2. Emits Testing
```typescript
it('should emit correct events', async () => {
  wrapper = mount(Component)
  
  await wrapper.find('button').trigger('click')
  
  expect(wrapper.emitted()).toHaveProperty('buttonClicked')
  expect(wrapper.emitted('buttonClicked')).toHaveLength(1)
  expect(wrapper.emitted('buttonClicked')[0]).toEqual(['expected-payload'])
})
```

### 3. Slots Testing
```typescript
it('should render slot content', () => {
  wrapper = mount(Component, {
    slots: {
      default: '<p>Slot Content</p>',
      header: '<h1>Header Slot</h1>'
    }
  })
  
  expect(wrapper.text()).toContain('Slot Content')
  expect(wrapper.find('h1').text()).toBe('Header Slot')
})
```

### 4. Conditional Rendering
```typescript
it('should show/hide elements based on conditions', async () => {
  wrapper = mount(Component, {
    props: { showModal: false }
  })
  
  expect(wrapper.find('.modal').exists()).toBe(false)
  
  await wrapper.setProps({ showModal: true })
  
  expect(wrapper.find('.modal').exists()).toBe(true)
})
```

## Async Testing

### 1. Waiting for Data Loading
```typescript
it('should load and display data', async () => {
  wrapper = mount(Component)
  
  // Wait for component to mount
  await wrapper.vm.$nextTick()
  
  // Wait for async operations
  await new Promise(resolve => setTimeout(resolve, 100))
  
  expect(wrapper.text()).toContain('Expected Data')
})
```

### 2. Testing Async Actions
```typescript
it('should handle async button click', async () => {
  const mockAction = vi.fn().mockResolvedValue(true)
  
  wrapper = mount(Component, {
    props: { onSubmit: mockAction }
  })
  
  await wrapper.find('button').trigger('click')
  await wrapper.vm.$nextTick()
  
  expect(mockAction).toHaveBeenCalled()
})
```

### 3. Testing Error Handling
```typescript
it('should handle errors gracefully', async () => {
  const mockAction = vi.fn().mockRejectedValue(new Error('Test error'))
  
  wrapper = mount(Component, {
    props: { onSubmit: mockAction }
  })
  
  await wrapper.find('button').trigger('click')
  await wrapper.vm.$nextTick()
  
  expect(wrapper.text()).toContain('Error occurred')
})
```

## Common Pitfalls & Solutions

### 1. Mock Import Issues
**Problem:** Mock not working due to import timing
**Solution:** Place mocks before imports and use `vi.hoisted()` if needed

```typescript
// Mock BEFORE importing the component
vi.mock('../../composables/useAuth', () => ({ /* mock */ }))

import Component from '../../components/Component.vue'
```

### 2. Reactive Data Not Updating
**Problem:** Component doesn't reflect data changes
**Solution:** Use `await wrapper.vm.$nextTick()` and proper reactivity

```typescript
it('should update when data changes', async () => {
  wrapper = mount(Component)
  
  // Change data
  wrapper.vm.someData = 'new value'
  
  // Wait for reactivity
  await wrapper.vm.$nextTick()
  
  expect(wrapper.text()).toContain('new value')
})
```

### 3. Component Stubbing
**Problem:** Child components cause issues in tests
**Solution:** Stub child components

```typescript
wrapper = mount(Component, {
  global: {
    stubs: {
      'child-component': true,
      'complex-chart': {
        template: '<div class="mock-chart">Chart</div>'
      }
    }
  }
})
```

### 4. Event Handling Issues
**Problem:** Events not triggering properly
**Solution:** Use proper event triggering and waiting

```typescript
// For simple events
await wrapper.find('button').trigger('click')

// For custom events
await wrapper.find('input').trigger('input', { target: { value: 'test' } })

// For form submission
await wrapper.find('form').trigger('submit')
```

### 5. Testing Computed Properties
```typescript
it('should compute values correctly', async () => {
  wrapper = mount(Component, {
    props: { items: [1, 2, 3] }
  })
  
  // Access computed property
  expect(wrapper.vm.itemCount).toBe(3)
  
  // Change dependent data
  await wrapper.setProps({ items: [1, 2, 3, 4, 5] })
  
  expect(wrapper.vm.itemCount).toBe(5)
})
```

## Best Practices Summary

1. **Always type button finders:** `(btn: any) => ...`
2. **Use data-testid for reliable element finding**
3. **Mock external dependencies completely**
4. **Wait for async operations with $nextTick() and timeouts**
5. **Stub complex child components**
6. **Clear mocks in beforeEach**
7. **Unmount components in afterEach**
8. **Test user interactions, not implementation details**
9. **Use descriptive test names**
10. **Group related tests in describe blocks**

## Example Complete Test File

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import MyComponent from '../../components/MyComponent.vue'
import { createMockRouter } from '../utils/test-utils'

// Mocks
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    user: computed(() => ({ id: '1', name: 'Test User' })),
    isAuthenticated: computed(() => true),
    logout: vi.fn()
  })
}))

describe('MyComponent', () => {
  let wrapper: any
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()
    router = createMockRouter()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(MyComponent, {
      props,
      global: {
        plugins: [router],
        stubs: {
          'router-link': true,
          'complex-child': true
        }
      }
    })
  }

  it('should render correctly', () => {
    wrapper = createWrapper()
    expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true)
  })

  it('should handle user interactions', async () => {
    wrapper = createWrapper()
    
    const buttons = wrapper.findAll('button')
    const submitButton = buttons.find((btn: any) => btn.text().includes('Submit'))
    
    await submitButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    expect(wrapper.emitted()).toHaveProperty('submitted')
  })

  // More tests...
})
```

This reference guide should help us maintain consistency and avoid the common issues we've encountered. Keep this updated as we discover new patterns!