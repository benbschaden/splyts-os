import { createServiceClient } from '@/lib/supabase/service'
import type { ProductSections } from '@/lib/company/product-sections'

export type ProductContextRow = {
  id: string
  organization_id: string
  sections: ProductSections
  updated_by: string | null
  created_at: string
  updated_at: string
}

export async function getProductContext(organizationId: string): Promise<ProductContextRow | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('product_context')
    .select('id, organization_id, sections, updated_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) return null
  return data as ProductContextRow | null
}

export async function upsertProductContext(
  organizationId: string,
  sections: ProductSections,
  userId: string,
): Promise<{ data: ProductContextRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('product_context')
    .upsert(
      {
        organization_id: organizationId,
        sections,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' },
    )
    .select('id, organization_id, sections, updated_by, created_at, updated_at')
    .single()

  if (error) return { data: null, error: 'Failed to save product context' }
  return { data: data as ProductContextRow, error: null }
}
