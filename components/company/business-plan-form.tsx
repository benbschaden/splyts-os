'use client'

import { useState, useCallback } from 'react'
import { Check, Download, Loader2, ChevronDown, ChevronRight, FileText, Sparkles, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SuggestButton, SuggestBox, type SuggestState, emptySuggestState } from '@/components/company/field-suggest'
import {
  BUSINESS_PLAN_SECTIONS,
  AI_CONTEXT_KEYS_FIELD,
  getAiVisibleKeys,
  type BusinessPlanSections,
} from '@/lib/company/business-plan-sections'

interface BusinessPlanFormProps {
  initial: BusinessPlanSections
  isAdmin: boolean
  lastSaved: string | null
}

export function BusinessPlanForm({ initial, isAdmin, lastSaved }: BusinessPlanFormProps) {
  const [sections, setSections] = useState<BusinessPlanSections>(initial)
  const [aiKeys, setAiKeys] = useState<Set<string>>(() => getAiVisibleKeys(initial))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(
    BUSINESS_PLAN_SECTIONS[0]?.key ?? null,
  )
  const [suggests, setSuggests] = useState<Record<string, SuggestState>>(
    () => Object.fromEntries(BUSINESS_PLAN_SECTIONS.map((s) => [s.key, emptySuggestState()])),
  )

  function setSuggest(key: string, update: Partial<SuggestState>) {
    setSuggests((prev) => ({ ...prev, [key]: { ...prev[key], ...update } }))
  }

  async function handleSuggest(section: typeof BUSINESS_PLAN_SECTIONS[number]) {
    setSuggest(section.key, { loading: true, suggestion: null, error: null })
    const currentValues: Record<string, string> = {}
    BUSINESS_PLAN_SECTIONS.forEach((s) => {
      if ((sections[s.key] ?? '').trim()) currentValues[s.key] = sections[s.key]
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

  const filledCount = BUSINESS_PLAN_SECTIONS.filter(
    (s) => (sections[s.key] ?? '').trim().length > 0,
  ).length

  const handleChange = useCallback((key: string, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  function toggleAiVisibility(key: string) {
    setAiKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setSaved(false)
  }

  function buildPayload(): BusinessPlanSections {
    return {
      ...sections,
      [AI_CONTEXT_KEYS_FIELD]: JSON.stringify([...aiKeys]),
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const res = await fetch('/api/business-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: buildPayload() }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save. Please try again.')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleDownloadPdf() {
    setDownloading(true)
    setError(null)

    const res = await fetch('/api/business-plan/pdf')

    if (!res.ok) {
      setError('Failed to generate PDF.')
      setDownloading(false)
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Business Plan.pdf'
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  function toggleSection(key: string) {
    setExpandedKey((prev) => (prev === key ? null : key))
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Business plan</h2>
            <p className="text-sm text-muted-foreground">
              {filledCount} of {BUSINESS_PLAN_SECTIONS.length} sections completed.
              {lastSaved && (
                <span className="ml-1 text-muted-foreground/60">
                  Last saved{' '}
                  {new Date(lastSaved).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={downloading || filledCount === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                PDF
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-500"
          style={{ width: `${(filledCount / BUSINESS_PLAN_SECTIONS.length) * 100}%` }}
        />
      </div>

      {/* Sections (accordion) */}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border overflow-hidden">
        {BUSINESS_PLAN_SECTIONS.map((section, idx) => {
          const isExpanded = expandedKey === section.key
          const value = sections[section.key] ?? ''
          const isFilled = value.trim().length > 0
          const isAiVisible = aiKeys.has(section.key)

          return (
            <div key={section.key} className="bg-background">
              {/* Accordion trigger */}
              <button
                onClick={() => toggleSection(section.key)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                  isExpanded && 'bg-accent/30',
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{section.label}</p>
                </div>
                {isAiVisible ? (
                  <Sparkles className="h-3 w-3 shrink-0 text-blue-500" aria-label="Included in AI context" />
                ) : (
                  <ShieldAlert className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-label="Hidden from AI" />
                )}
                {isFilled && (
                  <span className="shrink-0 h-2 w-2 rounded-full bg-green-500" aria-label="Completed" />
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {section.description}
                    </p>
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
                      handleChange(section.key, s)
                      setSuggest(section.key, emptySuggestState())
                    }}
                    onDismiss={() => setSuggest(section.key, emptySuggestState())}
                  />

                  {/* AI visibility toggle */}
                  {isAdmin && (
                    <label className="mb-3 mt-3 flex items-center gap-2 cursor-pointer select-none">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isAiVisible}
                        onClick={(e) => {
                          e.preventDefault()
                          toggleAiVisibility(section.key)
                        }}
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                          isAiVisible ? 'bg-blue-500' : 'bg-muted',
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                            isAiVisible ? 'translate-x-4' : 'translate-x-0',
                          )}
                        />
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {isAiVisible ? (
                          <span>Included in AI context <span className="text-blue-500 font-medium">(visible to AI)</span></span>
                        ) : (
                          <span>Hidden from AI <span className="font-medium">(internal only)</span></span>
                        )}
                      </span>
                    </label>
                  )}

                  {isAdmin ? (
                    <textarea
                      value={value}
                      onChange={(e) => handleChange(section.key, e.target.value)}
                      placeholder={section.placeholder}
                      rows={6}
                      className={cn(
                        'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none leading-relaxed',
                        'focus:outline-none focus:ring-2 focus:ring-ring',
                      )}
                    />
                  ) : value ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {value}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not yet completed.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-blue-500" /> Included in AI context
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldAlert className="h-3 w-3 text-muted-foreground/40" /> Internal only — hidden from AI
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Section completed
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Sections marked with <Sparkles className="inline h-3 w-3 text-blue-500 align-text-bottom" /> are
        fed into AI prompts as background context. Sensitive sections (financials, risks, etc.) are hidden
        by default — toggle them on only if you want AI to reference that information in generated content.
      </p>
    </div>
  )
}
