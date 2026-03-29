'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SuggestButton, SuggestBox, type SuggestState, emptySuggestState } from '@/components/company/field-suggest'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface BrandContextValues {
  company_name: string
  mission: string
  vision: string
  north_star: string
  voice: string
  tone: string
  pillars: string
  target_audience: string
  values: string
}

interface BrandContextFormProps {
  initial: Partial<BrandContextValues>
  isAdmin: boolean
}

const REQUIRED_FIELDS: Array<{ key: keyof BrandContextValues; label: string; hint: string; multiline?: boolean }> = [
  {
    key: 'company_name',
    label: 'Company name',
    hint: 'The name of your organisation as it should appear in content',
  },
  {
    key: 'mission',
    label: 'Mission',
    hint: 'Why your company exists — the problem you solve',
    multiline: true,
  },
  {
    key: 'vision',
    label: 'Vision',
    hint: 'The world you are working to create',
    multiline: true,
  },
  {
    key: 'north_star',
    label: 'North star',
    hint: 'The single guiding principle that drives decisions',
    multiline: true,
  },
  {
    key: 'voice',
    label: 'Voice',
    hint: 'Your brand personality — e.g. Direct, confident, science-led',
  },
  {
    key: 'tone',
    label: 'Tone',
    hint: 'How you adjust voice for context — e.g. Professional but approachable',
  },
  {
    key: 'pillars',
    label: 'Content pillars',
    hint: 'Core themes your content always connects back to — comma separated',
    multiline: true,
  },
  {
    key: 'target_audience',
    label: 'Target audience',
    hint: 'Who you are speaking to — be specific',
    multiline: true,
  },
]

const OPTIONAL_FIELDS: Array<{ key: keyof BrandContextValues; label: string; hint: string; multiline?: boolean }> = [
  {
    key: 'values',
    label: 'Values',
    hint: 'Optional — e.g. Integrity, Science-first, Athlete-led',
    multiline: true,
  },
]

const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

type FieldErrors = Partial<Record<keyof BrandContextValues, string>>

function empty(): BrandContextValues {
  return {
    company_name: '',
    mission: '',
    vision: '',
    north_star: '',
    voice: '',
    tone: '',
    pillars: '',
    target_audience: '',
    values: '',
  }
}

export function BrandContextForm({ initial, isAdmin }: BrandContextFormProps) {
  const [values, setValues] = useState<BrandContextValues>({
    ...empty(),
    ...initial,
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [suggests, setSuggests] = useState<Record<string, SuggestState>>(
    () => Object.fromEntries(allFields.map((f) => [f.key, emptySuggestState()])),
  )

  function setSuggest(key: string, update: Partial<SuggestState>) {
    setSuggests((prev) => ({ ...prev, [key]: { ...prev[key], ...update } }))
  }

  async function handleSuggest(field: typeof allFields[number]) {
    setSuggest(field.key, { loading: true, suggestion: null, error: null })
    const res = await fetch('/api/company/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field_key: field.key,
        field_label: field.label,
        field_hint: field.hint,
        current_form_values: values,
      }),
    })
    if (!res.ok) {
      setSuggest(field.key, { loading: false, error: 'Suggestion failed. Try again.' })
      return
    }
    const data = await res.json() as { suggestion: string; sources: string[]; has_conflicts: boolean }
    setSuggest(field.key, {
      loading: false,
      suggestion: data.suggestion,
      sources: data.sources ?? [],
      hasConflicts: data.has_conflicts ?? false,
    })
  }

  function set(key: keyof BrandContextValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
    setSaved(false)
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    for (const field of REQUIRED_FIELDS) {
      if (!values[field.key].trim()) {
        next[field.key] = `${field.label} is required`
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setServerError(null)
    setSaved(false)

    const res = await fetch('/api/brand-context', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        values: values.values || null,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setServerError('Failed to save. Please try again.')
      return
    }

    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-5">
        {allFields.map((field) => {
          const isOptional = OPTIONAL_FIELDS.some((f) => f.key === field.key)
          const value = values[field.key]
          const error = errors[field.key]

          return (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <label htmlFor={field.key} className="text-sm font-medium text-foreground">
                  {field.label}
                </label>
                {isOptional && <span className="text-xs text-muted-foreground">Optional</span>}
                {isAdmin && (
                  <SuggestButton
                    loading={suggests[field.key].loading}
                    onTrigger={() => handleSuggest(field)}
                    disabled={saving}
                    label={field.label}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{field.hint}</p>

              {field.multiline ? (
                isAdmin && value && editingKey !== field.key ? (
                  <div className="group relative">
                    <div className={cn(
                      'prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1',
                      'text-foreground text-sm leading-relaxed rounded-md border px-3 py-2',
                      error ? 'border-destructive' : 'border-input',
                    )}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingKey(field.key)}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent border border-border bg-background"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <textarea
                      id={field.key}
                      value={value}
                      onChange={(e) => set(field.key, e.target.value)}
                      rows={5}
                      disabled={!isAdmin || saving}
                      readOnly={!isAdmin}
                      autoFocus={editingKey === field.key}
                      className={cn(
                        'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-y font-mono',
                        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        error ? 'border-destructive' : 'border-input',
                      )}
                    />
                    {isAdmin && value && (
                      <button
                        type="button"
                        onClick={() => setEditingKey(null)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ← Back to preview
                      </button>
                    )}
                  </div>
                )
              ) : (
                <input
                  id={field.key}
                  type="text"
                  value={value}
                  onChange={(e) => set(field.key, e.target.value)}
                  disabled={!isAdmin || saving}
                  readOnly={!isAdmin}
                  className={cn(
                    'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    error ? 'border-destructive' : 'border-input',
                  )}
                />
              )}

              <SuggestBox
                state={suggests[field.key]}
                onAccept={(s) => { set(field.key, s); setSuggest(field.key, emptySuggestState()); setEditingKey(null) }}
                onDismiss={() => setSuggest(field.key, emptySuggestState())}
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
          )
        })}
      </div>

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      {isAdmin && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && (
            <span className="text-sm text-muted-foreground">
              Saved
            </span>
          )}
        </div>
      )}
    </form>
  )
}
