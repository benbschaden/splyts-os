'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, CircleCheck } from 'lucide-react'

interface MarkMilestoneDoneDialogProps {
  open: boolean
  milestone: { id: string; title: string } | null
  onClose: () => void
  onMarked: () => void
}

export function MarkMilestoneDoneDialog({
  open,
  milestone,
  onClose,
  onMarked,
}: MarkMilestoneDoneDialogProps) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNotes('')
      setError(null)
    }
  }, [open, milestone?.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, saving])

  async function handleMarkDone() {
    if (!milestone) return
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/company-milestones/${milestone.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'achieved',
        completion_notes: notes.trim() || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      let message = 'Could not update milestone.'
      try {
        const body = await res.json() as { error?: unknown }
        const err = body.error
        if (err && typeof err === 'object' && !Array.isArray(err)) {
          const first = Object.values(err as Record<string, string[] | undefined>).find((v) => Array.isArray(v) && v.length)
          if (first?.[0]) message = first[0]
        }
      } catch {
        /* ignore */
      }
      setError(message)
      return
    }
    onMarked()
    onClose()
  }

  if (!open || !milestone) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <CircleCheck className="h-4 w-4 text-green-600" />
            <h2 className="text-sm font-semibold text-foreground">Mark as achieved</h2>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{milestone.title}</span>
            {' '}will show as achieved on the timeline.
          </p>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="milestone-completion-notes" className="text-xs font-medium text-foreground">
              Completion notes <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="milestone-completion-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Hit 52 users on launch day, announced in Slack…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMarkDone}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Mark done
          </button>
        </div>
      </div>
    </div>
  )
}
