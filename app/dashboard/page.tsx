export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectsForOrg } from '@/lib/queries/projects'
import { getUserProfile } from '@/lib/queries/user-profile'
import { getKpiDefinitions } from '@/lib/queries/kpi-definitions'
import { getKpiSnapshots } from '@/lib/queries/kpi-snapshots'
import { getDashboardFunnel } from '@/lib/queries/funnels'
import { getRecentOutputs } from '@/lib/queries/outputs'
import { ProjectsList } from '@/components/projects/projects-list'
import { DashboardHome } from '@/components/dashboard/dashboard-home'
import type { FunnelStageData } from '@/components/dashboard/funnel-visual'
import type { ActivityItem } from '@/components/dashboard/recent-activity'

interface DashboardPageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const { category } = await searchParams

  if (category) {
    const [allProjects, profile] = await Promise.all([
      getProjectsForOrg(org.id),
      getUserProfile(user.id),
    ])

    const projects = allProjects.filter((p) => p.category === category)
    const fullName = profile?.full_name?.trim() || user.email?.split('@')[0] || ''
    const userName = fullName.split(' ')[0]

    return <ProjectsList projects={projects} userName={userName} activeCategory={category} />
  }

  const [
    allProjects,
    profile,
    kpiDefinitions,
    snapshots,
    dashboardFunnel,
    recentOutputs,
  ] = await Promise.all([
    getProjectsForOrg(org.id),
    getUserProfile(user.id),
    getKpiDefinitions(org.id),
    getKpiSnapshots(org.id, 2),
    getDashboardFunnel(org.id),
    getRecentOutputs(org.id, 8),
  ])

  const fullName = profile?.full_name?.trim() || user.email?.split('@')[0] || ''
  const userName = fullName.split(' ')[0]

  const currentSnapshot = snapshots[0] ?? null
  const previousSnapshot = snapshots[1] ?? null
  const currentValues = currentSnapshot?.values ?? {}
  const previousValues = previousSnapshot?.values ?? {}

  let funnelStages: FunnelStageData[] = []
  let funnelTitle: string | null = null

  if (dashboardFunnel && dashboardFunnel.stages.length >= 2) {
    funnelTitle = dashboardFunnel.name
    const kpiMap = new Map(kpiDefinitions.map((d) => [d.id, d]))

    funnelStages = dashboardFunnel.stages
      .sort((a, b) => a.stage_order - b.stage_order)
      .map((stage) => {
        const kpi = kpiMap.get(stage.kpi_definition_id)
        return {
          label: stage.label_override ?? kpi?.name ?? 'Unknown',
          value: currentValues[stage.kpi_definition_id] ?? 0,
          unit: kpi?.unit ?? 'count',
        }
      })
  }

  const recentActivity: ActivityItem[] = recentOutputs.map((o) => ({
    id: o.id,
    type: 'output' as const,
    label: o.brief.slice(0, 80),
    detail: o.projects?.name ?? 'Unassigned',
    href: `/dashboard/projects/${o.project_id}`,
    date: o.created_at,
  }))

  return (
    <DashboardHome
      userName={userName}
      kpiDefinitions={kpiDefinitions}
      currentValues={currentValues}
      previousValues={previousValues}
      funnelStages={funnelStages}
      funnelTitle={funnelTitle}
      recentActivity={recentActivity}
      projects={allProjects}
    />
  )
}
