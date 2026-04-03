'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Sparkles, ShieldOff, Loader2, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PersonaFormData {
  name: string
  tagline: string
  age_range: string
  job_title: string
  industry: string
  company_size: string
  location: string
  goals: string
  frustrations: string
  motivations: string
  behaviors: string
  values: string
  channels: string
  buying_triggers: string
  objections: string
  quote: string
  include_in_ai: boolean
}

interface PersonaEditing {
  id: string
  name: string
  tagline: string | null
  age_range: string | null
  job_title: string | null
  industry: string | null
  company_size: string | null
  location: string | null
  goals: string | null
  frustrations: string | null
  motivations: string | null
  behaviors: string | null
  values: string | null
  channels: string | null
  buying_triggers: string | null
  objections: string | null
  quote: string | null
  include_in_ai: boolean
  created_at: string
  updated_at: string
}

interface PersonaDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: PersonaEditing | null
}

const EMPTY: PersonaFormData = {
  name: '',
  tagline: '',
  age_range: '',
  job_title: '',
  industry: '',
  company_size: '',
  location: '',
  goals: '',
  frustrations: '',
  motivations: '',
  behaviors: '',
  values: '',
  channels: '',
  buying_triggers: '',
  objections: '',
  quote: '',
  include_in_ai: true,
}

const SECTIONS = [
  {
    group: 'Identity',
    color: 'text-violet-500',
    fields: [
      { key: 'name', label: 'Persona name', placeholder: 'e.g. The Ambitious Founder', required: true, multiline: false },
      { key: 'tagline', label: 'One-line summary', placeholder: 'e.g. A Series A founder scaling past product-market fit', required: false, multiline: false },
      { key: 'quote', label: 'Representative quote', placeholder: "A direct quote in their voice — how they'd describe their situation", required: false, multiline: true },
    ],
  },
  {
    group: 'Demographics',
    color: 'text-sky-500',
    fields: [
      { key: 'age_range', label: 'Age range', placeholder: 'e.g. 28–40', required: false, multiline: false },
      { key: 'job_title', label: 'Job title / role', placeholder: 'e.g. CEO, Head of Marketing', required: false, multiline: false },
      { key: 'industry', label: 'Industry', placeholder: 'e.g. B2B SaaS, eCommerce', required: false, multiline: false },
      { key: 'company_size', label: 'Company size', placeholder: 'e.g. 10–50 employees, Series A', required: false, multiline: false },
      { key: 'location', label: 'Location', placeholder: 'e.g. US & UK, mainly remote', required: false, multiline: false },
    ],
  },
  {
    group: 'Psychology',
    color: 'text-amber-500',
    fields: [
      { key: 'goals', label: 'Goals', placeholder: 'What do they want to achieve? What does success look like?', required: false, multiline: true },
      { key: 'frustrations', label: 'Pain points & frustrations', placeholder: 'What slows them down? What keeps them up at night?', required: false, multiline: true },
      { key: 'motivations', label: 'Motivations', placeholder: 'What drives their decisions? Status, efficiency, fear, growth?', required: false, multiline: true },
      { key: 'values', label: 'Values', placeholder: 'What do they care deeply about? What are non-negotiables?', required: false, multiline: true },
    ],
  },
  {
    group: 'Behaviour',
    color: 'text-emerald-500',
    fields: [
      { key: 'behaviors', label: 'Behaviours & habits', placeholder: 'How do they research, evaluate, and buy? What tools do they use?', required: false, multiline: true },
      { key: 'channels', label: 'Channels & media', placeholder: 'LinkedIn, podcasts, newsletters, Twitter, industry events?', required: false, multiline: false },
      { key: 'buying_triggers', label: 'Buying triggers', placeholder: 'What causes them to actively seek a solution?', required: false, multiline: true },
      { key: 'objections', label: 'Objections & hesitations', placeholder: 'What concerns or doubts do they raise before buying?', required: false, multiline: true },
    ],
  },
]

