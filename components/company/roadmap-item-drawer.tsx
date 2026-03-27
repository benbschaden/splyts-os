'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const KNOWN_CATEGORIES = ['core', 'AI', 'mobile', 'integrations', 'analytics', 'admin', 'social']

interface RoadmapItem {
  id: string
  title: string
  description: string | null
  phase: 'now' | 'next' | 'later'
  status: 'planned' | 'in_progress' | 'done' | 'cancelled'
  category: string | null
}

interface RoadmapItemDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: RoadmapItem | null
  defaultPhase: 'now' | 'next' | 'later'
}

interface FormData {
  title: string
  description: string
  phase: 'now' | 'next' | 'later'
  status: 'planned' | 'in_progress' | 'done' | 'cancelled'
  category: string
}

export function RoadmapItemDrawer({ open, onClose, onSaved, editing, defaultPhase }: RoadmapItemDrawerProps) {
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    phase: defaultPhase,
    status: 'planned',
    category: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        title: editing.title,
        description: editing.description ?? '',
        phase: editing.phase,
        status: editing.status,
        category: editing.category ?? '',
      } : {
        title: '',
        description: '',
        phase: defaultPhase,
        status: 'planned',
        category: '',
      })
      setError(null)
    }
  }, [open, editing, defaultPhase])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)

    const url = editing ? `/api/product-roadmap/${editing.id}` : '/api/product-roadmap'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        phase: form.phase,
        status: form.status,
        category: form.category.trim() || null,
      }),
    })

    setSaving(false)
    if (!res.ok) { setError('Failed to save. Please try again.'); return }
    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit roadmap item' : 'New roadmap item'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Title <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Athlete progress dashboard"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="What will this deliver? Who benefits?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Phase</label>
              <div className="flex flex-col gap-1.5">
                {(['now', 'next', 'later'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('phase', p)}
                    className={cn(
                      'rounded-md px-3 py-2 text-xs font-medium capitalize text-left transition-colors',
                      form.phase === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Status</label>
              <div className="flex flex-col gap-1.5">
                {(['planned', 'in_progress', 'done', 'cancelled'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('status', s)}
                    className={cn(
                      'rounded-md px-3 py-2 text-xs font-medium text-left transition-colors',
                      form.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Category</label>
            <input
              type="text"
              list="roadmap-categories"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="e.g. AI, mobile, core"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <datalist id="roadmap-categories">
              {KNOWN_CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </div>
    </div>
  )
}
