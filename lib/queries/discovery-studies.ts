import { createUntypedServiceClient } from '@/lib/supabase/service'

// discovery_studies is not yet in the generated Database types.
// Switch to createServiceClient once the migration is applied and types regenerated.

export type DiscoveryStudyMethod = 'interview' | 'review' | 'survey' | 'observation' | 'email' | 'mixed'
export type DiscoveryStudyStatus = 'active' | 'complete' | 'archived'

export type DiscoveryStudyRow = {
  id: string
  organization_id: string
  project_id: string
  created_by: string
  name: string
  goal: string | null
  method: DiscoveryStudyMethod | null
  script_markdown: string | null
  analysis_markdown: string | null
  notes_markdown: string | null
  report_markdown: string | null
  chat_session_id: string | null
  status: DiscoveryStudyStatus
  sort_order: number
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, project_id, created_by, name, goal, method, script_markdown, analysis_markdown, notes_markdown, report_markdown, chat_session_id, status, sort_order, created_at, updated_at'

export async function getDiscoveryStudies(
  projectId: string,
  organizationId: string,
): Promise<DiscoveryStudyRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_studies')
    .select(SELECT_COLUMNS)
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as unknown as DiscoveryStudyRow[]
}

export type CreateDiscoveryStudyParams = {
  organizationId: string
  projectId: string
  userId: string
  name: string
  goal: string | null
  method: DiscoveryStudyMethod | null
}

export async function createDiscoveryStudy(
  params: CreateDiscoveryStudyParams,
): Promise<{ study: DiscoveryStudyRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_studies')
    .insert({
      organization_id: params.organizationId,
      project_id: params.projectId,
      created_by: params.userId,
      name: params.name,
      goal: params.goal,
      method: params.method,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { study: null, error: 'Failed to create study' }
  return { study: data as unknown as DiscoveryStudyRow, error: null }
}

export type UpdateDiscoveryStudyParams = {
  name?: string
  goal?: string | null
  method?: DiscoveryStudyMethod | null
  script_markdown?: string | null
  analysis_markdown?: string | null
  notes_markdown?: string | null
  report_markdown?: string | null
  chat_session_id?: string | null
  status?: DiscoveryStudyStatus
}

export async function updateDiscoveryStudy(
  id: string,
  organizationId: string,
  updates: UpdateDiscoveryStudyParams,
): Promise<{ study: DiscoveryStudyRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_studies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { study: null, error: 'Failed to update study' }
  return { study: data as unknown as DiscoveryStudyRow, error: null }
}

export async function deleteDiscoveryStudy(
  id: string,
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('discovery_studies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete study' }
  return { error: null }
}

export async function linkStudyChatSession(
  studyId: string,
  organizationId: string,
  sessionId: string,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('discovery_studies')
    .update({ chat_session_id: sessionId, updated_at: new Date().toISOString() })
    .eq('id', studyId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  if (error) return { error: 'Failed to link chat session' }
  return { error: null }
}

export async function saveStudyReport(
  studyId: string,
  organizationId: string,
  reportMarkdown: string,
): Promise<{ study: DiscoveryStudyRow | null; error: string | null }> {
  return updateDiscoveryStudy(studyId, organizationId, { report_markdown: reportMarkdown })
}
