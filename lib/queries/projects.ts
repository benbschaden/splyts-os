import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/service'

const CATEGORY_ORDER = [
  'Growth',
  'Product',
  'Engineering',
  'Design',
  'Customer Success',
  'Data & Analytics',
  'Marketing',
  'Operations',
  'Finance',
  'People',
]

export async function getProjectCategories(organizationId: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('projects')
    .select('category')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .not('category', 'is', null)

  if (!data) return []
  const unique = Array.from(new Set(data.map((r) => r.category as string)))
  return unique.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
}

/**
 * Returns projects the given user can see, based on visibility rules:
 * - organization: all org members
 * - private: only the creator
 * - team: creator + members of granted teams
 * - specific_users: creator + explicitly granted users
 */
export const getProjectsForOrg = cache(async function getProjectsForOrg(
  organizationId: string,
  userId: string,
) {
  const supabase = createServiceClient()

  const { data: allProjects, error } = await supabase
    .from('projects')
    .select(
      'id, name, description, category, visibility, status, tags, created_at, updated_at, created_by, project_type, start_date, estimated_end_date',
    )
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error || !allProjects) return []

  // Fast path: if all projects are org-wide, return immediately
  const needsTeamCheck = allProjects.some((p) => p.visibility === 'team')
  const needsUserCheck = allProjects.some((p) => p.visibility === 'specific_users')

  let userTeamIds: string[] = []
  if (needsTeamCheck) {
    const { data: teamRows } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
    userTeamIds = teamRows?.map((r) => r.team_id) ?? []
  }

  let accessibleTeamProjectIds = new Set<string>()
  if (needsTeamCheck && userTeamIds.length > 0) {
    const teamProjectIds = allProjects
      .filter((p) => p.visibility === 'team')
      .map((p) => p.id)
    const { data: ptRows } = await supabase
      .from('project_teams')
      .select('project_id')
      .in('project_id', teamProjectIds)
      .in('team_id', userTeamIds)
    accessibleTeamProjectIds = new Set(ptRows?.map((r) => r.project_id) ?? [])
  }

  let accessibleSpecificProjectIds = new Set<string>()
  if (needsUserCheck) {
    const specificProjectIds = allProjects
      .filter((p) => p.visibility === 'specific_users')
      .map((p) => p.id)
    if (specificProjectIds.length > 0) {
      const { data: pmRows } = await supabase
        .from('project_members')
        .select('project_id')
        .in('project_id', specificProjectIds)
        .eq('user_id', userId)
      accessibleSpecificProjectIds = new Set(pmRows?.map((r) => r.project_id) ?? [])
    }
  }

  return allProjects.filter((p) => {
    if (p.visibility === 'organization') return true
    if (p.visibility === 'private') return p.created_by === userId
    if (p.visibility === 'team') {
      return p.created_by === userId || accessibleTeamProjectIds.has(p.id)
    }
    if (p.visibility === 'specific_users') {
      return p.created_by === userId || accessibleSpecificProjectIds.has(p.id)
    }
    return false
  })
})

/**
 * Returns a single project by ID, applying visibility rules for the given user.
 * Pass userId to enforce visibility. When omitted, visibility is not checked
 * (use only in admin/service contexts that have already verified access).
 */
export async function getToolsForOrg(
  organizationId: string,
): Promise<Array<{ id: string; name: string }>> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('project_type', 'tool')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error || !data) return []
  return data
}

export async function getProjectById(
  projectId: string,
  organizationId: string,
  userId?: string,
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, name, description, created_at, updated_at, created_by, visibility, status, tags, project_type, start_date, estimated_end_date',
    )
    .eq('id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  // No user context provided — caller is responsible for access control
  if (!userId) return data

  const visibility = data.visibility as string

  if (visibility === 'organization') return data
  if (visibility === 'private') return data.created_by === userId ? data : null

  // Creator always has access regardless of visibility level
  if (data.created_by === userId) return data

  if (visibility === 'team') {
    const { data: userTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
    const userTeamIds = userTeams?.map((t) => t.team_id) ?? []
    if (userTeamIds.length === 0) return null

    const { data: access } = await supabase
      .from('project_teams')
      .select('project_id')
      .eq('project_id', projectId)
      .in('team_id', userTeamIds)
      .limit(1)
      .maybeSingle()
    return access ? data : null
  }

  if (visibility === 'specific_users') {
    const { data: access } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle()
    return access ? data : null
  }

  return null
}

export async function getProjectTeams(
  projectId: string,
): Promise<Array<{ id: string; name: string }>> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('project_teams')
    .select('teams(id, name)')
    .eq('project_id', projectId)

  if (error || !data) return []

  return data
    .map((row) => {
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams
      if (!team) return null
      return { id: team.id, name: team.name }
    })
    .filter((t): t is { id: string; name: string } => t !== null)
}

