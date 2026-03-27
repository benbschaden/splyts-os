'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FunnelWithStages } from '@/lib/queries/funnels'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'
import { KPI_UNITS } from '@/lib/company/default-kpis'

interface StageEntry {
  kpiDefinitionId: string
  labelOverride: string
}

interface FunnelBuilderDrawerProps {
  funnel: FunnelWithStages | null
  kpiDefinitions: KpiDefinitionRow[]
  onClose: () => void
  onSaved: () => void
}

function kpiOptionLabel(kpi: KpiDefinitionRow): string {
  const unitLabel = KPI_UNITS[kpi.unit]?.label ?? kpi.unit
  return `${kpi.name} (${unitLabel})`
}

function emptyStage(): StageEntry {
  return { kpiDefinitionId: '', labelOverride: '' }
}

export function FunnelBuilderDrawer({ funnel, kpiDefinitions, onClose, onSaved }: FunnelBuilderDrawerProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isDashboardDefault, setIsDashboardDefault] = useState(false)
  const [stages, setStages] = useState<StageEntry[]>([emptyStage(), emptyStage()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (funnel) {
      setName(funnel.name)
      setDescription(funnel.description ?? '')
      setIsDashboardDefault(funnel.is_dashboard_default)
      setStages(
        funnel.stages.map((s) => ({
          kpiDefinitionId: s.kpi_definition_id,
          labelOverride: s.label_override ?? '',
        })),
      )
    } else {
      setName('')
      setDescription('')
      setIsDashboardDefault(false)
      setStages([emptyStage(), emptyStage()])
    }
    setError(null)
  }, [funnel])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function updateStage(index: number, patch: Partial<StageEntry>) {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function addStage() {
    setStages((prev) => [...prev, emptyStage()])
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    const validStages = stages.filter((s) => s.kpiDefinitionId)
    if (validStages.length < 2) {
      setError('At least 2 stages with a KPI selected are required.')
      return
    }

    setSaving(true)
    setError(null)

    const url = funnel ? `/api/funnels/${funnel.id}` : '/api/funnels'
    const method = funnel ? 'PATCH' : 'POST'

    const body = {
      name: name.trim(),
      description: description.trim() || null,
      is_dashboard_default: isDashboardDefault,
      stages: validStages.map((s, i) => ({
        kpi_definition_id: s.kpiDefinitionId,
        stage_order: i,
        label_override: s.labelOverride.trim() || null,
      })),
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative ml-auto flex h-full w-full flex-col bg-background shadow-2xl',
          'max-w-[540px]',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {funnel ? 'Edit Funnel' : 'New Funnel'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="funnel-name" className="text-xs font-medium text-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="funnel-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Signup to Paid"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="funnel-description" className="text-xs font-medium text-foreground">
              Description
            </label>
            <textarea
              id="funnel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What this funnel measures"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Settings</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
              <button
                type="button"
                role="switch"
                aria-checked={isDashboardDefault}
                onClick={() => setIsDashboardDefault(!isDashboardDefault)}
                className={cn(
                  'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                  isDashboardDefault ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    isDashboardDefault ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-foreground">Dashboard default</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isDashboardDefault
                    ? 'This funnel is shown on the main dashboard.'
                    : 'Set as the default funnel displayed on the dashboard.'}
                </p>
              </div>
            </label>
          </section>

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Stages <span className="text-destructive">*</span>
            </p>
            <div className="space-y-2">
              {stages.map((stage, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="mt-2.5 shrink-0 text-xs font-medium text-muted-foreground w-5 text-right">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <select
                      value={stage.kpiDefinitionId}
                      onChange={(e) => updateStage(idx, { kpiDefinitionId: e.target.value })}
                      aria-label={`Stage ${idx + 1} KPI`}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select a KPI…</option>
                      {kpiDefinitions.map((kpi) => (
                        <option key={kpi.id} value={kpi.id}>
                          {kpiOptionLabel(kpi)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={stage.labelOverride}
                      onChange={(e) => updateStage(idx, { labelOverride: e.target.value })}
                      placeholder="Custom label"
                      aria-label={`Stage ${idx + 1} custom label`}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStage(idx)}
                    disabled={stages.length <= 2}
                    className="mt-2 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove stage"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addStage}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add stage
            </button>
          </section>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : funnel ? 'Save changes' : 'Create Funnel'}
          </button>
        </div>
      </div>
    </div>
  )
}
