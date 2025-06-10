import { createRouter, createWebHistory } from 'vue-router';
import { authService } from '../services/pocketbase';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/items',
      name: 'Items',
      component: () => import('../views/ItemsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/items/:id',
      name: 'ItemDetail',
      component: () => import('../views/ItemDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vendors',
      name: 'Vendors',
      component: () => import('../views/VendorsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vendors/:id',
      name: 'VendorDetail',
      component: () => import('../views/VendorDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/quotations',
      name: 'Quotations',
      component: () => import('../views/QuotationsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/incoming',
      name: 'Incoming',
      component: () => import('../views/IncomingView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/payments',
      name: 'Payments',
      component: () => import('../views/PaymentsView.vue'),
      meta: { requiresAuth: true }
    }
  ]
});

router.beforeEach((to, _from, next) => {
  const isAuthenticated = authService.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;