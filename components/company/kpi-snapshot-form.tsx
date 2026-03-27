'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'
import type { KpiSnapshotRow } from '@/lib/queries/kpi-snapshots'
import { KPI_UNITS, KPI_CATEGORIES } from '@/lib/company/default-kpis'

function getMondayOfCurrentWeek(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

function groupByCategory(items: KpiDefinitionRow[]): Map<string, KpiDefinitionRow[]> {
  const map = new Map<string, KpiDefinitionRow[]>()
  for (const item of items) {
    const list = map.get(item.category) ?? []
    list.push(item)
    map.set(item.category, list)
  }
  return map
}

function categoryLabel(value: string): string {
  const found = KPI_CATEGORIES.find((c) => c.value === value)
  return found?.label ?? value
}

function unitHint(unit: string): string {
  const info = KPI_UNITS[unit]
  if (!info) return ''
  const parts: string[] = []
  if (info.prefix) parts.push(info.prefix)
  if (info.suffix) parts.push(info.suffix)
  return parts.join('')
}

export function KpiSnapshotForm({
  definitions,
  latestSnapshot,
  isAdmin,
}: {
  definitions: KpiDefinitionRow[]
  latestSnapshot: KpiSnapshotRow | null
  isAdmin: boolean
}) {
  const router = useRouter()
  const [date, setDate] = useState(getMondayOfCurrentWeek)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const d of definitions) {
      const existing = latestSnapshot?.values?.[d.id]
      initial[d.id] = existing !== undefined ? String(existing) : ''
    }
    return initial
  })
  const [notes, setNotes] = useState(latestSnapshot?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const grouped = useMemo(() => groupByCategory(definitions), [definitions])
  const categoryOrder = useMemo(() => {
    const order = KPI_CATEGORIES.map((c) => c.value)
    return order.filter((v) => grouped.has(v))
  }, [grouped])

  function setValue(defId: string, raw: string) {
    setValues((prev) => ({ ...prev, [defId]: raw }))
  }

  async function handleSave() {
    if (!isAdmin) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    const numericValues: Record<string, number> = {}
    for (const [id, raw] of Object.entries(values)) {
      const trimmed = raw.trim()
      if (trimmed === '') continue
      const num = Number(trimmed)
      if (isNaN(num)) {
        setError(`Invalid number for one of the KPIs. Please check your entries.`)
        setSaving(false)
        return
      }
      numericValues[id] = num
    }

    const res = await fetch('/api/kpi-snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshot_date: date,
        values: numericValues,
        notes: notes.trim() || null,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save snapshot. Please try again.')
      return
    }

    setSuccess(true)
    router.refresh()
  }

  if (definitions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Add KPI definitions above before entering weekly values.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Weekly entry</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enter values for the week. Existing entries for the same date are updated.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Snapshot saved.
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="snapshot-date" className="text-xs font-medium text-foreground">
          Week of
        </label>
        <input
          id="snapshot-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full max-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {categoryOrder.map((cat) => {
        const rows = grouped.get(cat) ?? []
        return (
          <section key={cat}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {categoryLabel(cat)}
            </h3>
            <div className="space-y-3">
              {rows.map((d) => {
                const hint = unitHint(d.unit)
                return (
                  <div key={d.id} className="flex items-center gap-4">
                    <label htmlFor={`kpi-${d.id}`} className="min-w-0 flex-1 text-sm text-foreground truncate">
                      {d.name}
                      {hint && (
                        <span className="ml-1 text-xs text-muted-foreground">({hint})</span>
                      )}
                    </label>
                    <input
                      id={`kpi-${d.id}`}
                      type="text"
                      inputMode="decimal"
                      value={values[d.id] ?? ''}
                      onChange={(e) => setValue(d.id, e.target.value)}
                      disabled={!isAdmin}
                      placeholder="—"
                      className="w-[140px] shrink-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground text-right tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <div className="space-y-1.5">
        <label htmlFor="snapshot-notes" className="text-xs font-medium text-foreground">
          Notes
        </label>
        <textarea
          id="snapshot-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={!isAdmin}
          placeholder="Any context about this week's numbers…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save snapshot'}
          </button>
        </div>
      )}
    </div>
  )
}
