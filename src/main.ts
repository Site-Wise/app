import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';
import { useTheme } from './composables/useTheme';

const app = createApp(App);

// Initialize theme before mounting the app
const { initializeTheme } = useTheme();
initializeTheme();

app.use(router);
app.mount('#app');