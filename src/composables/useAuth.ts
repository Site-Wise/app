import { ref, computed } from 'vue';
import { authService } from '../services/pocketbase';
import type { User } from '../services/pocketbase';

const user = ref<User | null>(authService.currentUser);
const isAuthenticated = computed(() => authService.isAuthenticated);

export function useAuth() {
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

  return {
    user: computed(() => user.value),
    isAuthenticated,
    login,
    register,
    logout
  };
}