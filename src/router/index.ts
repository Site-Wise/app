import { createRouter, createWebHistory } from 'vue-router';
import { authService, getCurrentSiteId, getCurrentUserRole, calculatePermissions } from '../services/pocketbase';

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
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/items',
      name: 'Items',
      component: () => import('../views/ItemsView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/items/:id',
      name: 'ItemDetail',
      component: () => import('../views/ItemDetailView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/services',
      name: 'Services',
      component: () => import('../views/ServicesView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/services/:id',
      name: 'ServiceDetail',
      component: () => import('../views/ServiceDetailView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/service-bookings',
      name: 'ServiceBookings',
      component: () => import('../views/ServiceBookingsView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/vendors',
      name: 'Vendors',
      component: () => import('../views/VendorsView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/vendors/:id',
      name: 'VendorDetail',
      component: () => import('../views/VendorDetailView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/accounts',
      name: 'Accounts',
      component: () => import('../views/AccountsView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canViewFinancials' }
    },
    {
      path: '/accounts/:id',
      name: 'AccountDetail',
      component: () => import('../views/AccountDetailView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canViewFinancials' }
    },
    {
      path: '/quotations',
      name: 'Quotations',
      component: () => import('../views/QuotationsView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/incoming',
      name: 'Incoming',
      component: () => import('../views/IncomingView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canRead' }
    },
    {
      path: '/payments',
      name: 'Payments',
      component: () => import('../views/PaymentsView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canViewFinancials' }
    },
    {
      path: '/users',
      name: 'UserManagement',
      component: () => import('../views/UserManagementView.vue'),
      meta: { requiresAuth: true, requiresSite: true, permission: 'canManageUsers' }
    },
    {
      path: '/invites',
      name: 'Invites',
      component: () => import('../views/InvitesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/subscription',
      name: 'Subscription',
      component: () => import('../views/SubscriptionView.vue'),
      meta: { requiresAuth: true, requiresSite: true, ownerOnly: true }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      redirect: '/'
    }
  ]
});

router.beforeEach((to, _from, next) => {
  const isAuthenticated = authService.isAuthenticated;
  const currentSiteId = getCurrentSiteId();
  const userRole = getCurrentUserRole();

  // Handle authentication requirements
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
    return;
  }

  // Handle guest-only routes (like login)
  if (to.meta.requiresGuest && isAuthenticated) {
    if (!currentSiteId) {
      next('/select-site');
    } else {
      next('/');
    }
    return;
  }

  // Handle site selection requirements
  if (to.meta.requiresSite && !currentSiteId) {
    next('/select-site');
    return;
  }

  // Handle owner-only routes
  if (to.meta.ownerOnly && userRole !== 'owner') {
    next('/');
    return;
  }

  // Handle permission requirements
  if (to.meta.permission && currentSiteId) {
    const permissions = calculatePermissions(userRole);
    const requiredPermission = to.meta.permission as keyof typeof permissions;
    
    if (!permissions[requiredPermission]) {
      // Redirect to dashboard if user doesn't have permission
      next('/');
      return;
    }
  }

  // Allow navigation
  next();
});

export default router;