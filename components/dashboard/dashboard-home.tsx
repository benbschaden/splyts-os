'use client'

import { useState } from 'react'
import { Plus, FolderOpen } from 'lucide-react'
import { Greeting } from '@/components/dashboard/greeting'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { FunnelVisual, type FunnelStageData } from '@/components/dashboard/funnel-visual'
import { RecentActivity, type ActivityItem } from '@/components/dashboard/recent-activity'
import { ProjectCard } from '@/components/projects/project-card'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  description: string | null
  category: string | null
  updated_at: string
}

interface DashboardHomeProps {
  userName: string
  kpiDefinitions: KpiDefinitionRow[]
  currentValues: Record<string, number>
  previousValues: Record<string, number>
  funnelStages: FunnelStageData[]
  funnelTitle: string | null
  recentActivity: ActivityItem[]
  projects: Project[]
}

export function DashboardHome({
  userName,
  kpiDefinitions,
  currentValues,
  previousValues,
  funnelStages,
  funnelTitle,
  recentActivity,
  projects,
}: DashboardHomeProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const hasKpis = kpiDefinitions.some((d) => d.is_highlighted)
  const hasFunnel = funnelStages.length >= 2
  const hasActivity = recentActivity.length > 0

  const recentProjects = projects.slice(0, 6)

  return (
    <>
      <div className="flex h-full flex-col">
        <Greeting name={userName} />

        <div className="flex-1 overflow-y-auto">
          <div className="px-8 pb-8 space-y-8">
            {/* KPI Cards */}
            {hasKpis && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Key Metrics
                  </h2>
                </div>
                <KpiCards
                  definitions={kpiDefinitions}
                  currentValues={currentValues}
                  previousValues={previousValues}
                />
              </section>
            )}

            {/* Funnel + Activity row */}
            {(hasFunnel || hasActivity) && (
              <div className={cn(
                'grid gap-6',
                hasFunnel && hasActivity ? 'lg:grid-cols-5' : 'grid-cols-1',
              )}>
                {/* Funnel */}
                {hasFunnel && (
                  <section className={cn(
                    'rounded-xl border border-border bg-background p-5',
                    hasActivity ? 'lg:col-span-3' : 'lg:col-span-5',
                  )}>
                    <FunnelVisual
                      stages={funnelStages}
                      title={funnelTitle ?? 'Conversion Funnel'}
                    />
                  </section>
                )}

                {/* Recent activity */}
                {hasActivity && (
                  <section className={cn(
                    'rounded-xl border border-border bg-background p-4',
                    hasFunnel ? 'lg:col-span-2' : 'lg:col-span-5',
                  )}>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      Recent Activity
                    </h3>
                    <RecentActivity items={recentActivity} />
                  </section>
                )}
              </div>
            )}

            {/* Projects */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Projects
                </h2>
                <button
                  onClick={() => setDialogOpen(true)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground',
                    'hover:bg-primary/90 transition-colors',
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New project
                </button>
              </div>

              {recentProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center rounded-xl border border-dashed border-border">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">No projects yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first project to get started
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {recentProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      id={project.id}
                      name={project.name}
                      description={project.description}
                      updatedAt={project.updated_at}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}
