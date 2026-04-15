import { createServiceClient } from '@/lib/supabase/service'

export type ProductFeatureRow = {
  id: string
  organization_id: string
  name: string
  tagline: string | null
  description: string | null
  related_features: string | null
  category: string
  surfaces: string[]
  status: 'live' | 'beta' | 'planned' | 'deprecated'
  include_in_ai: boolean
  sort_order: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export async function getProductFeatures(organizationId: string): Promise<ProductFeatureRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('product_features')
    .select('id, organization_id, name, tagline, description, related_features, category, surfaces, status, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as ProductFeatureRow[]
}

export async function getAiVisibleProductFeatures(organizationId: string, limit = 20): Promise<ProductFeatureRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('product_features')
    .select('id, organization_id, name, tagline, description, related_features, category, surfaces, status, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('include_in_ai', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .limit(limit)

  if (error) return []
  return (data ?? []) as ProductFeatureRow[]
}

export async function createProductFeature(params: {
  organizationId: string
  name: string
  tagline: string | null
  description: string | null
  relatedFeatures: string | null
  category: string
  surfaces: string[]
  status: string
  includeInAi: boolean
  userId: string
}): Promise<{ feature: ProductFeatureRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('product_features')
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      tagline: params.tagline,
      description: params.description,
      related_features: params.relatedFeatures,
      category: params.category,
      surfaces: params.surfaces,
      status: params.status,
      include_in_ai: params.includeInAi,
      created_by: params.userId,
    })
    .select('id, organization_id, name, tagline, description, related_features, category, surfaces, status, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { feature: null, error: 'Failed to create feature' }
  return { feature: data as ProductFeatureRow, error: null }
}

export async function updateProductFeature(
  id: string,
  organizationId: string,
  updates: {
    name?: string
    tagline?: string | null
    description?: string | null
    related_features?: string | null
    category?: string
    surfaces?: string[]
    status?: string
    include_in_ai?: boolean
  },
  userId: string,
): Promise<{ feature: ProductFeatureRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('product_features')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, organization_id, name, tagline, description, related_features, category, surfaces, status, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { feature: null, error: 'Failed to update feature' }
  return { feature: data as ProductFeatureRow, error: null }
}

export async function deleteProductFeature(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('product_features')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete feature' }
  return { error: null }
}
