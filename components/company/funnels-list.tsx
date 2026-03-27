'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, LayoutList } from 'lucide-react'
import type { FunnelWithStages } from '@/lib/queries/funnels'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'
import { FunnelBuilderDrawer } from './funnel-builder-drawer'

function resolveStageLabel(
  kpiDefinitionId: string,
  labelOverride: string | null,
  kpiDefinitions: KpiDefinitionRow[],
): string {
  if (labelOverride) return labelOverride
  const kpi = kpiDefinitions.find((k) => k.id === kpiDefinitionId)
  return kpi?.name ?? 'Unknown KPI'
}

export function FunnelsList({
  funnels: initialFunnels,
  kpiDefinitions,
  isAdmin,
}: {
  funnels: FunnelWithStages[]
  kpiDefinitions: KpiDefinitionRow[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [funnels, setFunnels] = useState<FunnelWithStages[]>(initialFunnels)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<FunnelWithStages | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setFunnels(initialFunnels)
  }, [initialFunnels])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  function openNew() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(f: FunnelWithStages) {
    setEditing(f)
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this funnel? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/funnels/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) refresh()
  }

  function handleSaved() {
    refresh()
    setDrawerOpen(false)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Funnels</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Create funnels to visualize conversion flows. Each stage links to a KPI you track.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Funnel
            </button>
          )}
        </div>

        {funnels.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Create funnels to visualize conversion flows. Each stage links to a KPI you track.
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={openNew}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Create the first funnel
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {funnels.map((f) => (
            <div
              key={f.id}
              className="group rounded-lg border border-border bg-background px-5 py-4 transition-colors hover:bg-muted/20"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0">
                  <LayoutList className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    {f.is_dashboard_default && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Dashboard default
                      </span>
                    )}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {f.stages.length} {f.stages.length === 1 ? 'stage' : 'stages'}
                    </span>
                  </div>

                  {f.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>
                  )}

                  {f.stages.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {f.stages.map((stage, idx) => (
                        <span key={stage.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {idx > 0 && <span className="text-border" aria-hidden>&rarr;</span>}
                          <span>{resolveStageLabel(stage.kpi_definition_id, stage.label_override, kpiDefinitions)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEdit(f)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      disabled={deleting === f.id}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {drawerOpen && (
        <FunnelBuilderDrawer
          funnel={editing}
          kpiDefinitions={kpiDefinitions}
          onClose={() => setDrawerOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
