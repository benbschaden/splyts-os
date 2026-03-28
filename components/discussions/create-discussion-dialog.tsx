'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { DiscussionRow, DiscussionParentType, DiscussionMode } from '@/lib/queries/discussions'

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
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
      }),
    })

    const data = await res.json() as { error?: string; discussion?: DiscussionRow }
    if (!res.ok) {
      setError(data.error ?? 'Failed to create discussion')
      setIsSubmitting(false)
      return
    }

    onCreated(data.discussion as DiscussionRow)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">New Discussion</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <p className="mb-1.5 block text-sm font-medium text-foreground">Type</p>
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

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
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
