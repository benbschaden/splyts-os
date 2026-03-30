import { createServiceClient } from '@/lib/supabase/service'
import { getUserDisplayNamesByIds } from '@/lib/queries/user-profile'

export type OutputWithCreator = {
  id: string
  brief: string
  content: string
  content_type_id: string
  model_id: string
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
  published_at: string | null
  reach: number | null
  reach_metric: string | null
  engagement: number | null
  performance_notes: string | null
  metadata: Record<string, unknown> | null
  content_types: { name: string } | null
  projects: { name: string } | null
  creator_full_name: string | null
}

export type PublishedOutput = {
  id: string
  brief: string
  content: string
  content_type_id: string
  model_id: string
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
  published_at: string
  reach: number | null
  reach_metric: string | null
  engagement: number | null
  performance_notes: string | null
  views_1d: number | null
  views_7d: number | null
  views_30d: number | null
  website_visits: number | null
  email_signups: number | null
  performance_recorded_at: string | null
  content_types: { name: string } | null
  projects: { name: string } | null
  creator_full_name: string | null
}

/** Row from DB before creator join (`metadata` is not a column; we set null in attach) */
type OutputRow = Omit<OutputWithCreator, 'creator_full_name' | 'metadata'>

async function attachCreatorNames(rows: OutputRow[] | null): Promise<OutputWithCreator[]> {
  if (!rows?.length) return []
  const ids = rows.map((r) => r.created_by)
  const names = await getUserDisplayNamesByIds(ids)
  return rows.map((r) => ({
    ...r,
    metadata: null,
    creator_full_name: names[r.created_by] ?? null,
  }))
}

export async function getRecentOutputs(
  organizationId: string,
  limit = 8,
): Promise<{ id: string; brief: string; project_id: string; projects: { name: string } | null; created_at: string }[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('outputs')
    .select('id, brief, project_id, projects(name), created_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as { id: string; brief: string; project_id: string; projects: { name: string } | null; created_at: string }[]
}

export async function getAllOutputsForOrg(organizationId: string): Promise<OutputWithCreator[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .select(
      'id, brief, content, content_type_id, model_id, project_id, created_by, created_at, updated_at, published_at, reach, reach_metric, engagement, performance_notes, content_types(name), projects(name)',
    )
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return []
  return await attachCreatorNames((data ?? []) as unknown as OutputRow[])
}

export async function getPublishedOutputsForOrg(
  organizationId: string,
  limit = 100,
): Promise<PublishedOutput[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .select(
      'id, brief, content, content_type_id, model_id, project_id, created_by, created_at, updated_at, published_at, reach, reach_metric, engagement, performance_notes, views_1d, views_7d, views_30d, website_visits, email_signups, performance_recorded_at, content_types(name), projects(name)',
    )
    .eq('organization_id', organizationId)
    .not('published_at', 'is', null)
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) return []
  const rows = (data ?? []) as unknown as Array<Omit<PublishedOutput, 'creator_full_name'>>
  const ids = rows.map((r) => r.created_by)
  const names = await getUserDisplayNamesByIds(ids)
  return rows.map((r) => ({ ...r, creator_full_name: names[r.created_by] ?? null }))
}

export async function getOutputsForProject(
  projectId: string,
  organizationId: string,
): Promise<OutputWithCreator[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .select(
      'id, brief, content, content_type_id, model_id, project_id, created_by, created_at, updated_at, published_at, reach, reach_metric, engagement, performance_notes, content_types(name), projects(name)',
    )
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return []
  return await attachCreatorNames((data ?? []) as unknown as OutputRow[])
}

export async function createOutput(params: {
  organizationId: string
  projectId: string
  contentTypeId: string | null
  brief: string
  content: string
  summary?: string | null
  userId: string
  modelId: string
}) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      organization_id: params.organizationId,
      project_id: params.projectId,
      content_type_id: params.contentTypeId ?? null,
      brief: params.brief,
      content: params.content,
      summary: params.summary ?? null,
      created_by: params.userId,
      model_id: params.modelId,
    })
    .select('id, brief, content, summary, content_type_id, model_id, created_by, created_at, updated_at, published_at, reach, reach_metric, engagement, performance_notes')
    .single()

  if (error) return { output: null, error: 'Failed to save output' }

  const names = await getUserDisplayNamesByIds([data.created_by])
  const creator_full_name = names[data.created_by] ?? null

  return {
    output: { ...data, creator_full_name },
    error: null,
  }
}

export async function updateOutput(
  id: string,
  organizationId: string,
  content: string,
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, content, updated_at')
    .single()

  if (error) return { output: null, error: 'Failed to update output' }
  return { output: data, error: null }
}

export async function publishOutput(id: string, organizationId: string, userId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .update({ published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, published_at, updated_at')
    .single()

  if (error) return { output: null, error: 'Failed to mark as published' }
  return { output: data, error: null }
}

export async function updateOutputPerformance(
  id: string,
  organizationId: string,
  params: {
    reach: number | null
    reach_metric: string | null
    engagement: number | null
    performance_notes: string | null
    views_1d?: number | null
    views_7d?: number | null
    views_30d?: number | null
    website_visits?: number | null
    email_signups?: number | null
    performance_recorded_at?: string | null
  },
) {
  const supabase = createServiceClient()

  const updatePayload: Record<string, unknown> = {
    ...params,
    updated_at: new Date().toISOString(),
  }

  // Auto-set performance_recorded_at when any time-windowed metric is provided
  if (
    params.performance_recorded_at === undefined &&
    (params.views_1d != null || params.views_7d != null || params.views_30d != null ||
      params.website_visits != null || params.email_signups != null)
  ) {
    updatePayload.performance_recorded_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('outputs')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(
      'id, reach, reach_metric, engagement, performance_notes, views_1d, views_7d, views_30d, website_visits, email_signups, performance_recorded_at, updated_at',
    )
    .single()

  if (error) return { output: null, error: 'Failed to update performance stats' }
  return { output: data, error: null }
}

export async function getTopPerformingOutputs(
  organizationId: string,
  limit = 3,
): Promise<{
  id: string
  brief: string
  content: string
  reach: number | null
  reach_metric: string | null
  views_30d: number | null
  website_visits: number | null
  email_signups: number | null
}[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .select('id, brief, content, reach, reach_metric, views_30d, website_visits, email_signups')
    .eq('organization_id', organizationId)
    .not('published_at', 'is', null)
    .is('deleted_at', null)
    .order('views_30d', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as {
    id: string
    brief: string
    content: string
    reach: number | null
    reach_metric: string | null
    views_30d: number | null
    website_visits: number | null
    email_signups: number | null
  }[]
}

export async function deleteOutput(id: string, organizationId: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('outputs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete output' }
  return { error: null }
}
