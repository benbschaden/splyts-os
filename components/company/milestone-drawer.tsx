'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const KNOWN_CATEGORIES = ['growth', 'product', 'team', 'funding', 'partnerships', 'launch', 'operations']

interface Milestone {
  id: string
  title: string
  description: string | null
  milestone_date: string
  category: string | null
  status: 'upcoming' | 'achieved' | 'missed'
}

interface MilestoneDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: Milestone | null
}

interface FormData {
  title: string
  description: string
  milestone_date: string
  category: string
  status: 'upcoming' | 'achieved' | 'missed'
}

export function MilestoneDrawer({ open, onClose, onSaved, editing }: MilestoneDrawerProps) {
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    milestone_date: new Date().toISOString().split('T')[0],
    category: '',
    status: 'upcoming',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        title: editing.title,
        description: editing.description ?? '',
        milestone_date: editing.milestone_date,
        category: editing.category ?? '',
        status: editing.status,
      } : {
        title: '',
        description: '',
        milestone_date: new Date().toISOString().split('T')[0],
        category: '',
        status: 'upcoming',
      })
      setError(null)
    }
  }, [open, editing])

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
    if (!form.milestone_date) { setError('Date is required.'); return }
    setSaving(true)
    setError(null)

    const url = editing ? `/api/company-milestones/${editing.id}` : '/api/company-milestones'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        milestone_date: form.milestone_date,
        category: form.category.trim() || null,
        status: form.status,
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
            {editing ? 'Edit milestone' : 'New milestone'}
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
              placeholder="e.g. Reached 10,000 active athletes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Context and significance of this milestone…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Date <span className="text-destructive">*</span></label>
              <input
                type="date"
                value={form.milestone_date}
                onChange={(e) => set('milestone_date', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Category</label>
              <input
                type="text"
                list="milestone-categories"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="e.g. growth, product"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <datalist id="milestone-categories">
                {KNOWN_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Status</label>
            <div className="flex gap-2">
              {(['upcoming', 'achieved', 'missed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={cn(
                    'flex-1 rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors',
                    form.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add milestone'}
          </button>
        </div>
      </div>
    </div>
  )
}
