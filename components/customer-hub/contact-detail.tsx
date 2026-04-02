'use client'

import { useState } from 'react'
import {
  Mail,
  ArrowDown,
  ArrowUp,
  StickyNote,
  Trash2,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactRow, ContactSegment } from '@/lib/queries/contacts'
import type { ContactCommunicationRow, CommunicationChannel } from '@/lib/queries/contact-communications'
import type { CustomerInsightRow, InsightCategory, InsightImpact } from '@/lib/queries/customer-insights'
import { AddCommunicationDialog } from './add-communication-dialog'
import { AddInsightDialog } from './add-insight-dialog'

interface ContactDetailProps {
  contact: ContactRow
  communications: ContactCommunicationRow[]
  insights: CustomerInsightRow[]
  onCommunicationAdded: (comm: ContactCommunicationRow) => void
  onCommunicationDeleted: (id: string) => void
  onInsightAdded: (insight: CustomerInsightRow) => void
  onInsightDeleted: (id: string) => void
  onChatWithContact: () => void
}

const SEGMENT_LABELS: Record<ContactSegment, string> = {
  beta_user: 'Beta User',
  prospect: 'Prospect',
  customer: 'Customer',
  churned: 'Churned',
  investor: 'Investor',
  partner: 'Partner',
  other: 'Other',
}

const SEGMENT_BADGE_CLASSES: Record<ContactSegment, string> = {
  beta_user: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800',
  customer: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
  prospect: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  churned: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  investor: 'bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800',
  partner: 'bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:text-indigo-400 dark:border-indigo-800',
  other: 'bg-muted text-muted-foreground border-border',
}

const HEALTH_DOT_CLASSES = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
}

const HEALTH_LABELS = {
  green: 'Healthy',
  yellow: 'Needs attention',
  red: 'At risk',
}

const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  chat: 'Chat',
  sms: 'SMS',
  other: 'Other',
}

const SENTIMENT_DOT_CLASSES = {
  positive: 'bg-green-500',
  neutral: 'bg-muted-foreground/40',
  negative: 'bg-red-500',
  mixed: 'bg-amber-400',
}

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  pain_point: 'Pain Point',
  feature_request: 'Feature Request',
  praise: 'Praise',
  objection: 'Objection',
  churn_signal: 'Churn Signal',
  usage_pattern: 'Usage Pattern',
  market_insight: 'Market Insight',
}

const CATEGORY_BADGE_CLASSES: Record<InsightCategory, string> = {
  pain_point: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  feature_request: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800',
  praise: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
  objection: 'bg-orange-500/10 text-orange-700 border-orange-200 dark:text-orange-400 dark:border-orange-800',
  churn_signal: 'bg-red-700/10 text-red-800 border-red-300 dark:text-red-300 dark:border-red-700',
  usage_pattern: 'bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800',
  market_insight: 'bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:text-indigo-400 dark:border-indigo-800',
}

