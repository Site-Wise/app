import { ref, computed } from 'vue';
import { authService } from '../services/pocketbase';
import type { User } from '../services/pocketbase';

const user = ref<User | null>(authService.currentUser);

// Watch for auth changes and update user reactively
const updateUser = () => {
  user.value = authService.currentUser;
};

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value && authService.isAuthenticated);

  const login = async (email: string, password: string) => {
    try {
      const authData = await authService.login(email, password);
      user.value = authData.record as unknown as User;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      await authService.register(email, password, name);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    authService.logout();
    user.value = null;
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