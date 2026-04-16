'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, StickyNote, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ContactCommunicationRow,
  CommunicationDirection,
  CommunicationChannel,
  CommunicationSentiment,
} from '@/lib/queries/contact-communications'
import type { ContactRow } from '@/lib/queries/contacts'

interface InboxViewProps {
  communications: ContactCommunicationRow[]
  contacts: ContactRow[]
  onCommunicationAdded: (comm: ContactCommunicationRow) => void
  onCommunicationDeleted: (id: string) => void
}

const DIRECTION_LABELS: Record<CommunicationDirection, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  internal_note: 'Internal note',
}

const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  chat: 'Chat',
  sms: 'SMS',
  testflight: 'TestFlight',
  userjot: 'UserJot',
  other: 'Other',
}

const SENTIMENT_DOT_CLASSES: Record<CommunicationSentiment, string> = {
  positive: 'bg-green-500',
  neutral: 'bg-muted-foreground/40',
  negative: 'bg-red-500',
  mixed: 'bg-amber-400',
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function InboxView({
  communications,
  contacts,
  onCommunicationAdded: _onCommunicationAdded,
  onCommunicationDeleted,
}: InboxViewProps) {
  const [directionFilter, setDirectionFilter] = useState<CommunicationDirection | 'all'>('all')
  const [channelFilter, setChannelFilter] = useState<CommunicationChannel | 'all'>('all')
  const [contactFilter, setContactFilter] = useState<string>('all')
  const [sentimentFilter, setSentimentFilter] = useState<CommunicationSentiment | 'all'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = communications.filter((c) => {
    if (directionFilter !== 'all' && c.direction !== directionFilter) return false
    if (channelFilter !== 'all' && c.channel !== channelFilter) return false
    if (contactFilter !== 'all' && c.contact_id !== contactFilter) return false
    if (sentimentFilter !== 'all' && c.sentiment !== sentimentFilter) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const aDate = a.sent_at ?? a.created_at
    const bDate = b.sent_at ?? b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })

  const isFiltered =
    directionFilter !== 'all' ||
    channelFilter !== 'all' ||
    contactFilter !== 'all' ||
    sentimentFilter !== 'all'

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/contact-communications/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    onCommunicationDeleted(id)
  }

  const SELECT_CLASS =
    'rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-border bg-muted/20">
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value as CommunicationDirection | 'all')}
          className={SELECT_CLASS}
          aria-label="Filter by direction"
        >
          <option value="all">All directions</option>
          {(Object.keys(DIRECTION_LABELS) as CommunicationDirection[]).map((d) => (
            <option key={d} value={d}>
              {DIRECTION_LABELS[d]}
            </option>
          ))}
        </select>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as CommunicationChannel | 'all')}
          className={SELECT_CLASS}
          aria-label="Filter by channel"
        >
          <option value="all">All channels</option>
          {(Object.keys(CHANNEL_LABELS) as CommunicationChannel[]).map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </option>
          ))}
        </select>

        <select
          value={contactFilter}
          onChange={(e) => setContactFilter(e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filter by contact"
        >
          <option value="all">All contacts</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value as CommunicationSentiment | 'all')}
          className={SELECT_CLASS}
          aria-label="Filter by sentiment"
        >
          <option value="all">All sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
          <option value="mixed">Mixed</option>
        </select>

        {isFiltered && (
          <span className="text-xs text-muted-foreground">
            Showing {sorted.length} of {communications.length}
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {communications.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">No communications yet.</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add one from a contact&apos;s profile.
            </p>
          </div>
        )}

        {communications.length > 0 && sorted.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No communications match your filters.</p>
          </div>
        )}

        {sorted.map((comm) => {
          const DirectionIcon =
            comm.direction === 'inbound'
              ? ArrowDown
              : comm.direction === 'outbound'
                ? ArrowUp
                : StickyNote

          const directionColor =
            comm.direction === 'inbound'
              ? 'text-green-600'
              : comm.direction === 'outbound'
                ? 'text-blue-600'
                : 'text-muted-foreground'

          return (
            <div
              key={comm.id}
              className={cn(
                'group flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20',
                deletingId === comm.id && 'opacity-50 pointer-events-none',
              )}
            >
              <div className={cn('mt-0.5 shrink-0', directionColor)}>
                <DirectionIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {comm.contact_name && (
                    <span className="text-xs font-semibold text-foreground">{comm.contact_name}</span>
                  )}
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {DIRECTION_LABELS[comm.direction]}
                  </span>
                  <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {CHANNEL_LABELS[comm.channel]}
                  </span>
                  {comm.is_draft && (
                    <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                      Draft
                    </span>
                  )}
                </div>
                {comm.subject && (
                  <p className="text-xs font-medium text-foreground mb-1 truncate">{comm.subject}</p>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {comm.content.length > 150 ? comm.content.slice(0, 150) + '…' : comm.content}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted-foreground/60">
                    {formatRelativeDate(comm.sent_at ?? comm.created_at)}
                  </span>
                  {comm.sentiment && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          SENTIMENT_DOT_CLASSES[comm.sentiment],
                        )}
                      />
                      {comm.sentiment}
                    </span>
                  )}
                  {comm.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this communication?')) handleDelete(comm.id)
                }}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                aria-label="Delete communication"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
