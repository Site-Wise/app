import { ref, computed, watch } from 'vue';

type Theme = 'light' | 'dark' | 'system';

const theme = ref<Theme>('system');
const systemPrefersDark = ref(false);

export function useTheme() {
  const isDark = computed(() => {
    if (theme.value === 'system') {
      return systemPrefersDark.value;
    }
    return theme.value === 'dark';
  });

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    updateDocumentClass();
  };

  const updateDocumentClass = () => {
    const root = document.documentElement;
    if (isDark.value) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const updateSystemPreference = () => {
    systemPrefersDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const initializeTheme = () => {
    // Get saved theme from localStorage or default to 'system'
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      theme.value = savedTheme;
    }

    // Set up system preference detection
    updateSystemPreference();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateSystemPreference);

    // Apply initial theme
    updateDocumentClass();

    return () => {
      mediaQuery.removeEventListener('change', updateSystemPreference);
    };
  };

  // Watch for theme changes
  watch([theme, systemPrefersDark], updateDocumentClass);

  return {
    theme: computed(() => theme.value),
    isDark,
    setTheme,
    initializeTheme
  };
}