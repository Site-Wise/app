import { ref, computed } from 'vue';
import { 
  siteInvitationService,
  authService,
  siteUserService,
  pb,
  type SiteInvitation
} from '../services/pocketbase';

const pendingInvitations = ref<SiteInvitation[]>([]);
const receivedInvitations = ref<SiteInvitation[]>([]);
const isLoading = ref(false);

export function useInvitations() {
  
  const cleanupExpiredInvitations = async (siteId: string) => {
    try {
      const invitations = await siteInvitationService.getBySite(siteId);
      const expiredInvitations = invitations.filter(
        inv => inv.status === 'pending' && new Date(inv.expires_at) <= new Date()
      );

      // Update expired invitations status
      for (const invitation of expiredInvitations) {
        await siteInvitationService.updateStatus(invitation.id!, 'expired');
      }
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
    }
  };

  const loadReceivedInvitations = async () => {
    const user = authService.currentUser;
    if (!user || !pb.authStore.isValid) return;

    isLoading.value = true;
    try {
      const allInvitations = await siteInvitationService.getAll();
      const pendingInvitationsForUser = allInvitations.filter(
        invitation => invitation.email === user.email && invitation.status === 'pending'
      );

      // Filter out invitations for sites where the user is already a member
      const validInvitations = [];
      for (const invitation of pendingInvitationsForUser) {
        try {
          const existingRole = await siteUserService.getUserRoleForSite(user.id, invitation.site);
          // Only include invitation if user is NOT already a member
          if (!existingRole) {
            validInvitations.push(invitation);
          }
        } catch (error) {
          // If there's an error checking membership, include the invitation
          // (better to show it than hide a valid invitation)
          validInvitations.push(invitation);
        }
      }

      receivedInvitations.value = validInvitations;
    } catch (error) {
      console.error('Error loading received invitations:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const loadSiteInvitations = async (siteId: string) => {
    if (!pb.authStore.isValid) return;
    
    isLoading.value = true;
    try {
      // First cleanup expired invitations
      await cleanupExpiredInvitations(siteId);
      
      const invitations = await siteInvitationService.getBySite(siteId);
      pendingInvitations.value = invitations.filter(inv => inv.status === 'pending');
    } catch (error) {
      console.error('Error loading site invitations:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const sendInvitation = async (
    siteId: string, 
    email: string, 
    role: 'owner' | 'supervisor' | 'accountant'
  ) => {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    const trimmedEmail = email.toLowerCase().trim();

    // Prevent users from inviting themselves
    if (user.email && user.email.toLowerCase() === trimmedEmail) {
      throw new Error('You cannot send an invitation to yourself');
    }

    // Check if there's already a user with this email who is a member of this site
    // Use the same approach as siteUserService.getBySite to ensure consistency
    try {
      const siteUsers = await siteUserService.getBySite(siteId);
      
      const existingMember = siteUsers.find(siteUser => 
        siteUser.expand?.user?.email?.toLowerCase() === trimmedEmail
      );
      
      if (existingMember) {
        throw new Error(`${trimmedEmail} is already a member of this site with the role: ${existingMember.role}`);
      }
    } catch (error) {
      // If it's our custom error, re-throw it
      if (error instanceof Error && error.message.includes('already a member')) {
        throw error;
      }
      // Otherwise, continue - might be a permission error or network issue
    }

    // Check if there's already a valid (pending) invitation for this email and site
    const existingInvitations = await siteInvitationService.getBySite(siteId);
    const activeInvitation = existingInvitations.find(
      inv => inv.email.toLowerCase() === trimmedEmail && 
             inv.status === 'pending' &&
             new Date(inv.expires_at) > new Date() // Not expired
    );

    if (activeInvitation) {
      const expiryDate = new Date(activeInvitation.expires_at).toLocaleDateString();
      throw new Error(`An active invitation already exists for ${email}. It expires on ${expiryDate}.`);
    }

    // Set expiry to 7 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const invitationData = {
      site: siteId,
      email: trimmedEmail,
      role,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
      status: 'pending' as const,
      expires_at: expiryDate.toISOString()
    };

    const invitation = await siteInvitationService.create(invitationData);
    return invitation;
  };

  const acceptInvitation = async (invitationId: string) => {
    const user = authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    const invitation = receivedInvitations.value.find(inv => inv.id === invitationId);
    if (!invitation) throw new Error('Invitation not found');

    // Check if user is already a member of this site
    const existingRole = await siteUserService.getUserRoleForSite(user.id, invitation.site);
    if (existingRole) {
      throw new Error('You are already a member of this site');
    }

    // Update invitation status to accepted
    // The PocketBase hook will automatically create the site_user record
    await siteInvitationService.updateStatus(invitationId, 'accepted');

    // Refresh invitations
    await loadReceivedInvitations();

    return invitation;
  };

  const rejectInvitation = async (invitationId: string) => {
    await siteInvitationService.delete(invitationId);
    await loadReceivedInvitations();
  };

  const cancelInvitation = async (invitationId: string) => {
    await siteInvitationService.delete(invitationId);
    const invitation = pendingInvitations.value.find(inv => inv.id === invitationId);
    if (invitation) {
      await loadSiteInvitations(invitation.site);
    }
  };


  const hasReceivedInvitations = computed(() => receivedInvitations.value.length > 0);
  const receivedInvitationsCount = computed(() => receivedInvitations.value.length);

  return {
    // State
    pendingInvitations: computed(() => pendingInvitations.value),
    receivedInvitations: computed(() => receivedInvitations.value),
    isLoading: computed(() => isLoading.value),
    hasReceivedInvitations,
    receivedInvitationsCount,

    // Actions
    loadReceivedInvitations,
    loadSiteInvitations,
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    cancelInvitation
  };
}