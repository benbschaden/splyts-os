'use client'

import { useState, useEffect } from 'react'
import { X, Check, Search } from 'lucide-react'
import type { DiscussionRow, DiscussionParentType, DiscussionMode } from '@/lib/queries/discussions'
import type { OrgMember } from '@/lib/queries/teams'

interface CreateDiscussionDialogProps {
  parentType: DiscussionParentType
  parentId: string
  sectionKey?: string
  onCreated: (discussion: DiscussionRow) => void
  onClose: () => void
}

export function CreateDiscussionDialog({
  parentType,
  parentId,
  sectionKey,
  onCreated,
  onClose,
}: CreateDiscussionDialogProps) {
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<DiscussionMode>('lightweight')
  const [members, setMembers] = useState<OrgMember[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadMembers()
  }, [])

  async function loadMembers() {
    setIsLoadingMembers(true)
    const res = await fetch('/api/org-members')
    if (res.ok) {
      const data = (await res.json()) as { data: OrgMember[] }
      // Exclude current user — they're added as creator automatically
      setMembers(data.data ?? [])
    }
    setIsLoadingMembers(false)
  }

  function toggleMember(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const filtered = members.filter((m) => {
    if (!search.trim()) return true
    const name = (m.full_name ?? m.user_id).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || selectedIds.size === 0) return
    setIsSubmitting(true)
    setError(null)

    const res = await fetch('/api/discussions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_type: parentType,
        parent_id: parentId,
        section_key: sectionKey,
        mode,
        title: title.trim(),
        participant_ids: Array.from(selectedIds),
      }),
    })

    const data = (await res.json()) as { error?: string; discussion?: DiscussionRow }
    if (!res.ok) {
      setError(data.error ?? 'Failed to create discussion')
      setIsSubmitting(false)
      return
    }

    onCreated(data.discussion as DiscussionRow)
  }

  const canSubmit = title.trim().length > 0 && selectedIds.size > 0 && !isSubmitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">New Discussion</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 p-5">
          {/* Title */}
          <div>
            <label htmlFor="disc-title" className="mb-1.5 block text-sm font-medium text-foreground">
              Title
            </label>
            <input
              id="disc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this discussion about?"
              autoFocus
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
          </div>

          {/* Participants */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Participants</p>
              {selectedIds.size > 0 && (
                <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              )}
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people…"
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
              />
            </div>

            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              {isLoadingMembers ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">No people found</div>
              ) : (
                filtered.map((m) => {
                  const isSelected = selectedIds.has(m.user_id)
                  const label = m.full_name ?? m.user_id
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => toggleMember(m.user_id)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                        isSelected ? 'bg-accent/50' : ''
                      }`}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium text-foreground">
                        {label.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 truncate text-foreground">{label}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-foreground" />}
                    </button>
                  )
                })
              )}
            </div>

            {selectedIds.size === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Select at least one person to start a discussion with.</p>
            )}
          </div>

          {/* Type */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Type</p>
            <div className="flex gap-2">
              {(['lightweight', 'structured'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === m
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:border-foreground/50'
                  }`}
                >
                  {m === 'lightweight' ? 'Lightweight' : 'Structured'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === 'lightweight'
                ? 'Quick question or clarification. Can be promoted later.'
                : 'Decision, strategy, or important topic. Expected to resolve.'}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Discussion'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
