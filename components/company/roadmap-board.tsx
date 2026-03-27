'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RoadmapItemDrawer } from './roadmap-item-drawer'

interface RoadmapItem {
  id: string
  title: string
  description: string | null
  phase: 'now' | 'next' | 'later'
  status: 'planned' | 'in_progress' | 'done' | 'cancelled'
  category: string | null
  sort_order: number
}

const PHASES: { key: RoadmapItem['phase']; label: string; color: string }[] = [
  { key: 'now', label: 'Now', color: 'text-green-600' },
  { key: 'next', label: 'Next', color: 'text-amber-600' },
  { key: 'later', label: 'Later', color: 'text-sky-600' },
]

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-600',
  done: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-destructive/10 text-destructive',
}

export function RoadmapBoard({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<RoadmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<RoadmapItem | null>(null)
  const [defaultPhase, setDefaultPhase] = useState<RoadmapItem['phase']>('now')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/product-roadmap')
    if (res.ok) {
      const { data } = await res.json()
      setItems(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew(phase: RoadmapItem['phase']) {
    setEditing(null)
    setDefaultPhase(phase)
    setDrawerOpen(true)
  }

  function openEdit(item: RoadmapItem) {
    setEditing(item)
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this roadmap item?')) return
    await fetch(`/api/product-roadmap/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Product roadmap</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Now / Next / Later planning board. Included in business plan PDF and AI context.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PHASES.map((p) => (
              <div key={p.key} className="h-48 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PHASES.map((phase) => {
              const phaseItems = items.filter((i) => i.phase === phase.key)
              return (
                <div key={phase.key} className="flex flex-col rounded-lg border border-border bg-background">
                  {/* Column header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-semibold', phase.color)}>{phase.label}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {phaseItems.length}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => openNew(phase.key)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
                        title={`Add ${phase.label} item`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Items */}
                  <div className="flex-1 p-3 space-y-2 min-h-[120px]">
                    {phaseItems.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground/50 pt-6">Empty</p>
                    )}
                    {phaseItems.map((item) => (
                      <div
                        key={item.id}
                        className="group rounded-md border border-border bg-muted/20 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-foreground leading-snug">{item.title}</p>
                          {isAdmin && (
                            <div className="shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(item)} className="rounded p-1 hover:bg-accent text-muted-foreground transition-colors">
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="rounded p-1 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', STATUS_STYLES[item.status])}>
                            {item.status.replace('_', ' ')}
                          </span>
                          {item.category && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add link at bottom */}
                  {isAdmin && (
                    <button
                      onClick={() => openNew(phase.key)}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border"
                    >
                      <Plus className="h-3 w-3" />
                      Add item
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <RoadmapItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
        editing={editing}
        defaultPhase={defaultPhase}
      />
    </>
  )
}
