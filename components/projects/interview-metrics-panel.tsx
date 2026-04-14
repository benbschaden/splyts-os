'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveryEntryRow } from '@/lib/queries/discovery-entries'

interface InterviewMetricsPanelProps {
  entry: DiscoveryEntryRow
}

type Threshold = { green: [number, number]; amber: [number, number] }

function inRange(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1]
}

function getColor(value: number, thresholds: Threshold, invert = false): string {
  if (invert) {
    // Lower is better (e.g. interviewer talk share, SPR)
    if (inRange(value, thresholds.green)) return 'text-green-700 dark:text-green-400'
    if (inRange(value, thresholds.amber)) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  } else {
    // Higher is better (e.g. IJL)
    if (inRange(value, thresholds.green)) return 'text-green-700 dark:text-green-400'
    if (inRange(value, thresholds.amber)) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }
}

function getBarColor(value: number, thresholds: Threshold, invert = false): string {
  const color = getColor(value, thresholds, invert)
  if (color.includes('green')) return 'bg-green-500'
  if (color.includes('amber')) return 'bg-amber-400'
  return 'bg-red-500'
}

// Thresholds: green = good range, amber = caution range, else = red
const TALK_SHARE_THRESHOLDS: Threshold = { green: [0, 40], amber: [40, 55] }    // interviewer % lower is better
const IJL_THRESHOLDS: Threshold = { green: [1.5, 99], amber: [0.75, 1.5] }      // seconds, higher is better
const SPR_THRESHOLDS: Threshold = { green: [0, 15], amber: [15, 30] }            // % lower is better
const ISR_THRESHOLDS: Threshold = { green: [0, 20], amber: [20, 40] }            // % lower is better

function MetricBar({
  value,
  max,
  barClass,
  label,
}: {
  value: number
  max: number
  barClass: string
  label: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
        <div className={cn('h-full rounded-full transition-all', barClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CoachingRow({
  label,
  value,
  unit,
  color,
  tip,
}: {
  label: string
  value: string
  unit: string
  color: string
  tip: string
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn('text-xs font-semibold tabular-nums shrink-0', color)}>
          {value}<span className="font-normal text-muted-foreground"> {unit}</span>
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground/70 leading-snug">{tip}</p>
    </div>
  )
}

function WTPBadge({ signal }: { signal: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    strong:   { label: 'Strong WTP', cls: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300' },
    moderate: { label: 'Moderate WTP', cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300' },
    weak:     { label: 'Weak WTP', cls: 'bg-muted text-muted-foreground border-border' },
    none:     { label: 'No WTP signal', cls: 'bg-muted text-muted-foreground/60 border-border' },
  }
  const c = cfg[signal] ?? cfg.none
  return (
    <span className={cn('rounded border px-2 py-0.5 text-[11px] font-medium', c.cls)}>{c.label}</span>
  )
}

function SeverityDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={cn('inline-block h-2 w-2 rounded-full', i < value ? 'bg-foreground' : 'bg-muted')}
        />
      ))}
    </span>
  )
}

