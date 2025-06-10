<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="flex items-center justify-center">
          <HardHat class="h-12 w-12 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to ConstructTrack
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Manage your construction site efficiently
        </p>
      </div>
      
      <div class="card">
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div v-if="error" class="rounded-md bg-error-50 dark:bg-error-900/30 p-4">
            <div class="flex">
              <AlertCircle class="h-5 w-5 text-error-400 dark:text-error-300" />
              <div class="ml-3">
                <h3 class="text-sm font-medium text-error-800 dark:text-error-300">
                  {{ error }}
                </h3>
              </div>
            </div>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="form.email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="input"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div class="mt-1">
              <input
                id="password"
                v-model="form.password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                class="input"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full btn-primary"
            >
              <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ loading ? 'Signing in...' : 'Sign in' }}
            </button>
          </div>
        </form>
        
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">New to ConstructTrack?</span>
            </div>
          </div>
          
          <div class="mt-6">
            <button
              @click="showRegister = !showRegister"
              class="w-full btn-outline"
            >
              Create new account
            </button>
          </div>
        </div>
      </div>

      <!-- Register Form -->
      <div v-if="showRegister" class="card">
        <form @submit.prevent="handleRegister" class="space-y-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Create Account</h3>
          
          <div>
            <label for="reg-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full Name
            </label>
            <div class="mt-1">
              <input
                id="reg-name"
                v-model="registerForm.name"
                name="name"
                type="text"
                required
                class="input"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div>
            <label for="reg-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <div class="mt-1">
              <input
                id="reg-email"
                v-model="registerForm.email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="input"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label for="reg-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div class="mt-1">
              <input
                id="reg-password"
                v-model="registerForm.password"
                name="password"
                type="password"
                required
                class="input"
                placeholder="Create a password"
              />
            </div>
          </div>

          <div class="flex space-x-3">
            <button
              type="submit"
              :disabled="registerLoading"
              class="flex-1 btn-primary"
            >
              <Loader2 v-if="registerLoading" class="mr-2 h-4 w-4 animate-spin" />
              Create Account
            </button>
            <button
              type="button"
              @click="showRegister = false"
              class="flex-1 btn-outline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { HardHat, AlertCircle, Loader2 } from 'lucide-vue-next';

const router = useRouter();
const { login, register } = useAuth();

const loading = ref(false);
const registerLoading = ref(false);
const error = ref('');
const showRegister = ref(false);

const form = reactive({
  email: '',
  password: ''
});

const registerForm = reactive({
  name: '',
  email: '',
  password: ''
});

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const result = await login(form.email, form.password);
    if (result.success) {
      router.push('/');
    } else {
      error.value = result.error || 'Login failed';
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred';
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  registerLoading.value = true;
  error.value = '';
  
  try {
    const result = await register(registerForm.email, registerForm.password, registerForm.name);
    if (result.success) {
      showRegister.value = false;
      error.value = '';
      // Auto-login after registration
      const loginResult = await login(registerForm.email, registerForm.password);
      if (loginResult.success) {
        router.push('/');
      }
    } else {
      error.value = result.error || 'Registration failed';
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred';
  } finally {
    registerLoading.value = false;
  }
};
</script>