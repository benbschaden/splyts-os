import { createServiceClient } from '@/lib/supabase/service'
import type { BusinessPlanSections } from '@/lib/company/business-plan-sections'

export async function getBusinessPlan(organizationId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('business_plans')
    .select('id, sections, updated_at')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) return null
  return data as { id: string; sections: BusinessPlanSections; updated_at: string } | null
}

export async function upsertBusinessPlan(
  organizationId: string,
  sections: BusinessPlanSections,
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('business_plans')
    .upsert(
      {
        organization_id: organizationId,
        sections,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' },
    )
    .select('id, updated_at')
    .single()

  if (error) return { plan: null, error: 'Failed to save business plan' }
  return { plan: data, error: null }
}
