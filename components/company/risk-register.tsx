'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskRow, RiskStatus, RiskCategory } from '@/lib/queries/risks'

const CATEGORIES: RiskCategory[] = [
  'strategic',
  'operational',
  'financial',
  'legal',
  'reputational',
  'technical',
]

const STATUSES: { value: RiskStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed', label: 'Closed' },
]

const SCORES = [1, 2, 3, 4, 5] as const

function priorityLabel(score: number): { label: string; className: string } {
  if (score >= 20) return { label: 'Critical', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
  if (score >= 12) return { label: 'High', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' }
  if (score >= 6) return { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' }
  return { label: 'Low', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
}

type FormState = {
  title: string
  description: string
  category: RiskCategory
  likelihood: number
  impact: number
  owner: string
  mitigation: string
  status: RiskStatus
  lastReviewedAt: string
}

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  category: 'operational',
  likelihood: 3,
  impact: 3,
  owner: '',
  mitigation: '',
  status: 'open',
  lastReviewedAt: '',
})

function riskToForm(r: RiskRow): FormState {
  return {
    title: r.title,
    description: r.description ?? '',
    category: r.category as RiskCategory,
    likelihood: r.likelihood,
    impact: r.impact,
    owner: r.owner ?? '',
    mitigation: r.mitigation ?? '',
    status: r.status as RiskStatus,
    lastReviewedAt: r.last_reviewed_at
      ? new Date(r.last_reviewed_at).toISOString().slice(0, 10)
      : '',
  }
}

interface Props {
  initialRisks: RiskRow[]
  isAdmin: boolean
}

export function RiskRegister({ initialRisks, isAdmin }: Props) {
  const [risks, setRisks] = useState<RiskRow[]>(initialRisks)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm())
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<FormState>(emptyForm())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startEdit(risk: RiskRow) {
    setEditingId(risk.id)
    setEditForm(riskToForm(risk))
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyForm())
    setError(null)
  }

  function startAdd() {
    setAdding(true)
    setAddForm(emptyForm())
    setError(null)
  }

  function cancelAdd() {
    setAdding(false)
    setAddForm(emptyForm())
    setError(null)
  }

  async function saveEdit() {
    if (!editingId) return
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/company/risks/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          category: editForm.category,
          likelihood: editForm.likelihood,
          impact: editForm.impact,
          owner: editForm.owner.trim() || null,
          mitigation: editForm.mitigation.trim() || null,
          status: editForm.status,
          last_reviewed_at: editForm.lastReviewedAt
            ? new Date(editForm.lastReviewedAt).toISOString()
            : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to save changes')
        return
      }

      const { risk } = await res.json() as { risk: RiskRow }
      setRisks((prev) =>
        prev.map((r) => (r.id === editingId ? risk : r)).sort(
          (a, b) => b.priority_score - a.priority_score,
        ),
      )
      setEditingId(null)
    })
  }

  async function saveAdd() {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/company/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: addForm.title.trim(),
          description: addForm.description.trim() || null,
          category: addForm.category,
          likelihood: addForm.likelihood,
          impact: addForm.impact,
          owner: addForm.owner.trim() || null,
          mitigation: addForm.mitigation.trim() || null,
          status: addForm.status,
          lastReviewedAt: addForm.lastReviewedAt
            ? new Date(addForm.lastReviewedAt).toISOString()
            : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to add risk')
        return
      }

      const { risk } = await res.json() as { risk: RiskRow }
      setRisks((prev) =>
        [...prev, risk].sort((a, b) => b.priority_score - a.priority_score),
      )
      setAdding(false)
      setAddForm(emptyForm())
    })
  }

  async function confirmDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/company/risks/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        setError('Failed to delete risk')
        return
      }
      setRisks((prev) => prev.filter((r) => r.id !== id))
      setDeleteConfirmId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <p className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground min-w-[180px]">Risk</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground min-w-[110px]">Category</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground w-20">Likelihood</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground w-16">Impact</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground w-20">Priority</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground min-w-[110px]">Owner</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground min-w-[100px]">Status</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground w-24">Reviewed</th>
              {isAdmin && <th className="w-20 px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {risks.map((risk) => {
              const isEditing = editingId === risk.id
              const priority = priorityLabel(risk.priority_score)
              const isDimmed = risk.status === 'mitigated' || risk.status === 'closed'

              if (isEditing) {
                return (
                  <RiskEditRow
                    key={risk.id}
                    form={editForm}
                    onChange={setEditForm}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    isPending={isPending}
                  />
                )
              }

              return (
                <tr
                  key={risk.id}
                  className={cn(
                    'group transition-colors hover:bg-muted/30',
                    isDimmed && 'opacity-50',
                  )}
                >
                  <td className="px-3 py-2.5 align-top">
                    <p className="font-medium text-foreground leading-snug">{risk.title}</p>
                    {risk.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {risk.description}
                      </p>
                    )}
                    {risk.mitigation && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2 italic">
                        Mitigation: {risk.mitigation}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="capitalize text-foreground">{risk.category}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center align-top">
                    <span className="font-mono text-foreground">{risk.likelihood}/5</span>
                  </td>
                  <td className="px-3 py-2.5 text-center align-top">
                    <span className="font-mono text-foreground">{risk.impact}/5</span>
                  </td>
                  <td className="px-3 py-2.5 text-center align-top">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        priority.className,
                      )}
                    >
                      {risk.priority_score} · {priority.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top text-muted-foreground">
                    {risk.owner ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <StatusBadge status={risk.status as RiskStatus} />
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-muted-foreground">
                    {risk.last_reviewed_at
                      ? new Date(risk.last_reviewed_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEdit(risk)}
                          aria-label={`Edit ${risk.title}`}
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {deleteConfirmId === risk.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => confirmDelete(risk.id)}
                              disabled={isPending}
                              aria-label="Confirm delete"
                              className="rounded p-1 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                              {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              aria-label="Cancel delete"
                              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(risk.id)}
                            aria-label={`Delete ${risk.title}`}
                            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}

            {/* Add-row inline form */}
            {adding && (
              <RiskEditRow
                form={addForm}
                onChange={setAddForm}
                onSave={saveAdd}
                onCancel={cancelAdd}
                isPending={isPending}
              />
            )}

            {risks.length === 0 && !adding && (
              <tr>
                <td
                  colSpan={isAdmin ? 9 : 8}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  No risks logged yet.{isAdmin ? ' Click "Add risk" to get started.' : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add button */}
      {isAdmin && !adding && (
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add risk
        </button>
      )}
    </div>
  )
}

// ─── Inline edit / add row ────────────────────────────────────────────────────

interface EditRowProps {
  form: FormState
  onChange: (f: FormState) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
}

function RiskEditRow({ form, onChange, onSave, onCancel, isPending }: EditRowProps) {
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value })
  }

  return (
    <tr className="bg-muted/20">
      {/* Title + description + mitigation */}
      <td className="px-3 py-2.5 align-top space-y-1.5" colSpan={1}>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Risk title *"
          className="w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full resize-none rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <textarea
          value={form.mitigation}
          onChange={(e) => set('mitigation', e.target.value)}
          placeholder="Mitigation plan (optional)"
          rows={2}
          className="w-full resize-none rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </td>

      {/* Category */}
      <td className="px-3 py-2.5 align-top">
        <SelectField
          value={form.category}
          onChange={(v) => set('category', v as RiskCategory)}
          options={CATEGORIES.map((c) => ({ value: c, label: capitalize(c) }))}
        />
      </td>

      {/* Likelihood */}
      <td className="px-3 py-2.5 align-top text-center">
        <ScoreField value={form.likelihood} onChange={(v) => set('likelihood', v)} />
      </td>

      {/* Impact */}
      <td className="px-3 py-2.5 align-top text-center">
        <ScoreField value={form.impact} onChange={(v) => set('impact', v)} />
      </td>

      {/* Priority preview */}
      <td className="px-3 py-2.5 align-top text-center">
        {(() => {
          const score = form.likelihood * form.impact
          const p = priorityLabel(score)
          return (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', p.className)}>
              {score} · {p.label}
            </span>
          )
        })()}
      </td>

      {/* Owner */}
      <td className="px-3 py-2.5 align-top">
        <input
          value={form.owner}
          onChange={(e) => set('owner', e.target.value)}
          placeholder="Owner"
          className="w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </td>

      {/* Status */}
      <td className="px-3 py-2.5 align-top">
        <SelectField
          value={form.status}
          onChange={(v) => set('status', v as RiskStatus)}
          options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
        />
      </td>

      {/* Last reviewed */}
      <td className="px-3 py-2.5 align-top">
        <input
          type="date"
          value={form.lastReviewedAt}
          onChange={(e) => set('lastReviewedAt', e.target.value)}
          className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 align-top">
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={onSave}
            disabled={isPending || !form.title.trim()}
            aria-label="Save"
            className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Cancel"
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RiskStatus }) {
  const map: Record<RiskStatus, string> = {
    open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    monitoring: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    mitigated: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', map[status])}>
      {status}
    </span>
  )
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded border border-input bg-background pl-2 pr-6 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
    </div>
  )
}

function ScoreField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none rounded border border-input bg-background pl-2 pr-5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-14"
      >
        {SCORES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
