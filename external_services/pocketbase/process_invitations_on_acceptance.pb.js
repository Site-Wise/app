// Hook to automatically grant site permissions when an invitation is accepted
onRecordAfterUpdateSuccess((e) => {
  if (e.record.tableName() !== 'site_invitations') return

  const invitation = e.record
  const oldRecord = e.record.originalCopy()

  // Check if status changed from pending to accepted
  if (!(oldRecord.get('status') === 'pending' && invitation.get('status') === 'accepted')) {
    return // Not an acceptance event
  }

  try {
    // Get the user who accepted the invitation
    const userEmail = invitation.get('email')
    const users = e.app.findRecordsByFilter('users', `email = "${userEmail}"`)

    if (!users || users.length === 0) {
      e.app.logger().error(`No user found with email ${userEmail} for invitation ${invitation.getId()}`)
      return
    }

    const user = users[0]

    // Check if user is already a member of this site
    let existingSiteUser
    try {
      existingSiteUser = e.app.findFirstRecordByFilter(
        'site_users',
        `site = "${invitation.get('site')}" && user = "${user.getId()}"`
      )
    } catch (err) {
      // No existing record found, which is expected
    }

    if (existingSiteUser) {
      e.app.logger().info(`User ${user.getId()} already has access to site ${invitation.get('site')}`)
      return
    }

    // Create site_user record to grant permissions
    const siteUserCollection = e.app.findCollectionByNameOrId('site_users')
    const siteUserRecord = new Record(siteUserCollection)
    siteUserRecord.set('site', invitation.get('site'))
    siteUserRecord.set('user', user.getId())
    siteUserRecord.set('role', invitation.get('role'))
    siteUserRecord.set('assigned_by', invitation.get('invited_by'))
    siteUserRecord.set('is_active', true)

    e.app.save(siteUserRecord)

    // Update the invitation with accepted_at timestamp
    invitation.set('accepted_at', new Date().toISOString())
    e.app.save(invitation)

    e.app.logger().info(`Granted ${invitation.get('role')} permissions to user ${user.getId()} for site ${invitation.get('site')}`)

  } catch (error) {
    e.app.logger().error(`Error processing accepted invitation ${invitation.getId()}:`, error)
    // Don't throw - we don't want to fail the invitation update
  }

  e.next()
}, 'site_invitations')
