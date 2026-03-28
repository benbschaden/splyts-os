'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronDown, ChevronRight, Check, Circle, AlertTriangle, X, ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PeriodGoal {
  id: string
  goal_period_id: string
  title: string
  description: string | null
  sort_order: number
  outcome: 'achieved' | 'partial' | 'missed' | null
  outcome_notes: string | null
  carried_from_goal_id: string | null
}

interface GoalPeriod {
  id: string
  period_label: string
  period_start: string
  period_end: string
  status: 'active' | 'reviewing' | 'closed'
  focus_areas: string | null
  what_to_push: string | null
  what_to_defer: string | null
  review_summary: string | null
  reviewed_at: string | null
  goals: PeriodGoal[]
}

const OUTCOME_CONFIG = {
  achieved: { label: 'Achieved', icon: Check, style: 'bg-green-500/10 text-green-600 border-green-500/30' },
  partial: { label: 'Partial', icon: AlertTriangle, style: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  missed: { label: 'Missed', icon: X, style: 'bg-destructive/10 text-destructive border-destructive/30' },
} as const

function getDefaultQuarter(): { label: string; start: string; end: string } {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  const startMonth = (quarter - 1) * 3
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 3, 0)
  return {
    label: `Q${quarter} ${year}`,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
  return `${s.toLocaleDateString('en-GB', opts)} – ${e.toLocaleDateString('en-GB', opts)}`
}

function outcomesSummary(goals: PeriodGoal[]): string {
  if (goals.length === 0) return 'No goals'
  const achieved = goals.filter((g) => g.outcome === 'achieved').length
  const partial = goals.filter((g) => g.outcome === 'partial').length
  const missed = goals.filter((g) => g.outcome === 'missed').length
  const parts: string[] = []
  if (achieved) parts.push(`${achieved} achieved`)
  if (partial) parts.push(`${partial} partial`)
  if (missed) parts.push(`${missed} missed`)
  return parts.length > 0 ? parts.join(', ') : `${goals.length} goal${goals.length === 1 ? '' : 's'}`
}

export function GoalPeriodsView({ isAdmin }: { isAdmin: boolean }) {
  const [periods, setPeriods] = useState<GoalPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPast, setExpandedPast] = useState<Set<string>>(new Set())
  const [showStartForm, setShowStartForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/goal-periods')
    if (res.ok) {
      const { data } = await res.json()
      setPeriods(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const activePeriod = periods.find((p) => p.status === 'active')
  const reviewingPeriod = periods.find((p) => p.status === 'reviewing')
  const pastPeriods = periods.filter((p) => p.status === 'closed')

  function togglePast(id: string) {
    setExpandedPast((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Goals</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Quarterly goals and strategic focus. Active period is injected into AI context.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted/40 animate-pulse" />)}
        </div>
      )}

      {!loading && (
        <>
          {/* Reviewing period — needs attention */}
          {reviewingPeriod && (
            <ReviewingPeriodCard period={reviewingPeriod} isAdmin={isAdmin} onUpdate={load} />
          )}

          {/* Active period */}
          {activePeriod ? (
            <ActivePeriodCard period={activePeriod} isAdmin={isAdmin} onUpdate={load} />
          ) : (
            !showStartForm && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No active quarter.</p>
                {isAdmin && (
                  <button onClick={() => setShowStartForm(true)} className="mt-3 text-sm font-medium text-primary hover:underline">
                    Start a new quarter
                  </button>
                )}
              </div>
            )
          )}

          {/* Start new quarter form */}
          {showStartForm && !activePeriod && isAdmin && (
            <StartQuarterForm
              previousPeriod={reviewingPeriod ?? pastPeriods[0] ?? null}
              onCreated={() => { setShowStartForm(false); load() }}
              onCancel={() => setShowStartForm(false)}
            />
          )}

          {/* Start new quarter button when active exists but admin wants to close and start new */}
          {activePeriod && isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!confirm('Close this quarter and move it to review?')) return
                  await fetch(`/api/goal-periods/${activePeriod.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'reviewing' }),
                  })
                  load()
                }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Close quarter & review →
              </button>
            </div>
          )}

          {/* Past periods */}
          {pastPeriods.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Past quarters</h3>
              {pastPeriods.map((p) => (
                <PastPeriodCard
                  key={p.id}
                  period={p}
                  expanded={expandedPast.has(p.id)}
                  onToggle={() => togglePast(p.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ActivePeriodCard({ period, isAdmin, onUpdate }: { period: GoalPeriod; isAdmin: boolean; onUpdate: () => void }) {
  const [focusAreas, setFocusAreas] = useState(period.focus_areas ?? '')
  const [whatToPush, setWhatToPush] = useState(period.what_to_push ?? '')
  const [whatToDefer, setWhatToDefer] = useState(period.what_to_defer ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [addingGoal, setAddingGoal] = useState(false)

  async function saveFields() {
    setSaving(true)
    await fetch(`/api/goal-periods/${period.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focus_areas: focusAreas || null, what_to_push: whatToPush || null, what_to_defer: whatToDefer || null }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function addGoal() {
    if (!newGoalTitle.trim()) return
    setAddingGoal(true)
    await fetch(`/api/goal-periods/${period.id}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newGoalTitle.trim() }),
    })
    setNewGoalTitle('')
    setAddingGoal(false)
    onUpdate()
  }

  async function deleteGoal(goalId: string) {
    if (!confirm('Remove this goal?')) return
    await fetch(`/api/goal-periods/${period.id}/goals/${goalId}`, { method: 'DELETE' })
    onUpdate()
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{period.period_label}</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Active</span>
          </div>
          <p className="text-[11px] text-muted-foreground">{formatDateRange(period.period_start, period.period_end)}</p>
        </div>
      </div>

      {/* Goals list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Goals</p>
        {period.goals.length === 0 && (
          <p className="text-xs text-muted-foreground/60">No goals yet. Add your first goal below.</p>
        )}
        {period.goals.map((g) => (
          <div key={g.id} className="group flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2">
            <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{g.title}</p>
              {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
              {g.carried_from_goal_id && (
                <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                  <ArrowRight className="h-2.5 w-2.5" /> Carried forward
                </p>
              )}
            </div>
            {isAdmin && (
              <button onClick={() => deleteGoal(g.id)} className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addGoal() }}
              placeholder="Add a goal…"
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addGoal}
              disabled={!newGoalTitle.trim() || addingGoal}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Strategic fields */}
      <div className="space-y-4 pt-2 border-t border-border/50">
        <TextField label="Focus areas" description="The 2–4 areas prioritised this period." value={focusAreas} onChange={setFocusAreas} disabled={!isAdmin} placeholder="What are you focusing on?" />
        <TextField label="What to push" description="Themes to amplify in content and outreach." value={whatToPush} onChange={setWhatToPush} disabled={!isAdmin} placeholder="What narratives dominate this quarter?" />
        <TextField label="What to defer" description="What you are deliberately saying no to." value={whatToDefer} onChange={setWhatToDefer} disabled={!isAdmin} placeholder="What are you parking until next quarter?" />
      </div>

      {isAdmin && (
        <div className="flex items-center gap-3 pt-1">
          <button onClick={saveFields} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <p className="text-xs text-green-600 font-medium">Saved</p>}
        </div>
      )}
    </div>
  )
}

function ReviewingPeriodCard({ period, isAdmin, onUpdate }: { period: GoalPeriod; isAdmin: boolean; onUpdate: () => void }) {
  const [reviewSummary, setReviewSummary] = useState(period.review_summary ?? '')
  const [outcomes, setOutcomes] = useState<Record<string, { outcome: string; notes: string }>>(
    Object.fromEntries(period.goals.map((g) => [g.id, { outcome: g.outcome ?? '', notes: g.outcome_notes ?? '' }])),
  )
  const [saving, setSaving] = useState(false)

  function setGoalOutcome(goalId: string, outcome: string) {
    setOutcomes((prev) => ({ ...prev, [goalId]: { ...prev[goalId], outcome } }))
  }

  function setGoalNotes(goalId: string, notes: string) {
    setOutcomes((prev) => ({ ...prev, [goalId]: { ...prev[goalId], notes } }))
  }

  async function completeReview() {
    setSaving(true)

    for (const goal of period.goals) {
      const o = outcomes[goal.id]
      if (o?.outcome) {
        await fetch(`/api/goal-periods/${period.id}/goals/${goal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outcome: o.outcome, outcome_notes: o.notes || null }),
        })
      }
    }

    await fetch(`/api/goal-periods/${period.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed', review_summary: reviewSummary || null }),
    })

    setSaving(false)
    onUpdate()
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{period.period_label}</h3>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Needs review</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{formatDateRange(period.period_start, period.period_end)}</p>
      </div>

      {/* Goal-by-goal review */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground">Rate each goal</p>
        {period.goals.map((g) => {
          const o = outcomes[g.id] ?? { outcome: '', notes: '' }
          return (
            <div key={g.id} className="rounded-md border border-border bg-background p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">{g.title}</p>
              {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
              {isAdmin && (
                <>
                  <div className="flex items-center gap-2">
                    {(['achieved', 'partial', 'missed'] as const).map((val) => {
                      const cfg = OUTCOME_CONFIG[val]
                      const Icon = cfg.icon
                      const selected = o.outcome === val
                      return (
                        <button
                          key={val}
                          onClick={() => setGoalOutcome(g.id, val)}
                          className={cn(
                            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                            selected ? cfg.style : 'border-border text-muted-foreground hover:bg-muted/50',
                          )}
                        >
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                  <input
                    type="text"
                    value={o.notes}
                    onChange={(e) => setGoalNotes(g.id, e.target.value)}
                    placeholder="What happened? (optional)"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </>
              )}
            </div>
          )
        })}
      </div>

      {isAdmin && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="review-summary" className="text-xs font-semibold text-foreground">Quarter review</label>
            <p className="text-[11px] text-muted-foreground">What did we learn? What worked and what didn't?</p>
            <textarea
              id="review-summary"
              rows={3}
              value={reviewSummary}
              onChange={(e) => setReviewSummary(e.target.value)}
              placeholder="Reflect on this quarter…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={completeReview}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Complete review'}
          </button>
        </div>
      )}
    </div>
  )
}

function StartQuarterForm({ previousPeriod, onCreated, onCancel }: { previousPeriod: GoalPeriod | null; onCreated: () => void; onCancel: () => void }) {
  const defaults = getDefaultQuarter()
  const [label, setLabel] = useState(defaults.label)
  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [carryForward, setCarryForward] = useState<Set<string>>(new Set())

  const carryableGoals = previousPeriod?.goals.filter((g) => g.outcome === 'partial' || g.outcome === 'missed') ?? []

  function toggleCarry(goalId: string) {
    setCarryForward((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }

  async function handleCreate() {
    setCreating(true)
    setError(null)

    const res = await fetch('/api/goal-periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_label: label, period_start: start, period_end: end }),
    })

    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? 'Failed to create period')
      setCreating(false)
      return
    }

    const { data: newPeriod } = await res.json()

    for (const goalId of carryForward) {
      const original = carryableGoals.find((g) => g.id === goalId)
      if (!original) continue
      await fetch(`/api/goal-periods/${newPeriod.id}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: original.title, description: original.description, carried_from_goal_id: original.id }),
      })
    }

    setCreating(false)
    onCreated()
  }

  return (
    <div className="rounded-lg border border-border bg-background p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Start new quarter</h3>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="period-label" className="text-xs font-medium text-foreground">Label</label>
          <input id="period-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label htmlFor="period-start" className="text-xs font-medium text-foreground">Start</label>
          <input id="period-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label htmlFor="period-end" className="text-xs font-medium text-foreground">End</label>
          <input id="period-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {carryableGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Carry forward from {previousPeriod?.period_label}?</p>
          {carryableGoals.map((g) => {
            const cfg = g.outcome ? OUTCOME_CONFIG[g.outcome] : null
            return (
              <label key={g.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <input type="checkbox" checked={carryForward.has(g.id)} onChange={() => toggleCarry(g.id)} className="rounded border-input" />
                <span className="text-sm text-foreground flex-1">{g.title}</span>
                {cfg && (
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.style)}>{cfg.label}</span>
                )}
              </label>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={handleCreate} disabled={creating || !label.trim()} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {creating ? 'Creating…' : 'Create quarter'}
        </button>
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
      </div>
    </div>
  )
}

function PastPeriodCard({ period, expanded, onToggle }: { period: GoalPeriod; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors">
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{period.period_label}</p>
          <p className="text-[11px] text-muted-foreground">{outcomesSummary(period.goals)}</p>
        </div>
        <span className="text-[11px] text-muted-foreground">{formatDateRange(period.period_start, period.period_end)}</span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {period.goals.map((g) => {
            const cfg = g.outcome ? OUTCOME_CONFIG[g.outcome] : null
            return (
              <div key={g.id} className="flex items-start gap-2">
                {cfg ? (
                  <cfg.icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', g.outcome === 'achieved' ? 'text-green-600' : g.outcome === 'partial' ? 'text-amber-600' : 'text-destructive')} />
                ) : (
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{g.title}</p>
                  {g.outcome_notes && <p className="text-xs text-muted-foreground">{g.outcome_notes}</p>}
                </div>
                {cfg && (
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.style)}>{cfg.label}</span>
                )}
              </div>
            )
          })}

          {period.review_summary && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground">Review</p>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{period.review_summary}</p>
            </div>
          )}

          {period.focus_areas && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Focus areas</p>
              <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap">{period.focus_areas}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TextField({ label, description, value, onChange, disabled, placeholder }: {
  label: string
  description: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
  placeholder: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-foreground">{label}</label>
      <p className="text-[11px] text-muted-foreground">{description}</p>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  )
}
