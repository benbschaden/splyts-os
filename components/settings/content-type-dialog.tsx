'use client'

import { useState, useEffect } from 'react'
import { X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Template {
  id: string
  slug: string
  name: string
  description: string
  base_prompt: string
}

interface ContentType {
  id: string
  name: string
  custom_rules: string
  template_id: string
  platform?: string | null
  cadence?: string | null
}

interface ContentTypeDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  templates: Template[]
  editing?: ContentType | null
}

const DEFAULT_CUSTOM_RULES: Record<string, string> = {
  'social-post':   'Professional but approachable tone. Max 280 characters for Twitter/X; up to 1,200 for LinkedIn. End with a question or a clear CTA. No hashtags unless specified.',
  'video-script':  'Conversational, energetic tone. Total runtime 60–90 seconds (approx. 150–225 words). Hook must be under 3 seconds. End CTA: direct viewers to the link in bio.',
  'long-form':     'Authoritative but accessible tone. Target 800–1,200 words. Include one concrete example per section. Avoid jargon. End with a clear takeaway the reader can act on.',
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
  const [platform, setPlatform] = useState('')
  const [cadence, setCadence] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name)
        setTemplateId(editing.template_id)
        setCustomRules(editing.custom_rules)
        setPlatform(editing.platform ?? '')
        setCadence(editing.cadence ?? '')
      } else {
        const first = templates[0] ?? null
        setName('')
        setTemplateId(first?.id ?? '')
        setCustomRules(first ? (DEFAULT_CUSTOM_RULES[first.slug] ?? '') : '')
        setPlatform('')
        setCadence('')
      }
      setErrors({})
      setServerError(null)
    }
  }, [open, editing, templates])

  function handleTemplateChange(id: string) {
    const t = templates.find((t) => t.id === id)
    setTemplateId(id)
    if (t) setCustomRules(DEFAULT_CUSTOM_RULES[t.slug] ?? '')
    setErrors((p) => ({ ...p, template_id: '', custom_rules: '' }))
  }

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
        platform: platform.trim() || null,
        cadence: cadence.trim() || null,
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="ct-name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <p className="text-xs text-muted-foreground">
              How this content type appears in the generation dropdown.
            </p>
            <input
              id="ct-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
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

          {/* Base template — hidden when editing */}
          {!editing && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Base template</label>
              <p className="text-xs text-muted-foreground">
                Sets the structural rules. Your custom rules below are layered on top.
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
                      onChange={() => handleTemplateChange(t.id)}
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

          {/* Base prompt preview */}
          {selectedTemplate?.base_prompt && (
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs font-medium text-muted-foreground">
                  Structure baked into this template
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedTemplate.base_prompt}
              </p>
            </div>
          )}

          {/* Custom rules */}
          <div className="space-y-1.5">
            <label htmlFor="ct-rules" className="text-sm font-medium text-foreground">
              Custom rules
            </label>
            <p className="text-xs text-muted-foreground">
              Platform-specific overrides: tone, length, CTAs, formatting. Edit the defaults below to match your needs.
            </p>
            <textarea
              id="ct-rules"
              value={customRules}
              onChange={(e) => { setCustomRules(e.target.value); setErrors((p) => ({ ...p, custom_rules: '' })) }}
              rows={5}
              disabled={saving}
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

          {/* Platform + Cadence row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="ct-platform" className="text-sm font-medium text-foreground">
                Platform <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="ct-platform"
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={saving}
                placeholder="e.g. LinkedIn"
                list="ct-platform-list"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50"
              />
              <datalist id="ct-platform-list">
                {['LinkedIn', 'Twitter/X', 'Instagram', 'YouTube', 'TikTok', 'Facebook', 'Newsletter', 'Blog', 'Podcast'].map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ct-cadence" className="text-sm font-medium text-foreground">
                Cadence <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="ct-cadence"
                type="text"
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                disabled={saving}
                placeholder="e.g. 3x per week"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50"
              />
            </div>
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
