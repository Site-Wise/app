import { createRouter, createWebHistory } from 'vue-router';
import { authService, getCurrentSiteId } from '../services/pocketbase';

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
      path: '/select-site',
      name: 'SiteSelection',
      component: () => import('../views/SiteSelectionView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true, requiresSite: true }
    },
    {
      path: '/items',
      name: 'Items',
      component: () => import('../views/ItemsView.vue'),
      meta: { requiresAuth: true, requiresSite: true }
    },
    {
      path: '/items/:id',
      name: 'ItemDetail',
      component: () => import('../views/ItemDetailView.vue'),
      meta: { requiresAuth: true, requiresSite: true }
    },
    {
      path: '/vendors',
      name: 'Vendors',
      component: () => import('../views/VendorsView.vue'),
      meta: { requiresAuth: true, requiresSite: true }
    },
    {
      path: '/vendors/:id',
      name: 'VendorDetail',
      component: () => import('../views/VendorDetailView.vue'),
      meta: { requiresAuth: true, requiresSite: true }
    },
    {
      path: '/quotations',
      name: 'Quotations',
      component: () => import('../views/QuotationsView.vue'),
      meta: { requiresAuth: true, requiresSite: true }
    },
    {
      path: '/incoming',
      name: 'Incoming',
      component: () => import('../views/IncomingView.vue'),
      meta: { requiresAuth: true, requiresSite: true }
    },
    {
      path: '/payments',
      name: 'Payments',
      component: () => import('../views/PaymentsView.vue'),
      meta: { requiresAuth: true, requiresSite: true }
    }
  ]
});

router.beforeEach((to, _from, next) => {
  const isAuthenticated = authService.isAuthenticated;
  const currentSiteId = getCurrentSiteId();

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.meta.requiresGuest && isAuthenticated) {
    // If user is authenticated but no site is selected, go to site selection
    if (!currentSiteId) {
      next('/select-site');
    } else {
      next('/');
    }
  } else if (to.meta.requiresSite && !currentSiteId) {
    // If route requires a site but none is selected, go to site selection
    next('/select-site');
  } else {
    next();
  }
});

export default router;