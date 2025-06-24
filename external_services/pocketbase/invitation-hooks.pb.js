/**
 * Site Invitation Hooks for PocketBase
 * 
 * This file handles all site invitation-related operations:
 * - Invitation acceptance processing
 * - User permission granting
 * - Invitation status management
 */

// Note: PocketBase doesn't support require/import in hooks
// Each hook file must be self-contained

/**
 * Hook to automatically grant site permissions when an invitation is accepted
 */
onRecordAfterUpdateSuccess((e) => {
  if (e.record.tableName() !== 'site_invitations') return

  const invitation = e.record
  const oldRecord = e.record.originalCopy()

  // Check if status changed from pending to accepted
  if (oldRecord.get('status') !== 'pending' || invitation.get('status') !== 'accepted') {
    return // Not an acceptance event
  }

  try {
    // Get the user who accepted the invitation
    const userEmail = invitation.get('email')
    const users = e.app.findRecordsByFilter('users', `email = "${userEmail}"`)

    if (!users || users.length === 0) {
      e.app.logger().error(`No user found with email ${userEmail} for invitation ${invitation.get('id')}`)
      return
    }

    const user = users[0]

    // Check if user is already a member of this site
    let existingSiteUser
    try {
      existingSiteUser = e.app.findFirstRecordByFilter(
        'site_users',
        `site = "${invitation.get('site')}" && user = "${user.get('id')}"`
      )
    } catch (err) {
      // No existing record found, which is expected for new invitations
    }

    if (existingSiteUser) {
      e.app.logger().info(`User ${user.get('id')} already has access to site ${invitation.get('site')}`)

      // Update existing role if different
      const currentRole = existingSiteUser.get('role')
      const invitedRole = invitation.get('role')

      if (currentRole !== invitedRole) {
        existingSiteUser.set('role', invitedRole)
        existingSiteUser.set('assigned_by', invitation.get('invited_by'))
        existingSiteUser.set('is_active', true)
        e.app.save(existingSiteUser)

        e.app.logger().info(`Updated user ${user.get('id')} role from ${currentRole} to ${invitedRole} for site ${invitation.get('site')}`)
      }

      // Update the invitation with accepted timestamp
      invitation.set('accepted_at', new Date().toISOString())
      e.app.save(invitation)

      return
    }

    // Create site_user record to grant permissions
    const siteUserCollection = e.app.findCollectionByNameOrId('site_users')
    const siteUserRecord = new Record(siteUserCollection)
    siteUserRecord.set('site', invitation.get('site'))
    siteUserRecord.set('user', user.get('id'))
    siteUserRecord.set('role', invitation.get('role'))
    siteUserRecord.set('assigned_by', invitation.get('invited_by'))
    siteUserRecord.set('is_active', true)

    e.app.save(siteUserRecord)

    // Update the invitation with accepted_at timestamp
    invitation.set('accepted_at', new Date().toISOString())
    e.app.save(invitation)

    e.app.logger().info(`Granted ${invitation.get('role')} permissions to user ${user.get('id')} for site ${invitation.get('site')}`)

  } catch (error) {
    e.app.logger().error(`Error processing accepted invitation ${invitation.get('id')}:`, error)
    // Don't throw - we don't want to fail the invitation update
  }

  e.next()
}, 'site_invitations')

/**
 * Hook to handle invitation expiration
 */
onRecordAfterUpdateSuccess((e) => {
  if (e.record.tableName() !== 'site_invitations') return

  const invitation = e.record
  const oldRecord = e.record.originalCopy()

  // Check if status changed to expired
  const oldStatus = oldRecord.get('status')
  const newStatus = invitation.get('status')

  if (oldStatus !== 'expired' && newStatus === 'expired') {
    const siteId = invitation.get('site')
    const userEmail = invitation.get('email')
    const role = invitation.get('role')

    e.app.logger().info(`Invitation expired for ${userEmail} to join site ${siteId} as ${role}`)

    // Additional cleanup or notification logic can be added here
    // For example, you might want to notify the site owner about expired invitations
  }

  e.next()
}, 'site_invitations')

