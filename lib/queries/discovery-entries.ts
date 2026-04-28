import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/service'

export type DiscoveryEntryType = 'interview' | 'review' | 'survey' | 'observation' | 'email'
export type DiscoverySentiment = 'positive' | 'neutral' | 'negative' | 'mixed'
export type DiscoveryUserSegment = 'new' | 'active' | 'power' | 'churned' | 'free' | 'paid' | 'prospect'
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
  // Audio + transcription
  audio_url: string | null
  diarized_transcript: unknown | null
  // Conversation metrics (from Deepgram diarized output)
  interviewer_talk_pct: number | null
  interviewee_talk_pct: number | null
  interviewer_wpm: number | null
  interviewee_wpm: number | null
  interviewer_turns: number | null
  interviewee_turns: number | null
  total_interruptions: number | null
  ijl_median_s: number | null
  ijl_mean_s: number | null
  isr_pct: number | null
  spr_pct: number | null
  // Content signals (Claude extracted)
  wtp_signal: 'strong' | 'moderate' | 'weak' | 'none' | null
  wtp_price_points: number[] | null
  problem_severity: number | null
  adoption_willingness: number | null
  // Free-form researcher notes on this entry (relationship, context, known biases, etc.)
  context_notes: string | null
  // Saved AI discussion transcript
  discussion_notes: string | null
  // Persona match (Claude-powered)
  persona_id: string | null
  persona_match_name: string | null
  persona_match_score: number | null
  persona_match_reasoning: string | null
  persona_matched_at: string | null
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, project_id, created_by, entry_type, source, entry_date, raw_content, sentiment, tags, include_in_ai, user_segment, key_quote_1, key_quote_2, key_quote_3, jtbd, star_rating, platform, source_material_id, study_id, participant, audio_url, diarized_transcript, interviewer_talk_pct, interviewee_talk_pct, interviewer_wpm, interviewee_wpm, interviewer_turns, interviewee_turns, total_interruptions, ijl_median_s, ijl_mean_s, isr_pct, spr_pct, wtp_signal, wtp_price_points, problem_severity, adoption_willingness, context_notes, discussion_notes, persona_id, persona_match_name, persona_match_score, persona_match_reasoning, persona_matched_at, created_at, updated_at'

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

export async function getAllOrgDiscoveryEntries(
  organizationId: string,
): Promise<DiscoveryEntryRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discovery_entries')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('entry_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return []
  return (data ?? []) as unknown as DiscoveryEntryRow[]
}

export async function getDiscoveryEntryById(
  id: string,
  organizationId: string,
): Promise<DiscoveryEntryRow | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discovery_entries')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null
  return data as unknown as DiscoveryEntryRow
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
  audio_url?: string | null
  diarized_transcript?: unknown | null
  interviewer_talk_pct?: number | null
  interviewee_talk_pct?: number | null
  interviewer_wpm?: number | null
  interviewee_wpm?: number | null
  interviewer_turns?: number | null
  interviewee_turns?: number | null
  total_interruptions?: number | null
  ijl_median_s?: number | null
  ijl_mean_s?: number | null
  isr_pct?: number | null
  spr_pct?: number | null
  wtp_signal?: 'strong' | 'moderate' | 'weak' | 'none' | null
  wtp_price_points?: number[] | null
  problem_severity?: number | null
  adoption_willingness?: number | null
  discussion_notes?: string | null
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
      audio_url: params.audio_url ?? null,
      diarized_transcript: params.diarized_transcript ?? null,
      interviewer_talk_pct: params.interviewer_talk_pct ?? null,
      interviewee_talk_pct: params.interviewee_talk_pct ?? null,
      interviewer_wpm: params.interviewer_wpm ?? null,
      interviewee_wpm: params.interviewee_wpm ?? null,
      interviewer_turns: params.interviewer_turns ?? null,
      interviewee_turns: params.interviewee_turns ?? null,
      total_interruptions: params.total_interruptions ?? null,
      ijl_median_s: params.ijl_median_s ?? null,
      ijl_mean_s: params.ijl_mean_s ?? null,
      isr_pct: params.isr_pct ?? null,
      spr_pct: params.spr_pct ?? null,
      wtp_signal: params.wtp_signal ?? null,
      wtp_price_points: params.wtp_price_points ?? null,
      problem_severity: params.problem_severity ?? null,
      adoption_willingness: params.adoption_willingness ?? null,
      discussion_notes: params.discussion_notes ?? null,
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
  audio_url?: string | null
  diarized_transcript?: unknown | null
  interviewer_talk_pct?: number | null
  interviewee_talk_pct?: number | null
  interviewer_wpm?: number | null
  interviewee_wpm?: number | null
  interviewer_turns?: number | null
  interviewee_turns?: number | null
  total_interruptions?: number | null
  ijl_median_s?: number | null
  ijl_mean_s?: number | null
  isr_pct?: number | null
  spr_pct?: number | null
  wtp_signal?: 'strong' | 'moderate' | 'weak' | 'none' | null
  wtp_price_points?: number[] | null
  problem_severity?: number | null
  adoption_willingness?: number | null
  discussion_notes?: string | null
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

/**
 * Writes the verified digest produced by the chunked analysis pipeline back
 * onto the `discovery_entries` row. Uses the untyped service client because
 * `analysis_json`, `analysis_markdown`, and `raw_content_hash` are added by
 * `supabase/migrations/20260428_discovery_chunks_pipeline.sql` and are not
 * in the generated Database types until the user regenerates them.
 *
 * Switch to the typed client once types are regenerated.
 */
export interface PipelineEntryAnalysisFields {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' | null
  tags: string[]
  key_quote_1: string | null
  key_quote_2: string | null
  key_quote_3: string | null
  jtbd: string | null
  wtp_signal: 'strong' | 'moderate' | 'weak' | 'none' | null
  wtp_price_points: number[]
  problem_severity: number | null
  adoption_willingness: number | null
  analysis_json: unknown
  analysis_markdown: string
  raw_content_hash: string
}

export async function updateEntryFromPipeline(
  id: string,
  organizationId: string,
  fields: PipelineEntryAnalysisFields,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('discovery_entries')
    .update({
      sentiment: fields.sentiment,
      tags: fields.tags,
      key_quote_1: fields.key_quote_1,
      key_quote_2: fields.key_quote_2,
      key_quote_3: fields.key_quote_3,
      jtbd: fields.jtbd,
      wtp_signal: fields.wtp_signal,
      wtp_price_points: fields.wtp_price_points,
      problem_severity: fields.problem_severity,
      adoption_willingness: fields.adoption_willingness,
      analysis_json: fields.analysis_json,
      analysis_markdown: fields.analysis_markdown,
      raw_content_hash: fields.raw_content_hash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  if (error) return { error: 'Failed to write pipeline analysis to entry' }
  return { error: null }
}

/**
 * Reads the pipeline-written columns (`analysis_markdown`, `analysis_json`,
 * `raw_content_hash`) for one entry. Untyped client until type regen.
 */
export interface EntryAnalysisExtras {
  analysis_markdown: string | null
  analysis_json: unknown | null
  raw_content_hash: string | null
}

export async function getEntryAnalysisExtras(
  id: string,
  organizationId: string,
): Promise<EntryAnalysisExtras | null> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_entries')
    .select('analysis_markdown, analysis_json, raw_content_hash')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as EntryAnalysisExtras
}
