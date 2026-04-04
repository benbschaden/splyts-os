import { createServiceClient } from '@/lib/supabase/service'
import type { Json } from '@/lib/types/database'

export interface BrandAssets {
  logo_url?: string
  logo_mark_url?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  font_display?: string
  font_body?: string
  image_style?: string
  social_handles?: string
}

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
      'id, company_name, mission, vision, north_star, voice, tone, pillars, target_audience, values, guardrails, brand_assets, updated_at',
    )
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) return null
  return data
}

export async function updateBrandAssets(
  organizationId: string,
  assets: BrandAssets,
): Promise<{ brandAssets: BrandAssets | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('brand_context')
    .update({
      brand_assets: assets as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .select('brand_assets')
    .maybeSingle()

  if (error) return { brandAssets: null, error: 'Failed to update brand assets' }
  if (!data) return { brandAssets: null, error: 'Not found' }

  const raw = data.brand_assets
  const parsed: BrandAssets =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as BrandAssets)
      : {}

  return { brandAssets: parsed, error: null }
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
