import { createServiceClient } from '@/lib/supabase/service'

export type BrandNarrativeRow = {
  id: string
  organization_id: string
  title: string
  narrative: string
  usage_context: string | null
  include_in_ai: boolean
  sort_order: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, title, narrative, usage_context, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at'

export async function getBrandNarratives(organizationId: string): Promise<BrandNarrativeRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_narratives')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) return []
  return (data ?? []) as BrandNarrativeRow[]
}

export async function getAiVisibleNarratives(organizationId: string): Promise<BrandNarrativeRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_narratives')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('include_in_ai', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) return []
  return (data ?? []) as BrandNarrativeRow[]
}

export async function createBrandNarrative(params: {
  organizationId: string
  title: string
  narrative: string
  usageContext: string | null
  includeInAi: boolean
  userId: string
}): Promise<{ narrative: BrandNarrativeRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_narratives')
    .insert({
      organization_id: params.organizationId,
      title: params.title,
      narrative: params.narrative,
      usage_context: params.usageContext,
      include_in_ai: params.includeInAi,
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { narrative: null, error: 'Failed to create brand narrative' }
  return { narrative: data as BrandNarrativeRow, error: null }
}

export async function updateBrandNarrative(
  id: string,
  organizationId: string,
  updates: {
    title?: string
    narrative?: string
    usage_context?: string | null
    include_in_ai?: boolean
  },
  userId: string,
): Promise<{ narrative: BrandNarrativeRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_narratives')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { narrative: null, error: 'Failed to update brand narrative' }
  return { narrative: data as BrandNarrativeRow, error: null }
}

export async function deleteBrandNarrative(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('brand_narratives')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete brand narrative' }
  return { error: null }
}
