'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, ShieldOff, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  DiscoveryEntryRow,
  DiscoveryEntryType,
  DiscoverySentiment,
  DiscoveryUserSegment,
  DiscoveryPlatform,
} from '@/lib/queries/discovery-entries'

interface DiscoveryDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: DiscoveryEntryRow | null
  projectId: string
  availableTags: string[]
}

interface FormData {
  entry_type: DiscoveryEntryType
  source: string
  entry_date: string
  raw_content: string
  sentiment: DiscoverySentiment | ''
  tags: string[]
  include_in_ai: boolean
  // interview
  user_segment: DiscoveryUserSegment | ''
  key_quote_1: string
  key_quote_2: string
  key_quote_3: string
  jtbd: string
  // review
  star_rating: number | null
  platform: DiscoveryPlatform | ''
}

const EMPTY: FormData = {
  entry_type: 'interview',
  source: '',
  entry_date: '',
  raw_content: '',
  sentiment: '',
  tags: [],
  include_in_ai: false,
  user_segment: '',
  key_quote_1: '',
  key_quote_2: '',
  key_quote_3: '',
  jtbd: '',
  star_rating: null,
  platform: '',
}

const TYPE_OPTIONS: { value: DiscoveryEntryType; label: string; desc: string }[] = [
  { value: 'interview', label: 'Interview', desc: '1:1 conversation with a user' },
  { value: 'review', label: 'Review', desc: 'Public review from App Store, G2, Reddit, etc.' },
  { value: 'survey', label: 'Survey', desc: 'Survey or NPS response' },
  { value: 'observation', label: 'Observation', desc: 'Synthesised pattern or support theme' },
]

const SEGMENT_OPTIONS: { value: DiscoveryUserSegment; label: string }[] = [
  { value: 'new', label: 'New user' },
  { value: 'active', label: 'Active user' },
  { value: 'power', label: 'Power user' },
  { value: 'churned', label: 'Churned' },
  { value: 'free', label: 'Free tier' },
  { value: 'paid', label: 'Paid' },
]

const PLATFORM_OPTIONS: { value: DiscoveryPlatform; label: string }[] = [
  { value: 'app_store', label: 'App Store' },
  { value: 'product_hunt', label: 'Product Hunt' },
  { value: 'g2', label: 'G2' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'other', label: 'Other' },
]

const RAW_CONTENT_LABELS: Record<DiscoveryEntryType, string> = {
  interview: 'Notes / transcript',
  review: 'Review text',
  survey: 'Response',
  observation: 'What you observed',
}

const SOURCE_PLACEHOLDERS: Record<DiscoveryEntryType, string> = {
  interview: 'e.g. User interview, Onboarding call',
  review: 'e.g. App Store, G2, Reddit',
  survey: 'e.g. NPS survey, Exit survey',
  observation: 'e.g. Support tickets, Session recordings',
}

