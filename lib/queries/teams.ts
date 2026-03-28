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

  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id, role, user_profiles(full_name, avatar_url)')
    .eq('organization_id', organizationId)

  if (error || !data) return []

  return data.map((row) => {
    const profile = Array.isArray(row.user_profiles)
      ? row.user_profiles[0]
      : row.user_profiles
    return {
      user_id: row.user_id,
      role: row.role,
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
