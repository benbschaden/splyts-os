'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthorProfileValues {
  name: string
  role: string
  voice: string
  tone: string
  writing_style: string
  personal_pillars: string
  platform_notes: string
}

interface AuthorProfile {
  id: string
  name: string
  role: string | null
  voice: string | null
  tone: string | null
  writing_style: string | null
  personal_pillars: string | null
  platform_notes: string | null
}

interface AuthorProfileDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: AuthorProfile | null
}

const FIELDS: Array<{
  key: keyof AuthorProfileValues
  label: string
  hint: string
  required?: boolean
  multiline?: boolean
}> = [
  {
    key: 'name',
    label: 'Name',
    hint: 'Full name as it will appear in the generation dropdown',
    required: true,
  },
  {
    key: 'role',
    label: 'Role',
    hint: 'e.g. Co-founder, CMO, Head of Content',
  },
  {
    key: 'voice',
    label: 'Voice',
    hint: 'Their brand personality — e.g. Direct, curious, founder-led',
  },
  {
    key: 'tone',
    label: 'Tone',
    hint: 'How they adjust for context — e.g. Conversational but sharp, no fluff',
  },
  {
    key: 'writing_style',
    label: 'Writing style',
    hint: 'Specific patterns — e.g. Short sentences. Asks questions. Never uses hype words.',
    multiline: true,
  },
  {
    key: 'personal_pillars',
    label: 'Personal content pillars',
    hint: 'Their own recurring themes, separate from the company pillars',
    multiline: true,
  },
  {
    key: 'platform_notes',
    label: 'Platform notes',
    hint: 'Platform-specific behaviour — e.g. On LinkedIn: professional but raw. On Instagram: more personal.',
    multiline: true,
  },
]

function empty(): AuthorProfileValues {
  return {
    name: '',
    role: '',
    voice: '',
    tone: '',
    writing_style: '',
    personal_pillars: '',
    platform_notes: '',
  }
}

export function AuthorProfileDialog({
  open,
  onClose,
  onSaved,
  editing,
}: AuthorProfileDialogProps) {
  const [values, setValues] = useState<AuthorProfileValues>(empty())
  const [nameError, setNameError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(
        editing
          ? {
              name: editing.name,
              role: editing.role ?? '',
              voice: editing.voice ?? '',
              tone: editing.tone ?? '',
              writing_style: editing.writing_style ?? '',
              personal_pillars: editing.personal_pillars ?? '',
              platform_notes: editing.platform_notes ?? '',
            }
          : empty(),
      )
      setNameError(null)
      setServerError(null)
    }
  }, [open, editing])

  function set(key: keyof AuthorProfileValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (key === 'name') setNameError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!values.name.trim()) {
      setNameError('Name is required')
      return
    }

    setSaving(true)
    setServerError(null)

    const payload = {
      name: values.name.trim(),
      role: values.role.trim() || null,
      voice: values.voice.trim() || null,
      tone: values.tone.trim() || null,
      writing_style: values.writing_style.trim() || null,
      personal_pillars: values.personal_pillars.trim() || null,
      platform_notes: values.platform_notes.trim() || null,
    }

    const url = editing ? `/api/author-profiles/${editing.id}` : '/api/author-profiles'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
            {editing ? 'Edit author' : 'Add author'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <label htmlFor={field.key} className="text-sm font-medium text-foreground">
                  {field.label}
                </label>
                {!field.required && (
                  <span className="text-xs text-muted-foreground">Optional</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{field.hint}</p>

              {field.multiline ? (
                <textarea
                  id={field.key}
                  value={values[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  rows={3}
                  disabled={saving}
                  className={cn(
                    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    'disabled:opacity-50',
                  )}
                />
              ) : (
                <input
                  id={field.key}
                  type="text"
                  value={values[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  disabled={saving}
                  className={cn(
                    'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    'disabled:opacity-50',
                    field.key === 'name' && nameError ? 'border-destructive' : 'border-input',
                  )}
                />
              )}

              {field.key === 'name' && nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>
          ))}

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add author'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
