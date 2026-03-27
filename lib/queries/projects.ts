import { createServiceClient } from '@/lib/supabase/service'

// Returns distinct populated categories in a consistent order
const CATEGORY_ORDER = ['Marketing', 'Engineering', 'Product', 'Sales', 'HR', 'Operations', 'Finance', 'Design', 'Legal', 'Customer Success']

export async function getProjectCategories(organizationId: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('projects')
    .select('category')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .not('category', 'is', null)

  if (!data) return []
  const unique = Array.from(new Set(data.map((r) => r.category as string)))
  // Sort by known order first, then alphabetically for any custom categories
  return unique.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
}

export async function getProjectsForOrg(organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, category, created_at, updated_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) return []
  return data
}

export async function getProjectById(projectId: string, organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, created_at, updated_at, created_by')
    .eq('id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return null
  return data
}

export async function createProject(
  name: string,
  description: string | null,
  organizationId: string,
  userId: string,
  category?: string | null,
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      description,
      organization_id: organizationId,
      created_by: userId,
      category: category ?? null,
    })
    .select('id, name, description, category, created_at, updated_at')
    .single()

  if (error) return { project: null, error: 'Failed to create project' }
  return { project: data, error: null }
}

export async function updateProject(
  projectId: string,
  organizationId: string,
  updates: { name?: string; description?: string | null; category?: string | null },
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, name, description, category, updated_at')
    .single()

  if (error) return { project: null, error: 'Failed to update project' }
  return { project: data, error: null }
}

export async function deleteProject(projectId: string, organizationId: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete project' }
  return { error: null }
}