export async function getProjectMembers(
  projectId: string,
): Promise<Array<{ user_id: string; full_name: string | null }>> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('project_members')
    .select('user_id, user_profiles(full_name)')
    .eq('project_id', projectId)

  if (error || !data) return []

  return data.map((row) => {
    const profile = Array.isArray(row.user_profiles)
      ? row.user_profiles[0]
      : row.user_profiles
    return {
      user_id: row.user_id,
      full_name: profile?.full_name ?? null,
    }
  })
}

export type ProjectVisibility = 'private' | 'organization' | 'team' | 'specific_users'

export async function createProject(
  name: string,
  description: string | null,
  organizationId: string,
  userId: string,
  category?: string | null,
  visibility: ProjectVisibility = 'organization',
  tags: string[] = [],
  teamIds: string[] = [],
  memberIds: string[] = [],
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      description,
      organization_id: organizationId,
      created_by: userId,
      category: category ?? null,
      visibility,
      tags: tags.length > 0 ? tags : [],
    })
    .select('id, name, description, category, visibility, status, tags, created_at, updated_at')
    .single()

  if (error || !data) return { project: null, error: 'Failed to create project' }

  // Set team or user access lists
  if (visibility === 'team' && teamIds.length > 0) {
    await supabase.from('project_teams').insert(
      teamIds.map((teamId) => ({ project_id: data.id, team_id: teamId })),
    )
  } else if (visibility === 'specific_users' && memberIds.length > 0) {
    await supabase.from('project_members').insert(
      memberIds.map((uid) => ({
        project_id: data.id,
        user_id: uid,
        granted_by: userId,
      })),
    )
  }

  return { project: data, error: null }
}

export async function updateProject(
  projectId: string,
  organizationId: string,
  updates: {
    name?: string
    description?: string | null
    category?: string | null
    status?: 'active' | 'archived'
    visibility?: ProjectVisibility
    teamIds?: string[]
    memberIds?: string[]
    grantedBy?: string
  },
) {
  const supabase = createServiceClient()

  const { teamIds, memberIds, grantedBy, ...projectUpdates } = updates

  const { data, error } = await supabase
    .from('projects')
    .update(projectUpdates)
    .eq('id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, name, description, category, visibility, status, updated_at')
    .single()

  if (error || !data) return { project: null, error: 'Failed to update project' }

  // If visibility is being set to 'team', replace the team list
  if (updates.visibility === 'team') {
    await supabase.from('project_teams').delete().eq('project_id', projectId)
    if (teamIds && teamIds.length > 0) {
      await supabase.from('project_teams').insert(
        teamIds.map((teamId) => ({ project_id: projectId, team_id: teamId })),
      )
    }
    // Clear any leftover project_members from a previous visibility mode
    await supabase.from('project_members').delete().eq('project_id', projectId)
  }

  // If visibility is being set to 'specific_users', replace the member list
  if (updates.visibility === 'specific_users') {
    await supabase.from('project_members').delete().eq('project_id', projectId)
    if (memberIds && memberIds.length > 0) {
      await supabase.from('project_members').insert(
        memberIds.map((uid) => ({
          project_id: projectId,
          user_id: uid,
          granted_by: grantedBy ?? uid,
        })),
      )
    }
    // Clear any leftover project_teams from a previous visibility mode
    await supabase.from('project_teams').delete().eq('project_id', projectId)
  }

  // If switching to 'private' or 'organization', clean up access lists
  if (updates.visibility === 'private' || updates.visibility === 'organization') {
    await Promise.all([
      supabase.from('project_teams').delete().eq('project_id', projectId),
      supabase.from('project_members').delete().eq('project_id', projectId),
    ])
  }

  return { project: data, error: null }
}

export async function deleteProject(projectId: string, organizationId: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete project' }
  return { error: null }
}
