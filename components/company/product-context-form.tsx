'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Pencil, Sparkles, ShieldAlert } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { PRODUCT_SECTIONS, type ProductSections } from '@/lib/company/product-sections'
import { SuggestButton, SuggestBox, type SuggestState, emptySuggestState } from '@/components/company/field-suggest'
import { useRegisterCompanyUnsaved } from '@/components/company/company-unsaved-context'

interface ProductContextFormProps {
  initial: ProductSections | null
  isAdmin: boolean
}

export function ProductContextForm({ initial, isAdmin }: ProductContextFormProps) {
  const [values, setValues] = useState<ProductSections>({ ...(initial ?? {}) })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const [suggests, setSuggests] = useState<Record<string, SuggestState>>(
    () => Object.fromEntries(PRODUCT_SECTIONS.map((s) => [s.key, emptySuggestState()])),
  )
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setIsDirty(false)
  }, [initial])

  function setSuggest(key: string, update: Partial<SuggestState>) {
    setSuggests((prev) => ({ ...prev, [key]: { ...prev[key], ...update } }))
  }

  async function handleSuggest(section: typeof PRODUCT_SECTIONS[number]) {
    setSuggest(section.key, { loading: true, suggestion: null, error: null })
    const currentValues: Record<string, string> = {}
    PRODUCT_SECTIONS.forEach((s) => {
      if ((values[s.key] ?? '').trim()) currentValues[s.key] = values[s.key]
    })
    const res = await fetch('/api/company/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field_key: section.key,
        field_label: section.label,
        field_hint: section.description,
        current_form_values: currentValues,
      }),
    })
    if (!res.ok) {
      setSuggest(section.key, { loading: false, error: 'Suggestion failed. Try again.' })
      return
    }
    const data = await res.json() as { suggestion: string; sources: string[]; has_conflicts: boolean }
    setSuggest(section.key, {
      loading: false,
      suggestion: data.suggestion,
      sources: data.sources ?? [],
      hasConflicts: data.has_conflicts ?? false,
    })
  }

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
    setIsDirty(true)
  }

  function toggleSection(key: string) {
    setExpandedKey((prev) => {
      if (prev === key) {
        setEditingKey(null)
        return null
      }
      return key
    })
  }

  async function commitSave(): Promise<void> {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/product-context', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: values }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      throw new Error('Save failed')
    }

    setSaved(true)
    setIsDirty(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await commitSave()
    } catch {
      /* error set above */
    }
  }

  useRegisterCompanyUnsaved(isAdmin && isDirty, commitSave)

  const filledCount = PRODUCT_SECTIONS.filter((s) => (values[s.key] ?? '').trim().length > 0).length

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Product context</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe your product in full detail. AI-visible sections are injected into every generation and chat with product context enabled.
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-500"
          style={{ width: `${(filledCount / PRODUCT_SECTIONS.length) * 100}%` }}
        />
      </div>

      {/* Accordion */}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border overflow-hidden">
        {PRODUCT_SECTIONS.map((section) => {
          const isExpanded = expandedKey === section.key
          const value = values[section.key] ?? ''
          const isFilled = value.trim().length > 0

          return (
            <div key={section.key} className="bg-background">
              {/* Header */}
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                  isExpanded && 'bg-accent/30',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{section.label}</p>
                </div>
                {section.aiVisibleByDefault ? (
                  <Sparkles className="h-3 w-3 shrink-0 text-blue-500" aria-label="Included in AI context" />
                ) : (
                  <ShieldAlert className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-label="Internal only" />
                )}
                {isFilled && (
                  <span className="shrink-0 h-2 w-2 rounded-full bg-green-500" aria-label="Filled" />
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">{section.description}</p>
                    {isAdmin && (
                      <SuggestButton
                        loading={suggests[section.key].loading}
                        onTrigger={() => handleSuggest(section)}
                        disabled={saving}
                        label={section.label}
                      />
                    )}
                  </div>

                  <SuggestBox
                    state={suggests[section.key]}
                    onAccept={(s) => {
                      set(section.key, s)
                      setSuggest(section.key, emptySuggestState())
                      setEditingKey(null)
                    }}
                    onDismiss={() => setSuggest(section.key, emptySuggestState())}
                  />

                  {isAdmin ? (
                    value && editingKey !== section.key ? (
                      <div className="group relative">
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1 text-foreground text-sm leading-relaxed rounded-md border border-border px-3 py-2.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingKey(section.key)}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent border border-border bg-background"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <textarea
                          id={section.key}
                          value={value}
                          onChange={(e) => set(section.key, e.target.value)}
                          placeholder={section.placeholder}
                          rows={6}
                          autoFocus={editingKey === section.key}
                          disabled={saving}
                          className={cn(
                            'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none leading-relaxed font-mono',
                            'focus:outline-none focus:ring-2 focus:ring-ring',
                          )}
                        />
                        {value && (
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Preview
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    value ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1 text-foreground text-sm leading-relaxed rounded-md border border-border px-3 py-2.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic px-1">No content yet.</p>
                    )
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-blue-500" /> Included in AI context
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="h-3 w-3 text-muted-foreground/40" /> Internal only
        </span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isAdmin && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      )}
    </form>
  )
}
