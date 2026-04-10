import { createServiceClient } from '@/lib/supabase/service'
import type { Database } from '@/lib/types/database'

type ProjectMaterialRow = Database['public']['Tables']['project_materials']['Row']

const SELECT_COLUMNS =
  'id, project_id, organization_id, created_by, material_type, title, content, file_url, file_name, file_mime, link_url, sort_order, created_at, updated_at'

export async function getProjectMaterials(
  projectId: string,
  organizationId: string,
): Promise<ProjectMaterialRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('project_materials')
    .select(SELECT_COLUMNS)
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as ProjectMaterialRow[]
}

export async function createProjectMaterial(
  projectId: string,
  organizationId: string,
  userId: string,
  input: {
    material_type: 'note' | 'file' | 'link'
    title?: string | null
    content?: string | null
    file_url?: string | null
    file_name?: string | null
    file_mime?: string | null
    link_url?: string | null
  },
): Promise<{ material: ProjectMaterialRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('project_materials')
    .insert({
      project_id: projectId,
      organization_id: organizationId,
      created_by: userId,
      material_type: input.material_type,
      title: input.title ?? null,
      content: input.content ?? null,
      file_url: input.file_url ?? null,
      file_name: input.file_name ?? null,
      file_mime: input.file_mime ?? null,
      link_url: input.link_url ?? null,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { material: null, error: 'Failed to create material' }
  return { material: data as ProjectMaterialRow, error: null }
}

export async function updateProjectMaterial(
  materialId: string,
  projectId: string,
  organizationId: string,
  updates: { title?: string | null; content?: string | null; sort_order?: number },
): Promise<{ material: ProjectMaterialRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('project_materials')
    .update(updates)
    .eq('id', materialId)
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .maybeSingle()

  if (error) return { material: null, error: 'Failed to update material' }
  if (!data) return { material: null, error: 'Not found' }
  return { material: data as ProjectMaterialRow, error: null }
}

/** Row fields needed to sign storage URLs for file materials. */
export async function getProjectMaterialFileRow(
  materialId: string,
  projectId: string,
  organizationId: string,
): Promise<Pick<
  ProjectMaterialRow,
  'id' | 'material_type' | 'file_url' | 'file_mime' | 'file_name'
> | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('project_materials')
    .select('id, material_type, file_url, file_mime, file_name')
    .eq('id', materialId)
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as Pick<
    ProjectMaterialRow,
    'id' | 'material_type' | 'file_url' | 'file_mime' | 'file_name'
  >
}

export async function deleteProjectMaterial(
  materialId: string,
  projectId: string,
  organizationId: string,
): Promise<{ error: string | null; notFound?: boolean }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('project_materials')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', materialId)
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) return { error: 'Failed to delete material' }
  if (!data) return { error: 'Not found', notFound: true }
  return { error: null }
}
