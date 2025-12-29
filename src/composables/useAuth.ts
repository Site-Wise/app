import { ref, computed } from 'vue';
import { authService, initializeTokenRefresh, stopTokenRefresh } from '../services/pocketbase';
import type { User } from '../services/pocketbase';

const user = ref<User | null>(authService.currentUser);

// Watch for auth changes and update user reactively
const updateUser = () => {
  user.value = authService.currentUser;
};

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value && authService.isAuthenticated);

  const login = async (email: string, password: string, turnstileToken?: string) => {
    try {
      const authData = await authService.login(email, password, turnstileToken);
      user.value = authData.record as unknown as User;

      // Initialize token refresh after successful login
      await initializeTokenRefresh();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const register = async (
    email: string, 
    password: string, 
    name: string, 
    turnstileToken?: string,
    phone?: string,
    countryCode?: string,
    couponCode?: string,
    legalAccepted?: boolean
  ) => {
    try {
      await authService.register(email, password, name, turnstileToken, phone, countryCode, couponCode, legalAccepted);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    // Stop token refresh mechanism
    stopTokenRefresh();

    authService.logout();
    user.value = null;

    // Clear site store to prevent race conditions
    try {
      const { useSiteStore } = await import('../stores/site');
      const siteStore = useSiteStore();
      await siteStore.clearCurrentSite();
    } catch (error) {
      console.warn('Failed to clear site store on logout:', error);
    }
  };

  // Expose updateUser for manual refresh if needed
  const refreshAuth = () => {
    updateUser();
  };

  return {
    user: computed(() => user.value),
    isAuthenticated,
    login,
    register,
    logout,
    refreshAuth
  };
}