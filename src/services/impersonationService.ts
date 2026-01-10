/**
 * Impersonation Service
 *
 * Manages the impersonation workflow including:
 * - Initiating impersonation requests (support staff)
 * - Responding to requests (site owners)
 * - Managing active sessions
 * - Real-time WebSocket communication
 * - Audit logging
 */

import { pb, type ImpersonationRequest, type ImpersonationSession, type AuditLog, type User, type Site } from './pocketbase';

// Configuration - should be set via environment variables
const IMPERSONATION_WORKER_URL = import.meta.env.VITE_IMPERSONATION_WORKER_URL || 'http://localhost:8787';

export type ImpersonationEventType =
  | 'impersonation_request'
  | 'impersonation_approved'
  | 'impersonation_denied'
  | 'impersonation_revoked'
  | 'session_expired'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface ImpersonationEvent {
  type: ImpersonationEventType;
  data?: any;
}

export type ImpersonationEventHandler = (event: ImpersonationEvent) => void;

class ImpersonationService {
  private ws: WebSocket | null = null;
  private eventHandlers: Set<ImpersonationEventHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;

  /**
   * Get the current user's auth token for API calls
   */
  private getAuthToken(): string {
    return pb.authStore.token;
  }

  /**
   * Get the current user ID
   */
  private getCurrentUserId(): string | null {
    return pb.authStore.model?.id || null;
  }

  /**
   * Connect to the impersonation WebSocket for real-time updates
   */
  async connect(role: 'owner' | 'support'): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    const userId = this.getCurrentUserId();
    const token = this.getAuthToken();

