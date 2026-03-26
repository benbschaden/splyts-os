import { createServiceClient } from '@/lib/supabase/service'

// Uses service client — trusted server-side lookup, not user-initiated.
// RLS on organization_members cannot be used here because this function
// is called to determine IF the user has an org (before RLS can help).
export async function getOrganizationForUser(userId: string) {
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
}

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

  return { organization: org, error: null }
}