/**
 * Hook to handle invitation rejection
 */
onRecordAfterUpdateSuccess((e) => {
  if (e.record.tableName() !== 'site_invitations') return

  const invitation = e.record
  const oldRecord = e.record.originalCopy()

  // Check if status changed to rejected
  const oldStatus = oldRecord.get('status')
  const newStatus = invitation.get('status')

  if (oldStatus !== 'rejected' && newStatus === 'rejected') {
    const siteId = invitation.get('site')
    const userEmail = invitation.get('email')
    const role = invitation.get('role')

    e.app.logger().info(`Invitation rejected by ${userEmail} for site ${siteId} (role: ${role})`)

    // Additional logic for handling rejections can be added here
    // For example, you might want to notify the site owner about the rejection
  }

  e.next()
}, 'site_invitations')

/**
 * Hook to validate invitation creation
 */
onRecordCreate((e) => {
  if (e.record.tableName() !== 'site_invitations') return

  const invitation = e.record
  const siteId = invitation.get('site')
  const userEmail = invitation.get('email')
  const role = invitation.get('role')

  try {
    // Check if user already has access to this site
    const users = e.app.findRecordsByFilter('users', `email = "${userEmail}"`)

    if (users && users.length > 0) {
      const user = users[0]

      try {
        const existingSiteUser = e.app.findFirstRecordByFilter(
          'site_users',
          `site = "${siteId}" && user = "${user.get('id')}" && is_active = true`
        )

        if (existingSiteUser) {
          throw new BadRequestError(`User ${userEmail} already has access to this site`)
        }
      } catch (err) {
        if (!err.message.includes('no rows')) {
          throw err
        }
        // No existing access found, proceed with invitation
      }
    }

    // Check for existing pending invitations
    try {
      const existingInvitation = e.app.findFirstRecordByFilter(
        'site_invitations',
        `site = "${siteId}" && email = "${userEmail}" && status = "pending"`
      )

      if (existingInvitation) {
        throw new BadRequestError(`A pending invitation already exists for ${userEmail}`)
      }
    } catch (err) {
      if (!err.message.includes('no rows')) {
        throw err
      }
      // No existing pending invitation found, proceed
    }

    // Validate role
    const validRoles = ['owner', 'supervisor', 'accountant']
    if (!validRoles.includes(role)) {
      throw new BadRequestError(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`)
    }

    // Set expiration date (e.g., 7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    invitation.set('expires_at', expiresAt.toISOString())

    // Set invited_at timestamp
    invitation.set('invited_at', new Date().toISOString())

    e.app.logger().info(`Creating invitation for ${userEmail} to join site ${siteId} as ${role}`)

  } catch (error) {
    e.app.logger().error(`Error validating invitation creation:`, error)
    throw error
  }

  e.next()
}, 'site_invitations')

/**
 * Hook to handle automatic invitation expiration
 * This could be triggered by a cron job or periodic task
 */
onRecordAfterCreateSuccess((e) => {
  if (e.record.tableName() !== 'invitation_expiration_check') return

  try {
    // Find all pending invitations that have expired
    const now = new Date().toISOString()
    const expiredInvitations = e.app.findRecordsByFilter(
      'site_invitations',
      `status = "pending" && expires_at < "${now}"`
    )

    expiredInvitations.forEach(invitation => {
      invitation.set('status', 'expired')
      e.app.save(invitation)

      e.app.logger().info(`Auto-expired invitation ${invitation.get('id')} for ${invitation.get('email')}`)
    })

    e.app.logger().info(`Processed ${expiredInvitations.length} expired invitations`)

  } catch (err) {
    e.app.logger().error('Error processing invitation expiration:', err)
  }

  e.next()
}, 'invitation_expiration_check')