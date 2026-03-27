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
  content_types: { name: string } | null
  projects: { name: string } | null
  creator_full_name: string | null
}

async function attachCreatorNames<
  T extends { created_by: string },
>(rows: T[] | null): Promise<(T & { creator_full_name: string | null })[]> {
  if (!rows?.length) return []
  const ids = rows.map((r) => r.created_by)
  const names = await getUserDisplayNamesByIds(ids)
  return rows.map((r) => ({
    ...r,
    creator_full_name: names[r.created_by] ?? null,
  }))
}

export async function getAllOutputsForOrg(organizationId: string): Promise<OutputWithCreator[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .select(
      'id, brief, content, content_type_id, model_id, project_id, created_by, created_at, updated_at, content_types(name), projects(name)',
    )
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return []
  return attachCreatorNames(data ?? [])
}

export async function getOutputsForProject(
  projectId: string,
  organizationId: string,
): Promise<OutputWithCreator[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .select(
      'id, brief, content, content_type_id, model_id, project_id, created_by, created_at, updated_at, content_types(name), projects(name)',
    )
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return []
  return attachCreatorNames(data ?? [])
}

export async function createOutput(params: {
  organizationId: string
  projectId: string
  contentTypeId: string
  brief: string
  content: string
  userId: string
  modelId: string
}) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      organization_id: params.organizationId,
      project_id: params.projectId,
      content_type_id: params.contentTypeId,
      brief: params.brief,
      content: params.content,
      created_by: params.userId,
      model_id: params.modelId,
    })
    .select('id, brief, content, content_type_id, model_id, created_by, created_at, updated_at')
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
