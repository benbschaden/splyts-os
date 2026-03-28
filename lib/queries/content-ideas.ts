import { createServiceClient } from '@/lib/supabase/service'

export type ContentIdeaRow = {
  id: string
  organization_id: string
  project_id: string
  title: string
  description: string | null
  platform: string
  platform_owner: 'author' | 'company'
  status: 'idea' | 'in_progress' | 'done'
  created_by: string
  created_at: string
  updated_at: string
}

export async function getContentIdeasForProject(
  projectId: string,
  organizationId: string,
): Promise<ContentIdeaRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .select(
      'id, organization_id, project_id, title, description, platform, platform_owner, status, created_by, created_at, updated_at',
    )
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
  platform: string
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
      platform: params.platform,
      platform_owner: params.platformOwner,
      created_by: params.userId,
    })
    .select(
      'id, organization_id, project_id, title, description, platform, platform_owner, status, created_by, created_at, updated_at',
    )
    .single()

  if (error) return { idea: null, error: 'Failed to create content idea' }
  return { idea: data as ContentIdeaRow, error: null }
}

export async function updateContentIdea(
  id: string,
  organizationId: string,
  params: Partial<Pick<ContentIdeaRow, 'title' | 'description' | 'platform' | 'platform_owner' | 'status'>>,
): Promise<{ idea: ContentIdeaRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(
      'id, organization_id, project_id, title, description, platform, platform_owner, status, created_by, created_at, updated_at',
    )
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
