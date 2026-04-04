import { createServiceClient } from '@/lib/supabase/service'

export type ContentIdeaRow = {
  id: string
  organization_id: string
  project_id: string
  title: string
  description: string | null
  platform: string | null
  platform_owner: 'author' | 'company'
  content_type_id: string | null
  status: 'idea' | 'in_progress' | 'done'
  created_by: string
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, project_id, title, description, platform, platform_owner, content_type_id, status, created_by, created_at, updated_at'

export async function getContentIdeasForProject(
  projectId: string,
  organizationId: string,
): Promise<ContentIdeaRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .select(SELECT_COLUMNS)
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as ContentIdeaRow[]
}

export async function createContentIdea(params: {
  organizationId: string
  projectId: string
  title: string
  description: string | null
  contentTypeId: string
  platformOwner: 'author' | 'company'
  userId: string
}): Promise<{ idea: ContentIdeaRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .insert({
      organization_id: params.organizationId,
      project_id: params.projectId,
      title: params.title,
      description: params.description,
      content_type_id: params.contentTypeId,
      platform_owner: params.platformOwner,
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { idea: null, error: 'Failed to create content idea' }
  return { idea: data as ContentIdeaRow, error: null }
}

export async function updateContentIdea(
  id: string,
  organizationId: string,
  params: Partial<Pick<ContentIdeaRow, 'title' | 'description' | 'content_type_id' | 'platform_owner' | 'status'>>,
): Promise<{ idea: ContentIdeaRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { idea: null, error: 'Failed to update content idea' }
  return { idea: data as ContentIdeaRow, error: null }
}

export async function deleteContentIdea(
  id: string,
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('content_ideas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete content idea' }
  return { error: null }
}
