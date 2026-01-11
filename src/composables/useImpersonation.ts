/**
 * Impersonation Composable
 *
 * Provides reactive state and methods for managing impersonation sessions.
 * Used by both support staff and site owners.
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { impersonationService, type ImpersonationEvent } from '../services/impersonationService';
import type { ImpersonationRequest, ImpersonationSession } from '../services/pocketbase';
import { useAuth } from './useAuth';
import { useSiteStore } from '../stores/site';

// Global state - shared across all component instances
const isImpersonating = ref(false);
const currentSession = ref<ImpersonationSession | null>(null);
const pendingRequests = ref<ImpersonationRequest[]>([]);
const activeSessions = ref<ImpersonationSession[]>([]);
const isSupportAgent = ref(false);
const supportSettings = ref<{
  supportLevel?: 'tier1' | 'tier2' | 'admin';
  maxSessionDuration?: number;
} | null>(null);
const isConnected = ref(false);
const connectionError = ref<string | null>(null);

// Local storage key for persisting impersonation state
const IMPERSONATION_STATE_KEY = 'sitewise_impersonation_state';

/**
 * Save impersonation state to local storage (session only)
 */
function saveImpersonationState(): void {
  if (currentSession.value) {
    sessionStorage.setItem(IMPERSONATION_STATE_KEY, JSON.stringify({
      sessionId: currentSession.value.id,
      targetSite: currentSession.value.target_site,
      effectiveRole: currentSession.value.effective_role,
      expiresAt: currentSession.value.expires_at
    }));
  } else {
    sessionStorage.removeItem(IMPERSONATION_STATE_KEY);
  }
}

/**
 * Load impersonation state from local storage
 */
