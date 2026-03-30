import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Flag, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GoalPeriodWithGoals } from '@/lib/queries/goal-periods'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'
import type { CompanyMilestone } from '@/lib/queries/company-milestones'
import type { RiskRow } from '@/lib/queries/risks'
import type { CompetitorRow } from '@/lib/queries/competitors'

interface PerformanceOverviewProps {
  activePeriod: GoalPeriodWithGoals | null
  highlightedKpis: KpiDefinitionRow[]
  currentValues: Record<string, number>
  previousValues: Record<string, number>
  milestones: CompanyMilestone[]
  activeRisks: RiskRow[]
  competitors: CompetitorRow[]
}

function formatKpiValue(value: number, unit: string): string {
  if (unit === 'currency') return `$${value.toLocaleString()}`
  if (unit === 'percentage') return `${value}%`
  if (unit === 'count') return value.toLocaleString()
  if (unit === 'rate') return `${value}x`
  return value.toLocaleString()
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function SectionHeader({ title, href, label = 'View all' }: { title: string; href: string; label?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{title}</h2>
      <Link href={href} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {label} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground">{message}</p>
  )
}

export function PerformanceOverview({
  activePeriod,
  highlightedKpis,
  currentValues,
  previousValues,
  milestones,
  activeRisks,
  competitors,
}: PerformanceOverviewProps) {
  const today = todayIso()

  // Goals: split by outcome
  const goals = activePeriod?.goals ?? []
  const achievedGoals = goals.filter((g) => g.outcome === 'achieved')
  const openGoals = goals.filter((g) => !g.outcome)

  // Milestones: upcoming / overdue / recent achievements
  const upcomingMilestones = milestones
    .filter((m) => (m.status === 'planned' || m.status === 'pushed') && m.milestone_date >= today)
    .slice(0, 3)
  const overdueMilestones = milestones.filter(
    (m) => (m.status === 'planned' || m.status === 'pushed') && m.milestone_date < today,
  )
  const recentAchieved = milestones
    .filter((m) => m.status === 'achieved')
    .slice(-3)
    .reverse()

  // Risks: show top 3 by priority
  const topRisks = activeRisks.slice(0, 3)

  // KPIs: trend
  const hasKpis = highlightedKpis.length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-8 py-8">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Performance</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Goals, metrics, milestones, and risks — the live view of your business.
        </p>
      </div>

      {/* Goals */}
      <section className="space-y-3">
        <SectionHeader
          title={activePeriod ? `Goals — ${activePeriod.period_label}` : 'Goals'}
          href="/dashboard/company/goals"
        />
        {!activePeriod && (
          <EmptyState message="No active goal period. Set up your current period in Goals." />
        )}
        {activePeriod && goals.length === 0 && (
          <EmptyState message="No goals for this period yet." />
        )}
        {activePeriod && goals.length > 0 && (
          <ul className="space-y-2">
            {goals.map((g) => (
              <li key={g.id} className="flex items-start gap-2.5">
                {g.outcome === 'achieved' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                ) : g.outcome === 'partial' ? (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                ) : g.outcome === 'missed' ? (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
                <span className={cn(
                  'text-sm',
                  g.outcome === 'achieved' ? 'text-muted-foreground line-through' : 'text-foreground',
                )}>
                  {g.title}
                </span>
              </li>
            ))}
          </ul>
        )}
        {activePeriod && (openGoals.length > 0 || achievedGoals.length > 0) && (
          <p className="text-xs text-muted-foreground">
            {achievedGoals.length} of {goals.length} goals achieved
          </p>
        )}
      </section>

      {/* KPIs */}
      <section className="space-y-3">
        <SectionHeader title="KPIs" href="/dashboard/company/kpis" />
        {!hasKpis && (
          <EmptyState message="No highlighted KPIs. Mark KPIs as highlighted in KPIs & Metrics." />
        )}
        {hasKpis && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {highlightedKpis.map((kpi) => {
              const current = currentValues[kpi.id]
              const prev = previousValues[kpi.id]
              const hasTrend = typeof current === 'number' && typeof prev === 'number' && prev !== 0
              const delta = hasTrend ? current - prev : null
              const pct = hasTrend && prev !== 0 ? ((delta! / prev) * 100).toFixed(1) : null
              const up = delta !== null && delta > 0

              return (
                <div key={kpi.id} className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <p className="text-[11px] text-muted-foreground truncate">{kpi.name}</p>
                  <p className="text-base font-semibold text-foreground tabular-nums">
                    {typeof current === 'number' ? formatKpiValue(current, kpi.unit) : '—'}
                  </p>
                  {pct !== null && (
                    <span className={cn(
                      'inline-flex items-center gap-0.5 text-[11px] font-medium',
                      up ? 'text-green-600' : 'text-destructive',
                    )}>
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {up ? '+' : ''}{pct}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Milestones */}
      <section className="space-y-3">
        <SectionHeader title="Milestones" href="/dashboard/company/milestones" />
        {overdueMilestones.length > 0 && (
          <div className="rounded-lg border border-amber-300/50 bg-amber-50/60 px-4 py-2.5 dark:border-amber-500/30 dark:bg-amber-950/20">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              {overdueMilestones.length} overdue
            </p>
            <ul className="mt-1 space-y-0.5">
              {overdueMilestones.map((m) => (
                <li key={m.id} className="text-xs text-amber-700 dark:text-amber-300">
                  {m.title} — was {formatDate(m.milestone_date)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {upcomingMilestones.length > 0 && (
          <ul className="space-y-2">
            {upcomingMilestones.map((m) => (
              <li key={m.id} className="flex items-start gap-2.5">
                <Flag className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(m.milestone_date)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {recentAchieved.length > 0 && (
          <ul className="space-y-2">
            {recentAchieved.map((m) => (
              <li key={m.id} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground line-through">{m.title}</p>
                  {m.completion_notes && (
                    <p className="text-[11px] text-muted-foreground/70">{m.completion_notes}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {upcomingMilestones.length === 0 && recentAchieved.length === 0 && overdueMilestones.length === 0 && (
          <EmptyState message="No milestones recorded yet." />
        )}
      </section>

      {/* Risks */}
      <section className="space-y-3">
        <SectionHeader title="Active Risks" href="/dashboard/company/risks" />
        {topRisks.length === 0 && (
          <EmptyState message="No active or monitoring risks." />
        )}
        {topRisks.length > 0 && (
          <ul className="space-y-2">
            {topRisks.map((risk) => {
              const score = risk.priority_score
              const severity = score >= 16 ? 'high' : score >= 6 ? 'medium' : 'low'
              return (
                <li key={risk.id} className="flex items-start gap-2.5">
                  <AlertTriangle className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    severity === 'high' ? 'text-destructive' : severity === 'medium' ? 'text-amber-500' : 'text-muted-foreground/50',
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{risk.title}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{risk.category} · score {score}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {activeRisks.length > 3 && (
          <p className="text-xs text-muted-foreground">+{activeRisks.length - 3} more active risks</p>
        )}
      </section>

      {/* Competitors (count + names — steer to the page for detail) */}
      <section className="space-y-3">
        <SectionHeader title="Competitive Landscape" href="/dashboard/company/competitors" />
        {competitors.length === 0 && (
          <EmptyState message="No competitors tracked yet." />
        )}
        {competitors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {competitors.map((c) => (
              <span key={c.id} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                {c.name}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
