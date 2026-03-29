'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Sparkles, MessageSquare, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveryEntryRow, DiscoveryEntryType, DiscoverySentiment } from '@/lib/queries/discovery-entries'
import { DiscoveryDrawer } from './discovery-drawer'

const DISCOVERY_TAGS = [
  'activation', 'retention', 'churn', 'pricing',
  'feature-request', 'pain-point', 'aha-moment',
  'praise', 'competitor', 'onboarding', 'referral',
]

const TYPE_LABELS: Record<DiscoveryEntryType, string> = {
  interview: 'Interview',
  review: 'Review',
  survey: 'Survey',
  observation: 'Observation',
  email: 'Email',
}

const TYPE_COLORS: Record<DiscoveryEntryType, string> = {
  interview: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  survey: 'bg-green-50 text-green-700 border-green-200',
  observation: 'bg-purple-50 text-purple-700 border-purple-200',
  email: 'bg-rose-50 text-rose-700 border-rose-200',
}

const SENTIMENT_COLORS: Record<DiscoverySentiment, string> = {
  positive: 'bg-green-500',
  neutral: 'bg-muted-foreground/40',
  negative: 'bg-red-500',
  mixed: 'bg-amber-400',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}…`
}

interface DiscoveryFeedProps {
  projectId: string
  initialEntries: DiscoveryEntryRow[]
  studyId?: string
  onEntriesChanged?: () => void
  onChatWithParticipant?: (participant: string) => void
}

export function DiscoveryFeed({
  projectId,
  initialEntries,
  studyId,
  onEntriesChanged,
  onChatWithParticipant,
}: DiscoveryFeedProps) {
  const router = useRouter()
  const [entries, setEntries] = useState<DiscoveryEntryRow[]>(initialEntries)
  const [typeFilter, setTypeFilter] = useState<DiscoveryEntryType | ''>('')
  const [sentimentFilter, setSentimentFilter] = useState<DiscoverySentiment | ''>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [participantFilter, setParticipantFilter] = useState<string>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<DiscoveryEntryRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])

  const refresh = useCallback(() => {
    router.refresh()
    onEntriesChanged?.()
  }, [router, onEntriesChanged])

  const filtered = entries.filter((e) => {
    if (typeFilter && e.entry_type !== typeFilter) return false
    if (sentimentFilter && e.sentiment !== sentimentFilter) return false
    if (tagFilter && !e.tags.includes(tagFilter)) return false
    if (participantFilter && e.participant !== participantFilter) return false
    return true
  })

  const activeParticipants = Array.from(
    new Set(entries.map((e) => e.participant).filter((p): p is string => !!p))
  ).sort()

  function openNew() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(entry: DiscoveryEntryRow) {
    setEditing(entry)
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/discovery-entries/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) refresh()
  }

  const activeTags = Array.from(new Set(entries.flatMap((e) => e.tags))).sort()

  return (
    <>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DiscoveryEntryType | '')}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            {(Object.keys(TYPE_LABELS) as DiscoveryEntryType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>

          {/* Sentiment filter */}
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value as DiscoverySentiment | '')}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by sentiment"
          >
            <option value="">All sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
            <option value="mixed">Mixed</option>
          </select>

          {/* Tag filter */}
          {activeTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by tag"
            >
              <option value="">All tags</option>
              {activeTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          {/* Participant filter */}
          {activeParticipants.length > 0 && (
            <select
              value={participantFilter}
              onChange={(e) => setParticipantFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by participant"
            >
              <option value="">All people</option>
              {activeParticipants.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}

          <div className="flex-1" />

          {/* Chat about participant button */}
          {participantFilter && onChatWithParticipant && (
            <button
              type="button"
              onClick={() => onChatWithParticipant(participantFilter)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat about {participantFilter}
            </button>
          )}

          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add entry
          </button>
        </div>

        {/* Count */}
        {(typeFilter || sentimentFilter || tagFilter) && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
          </p>
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground mb-1">No entries yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              {studyId
                ? 'Log interviews, surveys, reviews, or email feedback for this study.'
                : 'Capture interviews, reviews, surveys, and observations here.'}
            </p>
            <button
              type="button"
              onClick={openNew}
              className="text-sm font-medium text-primary hover:underline"
            >
              Add the first entry
            </button>
          </div>
        )}

        {entries.length > 0 && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">No entries match the current filters.</p>
          </div>
        )}

        {/* Entry list */}
        {filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20"
              >
                {/* Sentiment dot */}
                <div className="mt-1.5 shrink-0">
                  {entry.sentiment ? (
                    <span
                      className={cn('block h-2 w-2 rounded-full', SENTIMENT_COLORS[entry.sentiment])}
                      title={entry.sentiment}
                    />
                  ) : (
                    <span className="block h-2 w-2 rounded-full bg-border" />
                  )}
                </div>

                {/* Main content */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Type badge */}
                    <span className={cn(
                      'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      TYPE_COLORS[entry.entry_type],
                    )}>
                      {TYPE_LABELS[entry.entry_type]}
                    </span>

                    {/* Star rating for reviews */}
                    {entry.entry_type === 'review' && entry.star_rating !== null && (
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: entry.star_rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </span>
                    )}

                    {/* Participant */}
                    {entry.participant && (
                      <button
                        type="button"
                        onClick={() => setParticipantFilter(participantFilter === entry.participant ? '' : entry.participant!)}
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                          participantFilter === entry.participant
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground hover:bg-accent',
                        )}
                      >
                        {entry.participant}
                      </button>
                    )}

                    {/* Source */}
                    {entry.source && (
                      <span className="text-[11px] text-muted-foreground">{entry.source}</span>
                    )}

                    {/* Date */}
                    {entry.entry_date && (
                      <span className="text-[11px] text-muted-foreground/60">
                        {formatDate(entry.entry_date)}
                      </span>
                    )}

                    {/* AI indicator */}
                    {entry.include_in_ai ? (
                      <span title="Included in AI context">
                        <Sparkles className="h-3 w-3 text-blue-500 shrink-0" aria-hidden />
                      </span>
                    ) : null}
                  </div>

                  {/* Content preview */}
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {truncate(entry.raw_content, 160)}
                  </p>

                  {/* Tags */}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.slice(0, 5).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] transition-colors',
                            tagFilter === tag
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                      {entry.tags.length > 5 && (
                        <span className="text-[10px] text-muted-foreground/60 px-1">
                          +{entry.tags.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEdit(entry)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DiscoveryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
        editing={editing}
        projectId={projectId}
        studyId={studyId}
        availableTags={DISCOVERY_TAGS}
      />
    </>
  )
}
