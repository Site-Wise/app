import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import './styles/driver-overrides.css';
import './utils/onboardingTest'; // Load test utilities
import App from './App.vue';
import router from './router';
import { useTheme } from './composables/useTheme';
import { useI18n } from './composables/useI18n';

const app = createApp(App);
const pinia = createPinia();

// Initialize theme before mounting the app
const { initializeTheme } = useTheme();
initializeTheme();

// Initialize i18n: load the active language's dictionary BEFORE mount so there
// is zero flash-of-untranslated-content. Kept here (upstream of mount) and out
// of App.vue to avoid interfering with the isReadyForRouting reload fix.
const { currentLanguage, loadLanguage } = useI18n();
document.documentElement.lang = currentLanguage.value;

async function bootstrap() {
  await loadLanguage(currentLanguage.value);

  app.use(pinia);
  app.use(router);
  app.mount('#app');
}

bootstrap();