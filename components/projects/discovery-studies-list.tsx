'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveryStudyRow, DiscoveryStudyMethod } from '@/lib/queries/discovery-studies'
import type { DiscoveryEntryRow } from '@/lib/queries/discovery-entries'
import { DiscoveryStudyDrawer } from './discovery-study-drawer'

const METHOD_LABELS: Record<DiscoveryStudyMethod, string> = {
  interview: 'Interviews',
  review: 'Reviews',
  survey: 'Surveys',
  observation: 'Observations',
  email: 'Email feedback',
  mixed: 'Mixed methods',
}

const METHOD_COLORS: Record<DiscoveryStudyMethod, string> = {
  interview: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  survey: 'bg-green-50 text-green-700 border-green-200',
  observation: 'bg-purple-50 text-purple-700 border-purple-200',
  email: 'bg-rose-50 text-rose-700 border-rose-200',
  mixed: 'bg-muted text-muted-foreground border-border',
}

const STATUS_BADGE: Record<string, string> = {
  complete: 'rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200',
  archived: 'rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border',
}

interface DiscoveryStudiesListProps {
  projectId: string
  studies: DiscoveryStudyRow[]
  entries: DiscoveryEntryRow[]
  onSelect: (study: DiscoveryStudyRow) => void
  onStudyCreated: (study: DiscoveryStudyRow) => void
  onStudyUpdated: (study: DiscoveryStudyRow) => void
  onStudyDeleted: (id: string) => void
}

export function DiscoveryStudiesList({
  projectId,
  studies,
  entries,
  onSelect,
  onStudyCreated,
  onStudyUpdated,
  onStudyDeleted,
}: DiscoveryStudiesListProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingStudy, setEditingStudy] = useState<DiscoveryStudyRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  function openCreate() {
    setEditingStudy(null)
    setDrawerOpen(true)
  }

  function openEdit(e: React.MouseEvent, study: DiscoveryStudyRow) {
    e.stopPropagation()
    setEditingStudy(study)
    setDrawerOpen(true)
  }

  async function handleDelete(e: React.MouseEvent, study: DiscoveryStudyRow) {
    e.stopPropagation()
    if (!confirm(`Delete "${study.name}"? This cannot be undone.`)) return
    setDeleting(study.id)
    const res = await fetch(`/api/discovery-studies/${study.id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) onStudyDeleted(study.id)
  }

  function entryCount(studyId: string) {
    return entries.filter((e) => e.study_id === studyId).length
  }

  function handleDrawerSaved(study: DiscoveryStudyRow) {
    if (editingStudy) {
      onStudyUpdated(study)
    } else {
      onStudyCreated(study)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {studies.length} {studies.length === 1 ? 'study' : 'studies'}
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New study
          </button>
        </div>

        {studies.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground mb-1">No studies yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Create a study to organise a research effort — interviews, surveys, reviews, or email
              feedback.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="text-sm font-medium text-primary hover:underline"
            >
              Create the first study
            </button>
          </div>
        )}

        {studies.length > 0 && (
          <div className="space-y-2">
            {studies.map((study) => {
              const count = entryCount(study.id)
              return (
                <div
                  key={study.id}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-4 transition-colors hover:bg-muted/20 cursor-pointer"
                  onClick={() => onSelect(study)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(study)}
                  aria-label={`Open study: ${study.name}`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{study.name}</span>
                      {study.method && (
                        <span
                          className={cn(
                            'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                            METHOD_COLORS[study.method],
                          )}
                        >
                          {METHOD_LABELS[study.method]}
                        </span>
                      )}
                      {study.status !== 'active' && (
                        <span className={STATUS_BADGE[study.status]}>
                          {study.status === 'complete' ? 'Complete' : 'Archived'}
                        </span>
                      )}
                    </div>
                    {study.goal && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {study.goal}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/60">
                      {count} {count === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => openEdit(e, study)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                      title="Edit study"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, study)}
                      disabled={deleting === study.id}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      title="Delete study"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DiscoveryStudyDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleDrawerSaved}
        projectId={projectId}
        editing={editingStudy}
      />
    </>
  )
}
