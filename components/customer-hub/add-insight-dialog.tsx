'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  CustomerInsightRow,
  InsightCategory,
  InsightImpact,
  InsightStatus,
} from '@/lib/queries/customer-insights'

interface AddInsightDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (insight: CustomerInsightRow) => void
  sourceContactId?: string | null
  sourceCommunicationId?: string | null
  sourceContactName?: string | null
}

interface FormData {
  content: string
  category: InsightCategory
  impact: InsightImpact
  status: InsightStatus
  tags: string
  include_in_ai: boolean
}

const EMPTY: FormData = {
  content: '',
  category: 'pain_point',
  impact: 'medium',
  status: 'new',
  tags: '',
  include_in_ai: true,
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

const IMPACT_LABELS: Record<InsightImpact, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const STATUS_LABELS: Record<InsightStatus, string> = {
  new: 'New',
  validated: 'Validated',
  actioned: 'Actioned',
  archived: 'Archived',
}

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function AddInsightDialog({
  open,
  onClose,
  onSaved,
  sourceContactId,
  sourceCommunicationId,
  sourceContactName,
}: AddInsightDialogProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) {
      setError('Learning content is required.')
      return
    }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/customer-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: form.content.trim(),
        category: form.category,
        impact: form.impact,
        status: form.status,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        include_in_ai: form.include_in_ai,
        source_contact_id: sourceContactId ?? null,
        source_communication_id: sourceCommunicationId ?? null,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    const data = await res.json()
    onSaved(data.data)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Add insight</h2>
            {sourceContactName && (
              <p className="text-xs text-muted-foreground mt-0.5">From: {sourceContactName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div>
              <label htmlFor="insight-content" className="block text-xs font-medium text-foreground mb-1">
                Learning <span className="text-destructive">*</span>
              </label>
              <textarea
                id="insight-content"
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                rows={3}
                placeholder="What did you learn from this customer?"
                className={cn(INPUT_CLASS, 'resize-none')}
              />
            </div>

            <div>
              <label htmlFor="insight-category" className="block text-xs font-medium text-foreground mb-1">
                Category
              </label>
              <select
                id="insight-category"
                value={form.category}
                onChange={(e) => set('category', e.target.value as InsightCategory)}
                className={INPUT_CLASS}
              >
                {(Object.keys(CATEGORY_LABELS) as InsightCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="insight-impact" className="block text-xs font-medium text-foreground mb-1">
                  Impact
                </label>
                <select
                  id="insight-impact"
                  value={form.impact}
                  onChange={(e) => set('impact', e.target.value as InsightImpact)}
                  className={INPUT_CLASS}
                >
                  {(Object.keys(IMPACT_LABELS) as InsightImpact[]).map((i) => (
                    <option key={i} value={i}>
                      {IMPACT_LABELS[i]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="insight-status" className="block text-xs font-medium text-foreground mb-1">
                  Status
                </label>
                <select
                  id="insight-status"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as InsightStatus)}
                  className={INPUT_CLASS}
                >
                  {(Object.keys(STATUS_LABELS) as InsightStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="insight-tags" className="block text-xs font-medium text-foreground mb-1">
                Tags
              </label>
              <input
                id="insight-tags"
                type="text"
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="pricing, onboarding (comma-separated)"
                className={INPUT_CLASS}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.include_in_ai}
                onChange={(e) => set('include_in_ai', e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Include in AI context across the OS</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 p-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add insight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
