import { createServiceClient } from '@/lib/supabase/service'

export interface AuthorProfileData {
  name: string
  role: string | null
  voice: string | null
  tone: string | null
  writing_style: string | null
  personal_pillars: string | null
  platform_notes: string | null
}

export async function getAuthorProfiles(organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('author_profiles')
    .select('id, name, role, voice, tone, writing_style, personal_pillars, platform_notes, created_at, updated_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return []
  return data
}

export async function getAuthorProfileById(id: string, organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('author_profiles')
    .select('id, name, role, voice, tone, writing_style, personal_pillars, platform_notes')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return null
  return data
}

export async function createAuthorProfile(
  profile: AuthorProfileData,
  organizationId: string,
  userId: string,
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('author_profiles')
    .insert({
      ...profile,
      organization_id: organizationId,
      created_by: userId,
    })
    .select('id, name, role')
    .single()

  if (error) return { profile: null, error: 'Failed to create author profile' }
  return { profile: data, error: null }
}

export async function updateAuthorProfile(
  id: string,
  organizationId: string,
  updates: Partial<AuthorProfileData>,
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('author_profiles')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, name, role')
    .single()

  if (error) return { profile: null, error: 'Failed to update author profile' }
  return { profile: data, error: null }
}

export async function deleteAuthorProfile(id: string, organizationId: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('author_profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete author profile' }
  return { error: null }
}
