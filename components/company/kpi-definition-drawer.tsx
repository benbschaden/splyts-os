'use client'

import { useState, useEffect } from 'react'
import { X, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KPI_CATEGORIES } from '@/lib/company/default-kpis'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'

interface KpiDefinitionDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: KpiDefinitionRow | null
}

interface FormData {
  name: string
  unit: string
  category: string
  description: string
  is_highlighted: boolean
}

const EMPTY: FormData = {
  name: '',
  unit: 'count',
  category: 'custom',
  description: '',
  is_highlighted: false,
}

const UNIT_OPTIONS = [
  { value: 'count', label: 'Count' },
  { value: 'currency', label: 'Currency' },
  { value: 'percent', label: 'Percentage' },
  { value: 'ratio', label: 'Ratio' },
]

export function KpiDefinitionDrawer({ open, onClose, onSaved, editing }: KpiDefinitionDrawerProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              unit: editing.unit,
              category: editing.category,
              description: editing.description ?? '',
              is_highlighted: editing.is_highlighted,
            }
          : EMPTY,
      )
      setError(null)
    }
  }, [open, editing])

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

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)

    const url = editing ? `/api/kpi-definitions/${editing.id}` : '/api/kpi-definitions'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        unit: form.unit,
        category: form.category,
        description: form.description.trim() || null,
        is_highlighted: form.is_highlighted,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative ml-auto flex h-full w-full flex-col bg-background shadow-2xl',
          'max-w-[480px]',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit KPI' : 'New KPI'}
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
            <label htmlFor="kpi-name" className="text-xs font-medium text-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="kpi-name"
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Monthly Active Users"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="kpi-unit" className="text-xs font-medium text-foreground">
              Unit
            </label>
            <select
              id="kpi-unit"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="kpi-category" className="text-xs font-medium text-foreground">
              Category
            </label>
            <select
              id="kpi-category"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {KPI_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="kpi-description" className="text-xs font-medium text-foreground">
              Description
            </label>
            <textarea
              id="kpi-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="What this metric measures and why it matters"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Dashboard</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_highlighted}
                onClick={() => set('is_highlighted', !form.is_highlighted)}
                className={cn(
                  'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                  form.is_highlighted ? 'bg-amber-500' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    form.is_highlighted ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Star
                    className={
                      form.is_highlighted
                        ? 'h-3.5 w-3.5 fill-amber-400 text-amber-400'
                        : 'h-3.5 w-3.5 text-muted-foreground'
                    }
                  />
                  Highlight on dashboard
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {form.is_highlighted
                    ? 'This KPI is featured on dashboards and included in AI prompts.'
                    : 'This KPI will only appear in the full KPI list.'}
                </p>
              </div>
            </label>
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
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create KPI'}
          </button>
        </div>
      </div>
    </div>
  )
}
