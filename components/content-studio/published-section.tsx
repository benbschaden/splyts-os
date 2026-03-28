'use client'

import { useState } from 'react'
import { ChevronDown, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublishedOutput } from '@/lib/queries/outputs'
import { getModelById } from '@/lib/ai/models'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type PerfForm = {
  views_1d: string
  views_7d: string
  views_30d: string
  website_visits: string
  email_signups: string
  reach: string
  engagement: string
  performance_notes: string
}

function PublishedCard({ output: initial }: { output: PublishedOutput }) {
  const [output, setOutput] = useState(initial)
  const [showStats, setShowStats] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PerfForm>({
    views_1d: output.views_1d?.toString() ?? '',
    views_7d: output.views_7d?.toString() ?? '',
    views_30d: output.views_30d?.toString() ?? '',
    website_visits: output.website_visits?.toString() ?? '',
    email_signups: output.email_signups?.toString() ?? '',
    reach: output.reach?.toString() ?? '',
    engagement: output.engagement?.toString() ?? '',
    performance_notes: output.performance_notes ?? '',
  })

  function setField(key: keyof PerfForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSaveStats() {
    setSaving(true)

    const res = await fetch(`/api/outputs/${output.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        views_1d: form.views_1d ? parseInt(form.views_1d, 10) : null,
        views_7d: form.views_7d ? parseInt(form.views_7d, 10) : null,
        views_30d: form.views_30d ? parseInt(form.views_30d, 10) : null,
        website_visits: form.website_visits ? parseInt(form.website_visits, 10) : null,
        email_signups: form.email_signups ? parseInt(form.email_signups, 10) : null,
        reach: form.reach ? parseInt(form.reach, 10) : null,
        engagement: form.engagement ? parseInt(form.engagement, 10) : null,
        performance_notes: form.performance_notes.trim() || null,
      }),
    })

    setSaving(false)

    if (!res.ok) return

    const { output: updated } = await res.json()
    setOutput((prev) => ({ ...prev, ...updated }))
    setShowStats(false)
  }

  const hasStats =
    output.views_1d != null ||
    output.views_7d != null ||
    output.views_30d != null ||
    output.website_visits != null ||
    output.email_signups != null ||
    output.reach != null

  const modelLabel = getModelById(output.model_id)?.label ?? output.model_id

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
            {output.content_types?.name ?? 'Unknown type'}
          </span>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground shrink-0 hidden sm:inline-flex">
            {modelLabel}
          </span>
          {output.projects?.name && (
            <span className="text-xs text-muted-foreground shrink-0">
              {output.projects.name}
            </span>
          )}
          <span className="text-xs text-muted-foreground shrink-0">
            Published {formatDate(output.published_at)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowStats((s) => !s)}
          title="Performance stats"
          className={cn(
            'rounded-md p-1.5 transition-colors shrink-0',
            hasStats
              ? 'text-violet-600 hover:bg-violet-500/10'
              : 'text-muted-foreground hover:bg-accent',
          )}
        >
          <BarChart2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {/* Performance summary strip */}
      {!showStats && hasStats && (
        <div className="flex flex-wrap items-center gap-4 border-b border-border bg-violet-500/5 px-4 py-2">
          {output.views_1d != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {output.views_1d.toLocaleString()}
              </span>{' '}
              views (1d)
            </p>
          )}
          {output.views_7d != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {output.views_7d.toLocaleString()}
              </span>{' '}
              views (7d)
            </p>
          )}
          {output.views_30d != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {output.views_30d.toLocaleString()}
              </span>{' '}
              views (30d)
            </p>
          )}
          {output.website_visits != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {output.website_visits.toLocaleString()}
              </span>{' '}
              site visits
            </p>
          )}
          {output.email_signups != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {output.email_signups.toLocaleString()}
              </span>{' '}
              signups
            </p>
          )}
          {output.reach != null && !output.views_30d && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {output.reach.toLocaleString()}
              </span>{' '}
              {output.reach_metric ?? 'reach'}
            </p>
          )}
        </div>
      )}

      {/* Stats form */}
      {showStats && (
        <div className="border-b border-border bg-muted/10 px-4 py-4 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-600">
            Performance
          </p>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['views_1d', 'Views after 1 day'],
                ['views_7d', 'Views after 7 days'],
                ['views_30d', 'Views after 30 days'],
              ] as [keyof PerfForm, string][]
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <label htmlFor={`perf-${key}-${output.id}`} className="text-xs font-medium text-foreground">
                  {label}
                </label>
                <input
                  id={`perf-${key}-${output.id}`}
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor={`perf-visits-${output.id}`} className="text-xs font-medium text-foreground">
                Website visits
              </label>
              <input
                id={`perf-visits-${output.id}`}
                type="number"
                min={0}
                value={form.website_visits}
                onChange={(e) => setField('website_visits', e.target.value)}
                placeholder="0"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`perf-signups-${output.id}`} className="text-xs font-medium text-foreground">
                Email signups
              </label>
              <input
                id={`perf-signups-${output.id}`}
                type="number"
                min={0}
                value={form.email_signups}
                onChange={(e) => setField('email_signups', e.target.value)}
                placeholder="0"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`perf-notes-${output.id}`} className="text-xs font-medium text-foreground">
              Notes
            </label>
            <textarea
              id={`perf-notes-${output.id}`}
              value={form.performance_notes}
              onChange={(e) => setField('performance_notes', e.target.value)}
              rows={2}
              placeholder="What worked, what didn't, any context…"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveStats}
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save stats'}
            </button>
            <button
              type="button"
              onClick={() => setShowStats(false)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Brief */}
      <div className="px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
          Brief
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{output.brief}</p>
      </div>
    </div>
  )
}

interface PublishedSectionProps {
  initialOutputs: PublishedOutput[]
}

export function PublishedSection({ initialOutputs }: PublishedSectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <section className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Published</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {initialOutputs.length}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open ? 'rotate-0' : '-rotate-90',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-6 pb-6">
          {initialOutputs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No published content yet. Mark an output as published from any Marketing project.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {initialOutputs.map((output) => (
                <PublishedCard key={output.id} output={output} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
