import { createServiceClient } from '@/lib/supabase/service'

export type CompetitorRow = {
  id: string
  organization_id: string
  name: string
  website: string | null
  positioning: string | null
  strengths: string | null
  weaknesses: string | null
  pricing_notes: string | null
  battle_card: string | null
  include_in_ai: boolean
  sort_order: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, name, website, positioning, strengths, weaknesses, pricing_notes, battle_card, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at'

export async function getCompetitors(organizationId: string): Promise<CompetitorRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('competitors')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return []
  return (data ?? []) as CompetitorRow[]
}

export async function getAiVisibleCompetitors(organizationId: string): Promise<CompetitorRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('competitors')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('include_in_ai', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return []
  return (data ?? []) as CompetitorRow[]
}

export async function createCompetitor(params: {
  organizationId: string
  name: string
  website: string | null
  positioning: string | null
  strengths: string | null
  weaknesses: string | null
  pricing_notes: string | null
  battle_card: string | null
  includeInAi: boolean
  userId: string
}): Promise<{ competitor: CompetitorRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('competitors')
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      website: params.website,
      positioning: params.positioning,
      strengths: params.strengths,
      weaknesses: params.weaknesses,
      pricing_notes: params.pricing_notes,
      battle_card: params.battle_card,
      include_in_ai: params.includeInAi,
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { competitor: null, error: 'Failed to create competitor' }
  return { competitor: data as CompetitorRow, error: null }
}

export async function updateCompetitor(
  id: string,
  organizationId: string,
  updates: {
    name?: string
    website?: string | null
    positioning?: string | null
    strengths?: string | null
    weaknesses?: string | null
    pricing_notes?: string | null
    battle_card?: string | null
    include_in_ai?: boolean
  },
  userId: string,
): Promise<{ competitor: CompetitorRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('competitors')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { competitor: null, error: 'Failed to update competitor' }
  return { competitor: data as CompetitorRow, error: null }
}

export async function deleteCompetitor(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('competitors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete competitor' }
  return { error: null }
}
