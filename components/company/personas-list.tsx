'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Users, Sparkles, ShieldOff, MapPin, Briefcase, Quote, BookOpen, Loader2, Check, X } from 'lucide-react'
import { PersonaDrawer } from './persona-drawer'
import { cn } from '@/lib/utils'

interface Persona {
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

interface SuggestedPersona {
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
}

interface PersonasListProps {
  personas: Persona[]
  isAdmin: boolean
  matchCountById?: Record<string, { count: number; avgScore: number }>
}

function filledFields(p: Persona): number {
  const textKeys: (keyof Persona)[] = [
    'name', 'tagline', 'age_range', 'job_title', 'industry', 'company_size',
    'location', 'goals', 'frustrations', 'motivations', 'behaviors', 'values',
    'channels', 'buying_triggers', 'objections', 'quote',
  ]
  return textKeys.filter((k) => (p[k] as string | null)?.trim()).length
}

const TOTAL_FIELDS = 16

function CompletionBadge({ persona }: { persona: Persona }) {
  const filled = filledFields(persona)
  const pct = Math.round((filled / TOTAL_FIELDS) * 100)
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-muted-foreground'
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
}

export function PersonasList({ personas, isAdmin, matchCountById = {} }: PersonasListProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestedPersona[]>([])
  const [acceptingIdx, setAcceptingIdx] = useState<number | null>(null)
  const [dismissedIdxs, setDismissedIdxs] = useState<Set<number>>(new Set())

  function openAdd() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(persona: Persona) {
    setEditing(persona)
    setDrawerOpen(true)
  }

  function handleSaved() {
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError(null)

    const res = await fetch(`/api/personas/${id}`, { method: 'DELETE' })

    setDeletingId(null)
    setConfirmDeleteId(null)

    if (!res.ok) {
      setDeleteError('Failed to delete. Please try again.')
      return
    }

    router.refresh()
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    setSuggestions([])
    setDismissedIdxs(new Set())

    try {
      const res = await fetch('/api/personas/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setGenerateError(data.error ?? 'Generation failed. Please try again.')
        return
      }
      setSuggestions(data.personas as SuggestedPersona[])
    } catch {
      setGenerateError('Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleAccept(idx: number) {
    const p = suggestions[idx]
    if (!p) return
    setAcceptingIdx(idx)

    try {
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, include_in_ai: true }),
      })
      if (res.ok) {
        setDismissedIdxs((prev) => new Set([...prev, idx]))
        router.refresh()
      }
    } finally {
      setAcceptingIdx(null)
    }
  }

  function handleDismiss(idx: number) {
    setDismissedIdxs((prev) => new Set([...prev, idx]))
  }

  const visibleSuggestions = suggestions.filter((_, i) => !dismissedIdxs.has(i))

  const confirmTarget = personas.find((p) => p.id === confirmDeleteId)

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Personas</h2>
            <p className="text-sm text-muted-foreground max-w-lg">
              Define who you're building for. Each persona is injected into AI generation to ensure content speaks to the right audience.
            </p>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-500/10 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-500/20 dark:border-violet-800 dark:text-violet-400 transition-colors disabled:opacity-50',
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
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add persona
              </button>
            </div>
          )}
        </div>

        {generateError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{generateError}</p>
        )}

        {/* Suggested personas review panel */}
        {visibleSuggestions.length > 0 && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-900/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <p className="text-sm font-semibold text-foreground">
                  {visibleSuggestions.length} persona{visibleSuggestions.length !== 1 ? 's' : ''} found in your knowledge docs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuggestions([])}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Dismiss all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Review each suggestion and add the ones that fit.</p>
            <div className="space-y-3">
              {suggestions.map((p, idx) => {
                if (dismissedIdxs.has(idx)) return null
                const isAccepting = acceptingIdx === idx
                return (
                  <div key={idx} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{p.name}</p>
                        {p.tagline && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{p.tagline}</p>
                        )}
                        {(p.job_title || p.industry || p.company_size || p.location) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {p.job_title && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                                <Briefcase className="h-2.5 w-2.5" />
                                {p.job_title}
                              </span>
                            )}
                            {p.industry && (
                              <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {p.industry}
                              </span>
                            )}
                            {p.company_size && (
                              <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {p.company_size}
                              </span>
                            )}
                            {p.location && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                                <MapPin className="h-2.5 w-2.5" />
                                {p.location}
                              </span>
                            )}
                          </div>
                        )}
                        {p.goals && (
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                            <span className="font-medium text-foreground/70">Goals: </span>
                            {p.goals}
                          </p>
                        )}
                        {p.frustrations && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            <span className="font-medium text-foreground/70">Frustrations: </span>
                            {p.frustrations}
                          </p>
                        )}
                        {p.quote && (
                          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/40 px-3 py-2">
                            <Quote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground italic line-clamp-2">{p.quote}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleAccept(idx)}
                          disabled={isAccepting}
                          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {isAccepting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          {isAccepting ? 'Adding…' : 'Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismiss(idx)}
                          disabled={isAccepting}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
        )}

        {personas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No personas yet</p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto">
              Add your first persona to give AI a clear picture of who it's writing for.
            </p>
            {isAdmin && (
              <button
                onClick={openAdd}
                className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Add persona
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-1">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className="group relative rounded-xl border border-border bg-background p-5 hover:border-border/80 hover:shadow-sm transition-all"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{persona.name}</span>
                      {persona.include_in_ai ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-500">
                          <Sparkles className="h-3 w-3" />
                          AI context
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <ShieldOff className="h-3 w-3" />
                          Internal only
                        </span>
                      )}
                    </div>
                    {persona.tagline && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{persona.tagline}</p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(persona)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteId(persona.id)
                          setDeleteError(null)
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Demographic pills */}
                {(persona.job_title || persona.industry || persona.company_size || persona.location || persona.age_range) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {persona.age_range && (
                      <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {persona.age_range}
                      </span>
                    )}
                    {persona.job_title && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                        <Briefcase className="h-2.5 w-2.5" />
                        {persona.job_title}
                      </span>
                    )}
                    {persona.industry && (
                      <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {persona.industry}
                      </span>
                    )}
                    {persona.company_size && (
                      <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {persona.company_size}
                      </span>
                    )}
                    {persona.location && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" />
                        {persona.location}
                      </span>
                    )}
                  </div>
                )}

                {/* Goals preview */}
                {persona.goals && (
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                    <span className="font-medium text-foreground/70">Goals: </span>
                    {persona.goals}
                  </p>
                )}

                {/* Quote */}
                {persona.quote && (
                  <div className="mt-3 flex items-start gap-1.5 rounded-md bg-muted/40 px-3 py-2">
                    <Quote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground italic line-clamp-2">{persona.quote}</p>
                  </div>
                )}

                {/* Completion bar + match stats */}
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-4">
                  <CompletionBadge persona={persona} />
                  {matchCountById[persona.id] ? (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {matchCountById[persona.id].count} contact{matchCountById[persona.id].count !== 1 ? 's' : ''} matched
                      <span className="opacity-60">· avg {matchCountById[persona.id].avgScore}%</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/40">No contacts matched yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PersonaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        editing={editing}
      />

      {/* Delete confirmation modal */}
      {confirmDeleteId && confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-foreground mb-2">Delete persona</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete{' '}
              <span className="font-medium text-foreground">{confirmTarget.name}</span>.
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId === confirmDeleteId}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deletingId === confirmDeleteId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