    if (!userId || !token) {
      throw new Error('User not authenticated');
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = IMPERSONATION_WORKER_URL.replace('http', 'ws');
        this.ws = new WebSocket(
          `${wsUrl}/ws?userId=${userId}&token=${token}&role=${role}`
        );

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.emit({ type: 'connected' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          this.stopPingInterval();
          this.emit({ type: 'disconnected' });
          this.attemptReconnect(role);
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;
          console.error('WebSocket error:', error);
          this.emit({ type: 'error', data: error });
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  /**
   * Subscribe to impersonation events
   */
  subscribe(handler: ImpersonationEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Emit an event to all subscribers
   */
  private emit(event: ImpersonationEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'impersonation_request':
        this.emit({
          type: 'impersonation_request',
          data: {
            requestId: message.requestId,
            supportUserId: message.supportUserId,
            targetUserId: message.targetUserId,
            targetSiteId: message.targetSiteId,
            reason: message.reason,
            sessionDurationMinutes: message.sessionDurationMinutes,
            expiresAt: message.expiresAt
          }
        });
        break;

      case 'impersonation_approved':
        this.emit({
          type: 'impersonation_approved',
          data: {
            requestId: message.requestId,
            sessionId: message.sessionId
          }
        });
        break;

      case 'impersonation_denied':
        this.emit({
          type: 'impersonation_denied',
          data: {
            requestId: message.requestId,
            reason: message.deniedReason
          }
        });
        break;

      case 'impersonation_revoked':
        this.emit({
          type: 'impersonation_revoked',
          data: {
            sessionId: message.sessionId,
            revokedBy: message.revokedBy
          }
        });
        break;

      case 'pong':
        // Heartbeat response - no action needed
        break;

      case 'subscribed':
        // Subscription confirmed
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(role: 'owner' | 'support'): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect(role).catch(console.error);
    }, delay);
  }

  // ============================================
  // Support Staff Methods
  // ============================================

  /**
   * Request impersonation of a user (support staff only)
   */
  async requestImpersonation(
    targetUserId: string,
    targetSiteId: string,
    reason: string,
    sessionDurationMinutes: number = 30
  ): Promise<{ requestId: string; expiresAt: string }> {
    const userId = this.getCurrentUserId();
    const token = this.getAuthToken();

    if (!userId || !token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${IMPERSONATION_WORKER_URL}/api/impersonation/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supportUserId: userId,
        targetUserId,
        targetSiteId,
        reason,
        sessionDurationMinutes,
        token
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to request impersonation');
    }

    return response.json();
  }

  /**
   * Get active impersonation sessions for support user
   */
  async getMyActiveSessions(): Promise<ImpersonationSession[]> {
    const userId = this.getCurrentUserId();
    const token = this.getAuthToken();

    if (!userId || !token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${IMPERSONATION_WORKER_URL}/api/impersonation/sessions?userId=${userId}&token=${token}&type=support`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }

    const data = await response.json();
    return data.sessions;
  }

  /**
   * Verify if an impersonation session is still valid
   */
  async verifySession(sessionId: string): Promise<{
    valid: boolean;
    session?: {
      id: string;
      targetUser: string;
      targetSite: string;
      effectiveRole: string;
      expiresAt: string;
    };
    reason?: string;
  }> {
    const userId = this.getCurrentUserId();
    const token = this.getAuthToken();

    if (!userId || !token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${IMPERSONATION_WORKER_URL}/api/impersonation/verify?sessionId=${sessionId}&userId=${userId}&token=${token}`
    );

    if (!response.ok) {
      throw new Error('Failed to verify session');
    }

    return response.json();
  }

  /**
   * End an impersonation session (support user)
   */
  async endSession(sessionId: string, reason?: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const token = this.getAuthToken();

    if (!userId || !token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${IMPERSONATION_WORKER_URL}/api/impersonation/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userId,
        reason,
        token
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to end session');
    }
  }

  // ============================================
  // Site Owner Methods
  // ============================================

  /**
   * Get pending impersonation requests for sites owned by the user
   */
  async getPendingRequests(siteId?: string): Promise<ImpersonationRequest[]> {
    const userId = this.getCurrentUserId();
    const token = this.getAuthToken();

    if (!userId || !token) {
      throw new Error('User not authenticated');
    }

    let url = `${IMPERSONATION_WORKER_URL}/api/impersonation/pending?userId=${userId}&token=${token}`;
    if (siteId) {
      url += `&siteId=${siteId}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch pending requests');
    }

    const data = await response.json();
    return data.requests;
  }

  /**
   * Approve an impersonation request (site owner only)
   */
  async approveRequest(requestId: string): Promise<{ sessionId: string }> {
    const userId = this.getCurrentUserId();
    const token = this.getAuthToken();

    if (!userId || !token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${IMPERSONATION_WORKER_URL}/api/impersonation/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        ownerId: userId,
        approved: true,
        token
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve request');
    }

    return response.json();
  }

  /**
   * Deny an impersonation request (site owner only)
   */
  async denyRequest(requestId: string, reason?: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const token = this.getAuthToken();

    if (!userId || !token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${IMPERSONATION_WORKER_URL}/api/impersonation/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        ownerId: userId,
        approved: false,
        deniedReason: reason,
        token
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to deny request');
    }
  }

  /**
   * Get active sessions on sites owned by the user
   */
  async getActiveSessionsOnMySites(): Promise<ImpersonationSession[]> {
    const userId = this.getCurrentUserId();
    const token = this.getAuthToken();

    if (!userId || !token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${IMPERSONATION_WORKER_URL}/api/impersonation/sessions?userId=${userId}&token=${token}&type=owner`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }

    const data = await response.json();
    return data.sessions;
  }

  /**
   * Revoke an active impersonation session (site owner only)
   */
  async revokeSession(sessionId: string, reason?: string): Promise<void> {
    return this.endSession(sessionId, reason);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if the current user is a support agent
   */
  async isSupportAgent(): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const record = await pb.collection('support_user_settings').getFirstListItem(
        `user="${userId}" && is_support_agent=true`
      );
      return !!record;
    } catch {
      return false;
    }
  }

  /**
   * Get support user settings for the current user
   */
  async getSupportSettings(): Promise<{
    isSupportAgent: boolean;
    supportLevel?: 'tier1' | 'tier2' | 'admin';
    maxSessionDuration?: number;
  } | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    try {
      const record = await pb.collection('support_user_settings').getFirstListItem(
        `user="${userId}"`
      );
      return {
        isSupportAgent: record.is_support_agent,
        supportLevel: record.support_level,
        maxSessionDuration: record.max_session_duration
      };
    } catch {
      return null;
    }
  }

  /**
   * Search for users to impersonate (support only)
   */
  async searchUsers(query: string): Promise<User[]> {
    try {
      const records = await pb.collection('users').getList(1, 20, {
        filter: `email~"${query}" || name~"${query}"`,
        sort: 'name'
      });
      return records.items as unknown as User[];
    } catch {
      return [];
    }
  }

  /**
   * Get sites for a user (support only - for selecting which site to impersonate on)
   */
  async getUserSites(userId: string): Promise<{ site: Site; role: string }[]> {
    try {
      const records = await pb.collection('site_users').getFullList({
        filter: `user="${userId}" && is_active=true`,
        expand: 'site'
      });

      return records.map(r => ({
        site: r.expand?.site as unknown as Site,
        role: r.role
      })).filter(s => s.site);
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const impersonationService = new ImpersonationService();
