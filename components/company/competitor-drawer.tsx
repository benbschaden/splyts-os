'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompetitorRow } from '@/lib/queries/competitors'

interface CompetitorDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: CompetitorRow | null
}

interface FormData {
  name: string
  website: string
  positioning: string
  strengths: string
  weaknesses: string
  pricing_notes: string
  battle_card: string
  include_in_ai: boolean
}

const EMPTY: FormData = {
  name: '',
  website: '',
  positioning: '',
  strengths: '',
  weaknesses: '',
  pricing_notes: '',
  battle_card: '',
  include_in_ai: true,
}

export function CompetitorDrawer({ open, onClose, onSaved, editing }: CompetitorDrawerProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              website: editing.website ?? '',
              positioning: editing.positioning ?? '',
              strengths: editing.strengths ?? '',
              weaknesses: editing.weaknesses ?? '',
              pricing_notes: editing.pricing_notes ?? '',
              battle_card: editing.battle_card ?? '',
              include_in_ai: editing.include_in_ai,
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
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)

    const url = editing ? `/api/competitors/${editing.id}` : '/api/competitors'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        website: form.website.trim() || null,
        positioning: form.positioning.trim() || null,
        strengths: form.strengths.trim() || null,
        weaknesses: form.weaknesses.trim() || null,
        pricing_notes: form.pricing_notes.trim() || null,
        battle_card: form.battle_card.trim() || null,
        include_in_ai: form.include_in_ai,
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
      <div
        className={cn(
          'relative ml-auto flex h-full w-full flex-col bg-background shadow-2xl',
          'max-w-[480px]',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit competitor' : 'New competitor'}
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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="competitor-name" className="text-xs font-medium text-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="competitor-name"
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Company or product name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="competitor-website" className="text-xs font-medium text-foreground">
              Website
            </label>
            <input
              id="competitor-website"
              type="text"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="competitor-positioning" className="text-xs font-medium text-foreground">
              Positioning
            </label>
            <p className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">Their tagline or market position</p>
            <textarea
              id="competitor-positioning"
              value={form.positioning}
              onChange={(e) => set('positioning', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="competitor-strengths" className="text-xs font-medium text-foreground">
              Strengths
            </label>
            <textarea
              id="competitor-strengths"
              value={form.strengths}
              onChange={(e) => set('strengths', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="competitor-weaknesses" className="text-xs font-medium text-foreground">
              Weaknesses
            </label>
            <textarea
              id="competitor-weaknesses"
              value={form.weaknesses}
              onChange={(e) => set('weaknesses', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="competitor-pricing" className="text-xs font-medium text-foreground">
              Pricing notes
            </label>
            <p className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">How their pricing compares to ours</p>
            <textarea
              id="competitor-pricing"
              value={form.pricing_notes}
              onChange={(e) => set('pricing_notes', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="competitor-battle" className="text-xs font-medium text-foreground">
              Battle card
            </label>
            <p className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">
              What to say when a customer asks &apos;why not them?&apos;
            </p>
            <textarea
              id="competitor-battle"
              value={form.battle_card}
              onChange={(e) => set('battle_card', e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">AI context</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
              <button
                type="button"
                role="switch"
                aria-checked={form.include_in_ai}
                onClick={() => set('include_in_ai', !form.include_in_ai)}
                className={cn(
                  'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                  form.include_in_ai ? 'bg-blue-500' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    form.include_in_ai ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {form.include_in_ai ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Include in AI
                    </>
                  ) : (
                    <>
                      <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />
                      Hidden from AI
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {form.include_in_ai
                    ? 'This competitor is included when generating differentiated content.'
                    : 'Kept for reference only; not sent to AI prompts.'}
                </p>
              </div>
            </label>
          </section>
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
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create competitor'}
          </button>
        </div>
      </div>
    </div>
  )
}
