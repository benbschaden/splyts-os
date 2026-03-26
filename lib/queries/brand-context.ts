import { createServiceClient } from '@/lib/supabase/service'

export interface BrandContextData {
  company_name: string
  mission: string
  vision: string
  north_star: string
  voice: string
  tone: string
  pillars: string
  target_audience: string
  values: string | null
}

export async function getBrandContext(organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('brand_context')
    .select(
      'id, company_name, mission, vision, north_star, voice, tone, pillars, target_audience, values, updated_at',
    )
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) return null
  return data
}

export async function upsertBrandContext(
  organizationId: string,
  context: BrandContextData,
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('brand_context')
    .upsert(
      {
        organization_id: organizationId,
        ...context,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' },
    )
    .select('id, updated_at')
    .single()

  if (error) return { brandContext: null, error: 'Failed to save brand context' }
  return { brandContext: data, error: null }
}
