'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Sparkles, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeatureDrawer } from './feature-drawer'

interface Feature {
  id: string
  name: string
  tagline: string | null
  description: string | null
  category: string
  surfaces: string[]
  status: 'live' | 'beta' | 'planned' | 'deprecated'
  include_in_ai: boolean
  sort_order: number
}

const STATUS_STYLES: Record<string, string> = {
  live: 'bg-green-500/10 text-green-600',
  beta: 'bg-amber-500/10 text-amber-600',
  planned: 'bg-sky-500/10 text-sky-600',
  deprecated: 'bg-muted text-muted-foreground',
}

export function FeaturesList({ isAdmin }: { isAdmin: boolean }) {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Feature | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/product-features')
    if (res.ok) {
      const { data } = await res.json()
      setFeatures(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setEditing(null); setDrawerOpen(true) }
  function openEdit(f: Feature) { setEditing(f); setDrawerOpen(true) }

  async function handleDelete(id: string) {
    if (!confirm('Delete this feature? This cannot be undone.')) return
    setDeleting(id)
    await fetch(`/api/product-features/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  const grouped = features.reduce<Record<string, Feature[]>>((acc, f) => {
    const key = f.category || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Product features</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Features with AI enabled are included in generation and chat prompts.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add feature
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && features.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No features added yet.</p>
            {isAdmin && (
              <button
                onClick={openNew}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Add the first feature
              </button>
            )}
          </div>
        )}

        {!loading && Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">
              {category}
            </p>
            <div className="space-y-2">
              {items.map((f) => (
                <div
                  key={f.id}
                  className="group flex items-start gap-4 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20"
                >
                  {/* AI indicator */}
                  <div className="mt-0.5 shrink-0">
                    {f.include_in_ai ? (
                      <Sparkles className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{f.name}</p>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLES[f.status])}>
                        {f.status}
                      </span>
                      {f.surfaces.slice(0, 3).map((s) => (
                        <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {s}
                        </span>
                      ))}
                      {f.surfaces.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{f.surfaces.length - 3} more</span>
                      )}
                    </div>
                    {f.tagline && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{f.tagline}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(f)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
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
              ))}
            </div>
          </div>
        ))}
      </div>

      <FeatureDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
        editing={editing}
      />
    </>
  )
}
