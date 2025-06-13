# Vue 3 + TypeScript + Vitest Testing Reference Guide

This document contains all the patterns, best practices, and solutions we've discovered for testing in our Vue 3 + TypeScript + Vitest setup.

## Table of Contents
1. [Basic Test Setup](#basic-test-setup)
2. [TypeScript Issues & Solutions](#typescript-issues--solutions)
3. [Element Finding Patterns](#element-finding-patterns)
4. [Mock Patterns](#mock-patterns)
5. [Component Testing Patterns](#component-testing-patterns)
6. [Async Testing](#async-testing)
7. [Test Isolation & Mock Management](#test-isolation--mock-management)
8. [Vue Component Lifecycle Testing](#vue-component-lifecycle-testing)
9. [Reactive Form Testing](#reactive-form-testing)
10. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

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

// Finding buttons by text content (avoid :contains() - it doesn't work)
// ❌ Wrong:
const button = wrapper.find('button:contains("Create New Site")')

// ✅ Correct:
const buttons = wrapper.findAll('button')
const createButton = buttons.find((btn: any) => btn.text().includes('Create New Site'))
```

## Mock Patterns

### 1. Simple Composable Mock
```typescript
vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'auth.signIn': 'Sign In',
        'auth.signOut': 'Sign Out',
        'nav.manage_users': 'Manage Users',
        'subscription.title': 'Subscription'
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

## Test Isolation & Mock Management

### 1. Proper Mock Reset in beforeEach
**Problem:** Tests pass individually but fail when run together due to shared mock state
**Solution:** Reset mock implementations in beforeEach, not just clear calls

```typescript
describe('ComponentName', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Reset mock implementations for critical services
    const { serviceA } = await import('../../services/serviceA')
    vi.mocked(serviceA.getData).mockResolvedValue(defaultMockData)
    
    // Reset other mocks as needed
    const { serviceB } = await import('../../services/serviceB')
    vi.mocked(serviceB.create).mockResolvedValue(defaultResponse)
  })
})
```

### 2. Mock State Contamination
**Problem:** Previous test modifies mock return values affecting subsequent tests
**Solution:** Always reset to known good state

```typescript
// ❌ Wrong: Mock state can leak between tests
const mockService = {
  getData: vi.fn().mockResolvedValue([])
}

// ✅ Correct: Reset in beforeEach
beforeEach(async () => {
  const { accountService } = await import('../../services/pocketbase')
  vi.mocked(accountService.getAll).mockResolvedValue([
    { id: '1', name: 'Test Account', balance: 1000 }
  ])
})
```

### 3. Test Interdependence Issues
**Problem:** Tests fail when run in different order
**Solution:** Ensure each test can run independently

```typescript
// ✅ Good: Each test resets component state
beforeEach(() => {
  wrapper = createWrapper()
})

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
  }
})
```

## Vue Component Lifecycle Testing

### 1. Testing onMounted Behavior
**Problem:** Component lifecycle hooks don't execute properly in tests
**Solution:** Wait for mounted hook and async operations to complete

```typescript
it('should load data on mount', async () => {
  wrapper = createWrapper()
  
  // Wait for onMounted to complete
  await wrapper.vm.$nextTick()
  // Wait for async operations (adjust timing as needed)
  await new Promise(resolve => setTimeout(resolve, 50))
  // Final DOM update
  await wrapper.vm.$nextTick()
  
  expect(wrapper.vm.data).toBeDefined()
  expect(wrapper.text()).toContain('Expected Data')
})
```

### 2. Testing Async Data Loading
**Problem:** Component shows loading state but tests don't wait for data
**Solution:** Proper async waiting pattern

```typescript
it('should display loaded data', async () => {
  const mockData = [{ id: '1', name: 'Test Item' }]
  
  // Mock the service call
  const { dataService } = await import('../../services/api')
  vi.mocked(dataService.getAll).mockResolvedValue(mockData)
  
  wrapper = createWrapper()
  
  // Complete async lifecycle
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 50))
  await wrapper.vm.$nextTick()
  
  expect(wrapper.text()).toContain('Test Item')
})
```

### 3. Testing Computed Properties with Async Data
**Problem:** Computed properties return default values before data loads
**Solution:** Ensure data is loaded before testing computed properties

```typescript
it('should calculate values from loaded data', async () => {
  wrapper = createWrapper()
  
  // Wait for data loading
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 50))
  await wrapper.vm.$nextTick()
  
  // Now test computed properties
  expect(wrapper.vm.totalAmount).toBe(expectedValue)
  expect(wrapper.vm.itemCount).toBe(expectedCount)
})
```

## Reactive Form Testing

### 1. Testing Vue 3 Reactive Forms
**Problem:** Form values don't persist when set directly in tests
**Solution:** Set values on component's reactive form object, not DOM elements

```typescript
// ❌ Wrong: DOM manipulation doesn't update reactive state reliably
await wrapper.find('input[name="title"]').setValue('Test Title')

// ✅ Correct: Set reactive form data directly
wrapper.vm.form.title = 'Test Title'
wrapper.vm.form.amount = 1000
await wrapper.vm.$nextTick()

// Verify form state
expect(wrapper.vm.form.title).toBe('Test Title')
```

### 2. Testing Form Submission
**Problem:** Form submission tests fail because form data is reset
**Solution:** Test the reactive form object, not the service call parameters

```typescript
it('should submit form with correct data', async () => {
  const { apiService } = await import('../../services/api')
  const mockCreate = vi.mocked(apiService.create)
  
  wrapper = createWrapper()
  
  // Set form data
  wrapper.vm.form.name = 'Test Name'
  wrapper.vm.form.type = 'test'
  wrapper.vm.form.amount = 500
  await wrapper.vm.$nextTick()
  
  // Verify form state before submission
  expect(wrapper.vm.form.name).toBe('Test Name')
  
  // Call save method
  await wrapper.vm.saveForm()
  
  // Verify service called with form object
  expect(mockCreate).toHaveBeenCalledWith(wrapper.vm.form)
})
```

### 3. Testing Form Validation
**Problem:** Validation rules don't trigger in tests
**Solution:** Test HTML validation attributes and component validation state

```typescript
it('should validate required fields', async () => {
  wrapper = createWrapper()
  
  // Open form
  wrapper.vm.showModal = true
  await wrapper.vm.$nextTick()
  
  // Check required attributes
  const nameInput = wrapper.find('input[name="name"]')
  expect(nameInput.attributes('required')).toBeDefined()
  
  const typeSelect = wrapper.find('select[name="type"]')
  expect(typeSelect.attributes('required')).toBeDefined()
  
  // Test validation state
  wrapper.vm.form.name = ''
  await wrapper.vm.$nextTick()
  
  expect(wrapper.vm.isFormValid).toBe(false) // If component has validation
})
```

### 4. Modal Form Testing
**Problem:** Modal forms require specific interaction patterns
**Solution:** Proper modal lifecycle testing

```typescript
it('should handle modal form workflow', async () => {
  wrapper = createWrapper()
  
  // Open modal
  const buttons = wrapper.findAll('button')
  const addButton = buttons.find((btn: any) => btn.text().includes('Add'))
  await addButton?.trigger('click')
  await wrapper.vm.$nextTick()
  
  // Verify modal state
  expect(wrapper.vm.showModal).toBe(true)
  expect(wrapper.find('.modal').exists()).toBe(true)
  
  // Fill form
  wrapper.vm.form.name = 'Test Entry'
  await wrapper.vm.$nextTick()
  
  // Submit
  await wrapper.vm.saveForm()
  
  // Verify modal closes
  expect(wrapper.vm.showModal).toBe(false)
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

### 2. Subscription Mocking with PocketBase
**Problem:** useSubscription tests fail with "getFirstListItem is not a function"
**Solution:** Use complete PocketBase mock with all required methods

```typescript
vi.mock('../../services/pocketbase', () => {
  const collections = new Map()
  collections.set('subscription_plans', [
    { id: 'plan-1', name: 'Free', is_active: true, features: {...}, price: 0, currency: 'INR' }
  ])
  collections.set('site_subscriptions', [])
  collections.set('subscription_usage', [])
  
  return {
    pb: {
      collection: vi.fn((name: string) => ({
        getFullList: vi.fn().mockImplementation(() => Promise.resolve(collections.get(name) || [])),
        getFirstListItem: vi.fn().mockImplementation((filter: string) => {
          const items = collections.get(name) || []
          if (filter.includes('name="Free"')) {
            return Promise.resolve(items.find((item: any) => item.name === 'Free'))
          }
          return Promise.resolve(items[0] || null)
        }),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({})
      }))
    },
    getCurrentSiteId: vi.fn().mockReturnValue(null)
  }
})
```

### 3. Reactive Data Not Updating
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

### 4. Component Stubbing
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

### 5. Event Handling Issues
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

### 6. Testing Computed Properties
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

### 7. Modal Testing and Form Interactions
**Problem:** Forms inside modals not found or values not set
**Solution:** Ensure modal is open and use proper element finding

```typescript
it('should handle form submission in modal', async () => {
  wrapper = mount(Component)
  
  // 1. Open modal first
  await wrapper.find('button').trigger('click')
  const buttons = wrapper.findAll('button')
  const openModalButton = buttons.find((btn: any) => btn.text().includes('Create'))
  await openModalButton?.trigger('click')
  
  // 2. Wait for modal to render
  await wrapper.vm.$nextTick()
  expect(wrapper.vm.showModal).toBe(true)
  
  // 3. Fill form fields with existence checks
  const nameInput = wrapper.find('input[placeholder="Enter name"]')
  expect(nameInput.exists()).toBe(true)
  await nameInput.setValue('Test Value')
  
  const numberInputs = wrapper.findAll('input[type="number"]')
  expect(numberInputs.length).toBeGreaterThanOrEqual(1)
  await numberInputs[0].setValue('123')
  
  // 4. Submit form
  const form = wrapper.find('form')
  expect(form.exists()).toBe(true)
  await form.trigger('submit')
  
  // 5. Verify submission
  expect(mockSubmitFunction).toHaveBeenCalledWith({
    name: 'Test Value',
    number: 123
  })
})
```

## Best Practices Summary

### Core Testing Principles
1. **Always type button finders:** `(btn: any) => ...`
2. **Use data-testid for reliable element finding**
3. **Mock external dependencies completely**
4. **Test user interactions, not implementation details**
5. **Use descriptive test names**
6. **Group related tests in describe blocks**

### Async & Lifecycle Management
7. **Wait for async operations:** Use `$nextTick()` + `setTimeout()` pattern
8. **Test component lifecycle:** Properly wait for `onMounted` and data loading
9. **Handle computed properties:** Ensure data is loaded before testing computed values
10. **Use proper timing:** `await new Promise(resolve => setTimeout(resolve, 50))` for data loading

### Mock & Test Isolation
11. **Reset mocks in beforeEach:** Use `vi.mocked()` to reset implementations, not just calls
12. **Ensure test isolation:** Each test should work independently of execution order
13. **Stub complex child components:** Avoid testing dependencies unintentionally
14. **Clear mocks AND reset implementations:** Prevent mock state contamination

### Form & Modal Testing
15. **Test reactive forms directly:** Set `wrapper.vm.form.field` instead of DOM manipulation
16. **Verify modal state:** Always check modal is open before testing form interactions
17. **Test form validation:** Check HTML attributes and component validation state
18. **Handle form lifecycle:** Test open → fill → submit → close workflows

### Component Testing
19. **Unmount components in afterEach:** Prevent memory leaks and state contamination
20. **Use specific translations:** Mock i18n with actual text instead of returning keys
21. **Avoid CSS pseudo-selectors:** Don't use `:contains()` - use text-based finding instead
22. **Test component state:** Verify internal state before testing external interactions

### Service Integration Testing
23. **Test with reactive objects:** Use `wrapper.vm.form` for service call verification
24. **Mock service responses:** Provide complete mock data that matches component expectations
25. **Test error scenarios:** Include both success and failure paths in service tests

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

## Recent Updates

### January 2024 - AccountsView Testing Learnings
- Added comprehensive async lifecycle testing patterns
- Documented reactive form testing approaches
- Established test isolation best practices for mock management
- Created patterns for testing Vue 3 components with complex state

---

This reference guide should help us maintain consistency and avoid the common issues we've encountered. Keep this updated as we discover new patterns!