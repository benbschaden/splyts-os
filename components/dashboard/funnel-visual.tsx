'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface FunnelStageData {
  label: string
  value: number
  unit: string
}

interface FunnelVisualProps {
  stages: FunnelStageData[]
  title?: string
}

const COLORS = [
  { bg: 'rgba(99, 102, 241, 0.9)', glow: 'rgba(99, 102, 241, 0.3)' },
  { bg: 'rgba(79, 70, 229, 0.85)', glow: 'rgba(79, 70, 229, 0.25)' },
  { bg: 'rgba(124, 58, 237, 0.8)', glow: 'rgba(124, 58, 237, 0.25)' },
  { bg: 'rgba(139, 92, 246, 0.75)', glow: 'rgba(139, 92, 246, 0.2)' },
  { bg: 'rgba(167, 139, 250, 0.7)', glow: 'rgba(167, 139, 250, 0.2)' },
  { bg: 'rgba(196, 181, 253, 0.65)', glow: 'rgba(196, 181, 253, 0.15)' },
  { bg: 'rgba(221, 214, 254, 0.6)', glow: 'rgba(221, 214, 254, 0.1)' },
  { bg: 'rgba(237, 233, 254, 0.55)', glow: 'rgba(237, 233, 254, 0.08)' },
]

function formatValue(value: number, unit: string): string {
  if (unit === 'currency') {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
    return `$${value.toLocaleString()}`
  }
  if (unit === 'percent') return `${value}%`
  if (unit === 'ratio') return `${value}x`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function getConversionRate(from: number, to: number): string {
  if (from === 0) return '0%'
  return `${((to / from) * 100).toFixed(1)}%`
}

export function FunnelVisual({ stages, title }: FunnelVisualProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No funnel data yet
      </div>
    )
  }

  const maxValue = Math.max(...stages.map((s) => s.value), 1)

  return (
    <div className="w-full">
      {title && (
        <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      )}

      <div className="relative flex flex-col items-center gap-0">
        {stages.map((stage, i) => {
          const widthPercent = Math.max((stage.value / maxValue) * 100, 12)
          const nextStage = stages[i + 1]
          const color = COLORS[i % COLORS.length]
          const delay = i * 120

          return (
            <div key={i} className="w-full flex flex-col items-center">
              {/* Stage bar */}
              <div
                className={cn(
                  'group relative flex items-center justify-between px-5 py-3 transition-all duration-700 ease-out',
                  'hover:scale-[1.02] hover:z-10',
                )}
                style={{
                  width: mounted ? `${widthPercent}%` : '4%',
                  opacity: mounted ? 1 : 0,
                  transitionDelay: `${delay}ms`,
                  background: color.bg,
                  boxShadow: `0 0 20px ${color.glow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
                  borderRadius: i === 0
                    ? '12px 12px 4px 4px'
                    : i === stages.length - 1
                      ? '4px 4px 12px 12px'
                      : '4px',
                  minHeight: '48px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Left: label */}
                <span className="text-sm font-medium text-white truncate mr-3">
                  {stage.label}
                </span>

                {/* Right: value */}
                <span className="text-sm font-bold text-white whitespace-nowrap tabular-nums">
                  {formatValue(stage.value, stage.unit)}
                </span>

                {/* Shine overlay */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-[inherit]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 60%)',
                  }}
                />
              </div>

              {/* Conversion connector */}
              {nextStage && (
                <div
                  className="flex items-center gap-2 py-1 transition-all duration-500"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transitionDelay: `${delay + 80}ms`,
                  }}
                >
                  {/* Tapered connector lines */}
                  <svg
                    width="24"
                    height="16"
                    viewBox="0 0 24 16"
                    className="text-muted-foreground/30"
                  >
                    <path
                      d="M8 0 L6 16 M16 0 L18 16"
                      stroke="currentColor"
                      strokeWidth="1"
                      fill="none"
                    />
                    <path
                      d="M12 4 L12 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeDasharray="2 2"
                    />
                  </svg>

                  {/* Conversion badge */}
                  <div className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums',
                    'bg-background border border-border text-muted-foreground',
                    'shadow-sm',
                  )}>
                    {getConversionRate(stage.value, nextStage.value)}
                  </div>

                  <svg
                    width="24"
                    height="16"
                    viewBox="0 0 24 16"
                    className="text-muted-foreground/30"
                  >
                    <path
                      d="M8 0 L6 16 M16 0 L18 16"
                      stroke="currentColor"
                      strokeWidth="1"
                      fill="none"
                    />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Overall conversion */}
      {stages.length >= 2 && stages[0].value > 0 && (
        <div
          className="mt-4 flex items-center justify-center gap-2 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transitionDelay: `${stages.length * 120 + 200}ms`,
          }}
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xs font-medium text-muted-foreground px-3">
            Overall: {getConversionRate(stages[0].value, stages[stages.length - 1].value)}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      )}
    </div>
  )
}
