'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Sparkles, ShieldOff } from 'lucide-react'
import type { CompetitorRow } from '@/lib/queries/competitors'
import { CompetitorDrawer } from './competitor-drawer'

function truncate(text: string | null, max: number) {
  if (!text) return null
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

export function CompetitorsList({
  competitors: initialCompetitors,
  isAdmin,
}: {
  competitors: CompetitorRow[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [competitors, setCompetitors] = useState<CompetitorRow[]>(initialCompetitors)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<CompetitorRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setCompetitors(initialCompetitors)
  }, [initialCompetitors])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  function openNew() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(c: CompetitorRow) {
    setEditing(c)
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this competitor? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/competitors/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) refresh()
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Competitive landscape</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Entries marked for AI are included in generation and differentiation prompts.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add competitor
            </button>
          )}
        </div>

        {competitors.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No competitors added yet.</p>
            {isAdmin && (
              <button
                type="button"
                onClick={openNew}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Add the first competitor
              </button>
            )}
          </div>
        )}

        {competitors.length > 0 && (
          <div className="space-y-2">
            {competitors.map((c) => (
              <div
                key={c.id}
                className="group flex items-start gap-4 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20"
              >
                <div className="mt-0.5 shrink-0">
                  {c.include_in_ai ? (
                    <Sparkles className="h-4 w-4 text-blue-500" aria-hidden />
                  ) : (
                    <ShieldOff className="h-4 w-4 text-muted-foreground/40" aria-hidden />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    {c.website && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={c.website}>
                        {c.website.replace(/^https?:\/\//, '')}
                      </span>
                    )}
                  </div>
                  {c.positioning && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.positioning}</p>
                  )}
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 text-[11px] text-muted-foreground/90">
                    {c.strengths && (
                      <p className="min-w-0">
                        <span className="font-medium text-foreground/70">S: </span>
                        {truncate(c.strengths, 120)}
                      </p>
                    )}
                    {c.weaknesses && (
                      <p className="min-w-0">
                        <span className="font-medium text-foreground/70">W: </span>
                        {truncate(c.weaknesses, 120)}
                      </p>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
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

      <CompetitorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
        editing={editing}
      />
    </>
  )
}
