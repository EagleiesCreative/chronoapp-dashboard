// Sync Clerk users and organizations to Supabase
import { clerkClient } from "@clerk/nextjs/server"
import { supabase } from "./supabase-server"

/**
 * Sync a Clerk user to Supabase
 * Handles the case where the same email exists with different Clerk IDs (dev vs prod)
 */
export async function syncUserToSupabase(userId: string) {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const email = user.emailAddresses[0]?.emailAddress || ''

    // First, check if a user with this email already exists (possibly from different Clerk environment)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser && existingUser.id !== user.id) {
      // User exists with different ID (dev vs prod) - update the ID and other fields
      const { error } = await supabase
        .from('users')
        .update({
          id: user.id,
          first_name: user.firstName || '',
          last_name: user.lastName || '',
          image_url: user.imageUrl || '',
          updated_at: new Date().toISOString()
        })
        .eq('email', email)

      if (error) {
        console.error('Error updating user ID in Supabase:', error)
        return { success: false, error }
      }
    } else {
      // Normal upsert by ID
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email,
          first_name: user.firstName || '',
          last_name: user.lastName || '',
          image_url: user.imageUrl || '',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('Error syncing user to Supabase:', error)
        return { success: false, error }
      }
    }

    return { success: true, userId: user.id }
  } catch (err) {
    console.error('Failed to sync user:', err)
    return { success: false, error: err }
  }
}

/**
 * Sync a Clerk organization to Supabase
 */
export async function syncOrganizationToSupabase(orgId: string) {
  try {
    const client = await clerkClient()
    const org = await client.organizations.getOrganization({ organizationId: orgId })

    const { error } = await supabase
      .from('organizations')
      .upsert({
        id: org.id,
        name: org.name,
        slug: org.slug || '',
        image_url: org.imageUrl || '',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error('Error syncing organization to Supabase:', error)
      return { success: false, error }
    }

    return { success: true, orgId: org.id }
  } catch (err) {
    console.error('Failed to sync organization:', err)
    return { success: false, error: err }
  }
}

/**
 * Sync organization membership to Supabase
 */
export async function syncMembershipToSupabase(orgId: string, userId: string) {
  try {
    // First, ensure user and org exist in Supabase
    await syncUserToSupabase(userId)
    await syncOrganizationToSupabase(orgId)

    const client = await clerkClient()
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId
    })

    const membership = memberships.data.find(m => m.publicUserData?.userId === userId)
    if (!membership) {
      console.warn(`Membership not found for user ${userId} in org ${orgId}`)
      return { success: false, error: 'Membership not found' }
    }

    const { error } = await supabase
      .from('organization_memberships')
      .upsert({
        id: membership.id,
        organization_id: orgId,
        user_id: userId,
        role: membership.role,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error('Error syncing membership to Supabase:', error)
      return { success: false, error }
    }

    return { success: true, membershipId: membership.id }
  } catch (err) {
    console.error('Failed to sync membership:', err)
    return { success: false, error: err }
  }
}

/**
 * Sync all members of an organization to Supabase
 */
export async function syncAllOrgMembersToSupabase(orgId: string) {
  try {
    await syncOrganizationToSupabase(orgId)

    const client = await clerkClient()
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId
    })

    const results = await Promise.allSettled(
      memberships.data.map(async (membership) => {
        const userId = membership.publicUserData?.userId
        if (!userId) return { success: false, error: 'No user ID' }

        return syncMembershipToSupabase(orgId, userId)
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    return {
      success: true,
      synced: successful,
      total: memberships.data.length
    }
  } catch (err) {
    console.error('Failed to sync org members:', err)
    return { success: false, error: err }
  }
}

/**
 * Ensure user and org are synced before making DB queries
 * Call this at the start of API routes
 */
export async function ensureClerkDataSynced(userId: string, orgId: string) {
  try {
    await Promise.all([
      syncUserToSupabase(userId),
      syncOrganizationToSupabase(orgId),
      syncMembershipToSupabase(orgId, userId)
    ])
    return { success: true }
  } catch (err) {
    console.error('Failed to ensure Clerk data synced:', err)
    return { success: false, error: err }
  }
}

/**
 * Remove a user from Supabase (when deleted from Clerk)
 */
export async function removeUserFromSupabase(userId: string) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Error removing user from Supabase:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to remove user:', err)
    return { success: false, error: err }
  }
}

/**
 * Remove an organization from Supabase (when deleted from Clerk)
 */
export async function removeOrganizationFromSupabase(orgId: string) {
  try {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId)

    if (error) {
      console.error('Error removing organization from Supabase:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to remove organization:', err)
    return { success: false, error: err }
  }
}

/**
 * Remove a membership from Supabase
 */
export async function removeMembershipFromSupabase(membershipId: string) {
  try {
    const { error } = await supabase
      .from('organization_memberships')
      .delete()
      .eq('id', membershipId)

    if (error) {
      console.error('Error removing membership from Supabase:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to remove membership:', err)
    return { success: false, error: err }
  }
}

type ClerkWebhookEvent = {
  type: string,
  data?: unknown
}

// Webhook event handler for Clerk events
export async function handleClerkWebhook(event: ClerkWebhookEvent) {
  try {
    const type = event.type
    const data = event.data as Record<string, unknown> | undefined

    switch (type) {
      case 'user.created':
      case 'user.updated':
        if (data && typeof data['id'] === 'string') {
          await syncUserToSupabase(data['id'] as string)
        }
        break
      case 'user.deleted':
        if (data && typeof data['id'] === 'string') {
          await removeUserFromSupabase(data['id'] as string)
        }
        break
      case 'organization.created':
      case 'organization.updated':
        if (data && typeof data['id'] === 'string') {
          await syncOrganizationToSupabase(data['id'] as string)
        }
        break
      case 'organization.deleted':
        if (data && typeof data['id'] === 'string') {
          await removeOrganizationFromSupabase(data['id'] as string)
        }
        break
      case 'organization.membership.created':
      case 'organization.membership.updated':
        if (data && typeof data['organizationId'] === 'string' && typeof data['userId'] === 'string') {
          await syncMembershipToSupabase(data['organizationId'] as string, data['userId'] as string)
        }
        break
      case 'organization.membership.deleted':
        if (data && typeof data['id'] === 'string') {
          await removeMembershipFromSupabase(data['id'] as string)
        }
        break
      default:
        // Unhandled event
        break
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to handle Clerk webhook event:', err)
    return { success: false, error: err }
  }
}
