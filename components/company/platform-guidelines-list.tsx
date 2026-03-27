'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Sparkles, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformGuidelineDrawer } from './platform-guideline-drawer'

interface PlatformGuideline {
  id: string
  platform_name: string
  guidelines: string
  format_notes: string | null
  cadence: string | null
  include_in_ai: boolean
  sort_order: number
}

export function PlatformGuidelinesList({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<PlatformGuideline[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<PlatformGuideline | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/platform-guidelines')
    if (res.ok) {
      const { data } = await res.json()
      setItems(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Delete this platform guideline?')) return
    await fetch(`/api/platform-guidelines/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Platform guidelines</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tone, format, and cadence rules per platform. Injected into generation prompts when the content type matches.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setEditing(null); setDrawerOpen(true) }}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add platform
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />)}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No platform guidelines yet.</p>
            {isAdmin && (
              <button onClick={() => { setEditing(null); setDrawerOpen(true) }} className="mt-3 text-sm font-medium text-primary hover:underline">
                Add the first platform
              </button>
            )}
          </div>
        )}

        {!loading && items.map((item) => {
          const isExpanded = expanded === item.id
          return (
            <div key={item.id} className="group rounded-lg border border-border bg-background overflow-hidden">
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : item.id)}
              >
                {/* AI indicator */}
                <div className="shrink-0">
                  {item.include_in_ai ? (
                    <Sparkles className="h-4 w-4 text-blue-500" />
                  ) : (
                    <ShieldOff className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.platform_name}</p>
                  {item.cadence && (
                    <p className="text-xs text-muted-foreground">{item.cadence}</p>
                  )}
                </div>

                {isAdmin && (
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditing(item); setDrawerOpen(true) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <span className={cn('shrink-0 text-[10px] text-muted-foreground transition-transform', isExpanded ? 'rotate-0' : '')}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/10">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Guidelines</p>
                    <p className="whitespace-pre-wrap text-xs text-foreground">{item.guidelines}</p>
                  </div>
                  {item.format_notes && (
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Format notes</p>
                      <p className="whitespace-pre-wrap text-xs text-foreground">{item.format_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <PlatformGuidelineDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
        editing={editing}
      />
    </>
  )
}
