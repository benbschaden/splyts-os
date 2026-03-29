import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/service'

export type DiscoveryEntryType = 'interview' | 'review' | 'survey' | 'observation' | 'email'
export type DiscoverySentiment = 'positive' | 'neutral' | 'negative' | 'mixed'
export type DiscoveryUserSegment = 'new' | 'active' | 'power' | 'churned' | 'free' | 'paid'
export type DiscoveryPlatform = 'app_store' | 'product_hunt' | 'g2' | 'reddit' | 'twitter' | 'other'

export type DiscoveryEntryRow = {
  id: string
  organization_id: string
  project_id: string
  created_by: string
  entry_type: DiscoveryEntryType
  source: string | null
  entry_date: string | null
  raw_content: string
  sentiment: DiscoverySentiment | null
  tags: string[]
  include_in_ai: boolean
  user_segment: DiscoveryUserSegment | null
  key_quote_1: string | null
  key_quote_2: string | null
  key_quote_3: string | null
  jtbd: string | null
  star_rating: number | null
  platform: DiscoveryPlatform | null
  source_material_id: string | null
  study_id: string | null
  participant: string | null
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, project_id, created_by, entry_type, source, entry_date, raw_content, sentiment, tags, include_in_ai, user_segment, key_quote_1, key_quote_2, key_quote_3, jtbd, star_rating, platform, source_material_id, study_id, participant, created_at, updated_at'

export async function getDiscoveryEntries(
  projectId: string,
  organizationId: string,
): Promise<DiscoveryEntryRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discovery_entries')
    .select(SELECT_COLUMNS)
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('entry_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as unknown as DiscoveryEntryRow[]
}

export async function getAiVisibleDiscoveryEntries(
  projectId: string,
  organizationId: string,
): Promise<DiscoveryEntryRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discovery_entries')
    .select(SELECT_COLUMNS)
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .eq('include_in_ai', true)
    .is('deleted_at', null)
    .order('entry_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as unknown as DiscoveryEntryRow[]
}

export async function getParticipantDiscoveryEntries(
  projectId: string,
  organizationId: string,
  participant: string,
): Promise<DiscoveryEntryRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_entries')
    .select(SELECT_COLUMNS)
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .eq('participant', participant)
    .is('deleted_at', null)
    .order('entry_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as unknown as DiscoveryEntryRow[]
}

export type CreateDiscoveryEntryParams = {
  organizationId: string
  projectId: string
  userId: string
  entry_type: DiscoveryEntryType
  source: string | null
  entry_date: string | null
  raw_content: string
  sentiment: DiscoverySentiment | null
  tags: string[]
  include_in_ai: boolean
  user_segment: DiscoveryUserSegment | null
  key_quote_1: string | null
  key_quote_2: string | null
  key_quote_3: string | null
  jtbd: string | null
  star_rating: number | null
  platform: DiscoveryPlatform | null
  source_material_id: string | null
  study_id: string | null
  participant: string | null
}

export async function createDiscoveryEntry(
  params: CreateDiscoveryEntryParams,
): Promise<{ entry: DiscoveryEntryRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discovery_entries')
    .insert({
      organization_id: params.organizationId,
      project_id: params.projectId,
      created_by: params.userId,
      entry_type: params.entry_type,
      source: params.source,
      entry_date: params.entry_date,
      raw_content: params.raw_content,
      sentiment: params.sentiment,
      tags: params.tags,
      include_in_ai: params.include_in_ai,
      user_segment: params.user_segment,
      key_quote_1: params.key_quote_1,
      key_quote_2: params.key_quote_2,
      key_quote_3: params.key_quote_3,
      jtbd: params.jtbd,
      star_rating: params.star_rating,
      platform: params.platform,
      source_material_id: params.source_material_id,
      study_id: params.study_id,
      participant: params.participant,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { entry: null, error: 'Failed to create discovery entry' }
  return { entry: data as unknown as DiscoveryEntryRow, error: null }
}

export type UpdateDiscoveryEntryParams = {
  entry_type?: DiscoveryEntryType
  source?: string | null
  entry_date?: string | null
  raw_content?: string
  sentiment?: DiscoverySentiment | null
  tags?: string[]
  include_in_ai?: boolean
  user_segment?: DiscoveryUserSegment | null
  key_quote_1?: string | null
  key_quote_2?: string | null
  key_quote_3?: string | null
  jtbd?: string | null
  star_rating?: number | null
  platform?: DiscoveryPlatform | null
  source_material_id?: string | null
  study_id?: string | null
  participant?: string | null
}

export async function updateDiscoveryEntry(
  id: string,
  organizationId: string,
  updates: UpdateDiscoveryEntryParams,
): Promise<{ entry: DiscoveryEntryRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discovery_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { entry: null, error: 'Failed to update discovery entry' }
  return { entry: data as unknown as DiscoveryEntryRow, error: null }
}

export async function deleteDiscoveryEntry(
  id: string,
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('discovery_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete discovery entry' }
  return { error: null }
}
