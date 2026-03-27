'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const KNOWN_PLATFORMS = ['Instagram', 'LinkedIn', 'TikTok', 'Twitter / X', 'Facebook', 'YouTube', 'Email', 'Blog', 'Podcast', 'Press Release']

interface PlatformGuideline {
  id: string
  platform_name: string
  guidelines: string
  format_notes: string | null
  cadence: string | null
  include_in_ai: boolean
}

interface PlatformGuidelineDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: PlatformGuideline | null
}

interface FormData {
  platform_name: string
  guidelines: string
  format_notes: string
  cadence: string
  include_in_ai: boolean
}

export function PlatformGuidelineDrawer({ open, onClose, onSaved, editing }: PlatformGuidelineDrawerProps) {
  const [form, setForm] = useState<FormData>({
    platform_name: '',
    guidelines: '',
    format_notes: '',
    cadence: '',
    include_in_ai: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        platform_name: editing.platform_name,
        guidelines: editing.guidelines,
        format_notes: editing.format_notes ?? '',
        cadence: editing.cadence ?? '',
        include_in_ai: editing.include_in_ai,
      } : {
        platform_name: '',
        guidelines: '',
        format_notes: '',
        cadence: '',
        include_in_ai: true,
      })
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

  async function handleSave() {
    if (!form.platform_name.trim()) { setError('Platform name is required.'); return }
    if (!form.guidelines.trim()) { setError('Guidelines are required.'); return }
    setSaving(true)
    setError(null)

    const url = editing ? `/api/platform-guidelines/${editing.id}` : '/api/platform-guidelines'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform_name: form.platform_name.trim(),
        guidelines: form.guidelines.trim(),
        format_notes: form.format_notes.trim() || null,
        cadence: form.cadence.trim() || null,
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
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-background shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit platform guideline' : 'New platform guideline'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Platform name <span className="text-destructive">*</span></label>
            <input
              type="text"
              list="known-platforms"
              value={form.platform_name}
              onChange={(e) => set('platform_name', e.target.value)}
              placeholder="e.g. Instagram, LinkedIn"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <datalist id="known-platforms">
              {KNOWN_PLATFORMS.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Guidelines <span className="text-destructive">*</span></label>
            <p className="text-[11px] text-muted-foreground">Tone, style, do's and don'ts for this platform.</p>
            <textarea
              value={form.guidelines}
              onChange={(e) => set('guidelines', e.target.value)}
              rows={5}
              placeholder="Describe the tone, content style, what to avoid, how to structure posts…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Format notes</label>
            <p className="text-[11px] text-muted-foreground">Character limits, hashtag use, visual requirements, CTAs.</p>
            <textarea
              value={form.format_notes}
              onChange={(e) => set('format_notes', e.target.value)}
              rows={3}
              placeholder="e.g. Max 280 chars for main copy, 3–5 hashtags, always include CTA…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Posting cadence</label>
            <input
              type="text"
              value={form.cadence}
              onChange={(e) => set('cadence', e.target.value)}
              placeholder="e.g. 3x per week, daily at 9am, once per fortnight"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* AI toggle */}
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
                {form.include_in_ai
                  ? <><Sparkles className="h-3.5 w-3.5 text-blue-500" />Injected into generation prompts</>
                  : <><ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />Not used in AI prompts</>}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                When enabled, these guidelines are appended to generation prompts when the content type matches this platform.
              </p>
            </div>
          </label>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add platform'}
          </button>
        </div>
      </div>
    </div>
  )
}
