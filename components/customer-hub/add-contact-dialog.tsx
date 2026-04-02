'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactRow, ContactSegment, ContactHealth } from '@/lib/queries/contacts'

interface AddContactDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (contact: ContactRow) => void
}

interface FormData {
  name: string
  email: string
  company: string
  role: string
  segment: ContactSegment | ''
  health: ContactHealth | ''
  tags: string
  notes: string
}

const EMPTY: FormData = {
  name: '',
  email: '',
  company: '',
  role: '',
  segment: '',
  health: '',
  tags: '',
  notes: '',
}

const SEGMENT_LABELS: Record<ContactSegment, string> = {
  beta_user: 'Beta User',
  prospect: 'Prospect',
  customer: 'Customer',
  churned: 'Churned',
  investor: 'Investor',
  partner: 'Partner',
  other: 'Other',
}

const HEALTH_LABELS: Record<ContactHealth, string> = {
  green: 'Healthy',
  yellow: 'Needs attention',
  red: 'At risk',
}

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function AddContactDialog({ open, onClose, onSaved }: AddContactDialogProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim() || null,
        company: form.company.trim() || null,
        role: form.role.trim() || null,
        segment: form.segment || null,
        health: form.health || null,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        notes: form.notes.trim() || null,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    const data = await res.json()
    onSaved(data.data)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Add contact</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div>
              <label htmlFor="contact-name" className="block text-xs font-medium text-foreground mb-1">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Full name"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="block text-xs font-medium text-foreground mb-1">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@example.com"
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="contact-company" className="block text-xs font-medium text-foreground mb-1">
                  Company
                </label>
                <input
                  id="contact-company"
                  type="text"
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                  placeholder="Acme Inc."
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="contact-role" className="block text-xs font-medium text-foreground mb-1">
                  Role
                </label>
                <input
                  id="contact-role"
                  type="text"
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  placeholder="Head of Product"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="contact-segment" className="block text-xs font-medium text-foreground mb-1">
                  Segment
                </label>
                <select
                  id="contact-segment"
                  value={form.segment}
                  onChange={(e) => set('segment', e.target.value as ContactSegment | '')}
                  className={INPUT_CLASS}
                >
                  <option value="">No segment</option>
                  {(Object.keys(SEGMENT_LABELS) as ContactSegment[]).map((s) => (
                    <option key={s} value={s}>
                      {SEGMENT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="contact-health" className="block text-xs font-medium text-foreground mb-1">
                  Health
                </label>
                <select
                  id="contact-health"
                  value={form.health}
                  onChange={(e) => set('health', e.target.value as ContactHealth | '')}
                  className={INPUT_CLASS}
                >
                  <option value="">No health</option>
                  {(Object.keys(HEALTH_LABELS) as ContactHealth[]).map((h) => (
                    <option key={h} value={h}>
                      {HEALTH_LABELS[h]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="contact-tags" className="block text-xs font-medium text-foreground mb-1">
                Tags
              </label>
              <input
                id="contact-tags"
                type="text"
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="enterprise, series-a, warm (comma-separated)"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="contact-notes" className="block text-xs font-medium text-foreground mb-1">
                Notes
              </label>
              <textarea
                id="contact-notes"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                placeholder="Any context worth remembering…"
                className={cn(INPUT_CLASS, 'resize-none')}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
