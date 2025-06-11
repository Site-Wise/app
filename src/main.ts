import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';
import { useTheme } from './composables/useTheme';
import { useI18n } from './composables/useI18n';

const app = createApp(App);

// Initialize theme before mounting the app
const { initializeTheme } = useTheme();
initializeTheme();

// Initialize i18n
const { currentLanguage } = useI18n();
document.documentElement.lang = currentLanguage.value;

app.use(router);
app.mount('#app');