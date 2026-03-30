export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getActiveGoalPeriod } from '@/lib/queries/goal-periods'
import { getHighlightedKpis } from '@/lib/queries/kpi-definitions'
import { getKpiSnapshots } from '@/lib/queries/kpi-snapshots'
import { getCompanyMilestones } from '@/lib/queries/company-milestones'
import { getActiveRisks } from '@/lib/queries/risks'
import { getCompetitors } from '@/lib/queries/competitors'
import { PerformanceOverview } from '@/components/performance/performance-overview'

export default async function PerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [
    activePeriod,
    highlightedKpis,
    snapshots,
    milestones,
    activeRisks,
    competitors,
  ] = await Promise.all([
    getActiveGoalPeriod(org.id),
    getHighlightedKpis(org.id),
    getKpiSnapshots(org.id, 2),
    getCompanyMilestones(org.id),
    getActiveRisks(org.id),
    getCompetitors(org.id),
  ])

  const currentValues = snapshots[0]?.values ?? {}
  const previousValues = snapshots[1]?.values ?? {}

  return (
    <PerformanceOverview
      activePeriod={activePeriod}
      highlightedKpis={highlightedKpis}
      currentValues={currentValues}
      previousValues={previousValues}
      milestones={milestones}
      activeRisks={activeRisks}
      competitors={competitors}
    />
  )
}