export function PersonaDrawer({ open, onClose, onSaved, editing }: PersonaDrawerProps) {
  const [form, setForm] = useState<PersonaFormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatedBanner, setGeneratedBanner] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setGeneratedBanner(false)
      setForm(editing ? {
        name: editing.name,
        tagline: editing.tagline ?? '',
        age_range: editing.age_range ?? '',
        job_title: editing.job_title ?? '',
        industry: editing.industry ?? '',
        company_size: editing.company_size ?? '',
        location: editing.location ?? '',
        goals: editing.goals ?? '',
        frustrations: editing.frustrations ?? '',
        motivations: editing.motivations ?? '',
        behaviors: editing.behaviors ?? '',
        values: editing.values ?? '',
        channels: editing.channels ?? '',
        buying_triggers: editing.buying_triggers ?? '',
        objections: editing.objections ?? '',
        quote: editing.quote ?? '',
        include_in_ai: editing.include_in_ai,
      } : EMPTY)
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

  function set(key: keyof PersonaFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setGeneratedBanner(false)

    try {
      const res = await fetch('/api/personas/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Generation failed. Please try again.')
        return
      }

      const p = data.persona as Partial<PersonaFormData>
      setForm((prev) => ({
        ...prev,
        name: p.name ?? prev.name,
        tagline: p.tagline ?? prev.tagline,
        age_range: p.age_range ?? prev.age_range,
        job_title: p.job_title ?? prev.job_title,
        industry: p.industry ?? prev.industry,
        company_size: p.company_size ?? prev.company_size,
        location: p.location ?? prev.location,
        goals: p.goals ?? prev.goals,
        frustrations: p.frustrations ?? prev.frustrations,
        motivations: p.motivations ?? prev.motivations,
        behaviors: p.behaviors ?? prev.behaviors,
        values: p.values ?? prev.values,
        channels: p.channels ?? prev.channels,
        buying_triggers: p.buying_triggers ?? prev.buying_triggers,
        objections: p.objections ?? prev.objections,
        quote: p.quote ?? prev.quote,
      }))
      setGeneratedBanner(true)
    } catch {
      setError('Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  function filledCount(): number {
    const textFields = Object.entries(form).filter(
      ([k, v]) => k !== 'include_in_ai' && typeof v === 'string' && (v as string).trim()
    )
    return textFields.length
  }

  const total = Object.keys(EMPTY).filter((k) => k !== 'include_in_ai').length
  const progress = Math.round((filledCount() / total) * 100)

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Persona name is required.')
      return
    }

    setSaving(true)
    setError(null)

    const payload: Record<string, string | boolean | null> = {}
    for (const [k, v] of Object.entries(form)) {
      if (k === 'include_in_ai') {
        payload[k] = v as boolean
      } else {
        payload[k] = (v as string).trim() || null
      }
    }

    const url = editing ? `/api/personas/${editing.id}` : '/api/personas'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {editing ? 'Edit persona' : 'New persona'}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The more detail you provide, the better the AI understands who you're writing for.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || saving}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                  'bg-violet-500/10 text-violet-700 border border-violet-200 hover:bg-violet-500/20',
                  'dark:border-violet-800 dark:text-violet-400',
                  generating && 'animate-pulse',
                )}
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5" />
                )}
                {generating ? 'Generating…' : 'Generate from knowledge'}
              </button>
            </div>
            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {filledCount()}/{total} fields filled
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          {generatedBanner && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800 dark:bg-violet-900/20">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <div>
                  <p className="text-sm font-medium text-violet-900 dark:text-violet-200">Persona generated from your knowledge docs</p>
                  <p className="mt-0.5 text-xs text-violet-700 dark:text-violet-400">Review and adjust any fields before saving.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedBanner(false)}
                className="shrink-0 rounded p-0.5 text-violet-400 hover:text-violet-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {SECTIONS.map(({ group, color, fields }) => (
            <section key={group}>
              <p className={cn('mb-4 text-[11px] font-semibold uppercase tracking-widest', color)}>
                {group}
              </p>
              <div className="space-y-4">
                {fields.map(({ key, label, placeholder, required, multiline }) => (
                  <div key={key}>
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground">
                      {label}
                      {required && <span className="text-destructive">*</span>}
                    </label>
                    {multiline ? (
                      <textarea
                        value={form[key as keyof PersonaFormData] as string}
                        onChange={(e) => set(key as keyof PersonaFormData, e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        className={cn(
                          'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60',
                          'focus:outline-none focus:ring-2 focus:ring-ring resize-none',
                        )}
                      />
                    ) : (
                      <input
                        type="text"
                        value={form[key as keyof PersonaFormData] as string}
                        onChange={(e) => set(key as keyof PersonaFormData, e.target.value)}
                        placeholder={placeholder}
                        className={cn(
                          'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60',
                          'focus:outline-none focus:ring-2 focus:ring-ring',
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* AI visibility */}
          <section>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Included in AI context
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
                    ? 'This persona will be sent to the AI when generating content, helping it write to the right audience.'
                    : 'This persona exists as a reference only — it will not influence AI-generated content.'}
                </p>
              </div>
            </label>
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create persona'}
          </button>
        </div>
      </div>
    </div>
  )
}
