import { createServiceClient } from '@/lib/supabase/service'

export interface TeamRow {
  id: string
  name: string
  organization_id: string
  created_by: string
  created_at: string
}

export interface OrgMember {
  user_id: string
  role: string
  full_name: string | null
  avatar_url: string | null
}

export interface TeamMemberWithRole {
  user_id: string
  role: 'member' | 'reviewer'
  full_name: string | null
  avatar_url: string | null
}

export async function getTeamsForOrg(organizationId: string): Promise<TeamRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('teams')
    .select('id, name, organization_id, created_by, created_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error || !data) return []
  return data
}

export async function getOrgMembersWithProfiles(organizationId: string): Promise<OrgMember[]> {
  const supabase = createServiceClient()

  const { data: members, error } = await supabase
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', organizationId)

  if (error || !members || members.length === 0) return []

  const userIds = members.map((m) => m.user_id)

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  return members.map((m) => {
    const profile = profileMap.get(m.user_id)
    return {
      user_id: m.user_id,
      role: m.role,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }
  })
}

export async function seedTeamsForOrg(organizationId: string, createdBy: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: seeds } = await supabase
    .from('org_team_seeds')
    .select('name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!seeds || seeds.length === 0) return

  await supabase.from('teams').insert(
    seeds.map((seed) => ({
      organization_id: organizationId,
      name: seed.name,
      created_by: createdBy,
    })),
  )
}

export async function getTeamMembersWithRoles(teamId: string): Promise<TeamMemberWithRole[]> {
  const supabase = createServiceClient()

  const { data: teamMembers, error } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', teamId)

  if (error || !teamMembers) return []

  const userIds = teamMembers.map((m) => m.user_id)
  if (userIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  return teamMembers.map((m) => {
    const profile = profileMap.get(m.user_id)
    return {
      user_id: m.user_id,
      role: (m.role ?? 'member') as 'member' | 'reviewer',
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }
  })
}

export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: 'member' | 'reviewer',
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId)

  if (error) return { error: 'Failed to update reviewer role' }
  return { error: null }
}

export async function getReviewerTeamsForUser(
  userId: string,
  organizationId: string,
): Promise<string[]> {
  const supabase = createServiceClient()

  const [{ data: reviewerMemberships }, { data: orgTeams }] = await Promise.all([
    supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('role', 'reviewer'),
    supabase
      .from('teams')
      .select('id')
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
  ])

  const orgTeamSet = new Set((orgTeams ?? []).map((t) => t.id))
  return (reviewerMemberships ?? [])
    .map((m) => m.team_id)
    .filter((teamId) => orgTeamSet.has(teamId))
}
