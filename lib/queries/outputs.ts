import { createServiceClient } from '@/lib/supabase/service'

export async function getOutputsForProject(projectId: string, organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .select('id, brief, content, content_type_id, created_at, updated_at, content_types(name)')
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function createOutput(params: {
  organizationId: string
  projectId: string
  contentTypeId: string
  brief: string
  content: string
  userId: string
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
    })
    .select('id, brief, content, content_type_id, created_at, updated_at')
    .single()

  if (error) return { output: null, error: 'Failed to save output' }
  return { output: data, error: null }
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