export function InterviewMetricsPanel({ entry }: InterviewMetricsPanelProps) {
  const [open, setOpen] = useState(false)
  const hasMetrics = entry.interviewer_talk_pct !== null
  const hasSignals = entry.wtp_signal !== null || entry.problem_severity !== null || entry.adoption_willingness !== null

  if (!hasMetrics && !hasSignals) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Talk dynamics &amp; signals
      </button>
    <div className={cn('mt-3 space-y-4', !open && 'hidden')}>
      {/* Content signals */}
      {hasSignals && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">AI Signals</p>
          <div className="flex flex-wrap items-center gap-2">
            {entry.wtp_signal && <WTPBadge signal={entry.wtp_signal} />}
            {entry.wtp_price_points && entry.wtp_price_points.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                Prices: {entry.wtp_price_points.map((p) => `$${p}`).join(', ')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {entry.problem_severity !== null && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Problem severity</p>
                <div className="flex items-center gap-1.5">
                  <SeverityDots value={entry.problem_severity} />
                  <span className="text-xs font-semibold">{entry.problem_severity}/5</span>
                </div>
              </div>
            )}
            {entry.adoption_willingness !== null && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Adoption willingness</p>
                <div className="flex items-center gap-1.5">
                  <SeverityDots value={entry.adoption_willingness} />
                  <span className="text-xs font-semibold">{entry.adoption_willingness}/5</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Talk dynamics */}
      {hasMetrics && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Talk Dynamics</p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Interviewer</span>
                <span className={cn('font-semibold tabular-nums', getColor(entry.interviewer_talk_pct!, TALK_SHARE_THRESHOLDS, true))}>
                  {entry.interviewer_talk_pct}% · {entry.interviewer_wpm} WPM · {entry.interviewer_turns} turns
                </span>
              </div>
              <MetricBar
                value={entry.interviewer_talk_pct!}
                max={100}
                barClass={getBarColor(entry.interviewer_talk_pct!, TALK_SHARE_THRESHOLDS, true)}
                label="Interviewer talk share"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Interviewee</span>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {entry.interviewee_talk_pct}% · {entry.interviewee_wpm} WPM · {entry.interviewee_turns} turns
                </span>
              </div>
              <MetricBar
                value={entry.interviewee_talk_pct!}
                max={100}
                barClass="bg-blue-400"
                label="Interviewee talk share"
              />
            </div>

            {entry.total_interruptions !== null && entry.total_interruptions > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {entry.total_interruptions} interruption{entry.total_interruptions !== 1 ? 's' : ''} detected
              </p>
            )}
          </div>
        </div>
      )}

      {/* Interviewer coaching */}
      {hasMetrics && (entry.ijl_median_s !== null || entry.isr_pct !== null || entry.spr_pct !== null) && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Interviewer Coaching</p>

          <div className="space-y-3 divide-y divide-border">
            {entry.ijl_median_s !== null && (
              <div className="pt-0">
                <CoachingRow
                  label="Jump-in Latency (IJL)"
                  value={entry.ijl_median_s.toFixed(2)}
                  unit="s median"
                  color={getColor(entry.ijl_median_s, IJL_THRESHOLDS)}
                  tip={
                    entry.ijl_median_s >= 1.5
                      ? 'Good — you leave space after answers before speaking.'
                      : entry.ijl_median_s >= 0.75
                      ? 'Caution — consider waiting a beat longer after the interviewee finishes.'
                      : 'You may be jumping in too quickly. Leave more silence after answers.'
                  }
                />
              </div>
            )}

            {entry.spr_pct !== null && (
              <div className="pt-3">
                <CoachingRow
                  label="Short Preemptions ≤0.5s (SPR)"
                  value={`${entry.spr_pct}`}
                  unit="% of turns"
                  color={getColor(entry.spr_pct, SPR_THRESHOLDS, true)}
                  tip={
                    entry.spr_pct <= 15
                      ? 'Good — you rarely cut across interviewee turns.'
                      : entry.spr_pct <= 30
                      ? 'Caution — you cut in within 0.5s on some turns. Try counting to 2 silently.'
                      : 'High rate of short preemptions. Slow down — the interviewee may have more to say.'
                  }
                />
              </div>
            )}

            {entry.isr_pct !== null && (
              <div className="pt-3">
                <CoachingRow
                  label="Self-Continue Rate (ISR)"
                  value={`${entry.isr_pct}`}
                  unit="%"
                  color={getColor(entry.isr_pct, ISR_THRESHOLDS, true)}
                  tip={
                    entry.isr_pct <= 20
                      ? 'Good — the interviewee rarely had to restart their own thought.'
                      : entry.isr_pct <= 40
                      ? 'Some self-continuation — the interviewee occasionally picked up their own thread again.'
                      : 'High self-continuation rate. The interviewee may be filling silence you left awkwardly, or restarting after interruptions.'
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
