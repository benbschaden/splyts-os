import { createUntypedServiceClient } from '@/lib/supabase/service'

// current_goals table is not yet in the generated Database types.
// Switch to createServiceClient once types are regenerated after migration is applied.
import type { CurrentGoalsSections } from '@/lib/company/current-goals-sections'

export type CurrentGoalsRow = {
  id: string
  organization_id: string
  sections: CurrentGoalsSections
  updated_by: string | null
  created_at: string
  updated_at: string
}

export async function getCurrentGoals(organizationId: string): Promise<CurrentGoalsRow | null> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('current_goals')
    .select('id, organization_id, sections, updated_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) return null
  return data as unknown as CurrentGoalsRow | null
}

export async function upsertCurrentGoals(
  organizationId: string,
  sections: CurrentGoalsSections,
  userId: string,
): Promise<{ data: CurrentGoalsRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()

  const { data, error } = await supabase
    .from('current_goals')
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

  if (error) return { data: null, error: 'Failed to save current goals' }
  return { data: data as unknown as CurrentGoalsRow, error: null }
}
