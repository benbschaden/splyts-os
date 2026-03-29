'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Sparkles, ShieldOff } from 'lucide-react'
import type { BrandNarrativeRow } from '@/lib/queries/brand-narratives'
import { NarrativeDrawer } from './narrative-drawer'

export function NarrativesList({
  narratives: initialNarratives,
  isAdmin,
}: {
  narratives: BrandNarrativeRow[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [narratives, setNarratives] = useState<BrandNarrativeRow[]>(initialNarratives)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<BrandNarrativeRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setNarratives(initialNarratives)
  }, [initialNarratives])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  function openNew() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(n: BrandNarrativeRow) {
    setEditing(n)
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this narrative? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/brand-narratives/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) refresh()
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Core stories</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Numbered narratives your team repeats. Entries marked for AI anchor generation.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add narrative
            </button>
          )}
        </div>

        {narratives.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Add 3-5 core narratives — the repeatable stories your company tells.
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={openNew}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Add the first narrative
              </button>
            )}
          </div>
        )}

        {narratives.length > 0 && (
          <div className="space-y-2">
            {narratives.map((n, index) => (
              <div
                key={n.id}
                className="group flex items-start gap-4 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </div>

                <div className="mt-0.5 shrink-0">
                  {n.include_in_ai ? (
                    <Sparkles className="h-4 w-4 text-blue-500" aria-hidden />
                  ) : (
                    <ShieldOff className="h-4 w-4 text-muted-foreground/40" aria-hidden />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {n.narrative.replace(/^#+\s/gm, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/_(.*?)_/g, '$1')}
                  </p>
                  {n.usage_context && (
                    <p className="text-[11px] text-muted-foreground/80 italic border-l-2 border-border pl-2">
                      {n.usage_context}
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEdit(n)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      disabled={deleting === n.id}
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
        )}
      </div>

      <NarrativeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
        editing={editing}
      />
    </>
  )
}
