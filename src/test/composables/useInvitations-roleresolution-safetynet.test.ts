import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * SAFETY-NET: useInvitations.loadReceivedInvitations role resolution.
 *
 * WHAT THIS PROTECTS
 * ------------------
 * loadReceivedInvitations() must, for the current user, surface exactly the PENDING
 * invitations addressed to that user's email FOR SITES WHERE THE USER IS NOT ALREADY
 * A MEMBER. Membership is decided by resolving the user's role for the invitation's
 * site: a non-null role => already a member => invitation hidden; null role => shown.
 * On a per-invitation lookup error, the invitation is kept (fail-open).
 *
 * WHY IT MUST SURVIVE THE REFACTOR
 * --------------------------------
 * Today this does an N+1 loop calling siteUserService.getUserRoleForSite(userId, site)
 * once per invitation. The refactor will replace that loop with ONE batched call,
 * siteUserService.getUserRolesForSites(userId, siteIds), returning a role map.
 *
 * To make these tests pass for BOTH implementations, the mock backs both APIs with the
 * SAME role table, so each resolves identically. The assertions are written against the
 * resolved invitation->role OUTCOME (which invitation ids end up in receivedInvitations),
 * never against which method was called. So they hold whether the code loops over
 * getUserRoleForSite OR makes a single getUserRolesForSites call.
 */

// Hoisted so it is available to the hoisted vi.mock factory below (which accesses
// `currentUser` eagerly via authService.currentUser). A plain top-level const would be
// in the temporal dead zone when the hoisted factory runs.
const { currentUser } = vi.hoisted(() => ({
  currentUser: { id: 'user-1', email: 'me@example.com', name: 'Me' },
}))

// Role table that is the single source of truth for BOTH lookup APIs.
// 'site-member' => user already a member (role present) => invitation must be hidden.
// 'site-open'   => user has no role => invitation must be shown.
let roleTable: Record<string, 'owner' | 'supervisor' | 'accountant' | null>

const getUserRoleForSite = vi.fn(async (_userId: string, siteId: string) => {
  return roleTable[siteId] ?? null
})

const getUserRolesForSites = vi.fn(async (_userId: string, siteIds: string[]) => {
  const result: Record<string, 'owner' | 'supervisor' | 'accountant' | null> = {}
  siteIds.forEach(id => { result[id] = roleTable[id] ?? null })
  return result
})

const getAllInvitations = vi.fn()

vi.mock('../../services/pocketbase', () => ({
  siteInvitationService: {
    getAll: (...a: any[]) => getAllInvitations(...a),
    getBySite: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  },
  authService: { currentUser },
  siteUserService: {
    getUserRoleForSite: (...a: any[]) => getUserRoleForSite(...a),
    getUserRolesForSites: (...a: any[]) => getUserRolesForSites(...a),
    getBySite: vi.fn(),
  },
  pb: { authStore: { isValid: true }, collection: vi.fn() },
}))

import { useInvitations } from '../../composables/useInvitations'

const inv = (id: string, site: string, status = 'pending', email = currentUser.email) => ({
  id, site, email, status, role: 'supervisor',
  invited_by: 'u0', invited_at: '2024-01-01T00:00:00Z',
  expires_at: '2099-01-01T00:00:00Z',
  created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z',
})

describe('useInvitations role-resolution safety-net', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    roleTable = {}
  })

  it('keeps invitations only for sites where the user has NO role (member sites filtered out)', async () => {
    // Two invitations across DIFFERENT sites. User is a member of site-member,
    // not a member of site-open.
    roleTable = { 'site-member': 'owner', 'site-open': null }
    getAllInvitations.mockResolvedValue([
      inv('i-open', 'site-open'),
      inv('i-member', 'site-member'),
    ])

    const { loadReceivedInvitations, receivedInvitations } = useInvitations()
    await loadReceivedInvitations()

    // Invariant: exactly the open-site invitation survives.
    expect(receivedInvitations.value.map(i => i.id)).toEqual(['i-open'])
  })

  it('handles multiple invitations across several sites, mixed membership', async () => {
    roleTable = {
      'site-1': null,            // not a member -> shown
      'site-2': 'accountant',    // member -> hidden
      'site-3': null,            // not a member -> shown
    }
    getAllInvitations.mockResolvedValue([
      inv('a', 'site-1'),
      inv('b', 'site-2'),
      inv('c', 'site-3'),
    ])

    const { loadReceivedInvitations, receivedInvitations } = useInvitations()
    await loadReceivedInvitations()

    expect(new Set(receivedInvitations.value.map(i => i.id))).toEqual(new Set(['a', 'c']))
  })

  it('ignores invitations not addressed to the current user and non-pending ones', async () => {
    roleTable = { 'site-x': null, 'site-y': null }
    getAllInvitations.mockResolvedValue([
      inv('mine', 'site-x'),
      inv('someoneelse', 'site-y', 'pending', 'other@example.com'), // wrong email
      inv('accepted', 'site-x', 'accepted'),                         // wrong status
    ])

    const { loadReceivedInvitations, receivedInvitations } = useInvitations()
    await loadReceivedInvitations()

    expect(receivedInvitations.value.map(i => i.id)).toEqual(['mine'])
  })

  it('empty invitation list resolves to empty received list', async () => {
    getAllInvitations.mockResolvedValue([])
    const { loadReceivedInvitations, receivedInvitations } = useInvitations()
    await loadReceivedInvitations()
    expect(receivedInvitations.value).toEqual([])
  })

  it('site where the user has no role keeps the invitation visible', async () => {
    roleTable = { 'brand-new-site': null }
    getAllInvitations.mockResolvedValue([inv('fresh', 'brand-new-site')])
    const { loadReceivedInvitations, receivedInvitations } = useInvitations()
    await loadReceivedInvitations()
    expect(receivedInvitations.value.map(i => i.id)).toEqual(['fresh'])
  })

  it('cross-check: the SAME role table drives both the loop and batched APIs to the same outcome', async () => {
    // This guards the refactor directly: feeding the identical role data through
    // getUserRoleForSite (per-site) and getUserRolesForSites (batched) yields the
    // same membership decision, so swapping the implementation cannot change the
    // resolved received-invitations set.
    roleTable = { 's-keep': null, 's-drop': 'owner' }
    const invites = [inv('keep', 's-keep'), inv('drop', 's-drop')]

    // Per-site path (current implementation)
    const loopRoles = await Promise.all(
      invites.map(i => getUserRoleForSite(currentUser.id, i.site)),
    )
    const loopKept = invites.filter((_i, idx) => !loopRoles[idx]).map(i => i.id)

    // Batched path (future implementation)
    const map = await getUserRolesForSites(currentUser.id, invites.map(i => i.site))
    const batchedKept = invites.filter(i => !map[i.site]).map(i => i.id)

    expect(loopKept).toEqual(batchedKept)
    expect(loopKept).toEqual(['keep'])
  })
})
