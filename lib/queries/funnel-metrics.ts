import { createUntypedServiceClient } from '@/lib/supabase/service'
import type { FunnelStage } from './contacts'

export type FunnelStageCount = {
  stage: FunnelStage
  label: string
  current: number
  addedThisWeek: number
}

export const FUNNEL_STAGE_CONFIGS: Array<{ stage: FunnelStage; label: string; shortLabel: string }> = [
  { stage: 'signup', label: 'Signup', shortLabel: 'Signup' },
  { stage: 'form_completed', label: 'Form Completed', shortLabel: 'Form' },
  { stage: 'downloaded', label: 'Downloaded', shortLabel: 'DL' },
  { stage: 'first_session', label: 'First Session', shortLabel: 'Session' },
  { stage: 'activated', label: 'Activated', shortLabel: 'Active' },
]

/**
 * Compute per-stage counts and week-over-week additions for an org's contacts.
 * Fetches all funnel-tracked contacts and aggregates in-memory.
 * Suitable for up to ~10k contacts; use a DB-level GROUP BY for larger sets.
 */
export async function getFunnelMetrics(orgId: string): Promise<FunnelStageCount[]> {
  const supabase = createUntypedServiceClient()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('contacts')
    .select('funnel_stage, funnel_stage_updated_at, created_at')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .not('funnel_stage', 'is', null)

  if (error || !data) {
    return FUNNEL_STAGE_CONFIGS.map(({ stage, label }) => ({
      stage,
      label,
      current: 0,
      addedThisWeek: 0,
    }))
  }

  const counts = new Map<string, number>()
  const weeklyAdds = new Map<string, number>()

  for (const row of data as Array<{
    funnel_stage: string | null
    funnel_stage_updated_at: string | null
    created_at: string
  }>) {
    const stage = row.funnel_stage
    if (!stage) continue
    counts.set(stage, (counts.get(stage) ?? 0) + 1)

    // signup uses created_at (funnel_stage_updated_at isn't set on direct creation);
    // all other stages use funnel_stage_updated_at to reflect when they reached this stage.
    const changedAt =
      stage === 'signup'
        ? row.created_at
        : (row.funnel_stage_updated_at ?? row.created_at)

    if (changedAt >= weekAgo) {
      weeklyAdds.set(stage, (weeklyAdds.get(stage) ?? 0) + 1)
    }
  }

  return FUNNEL_STAGE_CONFIGS.map(({ stage, label }) => ({
    stage,
    label,
    current: counts.get(stage) ?? 0,
    addedThisWeek: weeklyAdds.get(stage) ?? 0,
  }))
}
