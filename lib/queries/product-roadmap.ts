import { createServiceClient } from '@/lib/supabase/service'

export type ProductRoadmapItem = {
  id: string
  organization_id: string
  title: string
  description: string | null
  phase: 'now' | 'next' | 'later' | 'shipped'
  status: 'planned' | 'in_progress' | 'shipped' | 'cut'
  category: string | null
  sort_order: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export async function getProductRoadmapItems(organizationId: string): Promise<ProductRoadmapItem[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('product_roadmap_items')
    .select('id, organization_id, title, description, phase, status, category, sort_order, created_by, updated_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('phase', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) return []
  return (data ?? []) as ProductRoadmapItem[]
}

export async function createProductRoadmapItem(params: {
  organizationId: string
  title: string
  description: string | null
  phase: string
  status: string
  category: string | null
  userId: string
}): Promise<{ item: ProductRoadmapItem | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('product_roadmap_items')
    .insert({
      organization_id: params.organizationId,
      title: params.title,
      description: params.description,
      phase: params.phase,
      status: params.status,
      category: params.category,
      created_by: params.userId,
    })
    .select('id, organization_id, title, description, phase, status, category, sort_order, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { item: null, error: 'Failed to create roadmap item' }
  return { item: data as ProductRoadmapItem, error: null }
}

export async function updateProductRoadmapItem(
  id: string,
  organizationId: string,
  updates: {
    title?: string
    description?: string | null
    phase?: string
    status?: string
    category?: string | null
  },
  userId: string,
): Promise<{ item: ProductRoadmapItem | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('product_roadmap_items')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, organization_id, title, description, phase, status, category, sort_order, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { item: null, error: 'Failed to update roadmap item' }
  return { item: data as ProductRoadmapItem, error: null }
}

export async function deleteProductRoadmapItem(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('product_roadmap_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete roadmap item' }
  return { error: null }
}
