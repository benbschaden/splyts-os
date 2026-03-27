'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  TERMINOLOGY_CATEGORY_LABELS,
  TERMINOLOGY_CATEGORY_ORDER,
  type TerminologyRow,
} from '@/lib/queries/terminology'

interface TermDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: TerminologyRow | null
}

interface FormData {
  term: string
  preferred: string
  avoid: string
  context: string
  category: (typeof TERMINOLOGY_CATEGORY_ORDER)[number]
}

const EMPTY: FormData = {
  term: '',
  preferred: '',
  avoid: '',
  context: '',
  category: 'general',
}

export function TermDrawer({ open, onClose, onSaved, editing }: TermDrawerProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const cat = editing?.category ?? 'general'
      const safeCategory = TERMINOLOGY_CATEGORY_ORDER.includes(cat as FormData['category'])
        ? (cat as FormData['category'])
        : 'general'
      setForm(
        editing
          ? {
              term: editing.term,
              preferred: editing.preferred,
              avoid: editing.avoid ?? '',
              context: editing.context ?? '',
              category: safeCategory,
            }
          : EMPTY,
      )
      setError(null)
    }
  }, [open, editing])

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

  async function handleSave() {
    if (!form.term.trim()) {
      setError('Term is required.')
      return
    }
    if (!form.preferred.trim()) {
      setError('Always say is required.')
      return
    }
    setSaving(true)
    setError(null)

    const url = editing ? `/api/terminology/${editing.id}` : '/api/terminology'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        term: form.term.trim(),
        preferred: form.preferred.trim(),
        avoid: form.avoid.trim() || null,
        context: form.context.trim() || null,
        category: form.category,
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative ml-auto flex h-full w-full max-w-[480px] flex-col bg-background shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit terminology' : 'New terminology'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="term-label" className="text-xs font-medium text-foreground">
              Term <span className="text-destructive">*</span>
            </label>
            <p className="text-[11px] text-muted-foreground">The concept or word</p>
            <input
              id="term-label"
              type="text"
              value={form.term}
              onChange={(e) => set('term', e.target.value)}
              placeholder="e.g. Users, Product name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="term-preferred" className="text-xs font-medium text-foreground">
              Always say <span className="text-destructive">*</span>
            </label>
            <p className="text-[11px] text-muted-foreground">The preferred term</p>
            <input
              id="term-preferred"
              type="text"
              value={form.preferred}
              onChange={(e) => set('preferred', e.target.value)}
              placeholder="e.g. Members, SPLYTS"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="term-avoid" className="text-xs font-medium text-foreground">
              Never say
            </label>
            <p className="text-[11px] text-muted-foreground">What to avoid</p>
            <input
              id="term-avoid"
              type="text"
              value={form.avoid}
              onChange={(e) => set('avoid', e.target.value)}
              placeholder="e.g. Users, Splyts app"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="term-context" className="text-xs font-medium text-foreground">
              Context
            </label>
            <p className="text-[11px] text-muted-foreground">Why this matters or when it applies</p>
            <textarea
              id="term-context"
              value={form.context}
              onChange={(e) => set('context', e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="term-category" className="text-xs font-medium text-foreground">
              Category
            </label>
            <select
              id="term-category"
              value={form.category}
              onChange={(e) => set('category', e.target.value as FormData['category'])}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TERMINOLOGY_CATEGORY_ORDER.map((key) => (
                <option key={key} value={key}>
                  {TERMINOLOGY_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
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
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add terminology'}
          </button>
        </div>
      </div>
    </div>
  )
}
