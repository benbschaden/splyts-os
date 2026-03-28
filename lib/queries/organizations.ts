import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import { seedTeamsForOrg } from '@/lib/queries/teams'

// Wrapped with React cache() so multiple calls within a single render
// (e.g. dashboard layout + page) share one DB round-trip.
// Uses service client — trusted server-side lookup, not user-initiated.
// RLS on organization_members cannot be used here because this function
// is called to determine IF the user has an org (before RLS can help).
export const getOrganizationForUser = cache(async function getOrganizationForUser(userId: string) {
  const supabase = createServiceClient()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!membership) return null

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', membership.organization_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!org) return null

  return {
    id: org.id,
    name: org.name,
    role: membership.role,
  }
})

// Uses service role to bypass RLS — valid because this is a trusted first-time
// setup operation where the user has no org yet and cannot pass RLS checks.
export async function createOrganization(name: string, userId: string) {
  const supabase = createServiceClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name })
    .select('id, name')
    .single()

  if (orgError || !org) {
    return { organization: null, error: 'Failed to create organization' }
  }

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: userId,
      role: 'admin' as const,
    })

  if (memberError) {
    return { organization: null, error: 'Failed to assign admin role' }
  }

  // Seed default projects from org_project_seeds table.
  // Details live in the database — no project names hardcoded here.
  const { data: seeds } = await supabase
    .from('org_project_seeds')
    .select('name, description, category')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (seeds && seeds.length > 0) {
    await supabase.from('projects').insert(
      seeds.map((seed) => ({
        name: seed.name,
        description: seed.description,
        category: (seed as unknown as { category?: string | null }).category ?? null,
        organization_id: org.id,
        created_by: userId,
      })),
    )
  }

  // Seed default teams from org_team_seeds
  await seedTeamsForOrg(org.id, userId)

  return { organization: org, error: null }
}
