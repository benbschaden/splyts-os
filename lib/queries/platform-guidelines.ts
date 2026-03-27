import { createServiceClient } from '@/lib/supabase/service'

export type PlatformGuideline = {
  id: string
  organization_id: string
  platform_name: string
  guidelines: string
  format_notes: string | null
  cadence: string | null
  include_in_ai: boolean
  sort_order: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export async function getPlatformGuidelines(organizationId: string): Promise<PlatformGuideline[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('platform_guidelines')
    .select('id, organization_id, platform_name, guidelines, format_notes, cadence, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('platform_name', { ascending: true })

  if (error) return []
  return (data ?? []) as PlatformGuideline[]
}

export async function getPlatformGuidelineByName(
  organizationId: string,
  platformName: string,
): Promise<PlatformGuideline | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('platform_guidelines')
    .select('id, organization_id, platform_name, guidelines, format_notes, cadence, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('include_in_ai', true)
    .ilike('platform_name', platformName)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return null
  return data as PlatformGuideline | null
}

export async function createPlatformGuideline(params: {
  organizationId: string
  platformName: string
  guidelines: string
  formatNotes: string | null
  cadence: string | null
  includeInAi: boolean
  userId: string
}): Promise<{ guideline: PlatformGuideline | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('platform_guidelines')
    .insert({
      organization_id: params.organizationId,
      platform_name: params.platformName,
      guidelines: params.guidelines,
      format_notes: params.formatNotes,
      cadence: params.cadence,
      include_in_ai: params.includeInAi,
      created_by: params.userId,
    })
    .select('id, organization_id, platform_name, guidelines, format_notes, cadence, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { guideline: null, error: 'Failed to create platform guideline' }
  return { guideline: data as PlatformGuideline, error: null }
}

export async function updatePlatformGuideline(
  id: string,
  organizationId: string,
  updates: {
    platform_name?: string
    guidelines?: string
    format_notes?: string | null
    cadence?: string | null
    include_in_ai?: boolean
  },
  userId: string,
): Promise<{ guideline: PlatformGuideline | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('platform_guidelines')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, organization_id, platform_name, guidelines, format_notes, cadence, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { guideline: null, error: 'Failed to update platform guideline' }
  return { guideline: data as PlatformGuideline, error: null }
}

export async function deletePlatformGuideline(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('platform_guidelines')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete platform guideline' }
  return { error: null }
}
