'use client'

import { useState, useMemo } from 'react'
import { Plus, X, MessageCircleWarning } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactRow, ContactSegment, ContactStatus, FunnelStage } from '@/lib/queries/contacts'
import { normalizeContactLabel } from '@/lib/contact-labels'
import { AddContactDialog } from './add-contact-dialog'

const FUNNEL_STAGES: Array<{ stage: FunnelStage; label: string; shortLabel: string }> = [
  { stage: 'signup', label: 'Signup', shortLabel: 'Signup' },
  { stage: 'form_completed', label: 'Form Completed', shortLabel: 'Form' },
  { stage: 'downloaded', label: 'Downloaded', shortLabel: 'DL' },
  { stage: 'first_session', label: 'First Session', shortLabel: 'Session' },
  { stage: 'activated', label: 'Activated', shortLabel: 'Active' },
]

interface ContactsListProps {
  contacts: ContactRow[]
  selectedId: string | null
  onSelect: (contact: ContactRow) => void
  onContactCreated: (contact: ContactRow) => void
  onContactDeleted: (id: string) => void
  allTags?: string[]
  allAcquisitionSources?: string[]
  onDeleteTag?: (tag: string) => void
}

const SEGMENT_LABELS: Record<ContactSegment, string> = {
  beta_user: 'Beta User',
  free_user: 'Free User',
  customer: 'Paying Customer',
  power_user: 'Power User',
  prospect: 'Prospect',
  churned: 'Churned',
  other: 'Other',
}

const SEGMENT_BADGE_CLASSES: Record<ContactSegment, string> = {
  beta_user: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800',
  free_user: 'bg-sky-500/10 text-sky-700 border-sky-200 dark:text-sky-400 dark:border-sky-800',
  customer: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
  power_user: 'bg-violet-500/10 text-violet-700 border-violet-200 dark:text-violet-400 dark:border-violet-800',
  prospect: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  churned: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  other: 'bg-muted text-muted-foreground border-border',
}

const HEALTH_DOT_CLASSES = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
}

const SEGMENT_FILTER_OPTIONS: Array<{ value: ContactSegment | 'all'; label: string }> = [
  { value: 'all', label: 'All segments' },
  { value: 'beta_user', label: 'Beta User' },
  { value: 'free_user', label: 'Free User' },
  { value: 'customer', label: 'Paying Customer' },
  { value: 'power_user', label: 'Power User' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'churned', label: 'Churned' },
  { value: 'other', label: 'Other' },
]

