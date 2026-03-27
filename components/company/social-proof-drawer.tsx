'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SocialProofRow } from '@/lib/queries/social-proof'

export type ProofType = 'testimonial' | 'case_study' | 'metric' | 'award'

const PROOF_OPTIONS: { value: ProofType; label: string }[] = [
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'case_study', label: 'Case study' },
  { value: 'metric', label: 'Metric' },
  { value: 'award', label: 'Award' },
]

interface SocialProofDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: SocialProofRow | null
}

interface FormData {
  proof_type: ProofType
  quote: string
  attribution: string
  company: string
  metric_value: string
  metric_label: string
  tagsInput: string
  approved: boolean
  include_in_ai: boolean
}

const EMPTY: FormData = {
  proof_type: 'testimonial',
  quote: '',
  attribution: '',
  company: '',
  metric_value: '',
  metric_label: '',
  tagsInput: '',
  approved: false,
  include_in_ai: true,
}

function parseProofType(value: string): ProofType {
  if (value === 'case_study' || value === 'metric' || value === 'award') return value
  return 'testimonial'
}

function tagsToInput(tags: string[]): string {
  return tags.length ? tags.join(', ') : ''
}

function inputToTags(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function SocialProofDrawer({ open, onClose, onSaved, editing }: SocialProofDrawerProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              proof_type: parseProofType(editing.proof_type),
              quote: editing.quote ?? '',
              attribution: editing.attribution ?? '',
              company: editing.company ?? '',
              metric_value: editing.metric_value ?? '',
              metric_label: editing.metric_label ?? '',
              tagsInput: tagsToInput(editing.tags ?? []),
              approved: editing.approved,
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
    setSaving(true)
    setError(null)

    const tags = inputToTags(form.tagsInput)
    const isMetric = form.proof_type === 'metric'

    const body = {
      proof_type: form.proof_type,
      quote: form.quote.trim() || null,
      attribution: form.attribution.trim() || null,
      company: form.company.trim() || null,
      metric_value: isMetric ? form.metric_value.trim() || null : null,
      metric_label: isMetric ? form.metric_label.trim() || null : null,
      tags,
      approved: form.approved,
      include_in_ai: form.include_in_ai,
    }

    const url = editing ? `/api/social-proof/${editing.id}` : '/api/social-proof'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  const showMetricFields = form.proof_type === 'metric'

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
            {editing ? 'Edit social proof' : 'New social proof'}
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

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground mb-1.5">Type</legend>
            <div className="grid grid-cols-2 gap-2">
              {PROOF_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors',
                    form.proof_type === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
                  )}
                >
                  <input
                    type="radio"
                    name="proof-type"
                    value={opt.value}
                    checked={form.proof_type === opt.value}
                    onChange={() => set('proof_type', opt.value)}
                    className="h-3.5 w-3.5 border-input text-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="social-proof-quote" className="text-xs font-medium text-foreground">
              Quote
            </label>
            <p className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">
              The testimonial or proof statement
            </p>
            <textarea
              id="social-proof-quote"
              value={form.quote}
              onChange={(e) => set('quote', e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="social-proof-attribution" className="text-xs font-medium text-foreground">
              Attribution
            </label>
            <p className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">Who said it</p>
            <input
              id="social-proof-attribution"
              type="text"
              value={form.attribution}
              onChange={(e) => set('attribution', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="social-proof-company" className="text-xs font-medium text-foreground">
              Company
            </label>
            <p className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">Their company</p>
            <input
              id="social-proof-company"
              type="text"
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {showMetricFields && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="social-proof-metric-value" className="text-xs font-medium text-foreground">
                  Metric value
                </label>
                <p className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">e.g. 40%, 3x</p>
                <input
                  id="social-proof-metric-value"
                  type="text"
                  value={form.metric_value}
                  onChange={(e) => set('metric_value', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="social-proof-metric-label" className="text-xs font-medium text-foreground">
                  Metric label
                </label>
                <p className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">
                  e.g. improvement in retention
                </p>
                <input
                  id="social-proof-metric-label"
                  type="text"
                  value={form.metric_label}
                  onChange={(e) => set('metric_label', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label htmlFor="social-proof-tags" className="text-xs font-medium text-foreground">
              Tags
            </label>
            <p className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">Comma-separated</p>
            <input
              id="social-proof-tags"
              type="text"
              value={form.tagsInput}
              onChange={(e) => set('tagsInput', e.target.value)}
              placeholder="enterprise, renewal, NPS"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {inputToTags(form.tagsInput).length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {inputToTags(form.tagsInput).map((t) => (
                  <span
                    key={t}
                    className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Publishing
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors mb-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.approved}
                onClick={() => set('approved', !form.approved)}
                className={cn(
                  'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                  form.approved ? 'bg-emerald-600' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    form.approved ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-foreground">Approved for use</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mark when this proof is cleared to reference in customer-facing or sensitive contexts.
                </p>
              </div>
            </label>

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
                    ? 'Sent to AI prompts when generating on-brand content.'
                    : 'Kept in the library only; not injected into AI context.'}
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
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