export function DiscoveryDrawer({
  open,
  onClose,
  onSaved,
  editing,
  projectId,
  availableTags,
}: DiscoveryDrawerProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          entry_type: editing.entry_type,
          source: editing.source ?? '',
          entry_date: editing.entry_date ?? '',
          raw_content: editing.raw_content,
          sentiment: editing.sentiment ?? '',
          tags: editing.tags ?? [],
          include_in_ai: editing.include_in_ai,
          user_segment: editing.user_segment ?? '',
          key_quote_1: editing.key_quote_1 ?? '',
          key_quote_2: editing.key_quote_2 ?? '',
          key_quote_3: editing.key_quote_3 ?? '',
          jtbd: editing.jtbd ?? '',
          star_rating: editing.star_rating ?? null,
          platform: editing.platform ?? '',
        })
      } else {
        setForm(EMPTY)
      }
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

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  async function handleSave() {
    if (!form.raw_content.trim()) {
      setError('Content is required.')
      return
    }
    setSaving(true)
    setError(null)

    const body = {
      project_id: projectId,
      entry_type: form.entry_type,
      source: form.source.trim() || null,
      entry_date: form.entry_date || null,
      raw_content: form.raw_content.trim(),
      sentiment: form.sentiment || null,
      tags: form.tags,
      include_in_ai: form.include_in_ai,
      // interview
      user_segment: form.entry_type === 'interview' ? (form.user_segment || null) : null,
      key_quote_1: form.entry_type === 'interview' ? (form.key_quote_1.trim() || null) : null,
      key_quote_2: form.entry_type === 'interview' ? (form.key_quote_2.trim() || null) : null,
      key_quote_3: form.entry_type === 'interview' ? (form.key_quote_3.trim() || null) : null,
      jtbd: form.entry_type === 'interview' ? (form.jtbd.trim() || null) : null,
      // review
      star_rating: form.entry_type === 'review' ? form.star_rating : null,
      platform: form.entry_type === 'review' ? (form.platform || null) : null,
      source_material_id: null,
    }

    const url = editing ? `/api/discovery-entries/${editing.id}` : '/api/discovery-entries'
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

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative ml-auto flex h-full w-full max-w-[520px] flex-col bg-background shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit entry' : 'New discovery entry'}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          {/* Entry type */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Type</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('entry_type', opt.value)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    form.entry_type === opt.value
                      ? 'border-foreground/30 bg-accent'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Source + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="entry-source" className="text-xs font-medium text-foreground">
                Source
              </label>
              <input
                id="entry-source"
                type="text"
                value={form.source}
                onChange={(e) => set('source', e.target.value)}
                placeholder={SOURCE_PLACEHOLDERS[form.entry_type]}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="entry-date" className="text-xs font-medium text-foreground">
                Date
              </label>
              <input
                id="entry-date"
                type="date"
                value={form.entry_date}
                onChange={(e) => set('entry_date', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Raw content */}
          <div className="space-y-1.5">
            <label htmlFor="entry-content" className="text-xs font-medium text-foreground">
              {RAW_CONTENT_LABELS[form.entry_type]} <span className="text-destructive">*</span>
            </label>
            {form.entry_type === 'interview' && (
              <p className="text-[11px] text-muted-foreground -mt-0.5">
                Paste the full transcript or your notes. No length limit.
              </p>
            )}
            <textarea
              id="entry-content"
              value={form.raw_content}
              onChange={(e) => set('raw_content', e.target.value)}
              rows={form.entry_type === 'interview' ? 8 : 5}
              placeholder={
                form.entry_type === 'interview'
                  ? 'Paste transcript or write notes here…'
                  : form.entry_type === 'review'
                  ? 'The full review text…'
                  : form.entry_type === 'survey'
                  ? 'The survey response…'
                  : 'Describe the pattern or theme you observed…'
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Sentiment */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Sentiment</p>
            <div className="flex gap-2">
              {(['positive', 'neutral', 'negative', 'mixed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('sentiment', form.sentiment === s ? '' : s)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                    form.sentiment === s
                      ? s === 'positive' ? 'bg-green-100 text-green-800 border border-green-300'
                        : s === 'negative' ? 'bg-red-100 text-red-800 border border-red-300'
                        : s === 'mixed' ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-muted text-foreground border border-border'
                      : 'border border-border text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs transition-colors',
                    form.tags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Interview-specific fields */}
          {form.entry_type === 'interview' && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="entry-segment" className="text-xs font-medium text-foreground">
                  User segment
                </label>
                <select
                  id="entry-segment"
                  value={form.user_segment}
                  onChange={(e) => set('user_segment', e.target.value as DiscoveryUserSegment | '')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Not specified</option>
                  {SEGMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">Key quotes</p>
                <p className="text-[11px] text-muted-foreground -mt-2">
                  Pull out up to 3 standout lines from the conversation.
                </p>
                {(['key_quote_1', 'key_quote_2', 'key_quote_3'] as const).map((field, i) => (
                  <input
                    key={field}
                    type="text"
                    value={form[field]}
                    onChange={(e) => set(field, e.target.value)}
                    placeholder={`Quote ${i + 1}…`}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ))}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="entry-jtbd" className="text-xs font-medium text-foreground">
                  Jobs to be done
                </label>
                <p className="text-[11px] text-muted-foreground -mt-0.5">
                  One-liner: &ldquo;Help me ___ so I can ___&rdquo;
                </p>
                <input
                  id="entry-jtbd"
                  type="text"
                  value={form.jtbd}
                  onChange={(e) => set('jtbd', e.target.value)}
                  placeholder="Help me track my training so I can improve faster"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          {/* Review-specific fields */}
          {form.entry_type === 'review' && (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Star rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('star_rating', form.star_rating === n ? null : n)}
                      className="transition-transform hover:scale-110"
                      aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                    >
                      <Star
                        className={cn(
                          'h-5 w-5 transition-colors',
                          form.star_rating !== null && n <= form.star_rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-border hover:text-amber-300',
                        )}
                      />
                    </button>
                  ))}
                  {form.star_rating !== null && (
                    <span className="ml-1 text-xs text-muted-foreground">{form.star_rating}/5</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="entry-platform" className="text-xs font-medium text-foreground">
                  Platform
                </label>
                <select
                  id="entry-platform"
                  value={form.platform}
                  onChange={(e) => set('platform', e.target.value as DiscoveryPlatform | '')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Not specified</option>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* AI context toggle */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              AI context
            </p>
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
                    <><Sparkles className="h-3.5 w-3.5 text-blue-500" /> Include in AI</>
                  ) : (
                    <><ShieldOff className="h-3.5 w-3.5 text-muted-foreground" /> Hidden from AI</>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {form.include_in_ai
                    ? 'This entry is available in project chat and generation context.'
                    : 'Kept for reference only; not sent to AI.'}
                </p>
              </div>
            </label>
          </section>
        </div>

        {/* Footer */}
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
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
