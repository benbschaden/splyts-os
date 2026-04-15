'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const KNOWN_SURFACES = ['iOS', 'Android', 'Watch', 'Web', 'API', 'Dashboard', 'Backend']
const KNOWN_CATEGORIES = ['capture', 'analysis', 'readiness', 'planning', 'coaching', 'HYROX', 'tracking', 'social', 'integrations', 'setup', 'admin']

interface Feature {
  id: string
  name: string
  tagline: string | null
  description: string | null
  related_features: string | null
  category: string
  surfaces: string[]
  status: 'live' | 'beta' | 'planned' | 'deprecated'
  include_in_ai: boolean
}

interface FeatureDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: Feature | null
}

interface FormData {
  name: string
  tagline: string
  description: string
  related_features: string
  category: string
  surfaces: string[]
  status: 'live' | 'beta' | 'planned' | 'deprecated'
  include_in_ai: boolean
}

const EMPTY: FormData = {
  name: '',
  tagline: '',
  description: '',
  related_features: '',
  category: '',
  surfaces: [],
  status: 'live',
  include_in_ai: true,
}

export function FeatureDrawer({ open, onClose, onSaved, editing }: FeatureDrawerProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        name: editing.name,
        tagline: editing.tagline ?? '',
        description: editing.description ?? '',
        related_features: editing.related_features ?? '',
        category: editing.category,
        surfaces: editing.surfaces,
        status: editing.status,
        include_in_ai: editing.include_in_ai,
      } : EMPTY)
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

  function toggleSurface(surface: string) {
    setForm((prev) => ({
      ...prev,
      surfaces: prev.surfaces.includes(surface)
        ? prev.surfaces.filter((s) => s !== surface)
        : [...prev.surfaces, surface],
    }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)

    const url = editing ? `/api/product-features/${editing.id}` : '/api/product-features'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        tagline: form.tagline.trim() || null,
        description: form.description.trim() || null,
        related_features: form.related_features.trim() || null,
        category: form.category.trim() || 'other',
        surfaces: form.surfaces,
        status: form.status,
        include_in_ai: form.include_in_ai,
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
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-background shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit feature' : 'New feature'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          {/* Identity */}
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-500">Identity</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. AI Training Coach"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                placeholder="One-sentence description of what this feature does"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                placeholder="Full description — how it works, what it does, key behaviours…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Related features</label>
              <input
                type="text"
                value={form.related_features}
                onChange={(e) => set('related_features', e.target.value)}
                placeholder="Comma-separated feature names this connects to"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </section>

          {/* Availability */}
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-500">Availability</p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Category</label>
              <input
                type="text"
                list="feature-categories"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="e.g. core, AI, mobile"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <datalist id="feature-categories">
                {KNOWN_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Surfaces</label>
              <div className="flex flex-wrap gap-2">
                {KNOWN_SURFACES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSurface(s)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      form.surfaces.includes(s)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {form.surfaces.length > 0 && (
                <p className="text-xs text-muted-foreground">Selected: {form.surfaces.join(', ')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Status</label>
              <div className="flex gap-2 flex-wrap">
                {(['live', 'beta', 'planned', 'deprecated'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('status', s)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                      form.status === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* AI context */}
          <section>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">AI context</p>
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
                <span className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  form.include_in_ai ? 'translate-x-4' : 'translate-x-0',
                )} />
              </button>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {form.include_in_ai ? (
                    <><Sparkles className="h-3.5 w-3.5 text-blue-500" />Included in AI context</>
                  ) : (
                    <><ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />Hidden from AI</>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {form.include_in_ai
                    ? 'This feature will be mentioned in AI-generated content and generation prompts.'
                    : 'This feature exists as a reference only — it will not influence AI output.'}
                </p>
              </div>
            </label>
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create feature'}
          </button>
        </div>
      </div>
    </div>
  )
}
