'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BenchmarkWithDefault } from '@/lib/queries/content-benchmarks'

interface BenchmarkDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  benchmark: BenchmarkWithDefault | null
}

export function BenchmarkDrawer({ open, onClose, onSaved, benchmark }: BenchmarkDrawerProps) {
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && benchmark) {
      setValue(String(benchmark.benchmark_value))
      setNotes(benchmark.notes ?? '')
      setError(null)
    }
  }, [open, benchmark])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  async function handleSave() {
    if (!benchmark) return
    const num = Number(value)
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      setError('Enter a valid number.')
      return
    }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/content-benchmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: benchmark.platform,
        metric_name: benchmark.metric_name,
        benchmark_value: num,
        benchmark_unit: benchmark.benchmark_unit,
        notes: notes.trim() || null,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    onSaved()
    onClose()
  }

  if (!open || !benchmark) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative ml-auto flex h-full w-full flex-col bg-background shadow-2xl',
          'max-w-[420px]',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">Edit benchmark</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Platform</p>
            <p className="text-sm text-foreground">{benchmark.platform}</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Metric</p>
            <p className="text-sm text-foreground">{benchmark.metric_name}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="benchmark-value" className="text-xs font-medium text-foreground">
              Value <span className="text-destructive">*</span>
            </label>
            <input
              id="benchmark-value"
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Unit</p>
            <p className="text-sm text-foreground tabular-nums">{benchmark.benchmark_unit}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="benchmark-notes" className="text-xs font-medium text-foreground">
              Notes
            </label>
            <textarea
              id="benchmark-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional context for your team"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