const IMPACT_BADGE_CLASSES: Record<InsightImpact, string> = {
  high: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  low: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function CommunicationCard({
  comm,
  onDelete,
}: {
  comm: ContactCommunicationRow
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = comm.content.length > 200
  const displayContent = expanded || !isLong ? comm.content : comm.content.slice(0, 200) + '…'

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

  const directionLabel =
    comm.direction === 'inbound' ? 'Inbound' : comm.direction === 'outbound' ? 'Outbound' : 'Note'

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20">
      <div className={cn('mt-0.5 shrink-0', directionColor)}>
        <DirectionIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-muted-foreground">{directionLabel}</span>
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
          <p className="text-xs font-medium text-foreground mb-1">{comm.subject}</p>
        )}
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{displayContent}</p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-[11px] font-medium text-primary hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground/60">
            {formatDate(comm.sent_at ?? comm.created_at)}
          </span>
          {comm.sentiment && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
              <span
                className={cn('h-1.5 w-1.5 rounded-full', SENTIMENT_DOT_CLASSES[comm.sentiment])}
              />
              {comm.sentiment}
            </span>
          )}
          {comm.tags.map((tag) => (
            <span key={tag} className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (confirm('Delete this communication?')) onDelete(comm.id)
        }}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
        aria-label="Delete communication"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function InsightCard({
  insight,
  onDelete,
}: {
  insight: CustomerInsightRow
  onDelete: (id: string) => void
}) {
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/20">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span
            className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              CATEGORY_BADGE_CLASSES[insight.category],
            )}
          >
            {CATEGORY_LABELS[insight.category]}
          </span>
          <span
            className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              IMPACT_BADGE_CLASSES[insight.impact],
            )}
          >
            {insight.impact}
          </span>
          {insight.include_in_ai && (
            <span title="Included in AI context" className="shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            </span>
          )}
        </div>
        <p className="text-xs text-foreground">{insight.content}</p>
        {insight.source_contact_name && (
          <p className="mt-1 text-[11px] text-muted-foreground/60">From: {insight.source_contact_name}</p>
        )}
        {insight.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {insight.tags.map((tag) => (
              <span key={tag} className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (confirm('Delete this insight?')) onDelete(insight.id)
        }}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
        aria-label="Delete insight"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

type Tab = 'communications' | 'insights'

export function ContactDetail({
  contact,
  communications,
  insights,
  onCommunicationAdded,
  onCommunicationDeleted,
  onInsightAdded,
  onInsightDeleted,
  onChatWithContact,
}: ContactDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('communications')
  const [addCommOpen, setAddCommOpen] = useState(false)
  const [addInsightOpen, setAddInsightOpen] = useState(false)
  const [deletingCommId, setDeletingCommId] = useState<string | null>(null)
  const [deletingInsightId, setDeletingInsightId] = useState<string | null>(null)

  async function handleDeleteComm(id: string) {
    setDeletingCommId(id)
    await fetch(`/api/contact-communications/${id}`, { method: 'DELETE' })
    setDeletingCommId(null)
    onCommunicationDeleted(id)
  }

  async function handleDeleteInsight(id: string) {
    setDeletingInsightId(id)
    await fetch(`/api/customer-insights/${id}`, { method: 'DELETE' })
    setDeletingInsightId(null)
    onInsightDeleted(id)
  }

  const sortedComms = [...communications].sort((a, b) => {
    const aDate = a.sent_at ?? a.created_at
    const bDate = b.sent_at ?? b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Contact header */}
      <div className="shrink-0 px-6 py-5 border-b border-border bg-background">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{contact.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {contact.email && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {contact.email}
                </span>
              )}
              {(contact.company || contact.role) && (
                <span className="text-xs text-muted-foreground">
                  {[contact.role, contact.company].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {contact.segment && (
                <span
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    SEGMENT_BADGE_CLASSES[contact.segment],
                  )}
                >
                  {SEGMENT_LABELS[contact.segment]}
                </span>
              )}
              {contact.health && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className={cn('h-2 w-2 rounded-full', HEALTH_DOT_CLASSES[contact.health])}
                  />
                  {HEALTH_LABELS[contact.health]}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/20">
        <button
          type="button"
          onClick={() => setAddCommOpen(true)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          Add communication
        </button>
        <button
          type="button"
          onClick={onChatWithContact}
          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Draft reply
        </button>
        <button
          type="button"
          onClick={() => setAddInsightOpen(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Add insight
        </button>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-border px-6">
        {(['communications', 'insights'] as Tab[]).map((tab) => {
          const count = tab === 'communications' ? communications.length : insights.length
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-1 py-3 mr-6 text-xs font-medium border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'communications' ? 'Communications' : 'Insights'} ({count})
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'communications' && (
          <div className="space-y-3">
            {sortedComms.length === 0 && (
              <div className="rounded-lg border border-dashed border-border py-12 text-center">
                <p className="text-sm text-muted-foreground">No communications yet.</p>
                <button
                  type="button"
                  onClick={() => setAddCommOpen(true)}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Add the first communication
                </button>
              </div>
            )}
            {sortedComms.map((comm) => (
              <div key={comm.id} className={cn(deletingCommId === comm.id && 'opacity-50 pointer-events-none')}>
                <CommunicationCard comm={comm} onDelete={handleDeleteComm} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-3">
            {insights.length === 0 && (
              <div className="rounded-lg border border-dashed border-border py-12 text-center">
                <p className="text-sm text-muted-foreground">No insights captured yet.</p>
                <button
                  type="button"
                  onClick={() => setAddInsightOpen(true)}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Add the first insight
                </button>
              </div>
            )}
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(deletingInsightId === insight.id && 'opacity-50 pointer-events-none')}
              >
                <InsightCard insight={insight} onDelete={handleDeleteInsight} />
              </div>
            ))}
          </div>
        )}
      </div>

      <AddCommunicationDialog
        open={addCommOpen}
        onClose={() => setAddCommOpen(false)}
        onSaved={(comm) => {
          onCommunicationAdded(comm)
          setAddCommOpen(false)
        }}
        contactId={contact.id}
        contactName={contact.name}
      />

      <AddInsightDialog
        open={addInsightOpen}
        onClose={() => setAddInsightOpen(false)}
        onSaved={(insight) => {
          onInsightAdded(insight)
          setAddInsightOpen(false)
        }}
        sourceContactId={contact.id}
        sourceContactName={contact.name}
      />
    </div>
  )
}
