'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'
import { KPI_UNITS, KPI_CATEGORIES } from '@/lib/company/default-kpis'
import { KpiDefinitionDrawer } from './kpi-definition-drawer'

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

function unitBadge(unit: string): string {
  return KPI_UNITS[unit]?.label ?? unit
}

export function KpiDefinitionsList({
  definitions: initialDefinitions,
  isAdmin,
}: {
  definitions: KpiDefinitionRow[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [definitions, setDefinitions] = useState<KpiDefinitionRow[]>(initialDefinitions)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<KpiDefinitionRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setDefinitions(initialDefinitions)
  }, [initialDefinitions])

  const grouped = useMemo(() => groupByCategory(definitions), [definitions])

  const categoryOrder = useMemo(() => {
    const order = KPI_CATEGORIES.map((c) => c.value)
    return order.filter((v) => grouped.has(v))
  }, [grouped])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  function openNew() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(d: KpiDefinitionRow) {
    setEditing(d)
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this KPI definition? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/kpi-definitions/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) refresh()
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Definitions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Starred KPIs are highlighted on dashboards and included in AI prompts.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add KPI
            </button>
          )}
        </div>

        {definitions.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No KPIs defined yet.</p>
            {isAdmin && (
              <button
                type="button"
                onClick={openNew}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Add the first KPI
              </button>
            )}
          </div>
        )}

        {categoryOrder.map((cat) => {
          const rows = grouped.get(cat) ?? []
          return (
            <section key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                {categoryLabel(cat)}
              </h3>
              <div className="space-y-1.5">
                {rows.map((d) => (
                  <div
                    key={d.id}
                    className="group flex items-start gap-4 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="mt-0.5 shrink-0">
                      <Star
                        className={
                          d.is_highlighted
                            ? 'h-4 w-4 fill-amber-400 text-amber-400'
                            : 'h-4 w-4 text-muted-foreground/30'
                        }
                        aria-hidden
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{d.name}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {unitBadge(d.unit)}
                        </span>
                      </div>
                      {d.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          disabled={deleting === d.id}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <KpiDefinitionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
        editing={editing}
      />
    </>
  )
}
