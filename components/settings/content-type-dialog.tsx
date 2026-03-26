'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Template {
  id: string
  slug: string
  name: string
  description: string
}

interface ContentType {
  id: string
  name: string
  custom_rules: string
  template_id: string
}

interface ContentTypeDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  templates: Template[]
  editing?: ContentType | null
}

export function ContentTypeDialog({
  open,
  onClose,
  onSaved,
  templates,
  editing,
}: ContentTypeDialogProps) {
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [customRules, setCustomRules] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name)
        setTemplateId(editing.template_id)
        setCustomRules(editing.custom_rules)
      } else {
        setName('')
        setTemplateId(templates[0]?.id ?? '')
        setCustomRules('')
      }
      setErrors({})
      setServerError(null)
    }
  }, [open, editing, templates])

  function validate() {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Name is required'
    if (!templateId) next.template_id = 'Select a base template'
    if (!customRules.trim()) next.custom_rules = 'Custom rules are required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setServerError(null)

    const url = editing ? `/api/content-types/${editing.id}` : '/api/content-types'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        template_id: templateId,
        custom_rules: customRules.trim(),
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setServerError('Failed to save. Please try again.')
      return
    }

    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-12">
      <div className="absolute inset-0 bg-black/20" onClick={saving ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit content type' : 'New content type'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="ct-name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <p className="text-xs text-muted-foreground">
              How this content type appears in the generation dropdown
            </p>
            <input
              id="ct-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
              disabled={saving}
              placeholder="e.g. LinkedIn Post, YouTube Script"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
                errors.name ? 'border-destructive' : 'border-input',
              )}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Base template — hidden when editing (can't change template) */}
          {!editing && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Base template</label>
              <p className="text-xs text-muted-foreground">
                Defines the structure. You customise the rules below.
              </p>
              <div className="grid gap-2">
                {templates.map((t) => (
                  <label
                    key={t.id}
                    className={cn(
                      'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                      templateId === t.id
                        ? 'border-foreground bg-accent'
                        : 'border-input hover:border-foreground/30',
                    )}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={templateId === t.id}
                      onChange={() => { setTemplateId(t.id); setErrors(p => ({ ...p, template_id: '' })) }}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.template_id && (
                <p className="text-xs text-destructive">{errors.template_id}</p>
              )}
            </div>
          )}

          {/* Custom rules */}
          <div className="space-y-1.5">
            <label htmlFor="ct-rules" className="text-sm font-medium text-foreground">
              Custom rules
            </label>
            <p className="text-xs text-muted-foreground">
              Platform-specific constraints, format, tone, length, CTAs — the AI follows these exactly
            </p>
            <textarea
              id="ct-rules"
              value={customRules}
              onChange={(e) => { setCustomRules(e.target.value); setErrors(p => ({ ...p, custom_rules: '' })) }}
              rows={5}
              disabled={saving}
              placeholder="e.g. Professional tone. Max 1,200 characters. End with a question to engage the reader. No hashtags."
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
                errors.custom_rules ? 'border-destructive' : 'border-input',
              )}
            />
            {errors.custom_rules && (
              <p className="text-xs text-destructive">{errors.custom_rules}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
