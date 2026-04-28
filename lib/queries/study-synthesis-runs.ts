import { createUntypedServiceClient } from '@/lib/supabase/service'

/**
 * `discovery_study_synthesis_runs` is not yet in the generated Database
 * types. Switch to createServiceClient once the migration in
 * `supabase/migrations/20260428_discovery_chunks_pipeline.sql` is applied
 * and types are regenerated.
 */

export type SynthesisRunStatus = 'running' | 'succeeded' | 'failed'

export interface StudySynthesisRunRow {
  id: string
  study_id: string
  organization_id: string
  created_by: string | null
  model_id: string | null
  prompt_version: string | null
  entries_included: number
  chunks_consulted: number
  quotes_dropped: number
  status: SynthesisRunStatus
  analysis_markdown: string | null
  error: string | null
  started_at: string
  completed_at: string | null
}

const SELECT_COLUMNS =
  'id, study_id, organization_id, created_by, model_id, prompt_version, entries_included, chunks_consulted, quotes_dropped, status, analysis_markdown, error, started_at, completed_at'

export interface CreateSynthesisRunParams {
  study_id: string
  organization_id: string
  created_by: string | null
  model_id: string
  prompt_version: string
}

export async function createSynthesisRun(
  params: CreateSynthesisRunParams,
): Promise<{ run: StudySynthesisRunRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_study_synthesis_runs')
    .insert({
      study_id: params.study_id,
      organization_id: params.organization_id,
      created_by: params.created_by,
      model_id: params.model_id,
      prompt_version: params.prompt_version,
      status: 'running',
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { run: null, error: 'Failed to create synthesis run' }
  return { run: data as unknown as StudySynthesisRunRow, error: null }
}

export interface FinaliseSynthesisRunParams {
  status: 'succeeded' | 'failed'
  entries_included: number
  chunks_consulted: number
  quotes_dropped: number
  analysis_markdown: string | null
  error: string | null
}

export async function finaliseSynthesisRun(
  runId: string,
  organizationId: string,
  updates: FinaliseSynthesisRunParams,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('discovery_study_synthesis_runs')
    .update({
      status: updates.status,
      entries_included: updates.entries_included,
      chunks_consulted: updates.chunks_consulted,
      quotes_dropped: updates.quotes_dropped,
      analysis_markdown: updates.analysis_markdown,
      error: updates.error,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to finalise synthesis run' }
  return { error: null }
}

export async function getLatestSynthesisRun(
  studyId: string,
  organizationId: string,
): Promise<StudySynthesisRunRow | null> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_study_synthesis_runs')
    .select(SELECT_COLUMNS)
    .eq('study_id', studyId)
    .eq('organization_id', organizationId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as StudySynthesisRunRow
}
