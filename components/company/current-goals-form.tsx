'use client'

import { useState, useEffect } from 'react'
import { CURRENT_GOALS_SECTIONS, type CurrentGoalsSections } from '@/lib/company/current-goals-sections'
import { useRegisterCompanyUnsaved } from '@/components/company/company-unsaved-context'

interface CurrentGoalsFormProps {
  initial: CurrentGoalsSections | null
  isAdmin: boolean
}

export function CurrentGoalsForm({ initial, isAdmin }: CurrentGoalsFormProps) {
  const [sections, setSections] = useState<CurrentGoalsSections>(initial ?? {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setSections(initial ?? {})
    setIsDirty(false)
  }, [initial])

  function handleChange(key: string, value: string) {
    setSections((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
    setIsDirty(true)
  }

  async function commitSave(): Promise<void> {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/current-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections }),
    })

    setSaving(false)
    if (!res.ok) {
      setError('Failed to save. Please try again.')
      throw new Error('Save failed')
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setIsDirty(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await commitSave()
    } catch {
      /* error set */
    }
  }

  useRegisterCompanyUnsaved(isAdmin && isDirty, commitSave)

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Current goals</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Quarterly / sprint focus. Injected into AI context and content generation to align outputs with current priorities.
        </p>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="space-y-6">
        {CURRENT_GOALS_SECTIONS.map((section) => (
          <div key={section.key} className="space-y-1.5">
            <label htmlFor={section.key} className="text-xs font-semibold text-foreground">
              {section.label}
            </label>
            <p className="text-[11px] text-muted-foreground">{section.description}</p>
            <textarea
              id={section.key}
              rows={section.key === 'key_results' ? 4 : 3}
              value={sections[section.key] ?? ''}
              onChange={(e) => handleChange(section.key, e.target.value)}
              placeholder={section.placeholder}
              disabled={!isAdmin}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save goals'}
          </button>
          {saved && <p className="text-xs text-green-600 font-medium">Saved</p>}
        </div>
      )}
    </form>
  )
}
