'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'
import { KPI_UNITS } from '@/lib/company/default-kpis'

interface KpiCardsProps {
  definitions: KpiDefinitionRow[]
  currentValues: Record<string, number>
  previousValues: Record<string, number>
}

function formatKpiValue(value: number, unit: string): string {
  const config = KPI_UNITS[unit]
  const prefix = config?.prefix ?? ''
  const suffix = config?.suffix ?? ''

  let formatted: string
  if (value >= 1_000_000) formatted = `${(value / 1_000_000).toFixed(1)}M`
  else if (value >= 10_000) formatted = `${(value / 1_000).toFixed(1)}K`
  else if (value >= 1_000) formatted = value.toLocaleString()
  else if (unit === 'percent' || unit === 'ratio') formatted = value.toFixed(1)
  else formatted = value.toLocaleString()

  return `${prefix}${formatted}${suffix}`
}

function getTrend(current: number, previous: number, unit: string) {
  if (previous === 0 && current === 0) return { direction: 'flat' as const, label: '—' }
  if (previous === 0) return { direction: 'up' as const, label: 'New' }

  const change = ((current - previous) / previous) * 100
  const absChange = Math.abs(change)

  // For churn, lower is better
  const isInverseMetric = unit === 'percent' && current < previous

  if (absChange < 0.5) return { direction: 'flat' as const, label: '—' }

  return {
    direction: change > 0 ? 'up' as const : 'down' as const,
    label: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
    isPositive: isInverseMetric ? change < 0 : change > 0,
  }
}

export function KpiCards({ definitions, currentValues, previousValues }: KpiCardsProps) {
  const highlighted = definitions.filter((d) => d.is_highlighted)
  if (highlighted.length === 0) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {highlighted.map((def) => {
        const current = currentValues[def.id] ?? 0
        const previous = previousValues[def.id] ?? 0
        const trend = getTrend(current, previous, def.unit)

        return (
          <div
            key={def.id}
            className={cn(
              'group relative overflow-hidden rounded-xl border border-border bg-background p-4',
              'transition-all duration-200 hover:border-foreground/20 hover:shadow-sm',
            )}
          >
            {/* Subtle gradient highlight on hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/[0.03] to-transparent" />

            <div className="relative">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                {def.name}
              </p>

              <div className="mt-2 flex items-end justify-between">
                <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                  {formatKpiValue(current, def.unit)}
                </p>

                {trend.direction !== 'flat' ? (
                  <div className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    trend.isPositive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400',
                  )}>
                    {trend.direction === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {trend.label}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Minus className="h-3 w-3" />
                    {trend.label}
                  </div>
                )}
              </div>

              {def.description && (
                <p className="mt-1.5 text-[11px] text-muted-foreground/60 truncate">
                  {def.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
