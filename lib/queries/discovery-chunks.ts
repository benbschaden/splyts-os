import { createUntypedServiceClient } from '@/lib/supabase/service'

/**
 * `discovery_entry_chunks` is not yet in the generated Database types.
 * Switch to createServiceClient once the migration in
 * `supabase/migrations/20260428_discovery_chunks_pipeline.sql` is applied
 * and types are regenerated.
 */

export type DiscoveryChunkStatus = 'pending' | 'succeeded' | 'failed'

export interface DiscoveryChunkRow {
  id: string
  entry_id: string
  organization_id: string
  chunk_index: number
  start_offset: number
  end_offset: number
  text: string
  findings_json: unknown | null
  verification_stats: VerificationStats | null
  status: DiscoveryChunkStatus
  error: string | null
  model_id: string | null
  prompt_version: string | null
  created_at: string
  updated_at: string
}

export interface VerificationStats {
  themes_total: number
  themes_dropped: number
  pains_total: number
  pains_dropped: number
  jtbd_total: number
  jtbd_dropped: number
  wtp_total: number
  wtp_dropped: number
  objections_total: number
  objections_dropped: number
  decisions_total: number
  decisions_dropped: number
  total_quotes_returned: number
  total_quotes_dropped: number
}

const SELECT_COLUMNS =
  'id, entry_id, organization_id, chunk_index, start_offset, end_offset, text, findings_json, verification_stats, status, error, model_id, prompt_version, created_at, updated_at'

export async function getChunksForEntry(
  entryId: string,
  organizationId: string,
): Promise<DiscoveryChunkRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_entry_chunks')
    .select(SELECT_COLUMNS)
    .eq('entry_id', entryId)
    .eq('organization_id', organizationId)
    .order('chunk_index', { ascending: true })

  if (error) return []
  return (data ?? []) as unknown as DiscoveryChunkRow[]
}

export async function deleteChunksForEntry(
  entryId: string,
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('discovery_entry_chunks')
    .delete()
    .eq('entry_id', entryId)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete chunks' }
  return { error: null }
}

export interface InsertPendingChunkParams {
  entry_id: string
  organization_id: string
  chunk_index: number
  start_offset: number
  end_offset: number
  text: string
}

export async function insertPendingChunks(
  rows: InsertPendingChunkParams[],
): Promise<{ rows: DiscoveryChunkRow[]; error: string | null }> {
  if (rows.length === 0) return { rows: [], error: null }
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_entry_chunks')
    .insert(rows.map((r) => ({ ...r, status: 'pending' })))
    .select(SELECT_COLUMNS)

  if (error) return { rows: [], error: 'Failed to insert chunks' }
  return { rows: (data ?? []) as unknown as DiscoveryChunkRow[], error: null }
}

export interface UpdateChunkResultParams {
  findings_json: unknown
  verification_stats: VerificationStats
  status: 'succeeded' | 'failed'
  error: string | null
  model_id: string
  prompt_version: string
}

export async function updateChunkResult(
  chunkId: string,
  organizationId: string,
  updates: UpdateChunkResultParams,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('discovery_entry_chunks')
    .update({
      findings_json: updates.findings_json,
      verification_stats: updates.verification_stats,
      status: updates.status,
      error: updates.error,
      model_id: updates.model_id,
      prompt_version: updates.prompt_version,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chunkId)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to update chunk result' }
  return { error: null }
}
