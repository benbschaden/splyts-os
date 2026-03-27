'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Sparkles, ShieldOff, CheckCircle2 } from 'lucide-react'
import type { SocialProofRow } from '@/lib/queries/social-proof'
import { SocialProofDrawer } from './social-proof-drawer'

const PROOF_ORDER = ['testimonial', 'case_study', 'metric', 'award'] as const

const SECTION_LABELS: Record<(typeof PROOF_ORDER)[number], string> = {
  testimonial: 'Testimonials',
  case_study: 'Case studies',
  metric: 'Metrics',
  award: 'Awards',
}

function isOrderedProofType(t: string): t is (typeof PROOF_ORDER)[number] {
  return PROOF_ORDER.includes(t as (typeof PROOF_ORDER)[number])
}

function cardPrimaryContent(row: SocialProofRow): string | null {
  if (row.proof_type === 'metric' && (row.metric_value?.trim() || row.metric_label?.trim())) {
    const v = row.metric_value?.trim() ?? ''
    const l = row.metric_label?.trim() ?? ''
    if (v && l) return `${v} ${l}`
    return v || l || null
  }
  const q = row.quote?.trim()
  return q || null
}

function attributionLine(row: SocialProofRow): string | null {
  const a = row.attribution?.trim()
  const c = row.company?.trim()
  if (a && c) return `${a} · ${c}`
  return a || c || null
}

export function SocialProofList({
  items: initialItems,
  isAdmin,
}: {
  items: SocialProofRow[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState<SocialProofRow[]>(initialItems)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<SocialProofRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const grouped = useMemo(() => {
    const map = new Map<string, SocialProofRow[]>()
    for (const t of PROOF_ORDER) {
      map.set(t, [])
    }
    const extra: SocialProofRow[] = []
    for (const row of items) {
      if (isOrderedProofType(row.proof_type)) {
        map.get(row.proof_type)!.push(row)
      } else {
        extra.push(row)
      }
    }
    return { map, extra }
  }, [items])

  function openNew() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(row: SocialProofRow) {
    setEditing(row)
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/social-proof/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) refresh()
  }

  function renderCard(row: SocialProofRow) {
    const primary = cardPrimaryContent(row)
    const attr = attributionLine(row)

    return (
      <div
        key={row.id}
        className="group flex items-start gap-4 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20"
      >
        <div className="mt-0.5 flex shrink-0 flex-col gap-1.5">
          {row.approved ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Approved for use" />
          ) : (
            <span
              className="h-4 w-4 rounded-full border border-dashed border-muted-foreground/30"
              aria-label="Not approved"
            />
          )}
          {row.include_in_ai ? (
            <Sparkles className="h-4 w-4 text-blue-500" aria-label="Included in AI" />
          ) : (
            <ShieldOff className="h-4 w-4 text-muted-foreground/40" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {primary ? (
            row.proof_type === 'metric' && (row.metric_value?.trim() || row.metric_label?.trim()) ? (
              <p className="text-sm text-foreground">
                {row.metric_value?.trim() && (
                  <span className="font-semibold tabular-nums">{row.metric_value.trim()}</span>
                )}
                {row.metric_value?.trim() && row.metric_label?.trim() && ' '}
                {row.metric_label?.trim() && (
                  <span className="text-muted-foreground">{row.metric_label.trim()}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-foreground leading-relaxed">{primary}</p>
            )
          ) : (
            <p className="text-sm italic text-muted-foreground">No quote or metric yet</p>
          )}
          {attr && <p className="text-xs text-muted-foreground">{attr}</p>}
          {row.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.tags.map((t) => (
                <span
                  key={`${row.id}-${t}`}
                  className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.id)}
              disabled={deleting === row.id}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

  const hasAny = items.length > 0

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Library</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Approved items can be referenced with confidence; AI inclusion controls prompt injection.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add proof
            </button>
          )}
        </div>

        {!hasAny && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No social proof added yet.</p>
            {isAdmin && (
              <button
                type="button"
                onClick={openNew}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Add the first entry
              </button>
            )}
          </div>
        )}

        {hasAny && (
          <div className="space-y-8">
            {PROOF_ORDER.map((type) => {
              const sectionItems = grouped.map.get(type) ?? []
              if (sectionItems.length === 0) return null
              return (
                <section key={type}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {SECTION_LABELS[type]}
                  </h3>
                  <div className="space-y-2">{sectionItems.map((row) => renderCard(row))}</div>
                </section>
              )
            })}
            {grouped.extra.length > 0 && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Other
                </h3>
                <div className="space-y-2">{grouped.extra.map((row) => renderCard(row))}</div>
              </section>
            )}
          </div>
        )}
      </div>

      <SocialProofDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
        editing={editing}
      />
    </>
  )
}
