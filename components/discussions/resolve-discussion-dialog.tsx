'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import type {
  DiscussionRow,
  DiscussionResolutionData,
} from '@/lib/queries/discussions'

interface ResolveDiscussionDialogProps {
  discussion: DiscussionRow
  onResolved: (discussion: DiscussionRow, resolution: DiscussionResolutionData) => void
  onClose: () => void
}

type Phase = 'loading' | 'editing' | 'saving' | 'error'

export function ResolveDiscussionDialog({
  discussion,
  onResolved,
  onClose,
}: ResolveDiscussionDialogProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [summary, setSummary] = useState('')
  const [decisions, setDecisions] = useState<string[]>([])
  const [learnings, setLearnings] = useState<string[]>([])
  const [nextSteps, setNextSteps] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    void generatePreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generatePreview(): Promise<void> {
    setPhase('loading')
    const res = await fetch(`/api/discussions/${discussion.id}/resolve/preview`, { method: 'POST' })
    const data = (await res.json()) as {
      summary?: string
      decisions?: string[]
      learnings?: string[]
      nextSteps?: string[]
      error?: string
    }
    if (!res.ok) {
      setErrorMsg(data.error ?? 'Failed to generate summary')
      setPhase('error')
      return
    }
    setSummary(data.summary ?? '')
    setDecisions(data.decisions ?? [])
    setLearnings(data.learnings ?? [])
    setNextSteps(data.nextSteps ?? [])
    setPhase('editing')
  }

  async function handleSave(): Promise<void> {
    setPhase('saving')
    const res = await fetch(`/api/discussions/${discussion.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary,
        decisions: decisions.filter((d) => d.trim()),
        learnings: learnings.filter((l) => l.trim()),
        nextSteps: nextSteps.filter((ns) => ns.trim()).map((text) => ({ text })),
      }),
    })
    const data = (await res.json()) as { discussion?: DiscussionRow; error?: string }
    if (!res.ok) {
      setErrorMsg(data.error ?? 'Failed to save resolution')
      setPhase('editing')
      return
    }
    const detailRes = await fetch(`/api/discussions/${discussion.id}`)
    const detailData = (await detailRes.json()) as { resolution: DiscussionResolutionData | null }
    const resolution: DiscussionResolutionData = detailData.resolution ?? {
      decisions: [],
      learnings: [],
      nextSteps: [],
    }
    onResolved(data.discussion!, resolution)
  }

  function addItem(setter: React.Dispatch<React.SetStateAction<string[]>>): void {
    setter((prev) => [...prev, ''])
  }

  function updateItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    idx: number,
    val: string,
  ): void {
    setter((prev) => prev.map((item, i) => (i === idx ? val : item)))
  }

  function removeItem(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number): void {
    setter((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Resolve Discussion</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generating summary…</p>
            </div>
          )}
          {phase === 'error' && (
            <div className="py-8 text-center">
              <p className="mb-3 text-sm text-destructive">{errorMsg}</p>
              <button onClick={() => void generatePreview()} className="text-sm underline">
                Try again
              </button>
            </div>
          )}
          {(phase === 'editing' || phase === 'saving') && (
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="resolution-summary"
                  className="mb-1.5 block text-sm font-semibold text-foreground"
                >
                  Summary
                </label>
                <textarea
                  id="resolution-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>
              <EditableList
                label="Decisions"
                items={decisions}
                onAdd={() => addItem(setDecisions)}
                onChange={(i, v) => updateItem(setDecisions, i, v)}
                onRemove={(i) => removeItem(setDecisions, i)}
                placeholder="A decision that was made"
              />
              <EditableList
                label="Learnings"
                items={learnings}
                onAdd={() => addItem(setLearnings)}
                onChange={(i, v) => updateItem(setLearnings, i, v)}
                onRemove={(i) => removeItem(setLearnings, i)}
                placeholder="An insight or realisation"
              />
              <EditableList
                label="Next Steps"
                items={nextSteps}
                onAdd={() => addItem(setNextSteps)}
                onChange={(i, v) => updateItem(setNextSteps, i, v)}
                onRemove={(i) => removeItem(setNextSteps, i)}
                placeholder="An action item"
              />
            </div>
          )}
        </div>

        {(phase === 'editing' || phase === 'saving') && (
          <div className="flex gap-2 border-t border-border px-5 py-4">
            <button
              onClick={() => void handleSave()}
              disabled={!summary.trim() || phase === 'saving'}
              className="flex-1 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {phase === 'saving' ? 'Saving…' : 'Save Resolution'}
            </button>
            <button
              onClick={onClose}
              disabled={phase === 'saving'}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EditableList({
  label,
  items,
  onAdd,
  onChange,
  onRemove,
  placeholder,
}: {
  label: string
  items: string[]
  onAdd: () => void
  onChange: (i: number, v: string) => void
  onRemove: (i: number) => void
  placeholder: string
}): React.ReactElement {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">None identified</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => onChange(i, e.target.value)}
                placeholder={placeholder}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
              />
              <button
                onClick={() => onRemove(i)}
                aria-label="Remove"
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
