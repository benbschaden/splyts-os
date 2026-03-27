'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const KNOWN_PLATFORMS = ['Instagram', 'LinkedIn', 'TikTok', 'Twitter / X', 'Facebook', 'YouTube', 'Email', 'Blog', 'Podcast', 'Press Release']

interface CalendarItem {
  id: string
  title: string
  description: string | null
  scheduled_date: string
  platform: string | null
  status: 'idea' | 'planned' | 'in_progress' | 'generated' | 'published' | 'cancelled'
  notes: string | null
}

interface CalendarItemDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: CalendarItem | null
  defaultDate: string | null
}

interface FormData {
  title: string
  description: string
  scheduled_date: string
  platform: string
  status: 'idea' | 'planned' | 'in_progress' | 'generated' | 'published' | 'cancelled'
  notes: string
}

export function CalendarItemDrawer({ open, onClose, onSaved, editing, defaultDate }: CalendarItemDrawerProps) {
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    scheduled_date: defaultDate ?? new Date().toISOString().split('T')[0],
    platform: '',
    status: 'idea',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        title: editing.title,
        description: editing.description ?? '',
        scheduled_date: editing.scheduled_date,
        platform: editing.platform ?? '',
        status: editing.status,
        notes: editing.notes ?? '',
      } : {
        title: '',
        description: '',
        scheduled_date: defaultDate ?? new Date().toISOString().split('T')[0],
        platform: '',
        status: 'idea',
        notes: '',
      })
      setError(null)
    }
  }, [open, editing, defaultDate])

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
    if (!form.scheduled_date) { setError('Date is required.'); return }
    setSaving(true)
    setError(null)

    const url = editing ? `/api/content-calendar/${editing.id}` : '/api/content-calendar'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_date: form.scheduled_date,
        platform: form.platform.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
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
            {editing ? 'Edit calendar item' : 'New calendar item'}
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
              placeholder="e.g. Athlete spotlight — Week 12"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="What is this about?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Date <span className="text-destructive">*</span></label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => set('scheduled_date', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Platform</label>
              <input
                type="text"
                list="calendar-platforms"
                value={form.platform}
                onChange={(e) => set('platform', e.target.value)}
                placeholder="e.g. Instagram"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <datalist id="calendar-platforms">
                {KNOWN_PLATFORMS.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['idea', 'planned', 'in_progress', 'generated', 'published', 'cancelled'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                    form.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Any additional notes, references, or context…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
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