const STATUS_FILTER_OPTIONS: Array<{ value: ContactStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

export function ContactsList({
  contacts,
  selectedId,
  onSelect,
  onContactCreated,
  onContactDeleted,
  allTags = [],
  allAcquisitionSources = [],
  onDeleteTag,
}: ContactsListProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<ContactSegment | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all')
  const [funnelStageFilter, setFunnelStageFilter] = useState<FunnelStage | 'all'>('all')
  const [needsResponseOnly, setNeedsResponseOnly] = useState(false)

  const funnelCounts = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const counts = new Map<string, number>()
    const weeklyAdds = new Map<string, number>()

    for (const c of contacts) {
      if (!c.funnel_stage) continue
      counts.set(c.funnel_stage, (counts.get(c.funnel_stage) ?? 0) + 1)
      const t =
        c.funnel_stage === 'signup'
          ? new Date(c.created_at).getTime()
          : new Date(c.funnel_stage_updated_at ?? c.created_at).getTime()
      if (t >= weekAgo) {
        weeklyAdds.set(c.funnel_stage, (weeklyAdds.get(c.funnel_stage) ?? 0) + 1)
      }
    }

    return FUNNEL_STAGES.map(({ stage, label, shortLabel }) => ({
      stage,
      label,
      shortLabel,
      current: counts.get(stage) ?? 0,
      addedThisWeek: weeklyAdds.get(stage) ?? 0,
    }))
  }, [contacts])

  const hasFunnelData = funnelCounts.some((s) => s.current > 0)

  const tagUsageCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of contacts) {
      for (const t of c.tags) {
        const n = normalizeContactLabel(t)
        if (!n) continue
        m.set(n, (m.get(n) ?? 0) + 1)
      }
    }
    return m
  }, [contacts])

  const needsResponseCount = useMemo(
    () => contacts.filter((c) => c.response_status === 'needs_response').length,
    [contacts],
  )

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())

    const matchesSegment = segmentFilter === 'all' || c.segment === segmentFilter
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesTag =
      tagFilter === 'all' ||
      c.tags.some((t) => normalizeContactLabel(t) === tagFilter)
    const matchesFunnel = funnelStageFilter === 'all' || c.funnel_stage === funnelStageFilter
    const matchesResponse = !needsResponseOnly || c.response_status === 'needs_response'

    return matchesSearch && matchesSegment && matchesStatus && matchesTag && matchesFunnel && matchesResponse
  })

  const isFiltering =
    search.trim() !== '' ||
    segmentFilter !== 'all' ||
    statusFilter !== 'all' ||
    tagFilter !== 'all' ||
    funnelStageFilter !== 'all' ||
    needsResponseOnly

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {contacts.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label="Add contact"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {/* Funnel strip — only shown once at least one contact has a funnel stage set */}
      {hasFunnelData && (
        <div className="px-2 pt-2 pb-1.5 border-b border-border">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
            Funnel
          </p>
          <div className="flex gap-1">
            {funnelCounts.map(({ stage, label, shortLabel, current, addedThisWeek }) => {
              const isActive = funnelStageFilter === stage
              return (
                <button
                  key={stage}
                  type="button"
                  title={label}
                  onClick={() => setFunnelStageFilter(isActive ? 'all' : stage)}
                  className={cn(
                    'flex flex-1 min-w-0 flex-col items-center rounded-md border px-0.5 py-1.5 transition-colors',
                    isActive
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/20 hover:bg-primary/5 hover:text-foreground',
                  )}
                >
                  <span className="text-[8px] font-medium leading-none truncate w-full text-center">
                    {shortLabel}
                  </span>
                  <span className={cn('text-sm font-bold leading-none mt-1', isActive ? 'text-primary' : 'text-foreground')}>
                    {current}
                  </span>
                  {addedThisWeek > 0 ? (
                    <span className="text-[8px] font-medium leading-none mt-0.5 text-green-600 dark:text-green-400">
                      +{addedThisWeek}
                    </span>
                  ) : (
                    <span className="text-[8px] leading-none mt-0.5 opacity-0">·</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-3 py-2.5 space-y-2 border-b border-border">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className="w-full rounded-md border border-input bg-muted/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value as ContactSegment | 'all')}
          className="w-full rounded-md border border-input bg-muted/40 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SEGMENT_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContactStatus | 'all')}
          className="w-full rounded-md border border-input bg-muted/40 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Needs Response quick filter */}
        {needsResponseCount > 0 && (
          <button
            type="button"
            onClick={() => setNeedsResponseOnly((v) => !v)}
            className={cn(
              'flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
              needsResponseOnly
                ? 'border-amber-400/60 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700'
                : 'border-border bg-muted/40 text-foreground hover:border-amber-300 hover:bg-amber-50/60 dark:hover:bg-amber-900/10',
            )}
          >
            <span className="flex items-center gap-1.5">
              <MessageCircleWarning className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Needs Response
            </span>
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              needsResponseOnly
                ? 'bg-amber-600 text-white dark:bg-amber-500'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
            )}>
              {needsResponseCount}
            </span>
          </button>
        )}

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => {
                const isActive = tagFilter === tag
                const count = tagUsageCounts.get(tag) ?? 0
                return (
                  <div key={tag} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setTagFilter(isActive ? 'all' : tag)}
                      className={cn(
                        'rounded-l border px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                        isActive
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border bg-muted text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary',
                      )}
                    >
                      {tag}
                      <span className="text-muted-foreground/80 font-normal"> ({count})</span>
                    </button>
                    {onDeleteTag && count > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (tagFilter === tag) setTagFilter('all')
                          onDeleteTag(tag)
                        }}
                        className="rounded-r border border-l-0 border-border bg-muted px-1 py-0.5 text-muted-foreground/50 hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive transition-colors"
                        aria-label={`Remove tag ${tag} from all contacts`}
                        title="Remove this tag from every contact (deletes it from the list when unused)"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 && (
          <div className="rounded-lg border border-dashed border-border mx-3 my-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">No contacts yet</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Add your first contact
            </button>
          </div>
        )}

        {contacts.length > 0 && filtered.length === 0 && isFiltering && (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground">No contacts match</p>
          </div>
        )}

        {filtered.map((contact) => {
          const isSelected = contact.id === selectedId
          const isInactive = contact.status === 'inactive' || contact.status === 'archived'
          const displayTags = Array.from(
            new Set(contact.tags.map((t) => normalizeContactLabel(t)).filter(Boolean)),
          )
          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelect(contact)}
              className={cn(
                'group w-full text-left px-3 py-3 border-b border-border/60 transition-colors hover:bg-muted/30',
                isSelected && 'bg-primary/5 border-l-2 border-l-primary/60',
                isInactive && 'opacity-50',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground truncate">{contact.name}</span>
                    {contact.response_status === 'needs_response' && (
                      <span title="Awaiting response" className="shrink-0">
                        <MessageCircleWarning className="h-3 w-3 text-amber-500" />
                      </span>
                    )}
                    {contact.health && (
                      <span
                        className={cn('h-2 w-2 shrink-0 rounded-full', HEALTH_DOT_CLASSES[contact.health])}
                        title={contact.health}
                      />
                    )}
                    {isInactive && (
                      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                        {contact.status}
                      </span>
                    )}
                  </div>
                  {contact.email && (
                    <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{contact.email}</p>
                  )}
                  {displayTags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {displayTags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      {displayTags.length > 3 && (
                        <span className="text-[9px] text-muted-foreground/60">
                          +{displayTags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {contact.segment && (
                  <span
                    className={cn(
                      'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                      SEGMENT_BADGE_CLASSES[contact.segment],
                    )}
                  >
                    {SEGMENT_LABELS[contact.segment]}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <AddContactDialog
        open={addOpen}
        availableTags={allTags}
        availableAcquisitionSources={allAcquisitionSources}
        onClose={() => setAddOpen(false)}
        onSaved={(contact) => {
          onContactCreated(contact)
          setAddOpen(false)
        }}
      />
    </div>
  )
}
