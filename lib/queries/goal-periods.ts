import { createServiceClient } from '@/lib/supabase/service'

export type GoalPeriodRow = {
  id: string
  organization_id: string
  period_label: string
  period_start: string
  period_end: string
  status: 'active' | 'reviewing' | 'closed'
  focus_areas: string | null
  what_to_push: string | null
  what_to_defer: string | null
  review_summary: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type PeriodGoalRow = {
  id: string
  goal_period_id: string
  organization_id: string
  title: string
  description: string | null
  sort_order: number
  outcome: 'achieved' | 'partial' | 'missed' | null
  outcome_notes: string | null
  carried_from_goal_id: string | null
  created_at: string
  updated_at: string
}

export type GoalPeriodWithGoals = GoalPeriodRow & { goals: PeriodGoalRow[] }

const PERIOD_COLUMNS = 'id, organization_id, period_label, period_start, period_end, status, focus_areas, what_to_push, what_to_defer, review_summary, reviewed_at, reviewed_by, created_by, created_at, updated_at'
const GOAL_COLUMNS = 'id, goal_period_id, organization_id, title, description, sort_order, outcome, outcome_notes, carried_from_goal_id, created_at, updated_at'

export async function getActiveGoalPeriod(organizationId: string): Promise<GoalPeriodWithGoals | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('goal_periods')
    .select(PERIOD_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) return null

  const { data: goals } = await supabase
    .from('period_goals')
    .select(GOAL_COLUMNS)
    .eq('goal_period_id', data.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return { ...(data as GoalPeriodRow), goals: (goals ?? []) as PeriodGoalRow[] }
}

export async function getGoalPeriods(organizationId: string): Promise<GoalPeriodWithGoals[]> {
  const supabase = createServiceClient()
  const { data: periods, error } = await supabase
    .from('goal_periods')
    .select(PERIOD_COLUMNS)
    .eq('organization_id', organizationId)
    .order('period_start', { ascending: false })

  if (error || !periods) return []

  const periodIds = periods.map((p) => p.id)
  if (periodIds.length === 0) return []

  const { data: allGoals } = await supabase
    .from('period_goals')
    .select(GOAL_COLUMNS)
    .in('goal_period_id', periodIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const goalsByPeriod = new Map<string, PeriodGoalRow[]>()
  for (const g of (allGoals ?? []) as PeriodGoalRow[]) {
    const list = goalsByPeriod.get(g.goal_period_id) ?? []
    list.push(g)
    goalsByPeriod.set(g.goal_period_id, list)
  }

  return (periods as GoalPeriodRow[]).map((p) => ({
    ...p,
    goals: goalsByPeriod.get(p.id) ?? [],
  }))
}

export async function getReviewingPeriod(organizationId: string): Promise<GoalPeriodWithGoals | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('goal_periods')
    .select(PERIOD_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('status', 'reviewing')
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const { data: goals } = await supabase
    .from('period_goals')
    .select(GOAL_COLUMNS)
    .eq('goal_period_id', data.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return { ...(data as GoalPeriodRow), goals: (goals ?? []) as PeriodGoalRow[] }
}

export async function createGoalPeriod(params: {
  organizationId: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  userId: string
}): Promise<{ period: GoalPeriodRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('goal_periods')
    .insert({
      organization_id: params.organizationId,
      period_label: params.periodLabel,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      created_by: params.userId,
    })
    .select(PERIOD_COLUMNS)
    .single()

  if (error) {
    if (error.code === '23505') return { period: null, error: 'An active period already exists' }
    return { period: null, error: 'Failed to create goal period' }
  }
  return { period: data as GoalPeriodRow, error: null }
}

export async function updateGoalPeriod(
  id: string,
  organizationId: string,
  updates: {
    focus_areas?: string | null
    what_to_push?: string | null
    what_to_defer?: string | null
    status?: 'active' | 'reviewing' | 'closed'
    review_summary?: string | null
    reviewed_at?: string | null
    reviewed_by?: string | null
  },
): Promise<{ period: GoalPeriodRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('goal_periods')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select(PERIOD_COLUMNS)
    .single()

  if (error) return { period: null, error: 'Failed to update goal period' }
  return { period: data as GoalPeriodRow, error: null }
}

export async function createPeriodGoal(params: {
  goalPeriodId: string
  organizationId: string
  title: string
  description?: string | null
  carriedFromGoalId?: string | null
}): Promise<{ goal: PeriodGoalRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data: maxOrder } = await supabase
    .from('period_goals')
    .select('sort_order')
    .eq('goal_period_id', params.goalPeriodId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('period_goals')
    .insert({
      goal_period_id: params.goalPeriodId,
      organization_id: params.organizationId,
      title: params.title,
      description: params.description ?? null,
      sort_order: nextOrder,
      carried_from_goal_id: params.carriedFromGoalId ?? null,
    })
    .select(GOAL_COLUMNS)
    .single()

  if (error) return { goal: null, error: 'Failed to create goal' }
  return { goal: data as PeriodGoalRow, error: null }
}

export async function updatePeriodGoal(
  id: string,
  organizationId: string,
  updates: {
    title?: string
    description?: string | null
    outcome?: 'achieved' | 'partial' | 'missed' | null
    outcome_notes?: string | null
    sort_order?: number
  },
): Promise<{ goal: PeriodGoalRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('period_goals')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select(GOAL_COLUMNS)
    .single()

  if (error) return { goal: null, error: 'Failed to update goal' }
  return { goal: data as PeriodGoalRow, error: null }
}

export async function deletePeriodGoal(
  id: string,
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('period_goals')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete goal' }
  return { error: null }
}
