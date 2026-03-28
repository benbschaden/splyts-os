'use client'

import { MessageCircle, Plus, CheckCircle2, Loader2 } from 'lucide-react'
import type { DiscussionRow } from '@/lib/queries/discussions'

interface DiscussionListProps {
  discussions: DiscussionRow[]
  isLoading: boolean
  selectedId: string | null
  statusFilter: 'all' | 'active' | 'resolved'
  onSelect: (id: string) => void
  onFilterChange: (filter: 'all' | 'active' | 'resolved') => void
  onCreateNew: () => void
}

const MODE_LABELS: Record<string, string> = { lightweight: 'Light', structured: 'Structured' }
const FILTERS: Array<{ id: 'all' | 'active' | 'resolved'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'resolved', label: 'Resolved' },
]

export function DiscussionList({
  discussions,
  isLoading,
  selectedId,
  statusFilter,
  onSelect,
  onFilterChange,
  onCreateNew,
}: DiscussionListProps) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Discussions</h3>
        <button
          onClick={onCreateNew}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="New discussion"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-1 px-3 py-2 border-b border-border">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              statusFilter === f.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : discussions.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <MessageCircle className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No discussions</p>
            <button
              onClick={onCreateNew}
              className="mt-2 text-xs text-foreground underline underline-offset-2"
            >
              Start one
            </button>
          </div>
        ) : (
          discussions.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors ${
                selectedId === d.id ? 'bg-accent' : 'hover:bg-accent/50'
              } ${d.status === 'resolved' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                  {d.title}
                </p>
                {d.status === 'resolved' && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  d.mode === 'structured'
                    ? 'bg-foreground/10 text-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {MODE_LABELS[d.mode]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(d.updated_at).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  )
}
