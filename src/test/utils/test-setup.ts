import { createPinia, setActivePinia } from 'pinia'
import { useSiteStore } from '../../stores/site'

/**
 * Sets up a test Pinia instance with a mocked site store.
 * This is useful for component tests that rely on the site store.
 *
 * @returns An object containing the Pinia instance and the mocked site store.
 */
export function setupTestPinia() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const siteStore = useSiteStore()

  // Use $patch to properly set state - the store uses refs internally
  siteStore.$patch({
    currentSiteId: 'site-1',
    currentSite: { 
      id: 'site-1', 
      name: 'Test Site',
      description: 'A test construction site',
      total_units: 100,
      total_planned_area: 50000,
      admin_user: 'user-1',
      users: ['user-1'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    },
    userSites: [{ 
      site: 'site-1', 
      role: 'owner', 
      expand: { 
        site: { 
          id: 'site-1', 
          name: 'Test Site',
          description: 'A test construction site',
          total_units: 100,
          total_planned_area: 50000,
          admin_user: 'user-1',
          users: ['user-1'],
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        } 
      } 
    }],
    currentUserRole: 'owner',
    isInitialized: true,
    isLoading: false
  })

  return { pinia, siteStore }
}
