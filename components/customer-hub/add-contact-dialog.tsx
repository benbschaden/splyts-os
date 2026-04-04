'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactRow, ContactSegment, ContactHealth, ContactStatus } from '@/lib/queries/contacts'

interface AddContactDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (contact: ContactRow) => void
  initialContact?: ContactRow
  availableTags?: string[]
}

interface FormData {
  name: string
  email: string
  segment: ContactSegment | ''
  health: ContactHealth | ''
  status: ContactStatus
  notes: string
}

const EMPTY: FormData = {
  name: '',
  email: '',
  segment: '',
  health: '',
  status: 'active',
  notes: '',
}

const STATUS_LABELS: Record<ContactStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
}

const SEGMENT_LABELS: Record<ContactSegment, string> = {
  beta_user: 'Beta User',
  free_user: 'Free User',
  customer: 'Paying Customer',
  power_user: 'Power User',
  prospect: 'Prospect',
  churned: 'Churned',
  other: 'Other',
}

const HEALTH_LABELS: Record<ContactHealth, string> = {
  green: 'Healthy',
  yellow: 'Needs attention',
  red: 'At risk',
}

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function AddContactDialog({ open, onClose, onSaved, initialContact, availableTags = [] }: AddContactDialogProps) {
  const isEditing = !!initialContact
  const [form, setForm] = useState<FormData>(EMPTY)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      if (initialContact) {
        setForm({
          name: initialContact.name,
          email: initialContact.email ?? '',
          segment: initialContact.segment ?? '',
          health: initialContact.health ?? '',
          status: initialContact.status,
          notes: initialContact.notes ?? '',
        })
        setSelectedTags(initialContact.tags)
      } else {
        setForm(EMPTY)
        setSelectedTags([])
      }
      setTagInput('')
      setError(null)
    }
  }, [open, initialContact])

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

  function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!trimmed || selectedTags.includes(trimmed)) return
    setSelectedTags((prev) => [...prev, trimmed])
  }

  function removeTag(tag: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== tag))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
    } else if (e.key === 'Backspace' && tagInput === '' && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1])
    }
  }

  // Tags from other contacts that aren't already selected
  const suggestedTags = availableTags.filter(
    (t) =>
      !selectedTags.includes(t) &&
      (tagInput === '' || t.includes(tagInput.toLowerCase())),
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Commit any pending tag input on submit
    const finalTags = tagInput.trim()
      ? [...new Set([...selectedTags, tagInput.trim().toLowerCase().replace(/\s+/g, '-')])]
      : selectedTags

    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      segment: form.segment || null,
      health: form.health || null,
      status: form.status,
      tags: finalTags,
      notes: form.notes.trim() || null,
    }

    const res = isEditing
      ? await fetch(`/api/contacts/${initialContact!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{isEditing ? 'Edit contact' : 'Add contact'}</h2>
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
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
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
              <label htmlFor="contact-status" className="block text-xs font-medium text-foreground mb-1">
                Status
              </label>
              <select
                id="contact-status"
                value={form.status}
                onChange={(e) => set('status', e.target.value as ContactStatus)}
                className={INPUT_CLASS}
              >
                {(Object.keys(STATUS_LABELS) as ContactStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags field */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Tags</label>

              {/* Selected tag chips + input */}
              <div
                className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-2.5 py-2 focus-within:ring-2 focus-within:ring-ring cursor-text min-h-[38px]"
                onClick={() => tagInputRef.current?.focus()}
              >
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                      className="text-primary/60 hover:text-primary transition-colors"
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={selectedTags.length === 0 ? 'Type a tag and press Enter…' : ''}
                  className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Existing tag suggestions */}
              {suggestedTags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">Press Enter or comma to add a new tag. Backspace removes the last.</p>
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
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
