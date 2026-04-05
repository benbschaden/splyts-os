import { createServiceClient } from '@/lib/supabase/service'

export type ContentIdeaRow = {
  id: string
  organization_id: string
  project_id: string
  title: string
  description: string | null
  platform: string | null
  author_user_id: string | null
  content_type_id: string | null
  status: 'idea' | 'in_progress' | 'done'
  created_by: string
  created_at: string
  updated_at: string
}

// author_user_id is added by a pending migration — select without it until then
const SELECT_COLUMNS =
  'id, organization_id, project_id, title, description, platform, content_type_id, status, created_by, created_at, updated_at'

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
  return (data ?? []).map((row) => ({ ...row, author_user_id: null })) as ContentIdeaRow[]
}

export async function createContentIdea(params: {
  organizationId: string
  projectId: string
  title: string
  description: string | null
  contentTypeId: string
  authorUserId: string | null
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
      // platform_owner is the pre-migration column; author_user_id replaces it after migration
      platform_owner: params.authorUserId ? 'author' : 'company',
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { idea: null, error: 'Failed to create content idea' }
  return { idea: data ? { ...data, author_user_id: null } as ContentIdeaRow : null, error: null }
}

export async function updateContentIdea(
  id: string,
  organizationId: string,
  params: Partial<Pick<ContentIdeaRow, 'title' | 'description' | 'content_type_id' | 'author_user_id' | 'status'>>,
): Promise<{ idea: ContentIdeaRow | null; error: string | null }> {
  const supabase = createServiceClient()

  // author_user_id is a post-migration column — strip it before updating
  const { author_user_id: _authorUserId, ...safeParams } = params

  const { data, error } = await supabase
    .from('content_ideas')
    .update({ ...safeParams, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { idea: null, error: 'Failed to update content idea' }
  return { idea: data ? { ...data, author_user_id: null } as ContentIdeaRow : null, error: null }
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
