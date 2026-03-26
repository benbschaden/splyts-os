import { createServiceClient } from '@/lib/supabase/service'

export async function getContentTypeTemplates() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_type_templates')
    .select('id, slug, name, description')
    .order('name', { ascending: true })

  if (error) return []
  return data
}

export async function getContentTypes(organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_types')
    .select('id, name, custom_rules, is_active, created_at, updated_at, template_id, content_type_templates(slug, name)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return []
  return data
}

export async function getActiveContentTypes(organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_types')
    .select('id, name, custom_rules, template_id, content_type_templates(slug, name)')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) return []
  return data
}

export async function createContentType(
  organizationId: string,
  userId: string,
  data: { name: string; template_id: string; custom_rules: string },
) {
  const supabase = createServiceClient()

  const { data: created, error } = await supabase
    .from('content_types')
    .insert({
      organization_id: organizationId,
      created_by: userId,
      name: data.name,
      template_id: data.template_id,
      custom_rules: data.custom_rules,
    })
    .select('id, name, is_active')
    .single()

  if (error) return { contentType: null, error: 'Failed to create content type' }
  return { contentType: created, error: null }
}

export async function updateContentType(
  id: string,
  organizationId: string,
  updates: { name?: string; custom_rules?: string; is_active?: boolean },
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_types')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, name, is_active')
    .single()

  if (error) return { contentType: null, error: 'Failed to update content type' }
  return { contentType: data, error: null }
}

export async function deleteContentType(id: string, organizationId: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('content_types')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete content type' }
  return { error: null }
}
