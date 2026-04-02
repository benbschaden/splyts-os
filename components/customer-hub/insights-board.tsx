'use client'

import { useState } from 'react'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  CustomerInsightRow,
  InsightCategory,
  InsightImpact,
  InsightStatus,
  InsightSourceSegment,
} from '@/lib/queries/customer-insights'
import { AddInsightDialog } from './add-insight-dialog'

interface InsightsBoardProps {
  insights: CustomerInsightRow[]
  onInsightAdded: (insight: CustomerInsightRow) => void
  onInsightUpdated: (insight: CustomerInsightRow) => void
  onInsightDeleted: (id: string) => void
}

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  pain_point: 'Pain Point',
  feature_request: 'Feature Request',
  praise: 'Praise',
  objection: 'Objection',
  churn_signal: 'Churn Signal',
  usage_pattern: 'Usage Pattern',
  market_insight: 'Market Insight',
}

const CATEGORY_BADGE_CLASSES: Record<InsightCategory, string> = {
  pain_point: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  feature_request: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800',
  praise: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
  objection: 'bg-orange-500/10 text-orange-700 border-orange-200 dark:text-orange-400 dark:border-orange-800',
  churn_signal: 'bg-red-700/10 text-red-800 border-red-300 dark:text-red-300 dark:border-red-700',
  usage_pattern: 'bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800',
  market_insight: 'bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:text-indigo-400 dark:border-indigo-800',
}

const IMPACT_BADGE_CLASSES: Record<InsightImpact, string> = {
  high: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  low: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
}

const STATUS_BADGE_CLASSES: Record<InsightStatus, string> = {
  new: 'bg-sky-500/10 text-sky-700 border-sky-200 dark:text-sky-400 dark:border-sky-800',
  validated: 'bg-violet-500/10 text-violet-700 border-violet-200 dark:text-violet-400 dark:border-violet-800',
  actioned: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
  archived: 'bg-muted text-muted-foreground border-border',
}

const STATUS_LABELS: Record<InsightStatus, string> = {
  new: 'New',
  validated: 'Validated',
  actioned: 'Actioned',
  archived: 'Archived',
}

const SEGMENT_LABELS: Record<InsightSourceSegment, string> = {
  beta_user: 'Beta Users',
  free_user: 'Free Users',
  customer: 'Paying Customers',
  power_user: 'Power Users',
  prospect: 'Prospects',
  churned: 'Churned',
  other: 'Other',
}

const STATUS_CYCLE: Record<InsightStatus, InsightStatus> = {
  new: 'validated',
  validated: 'actioned',
  actioned: 'archived',
  archived: 'new',
}

const SELECT_CLASS =
  'rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function InsightsBoard({
  insights,
  onInsightAdded,
  onInsightUpdated,
  onInsightDeleted,
}: InsightsBoardProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | 'all'>('all')
  const [impactFilter, setImpactFilter] = useState<InsightImpact | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<InsightStatus | 'all'>('all')
  const [segmentFilter, setSegmentFilter] = useState<InsightSourceSegment | 'all'>('all')
  const [cyclingId, setCyclingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = insights.filter((i) => {
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false
    if (impactFilter !== 'all' && i.impact !== impactFilter) return false
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (segmentFilter !== 'all' && i.source_segment !== segmentFilter) return false
    return true
  })

  const isFiltered = categoryFilter !== 'all' || impactFilter !== 'all' || statusFilter !== 'all' || segmentFilter !== 'all'

  async function handleCycleStatus(insight: CustomerInsightRow) {
    const nextStatus = STATUS_CYCLE[insight.status]
    setCyclingId(insight.id)
    const res = await fetch(`/api/customer-insights/${insight.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    setCyclingId(null)
    if (!res.ok) return
    const data = await res.json()
    onInsightUpdated(data.data)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/customer-insights/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    onInsightDeleted(id)
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-border bg-muted/20">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as InsightCategory | 'all')}
          className={SELECT_CLASS}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {(Object.keys(CATEGORY_LABELS) as InsightCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <select
          value={impactFilter}
          onChange={(e) => setImpactFilter(e.target.value as InsightImpact | 'all')}
          className={SELECT_CLASS}
          aria-label="Filter by impact"
        >
          <option value="all">All impacts</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InsightStatus | 'all')}
          className={SELECT_CLASS}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="validated">Validated</option>
          <option value="actioned">Actioned</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value as InsightSourceSegment | 'all')}
          className={SELECT_CLASS}
          aria-label="Filter by segment"
        >
          <option value="all">All segments</option>
          {(Object.keys(SEGMENT_LABELS) as InsightSourceSegment[]).map((s) => (
            <option key={s} value={s}>
              {SEGMENT_LABELS[s]}
            </option>
          ))}
        </select>

        {isFiltered && (
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length} of {insights.length}
          </span>
        )}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add insight
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {insights.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">No insights captured yet.</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Add the first insight
            </button>
          </div>
        )}

        {insights.length > 0 && filtered.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No insights match your filters.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  'group flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20',
                  deletingId === insight.id && 'opacity-50 pointer-events-none',
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                        CATEGORY_BADGE_CLASSES[insight.category],
                      )}
                    >
                      {CATEGORY_LABELS[insight.category]}
                    </span>
                    {insight.include_in_ai && (
                      <span title="Included in AI context" className="shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this insight?')) handleDelete(insight.id)
                    }}
                    className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    aria-label="Delete insight"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Content */}
                <p className="flex-1 text-xs text-foreground">{insight.content}</p>

                {/* Footer row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      IMPACT_BADGE_CLASSES[insight.impact],
                    )}
                  >
                    {insight.impact}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCycleStatus(insight)}
                    disabled={cyclingId === insight.id}
                    className={cn(
                      'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-opacity',
                      STATUS_BADGE_CLASSES[insight.status],
                      'hover:opacity-75 disabled:opacity-50',
                    )}
                    title="Click to advance status"
                  >
                    {cyclingId === insight.id ? '…' : STATUS_LABELS[insight.status]}
                  </button>
                  {insight.source_segment && (
                    <span className="rounded border border-sky-200 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-800 dark:text-sky-400">
                      {SEGMENT_LABELS[insight.source_segment]}
                    </span>
                  )}
                  {insight.source_contact_name && (
                    <span className="text-[11px] text-muted-foreground/60 ml-auto">
                      From: {insight.source_contact_name}
                    </span>
                  )}
                </div>

                {insight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 -mt-1">
                    {insight.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddInsightDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(insight) => {
          onInsightAdded(insight)
          setAddOpen(false)
        }}
      />
    </div>
  )
}
