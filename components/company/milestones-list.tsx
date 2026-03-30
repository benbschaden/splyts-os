'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MilestoneDrawer } from './milestone-drawer'

interface Milestone {
  id: string
  title: string
  description: string | null
  milestone_date: string
  category: string | null
  status: 'planned' | 'achieved' | 'missed' | 'pushed'
}

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-sky-500/10 text-sky-600',
  pushed: 'bg-sky-500/10 text-sky-600',
  achieved: 'bg-green-500/10 text-green-600',
  missed: 'bg-destructive/10 text-destructive',
}

function statusBadgeLabel(status: Milestone['status']): string {
  if (status === 'planned' || status === 'pushed') return 'upcoming'
  return status
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', day: 'numeric' })
}

export function MilestonesList({ isAdmin }: { isAdmin: boolean }) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Milestone | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/company-milestones')
    if (res.ok) {
      const { data } = await res.json()
      setMilestones(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Delete this milestone?')) return
    await fetch(`/api/company-milestones/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Company milestones</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Key moments in the company's history. Included in business plan and AI context.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setEditing(null); setDrawerOpen(true) }}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add milestone
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />)}
          </div>
        )}

        {!loading && milestones.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No milestones recorded yet.</p>
            {isAdmin && (
              <button onClick={() => { setEditing(null); setDrawerOpen(true) }} className="mt-3 text-sm font-medium text-primary hover:underline">
                Add the first milestone
              </button>
            )}
          </div>
        )}

        {!loading && milestones.length > 0 && (
          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {milestones.map((m) => (
                <div key={m.id} className="group relative">
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute -left-[18px] top-3 h-3 w-3 rounded-full border-2 border-background',
                    m.status === 'achieved' ? 'bg-green-500' : m.status === 'missed' ? 'bg-destructive' : 'bg-sky-500', // planned | pushed
                  )} />

                  <div className="rounded-lg border border-border bg-background px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{m.title}</p>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLES[m.status])}>
                            {statusBadgeLabel(m.status)}
                          </span>
                          {m.category && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{m.category}</span>
                          )}
                        </div>
                        {m.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
                        )}
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                          <Flag className="h-3 w-3" />
                          {formatDate(m.milestone_date)}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditing(m); setDrawerOpen(true) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(m.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <MilestoneDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
        editing={editing}
      />
    </>
  )
}
