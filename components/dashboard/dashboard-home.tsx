'use client'

import { KpiCards } from '@/components/dashboard/kpi-cards'
import { FunnelVisual, type FunnelStageData } from '@/components/dashboard/funnel-visual'
import { RecentActivity, type ActivityItem } from '@/components/dashboard/recent-activity'
import { Greeting } from '@/components/dashboard/greeting'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'
import { cn } from '@/lib/utils'

interface DashboardHomeProps {
  userName: string
  orgName: string
  northStar: string | null
  mission: string | null
  vision: string | null
  kpiDefinitions: KpiDefinitionRow[]
  currentValues: Record<string, number>
  previousValues: Record<string, number>
  funnelStages: FunnelStageData[]
  funnelTitle: string | null
  recentActivity: ActivityItem[]
}

export function DashboardHome({
  userName,
  orgName,
  northStar,
  mission,
  vision,
  kpiDefinitions,
  currentValues,
  previousValues,
  funnelStages,
  funnelTitle,
  recentActivity,
}: DashboardHomeProps) {
  const hasKpis = kpiDefinitions.some((d) => d.is_highlighted)
  const hasFunnel = funnelStages.length >= 2
  const hasActivity = recentActivity.length > 0
  const hasNorthStar = northStar || mission || vision

  return (
    <div className="flex h-full flex-col">
      <Greeting name={userName} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pb-8 space-y-8">

          {/* North star / mission / vision */}
          {hasNorthStar && (
            <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40">
              {/* Decorative accent line along top */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

              {northStar && (
                <div className="px-8 pt-8 pb-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 mb-4">
                    North star
                  </p>
                  <p className="text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl max-w-2xl">
                    {northStar}
                  </p>
                </div>
              )}

              {(mission || vision) && (
                <div className={cn(
                  'border-t border-border/50',
                  mission && vision ? 'grid grid-cols-2 divide-x divide-border/50' : '',
                )}>
                  {mission && (
                    <div className="px-8 py-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 mb-2.5">
                        Mission
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {mission}
                      </p>
                    </div>
                  )}
                  {vision && (
                    <div className="px-8 py-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 mb-2.5">
                        Vision
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {vision}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Org name footer */}
              <div className="px-8 py-3 border-t border-border/30 bg-muted/20">
                <p className="text-[10px] font-medium tracking-widest text-muted-foreground/40 uppercase">
                  {orgName}
                </p>
              </div>
            </section>
          )}

          {/* KPI Cards */}
          {hasKpis && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
                Key Metrics
              </h2>
              <KpiCards
                definitions={kpiDefinitions}
                currentValues={currentValues}
                previousValues={previousValues}
              />
            </section>
          )}

          {/* Funnel + Activity */}
          {(hasFunnel || hasActivity) && (
            <div className={cn(
              'grid gap-6',
              hasFunnel && hasActivity ? 'lg:grid-cols-5' : 'grid-cols-1',
            )}>
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

        </div>
      </div>
    </div>
  )
}