function loadImpersonationState(): { sessionId: string; targetSite: string; effectiveRole: string; expiresAt: string } | null {
  try {
    const stored = sessionStorage.getItem(IMPERSONATION_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Clear impersonation state
 */
function clearImpersonationState(): void {
  isImpersonating.value = false;
  currentSession.value = null;
  sessionStorage.removeItem(IMPERSONATION_STATE_KEY);
}

export function useImpersonation() {
  const { user, isAuthenticated } = useAuth();
  const siteStore = useSiteStore();

  // Loading states
  const isLoading = ref(false);
  const isInitialized = ref(false);

  // Computed properties
  const hasActiveSession = computed(() => isImpersonating.value && currentSession.value !== null);

  const sessionTimeRemaining = computed(() => {
    if (!currentSession.value?.expires_at) return 0;
    const expiresAt = new Date(currentSession.value.expires_at).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  });

  const pendingRequestCount = computed(() => pendingRequests.value.length);

  const activeSessionCount = computed(() => activeSessions.value.length);

  const canRequestImpersonation = computed(() => {
    return isSupportAgent.value && !isImpersonating.value;
  });

  // Event handler for WebSocket messages
  let unsubscribe: (() => void) | null = null;

  function handleImpersonationEvent(event: ImpersonationEvent): void {
    switch (event.type) {
      case 'connected':
        isConnected.value = true;
        connectionError.value = null;
        break;

      case 'disconnected':
        isConnected.value = false;
        break;

      case 'error':
        connectionError.value = event.data?.message || 'Connection error';
        break;

      case 'impersonation_request':
        // New request received - add to pending list
        if (event.data) {
          pendingRequests.value.unshift(event.data as ImpersonationRequest);
        }
        break;

      case 'impersonation_approved':
        // Request was approved - start impersonation session
        if (event.data?.sessionId) {
          startImpersonationFromSession(event.data.sessionId);
        }
        break;

      case 'impersonation_denied':
        // Request was denied - show notification
        console.log('Impersonation request denied:', event.data?.reason);
        break;

      case 'impersonation_revoked':
        // Session was revoked by owner
        if (currentSession.value?.id === event.data?.sessionId) {
          endCurrentSession('Session was revoked by site owner');
        }
        break;

      case 'session_expired':
        // Session expired
        if (currentSession.value?.id === event.data?.sessionId) {
          endCurrentSession('Session has expired');
        }
        break;
    }
  }

  /**
   * Initialize the impersonation system
   */
  async function initialize(): Promise<void> {
    if (isInitialized.value || !isAuthenticated.value) return;

    isLoading.value = true;

    try {
      // Check if user is a support agent
      const settings = await impersonationService.getSupportSettings();
      isSupportAgent.value = settings?.isSupportAgent || false;
      supportSettings.value = settings;

      // Restore any existing session
      const savedState = loadImpersonationState();
      if (savedState) {
        const verification = await impersonationService.verifySession(savedState.sessionId);
        if (verification.valid && verification.session) {
          isImpersonating.value = true;
          currentSession.value = {
            id: verification.session.id,
            target_site: verification.session.targetSite,
            target_user: verification.session.targetUser,
            effective_role: verification.session.effectiveRole as 'supervisor' | 'accountant',
            expires_at: verification.session.expiresAt
          } as ImpersonationSession;
        } else {
          clearImpersonationState();
        }
      }

      // Connect to WebSocket based on user role
      const role = isSupportAgent.value ? 'support' : 'owner';
      await impersonationService.connect(role);

      // Subscribe to events
      unsubscribe = impersonationService.subscribe(handleImpersonationEvent);

      // Load initial data
      if (siteStore.isOwner()) {
        await loadPendingRequests();
        await loadActiveSessions();
      }

      isInitialized.value = true;
    } catch (error) {
      console.error('Failed to initialize impersonation:', error);
      connectionError.value = 'Failed to initialize impersonation system';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Request to impersonate a user (support staff only)
   */
  async function requestImpersonation(
    targetUserId: string,
    targetSiteId: string,
    reason: string,
    durationMinutes: number = 30
  ): Promise<{ requestId: string; expiresAt: string }> {
    if (!canRequestImpersonation.value) {
      throw new Error('Cannot request impersonation');
    }

    isLoading.value = true;
    try {
      return await impersonationService.requestImpersonation(
        targetUserId,
        targetSiteId,
        reason,
        durationMinutes
      );
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Approve an impersonation request (site owner only)
   */
  async function approveRequest(requestId: string): Promise<void> {
    isLoading.value = true;
    try {
      await impersonationService.approveRequest(requestId);
      // Remove from pending list
      pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId);
      // Reload active sessions
      await loadActiveSessions();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Deny an impersonation request (site owner only)
   */
  async function denyRequest(requestId: string, reason?: string): Promise<void> {
    isLoading.value = true;
    try {
      await impersonationService.denyRequest(requestId, reason);
      // Remove from pending list
      pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Start impersonation from an approved session
   */
  async function startImpersonationFromSession(sessionId: string): Promise<void> {
    const verification = await impersonationService.verifySession(sessionId);
    if (!verification.valid || !verification.session) {
      throw new Error('Invalid session');
    }

    // Set impersonation state
    isImpersonating.value = true;
    currentSession.value = {
      id: verification.session.id,
      target_site: verification.session.targetSite,
      target_user: verification.session.targetUser,
      effective_role: verification.session.effectiveRole as 'supervisor' | 'accountant',
      expires_at: verification.session.expiresAt
    } as ImpersonationSession;

    // Save state
    saveImpersonationState();

    // Switch to the target site with the effective role
    // Note: This doesn't actually log in as the user, it just switches the view context
    // The backend still sees the real user ID for audit purposes
  }

  /**
   * End the current impersonation session
   */
  async function endCurrentSession(reason?: string): Promise<void> {
    if (!currentSession.value) return;

    isLoading.value = true;
    try {
      await impersonationService.endSession(currentSession.value.id!, reason);
    } catch (error) {
      console.error('Failed to end session on server:', error);
    } finally {
      clearImpersonationState();
      isLoading.value = false;
    }
  }

  /**
   * Revoke a session (site owner only)
   */
  async function revokeSession(sessionId: string, reason?: string): Promise<void> {
    isLoading.value = true;
    try {
      await impersonationService.revokeSession(sessionId, reason);
      // Remove from active sessions
      activeSessions.value = activeSessions.value.filter(s => s.id !== sessionId);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Load pending impersonation requests
   */
  async function loadPendingRequests(): Promise<void> {
    try {
      pendingRequests.value = await impersonationService.getPendingRequests();
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  }

  /**
   * Load active impersonation sessions
   */
  async function loadActiveSessions(): Promise<void> {
    try {
      if (isSupportAgent.value) {
        activeSessions.value = await impersonationService.getMyActiveSessions();
      } else {
        activeSessions.value = await impersonationService.getActiveSessionsOnMySites();
      }
    } catch (error) {
      console.error('Failed to load active sessions:', error);
    }
  }

  /**
   * Search for users (support staff only)
   */
  async function searchUsers(query: string) {
    return impersonationService.searchUsers(query);
  }

  /**
   * Get sites for a user (support staff only)
   */
  async function getUserSites(userId: string) {
    return impersonationService.getUserSites(userId);
  }

  // Session expiration timer
  let expirationTimer: ReturnType<typeof setInterval> | null = null;

  function startExpirationTimer(): void {
    if (expirationTimer) return;

    expirationTimer = setInterval(() => {
      if (currentSession.value && sessionTimeRemaining.value <= 0) {
        endCurrentSession('Session expired');
      }
    }, 1000);
  }

  function stopExpirationTimer(): void {
    if (expirationTimer) {
      clearInterval(expirationTimer);
      expirationTimer = null;
    }
  }

  // Watch for session changes to manage timer
  watch(currentSession, (newSession) => {
    if (newSession) {
      startExpirationTimer();
    } else {
      stopExpirationTimer();
    }
  });

  // Lifecycle hooks
  onMounted(() => {
    if (isAuthenticated.value) {
      initialize();
    }
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    stopExpirationTimer();
  });

  // Watch for auth changes
  watch(isAuthenticated, (authenticated) => {
    if (authenticated) {
      initialize();
    } else {
      clearImpersonationState();
      impersonationService.disconnect();
    }
  });

  return {
    // State
    isImpersonating,
    currentSession,
    pendingRequests,
    activeSessions,
    isSupportAgent,
    supportSettings,
    isConnected,
    connectionError,
    isLoading,
    isInitialized,

    // Computed
    hasActiveSession,
    sessionTimeRemaining,
    pendingRequestCount,
    activeSessionCount,
    canRequestImpersonation,

    // Methods
    initialize,
    requestImpersonation,
    approveRequest,
    denyRequest,
    startImpersonationFromSession,
    endCurrentSession,
    revokeSession,
    loadPendingRequests,
    loadActiveSessions,
    searchUsers,
    getUserSites
  };
}
