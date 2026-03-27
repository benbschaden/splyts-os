import { createServiceClient } from '@/lib/supabase/service'

export async function getTeamMembers(organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  if (error) return []

  // Fetch user emails from auth.users via admin API
  const adminClient = createServiceClient()
  const userIds = (data ?? []).map((m) => m.user_id)

  // Get user profiles for names
  const { data: profiles } = await adminClient
    .from('user_profiles')
    .select('id, full_name')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]))

  return (data ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role as 'admin' | 'member',
    createdAt: m.created_at,
    fullName: profileMap[m.user_id] ?? null,
  }))
}

export async function getPendingInviteByEmail(email: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('invites')
    .select('id, organization_id, email, role, expires_at, accepted_at')
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function getPendingInvites(organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('invites')
    .select('id, email, role, created_at, expires_at, accepted_at')
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function createInvite(params: {
  organizationId: string
  email: string
  role: 'admin' | 'member'
  invitedBy: string
}) {
  const supabase = createServiceClient()

  // Invalidate any existing pending invites for this email+org
  await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('organization_id', params.organizationId)
    .eq('email', params.email.toLowerCase())
    .is('accepted_at', null)

  const { data, error } = await supabase
    .from('invites')
    .insert({
      organization_id: params.organizationId,
      email: params.email.toLowerCase(),
      role: params.role,
      invited_by: params.invitedBy,
    })
    .select('id, token')
    .single()

  if (error || !data) return { invite: null, error: 'Failed to create invite' }
  return { invite: data, error: null }
}

export async function getInviteByToken(token: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('invites')
    .select('id, organization_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function acceptInvite(token: string, userId: string) {
  const supabase = createServiceClient()

  const invite = await getInviteByToken(token)
  if (!invite) return { error: 'Invite not found' }
  if (invite.accepted_at) return { error: 'This invite link is no longer valid' }
  if (new Date(invite.expires_at) < new Date()) return { error: 'This invite link is no longer valid' }

  // Check if user is already a member
  const { data: existing } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', invite.organization_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invite.organization_id,
        user_id: userId,
        role: invite.role as 'admin' | 'member',
      })
    if (memberError) return { error: 'Failed to join organisation' }
  }

  await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', token)

  return { error: null, organizationId: invite.organization_id }
}

export async function acceptInviteById(inviteId: string, userId: string) {
  const supabase = createServiceClient()

  const { data: invite, error: fetchError } = await supabase
    .from('invites')
    .select('id, organization_id, role, accepted_at, expires_at')
    .eq('id', inviteId)
    .maybeSingle()

  if (fetchError || !invite) return { error: 'Invite not found' }
  if (invite.accepted_at) return { error: 'This invite link is no longer valid' }
  if (new Date(invite.expires_at) < new Date()) return { error: 'This invite link is no longer valid' }

  const { data: existing } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', invite.organization_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invite.organization_id,
        user_id: userId,
        role: invite.role as 'admin' | 'member',
      })
    if (memberError) return { error: 'Failed to join organisation' }
  }

  await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inviteId)

  return { error: null }
}

export async function updateMemberRole(
  organizationId: string,
  userId: string,
  role: 'admin' | 'member',
) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('organization_id', organizationId)
    .eq('user_id', userId)

  if (error) return { error: 'Failed to update role' }
  return { error: null }
}

export async function removeMember(organizationId: string, userId: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId)

  if (error) return { error: 'Failed to remove member' }
  return { error: null }
}

export async function revokeInvite(inviteId: string, organizationId: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to revoke invite' }
  return { error: null }
}
