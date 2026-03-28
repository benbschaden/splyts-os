'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveryStudyRow, DiscoveryStudyMethod } from '@/lib/queries/discovery-studies'

interface DiscoveryStudyDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: (study: DiscoveryStudyRow) => void
  projectId: string
  editing: DiscoveryStudyRow | null
}

interface FormData {
  name: string
  goal: string
  method: DiscoveryStudyMethod | ''
}

const EMPTY: FormData = { name: '', goal: '', method: '' }

const METHOD_OPTIONS: { value: DiscoveryStudyMethod; label: string; desc: string }[] = [
  { value: 'interview', label: 'Interviews', desc: '1:1 user conversations' },
  { value: 'survey', label: 'Surveys', desc: 'NPS, exit surveys, questionnaires' },
  { value: 'review', label: 'Reviews', desc: 'App Store, G2, Reddit, etc.' },
  { value: 'observation', label: 'Observations', desc: 'Session recordings, support patterns' },
  { value: 'email', label: 'Email feedback', desc: 'Direct emails, beta feedback' },
  { value: 'mixed', label: 'Mixed', desc: 'Multiple research methods' },
]

export function DiscoveryStudyDrawer({
  open,
  onClose,
  onSaved,
  projectId,
  editing,
}: DiscoveryStudyDrawerProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { name: editing.name, goal: editing.goal ?? '', method: editing.method ?? '' }
          : EMPTY,
      )
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

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Study name is required.')
      return
    }
    setSaving(true)
    setError(null)

    const body = {
      project_id: projectId,
      name: form.name.trim(),
      goal: form.goal.trim() || null,
      method: form.method || null,
    }

    const url = editing ? `/api/discovery-studies/${editing.id}` : '/api/discovery-studies'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    const json = (await res.json()) as { data: DiscoveryStudyRow }
    onSaved(json.data)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative ml-auto flex h-full w-full max-w-[480px] flex-col bg-background shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit study' : 'New study'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="study-name" className="text-xs font-medium text-foreground">
              Study name <span className="text-destructive">*</span>
            </label>
            <input
              id="study-name"
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Beta user interviews round 1"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Goal */}
          <div className="space-y-1.5">
            <label htmlFor="study-goal" className="text-xs font-medium text-foreground">
              Research goal
            </label>
            <p className="text-[11px] text-muted-foreground -mt-0.5">
              What question are you trying to answer?
            </p>
            <textarea
              id="study-goal"
              value={form.goal}
              onChange={(e) => set('goal', e.target.value)}
              rows={3}
              placeholder="e.g. Understand why users drop off after the first session"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Method */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Method</p>
            <div className="grid grid-cols-2 gap-2">
              {METHOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('method', form.method === opt.value ? '' : opt.value)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    form.method === opt.value
                      ? 'border-foreground/30 bg-accent'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create study'}
          </button>
        </div>
      </div>
    </div>
  )
}
