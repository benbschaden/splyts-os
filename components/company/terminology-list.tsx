'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  TERMINOLOGY_CATEGORY_LABELS,
  TERMINOLOGY_CATEGORY_ORDER,
  type TerminologyRow,
} from '@/lib/queries/terminology'
import { TermDrawer } from './term-drawer'

function groupByCategory(rows: TerminologyRow[]): Map<string, TerminologyRow[]> {
  const map = new Map<string, TerminologyRow[]>()
  for (const key of TERMINOLOGY_CATEGORY_ORDER) {
    map.set(key, [])
  }
  for (const row of rows) {
    const k = TERMINOLOGY_CATEGORY_ORDER.includes(row.category as (typeof TERMINOLOGY_CATEGORY_ORDER)[number])
      ? row.category
      : 'general'
    const list = map.get(k) ?? []
    list.push(row)
    map.set(k, list)
  }
  return map
}

export function TerminologyList({
  terms: initialTerms,
  isAdmin,
}: {
  terms: TerminologyRow[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [terms, setTerms] = useState<TerminologyRow[]>(initialTerms)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<TerminologyRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setTerms(initialTerms)
  }, [initialTerms])

  const grouped = useMemo(() => groupByCategory(terms), [terms])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  function openNew() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(t: TerminologyRow) {
    setEditing(t)
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this terminology rule? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/terminology/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) refresh()
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Glossary</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reference for writers and AI: preferred phrasing and words to avoid.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add term
            </button>
          )}
        </div>

        {terms.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Add terminology rules to keep AI output consistent. Define what to always say and what to never say.
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={openNew}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Add the first rule
              </button>
            )}
          </div>
        )}

        {terms.length > 0 && (
          <div className="space-y-8">
            {TERMINOLOGY_CATEGORY_ORDER.map((cat) => {
              const list = grouped.get(cat) ?? []
              if (list.length === 0) return null
              return (
                <section key={cat}>
                  <h3 className="mb-2 border-b border-border pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {TERMINOLOGY_CATEGORY_LABELS[cat]}
                  </h3>
                  <div className="divide-y divide-border rounded-md border border-border bg-background">
                    {list.map((t) => (
                      <div
                        key={t.id}
                        className="group flex items-start gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/20"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-semibold text-foreground">{t.term}</p>
                          <p>
                            <span className="mr-2 inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                              Always say
                            </span>
                            <span className="text-foreground/90">{t.preferred}</span>
                          </p>
                          {t.avoid && (
                            <p>
                              <span className="mr-2 inline-flex items-center rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-700 dark:text-red-400">
                                Never say
                              </span>
                              <span className="text-foreground/90">{t.avoid}</span>
                            </p>
                          )}
                          {t.context && (
                            <p className="text-xs text-muted-foreground">{t.context}</p>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(t.id)}
                              disabled={deleting === t.id}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
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
        )}
      </div>

      <TermDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
        editing={editing}
      />
    </>
  )
}
