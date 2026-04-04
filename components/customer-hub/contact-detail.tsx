'use client'

import { useState, useEffect } from 'react'
import {
  Mail,
  ArrowDown,
  ArrowUp,
  StickyNote,
  Trash2,
  Sparkles,
  Loader2,
  X,
  ChevronDown,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactRow, ContactSegment } from '@/lib/queries/contacts'
import type { ContactCommunicationRow, CommunicationChannel } from '@/lib/queries/contact-communications'
import type { CustomerInsightRow, InsightCategory, InsightImpact } from '@/lib/queries/customer-insights'
import type { PersonaRow } from '@/lib/queries/personas'
import { AddCommunicationDialog } from './add-communication-dialog'
import { AddInsightDialog } from './add-insight-dialog'
import { HubChatPanel } from './hub-chat-panel'

interface ContactDetailProps {
  contact: ContactRow
  communications: ContactCommunicationRow[]
  insights: CustomerInsightRow[]
  personas: PersonaRow[]
  onCommunicationAdded: (comm: ContactCommunicationRow) => void
  onCommunicationDeleted: (id: string) => void
  onCommunicationUpdated: (comm: ContactCommunicationRow) => void
  onInsightAdded: (insight: CustomerInsightRow) => void
  onInsightDeleted: (id: string) => void
}

type GenerateState =
  | { status: 'idle' }
  | { status: 'form' }
  | { status: 'generating' }
  | { status: 'reviewing'; subject: string; body: string }
  | { status: 'saving' }
  | { status: 'error'; message: string }

type MatchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; personaId: string | null; personaName: string | null; score: number; reasoning: string; suggestNew: boolean; newPersonaDraft: Record<string, string | null> | null }
  | { status: 'creating_persona' }
  | { status: 'persona_created'; name: string }
  | { status: 'error'; message: string }

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
  onUpdated,
}: {
  comm: ContactCommunicationRow
  onDelete: (id: string) => void
  onUpdated: (comm: ContactCommunicationRow) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [markingAsSent, setMarkingAsSent] = useState(false)
  const [sentAtValue, setSentAtValue] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [isSavingMarkSent, setIsSavingMarkSent] = useState(false)
  const isLong = comm.content.length > 200
  const displayContent = expanded || !isLong ? comm.content : comm.content.slice(0, 200) + '…'

  async function confirmMarkSent() {
    setIsSavingMarkSent(true)
    try {
      const res = await fetch(`/api/contact-communications/${comm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_draft: false, sent_at: new Date(sentAtValue).toISOString() }),
      })
      const data = await res.json()
      if (res.ok && data.data) {
        onUpdated(data.data)
      }
    } finally {
      setIsSavingMarkSent(false)
      setMarkingAsSent(false)
    }
  }

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
              Pending
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
          {comm.is_draft && !markingAsSent && (
            <button
              type="button"
              onClick={() => setMarkingAsSent(true)}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Mark as sent
            </button>
          )}
        </div>
        {comm.is_draft && markingAsSent && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="datetime-local"
              value={sentAtValue}
              onChange={(e) => setSentAtValue(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={confirmMarkSent}
              disabled={isSavingMarkSent}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSavingMarkSent ? 'Saving…' : 'Confirm sent'}
            </button>
            <button
              type="button"
              onClick={() => setMarkingAsSent(false)}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
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

type Tab = 'communications' | 'insights' | 'chat'

export function ContactDetail({
  contact,
  communications,
  insights,
  personas,
  onCommunicationAdded,
  onCommunicationDeleted,
  onCommunicationUpdated,
  onInsightAdded,
  onInsightDeleted,
}: ContactDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('communications')
  const [addCommOpen, setAddCommOpen] = useState(false)
  const [addInsightOpen, setAddInsightOpen] = useState(false)
  const [deletingCommId, setDeletingCommId] = useState<string | null>(null)
  const [deletingInsightId, setDeletingInsightId] = useState<string | null>(null)
  const [generateState, setGenerateState] = useState<GenerateState>({ status: 'idle' })
  const [purpose, setPurpose] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [refineInstruction, setRefineInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [includeChatContext, setIncludeChatContext] = useState(false)
  const [matchState, setMatchState] = useState<MatchState>({ status: 'idle' })

  useEffect(() => {
    setMatchState({ status: 'idle' })
  }, [contact.id])

  async function handleGenerate() {
    if (!purpose.trim()) return
    setGenerateState({ status: 'generating' })
    try {
      const res = await fetch(`/api/contacts/${contact.id}/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: purpose.trim(), additional_context: additionalContext.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        const details = data.details ? Object.entries(data.details).map(([f, errs]) => `${f}: ${(errs as string[]).join(', ')}`).join('; ') : null
        setGenerateState({ status: 'error', message: details ?? data.error ?? 'Generation failed.' })
        return
      }
      setDraftSubject(data.subject)
      setDraftBody(data.body)
      setGenerateState({ status: 'reviewing', subject: data.subject, body: data.body })
    } catch {
      setGenerateState({ status: 'error', message: 'Something went wrong. Please try again.' })
    }
  }

  async function handleSaveDraft() {
    setGenerateState((prev) => prev.status === 'reviewing' ? { status: 'saving' } : prev)
    try {
      const res = await fetch('/api/contact-communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contact.id,
          direction: 'outbound',
          channel: 'email',
          subject: draftSubject,
          content: draftBody,
          is_draft: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenerateState({ status: 'error', message: data.error ?? 'Failed to save draft.' })
        return
      }
      onCommunicationAdded(data.data)
      setGenerateState({ status: 'idle' })
      setPurpose('')
      setAdditionalContext('')
      setActiveTab('communications')
    } catch {
      setGenerateState({ status: 'error', message: 'Failed to save draft.' })
    }
  }

  async function handleRefine() {
    if (!refineInstruction.trim() || isRefining) return
    setIsRefining(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}/refine-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_subject: draftSubject,
          current_body: draftBody,
          instruction: refineInstruction.trim(),
          include_chat_context: includeChatContext,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenerateState({ status: 'error', message: data.error ?? 'Refinement failed.' })
        return
      }
      setDraftSubject(data.subject)
      setDraftBody(data.body)
      setRefineInstruction('')
    } catch {
      setGenerateState({ status: 'error', message: 'Something went wrong. Please try again.' })
    } finally {
      setIsRefining(false)
    }
  }

  function dismissGenerate() {
    setGenerateState({ status: 'idle' })
  }

  async function handleAssessPersona() {
    setMatchState({ status: 'loading' })
    try {
      const res = await fetch(`/api/contacts/${contact.id}/match-persona`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setMatchState({ status: 'error', message: data.error ?? 'Assessment failed.' })
        return
      }
      setMatchState({
        status: 'done',
        personaId: data.match.persona_id,
        personaName: data.match.persona_name,
        score: data.match.score,
        reasoning: data.match.reasoning,
        suggestNew: data.suggest_new_persona ?? false,
        newPersonaDraft: data.new_persona_draft ?? null,
      })
    } catch {
      setMatchState({ status: 'error', message: 'Something went wrong. Please try again.' })
    }
  }

  async function handleCreateSuggestedPersona(draft: Record<string, string | null>) {
    setMatchState((prev) => ({ ...prev, status: 'creating_persona' } as MatchState))
    try {
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, include_in_ai: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMatchState({ status: 'error', message: data.error ?? 'Failed to create persona.' })
        return
      }
      setMatchState({ status: 'persona_created', name: data.data?.name ?? draft.name ?? 'New persona' })
    } catch {
      setMatchState({ status: 'error', message: 'Failed to create persona.' })
    }
  }

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

  // Derive currently shown persona match — prefer fresh match result over stored contact fields
  const currentPersonaId = matchState.status === 'done' ? matchState.personaId : contact.persona_id
  const currentPersonaScore = matchState.status === 'done' ? matchState.score : contact.persona_match_score
  const currentPersonaName =
    matchState.status === 'done'
      ? matchState.personaName
      : personas.find((p) => p.id === contact.persona_id)?.name ?? null

  const isAssessing = matchState.status === 'loading'
  const isCreatingPersona = matchState.status === 'creating_persona'

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
              {currentPersonaId && currentPersonaName && currentPersonaScore !== null && (
                <span className="flex items-center gap-1.5 rounded border border-violet-200 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-800 dark:text-violet-400">
                  <Users className="h-3 w-3 shrink-0" />
                  {currentPersonaName}
                  <span className="opacity-70">• {currentPersonaScore}%</span>
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
          onClick={() => setGenerateState({ status: 'form' })}
          disabled={generateState.status === 'generating' || generateState.status === 'saving'}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate email
        </button>
        <button
          type="button"
          onClick={() => setAddInsightOpen(true)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          Add insight
        </button>
        <button
          type="button"
          onClick={handleAssessPersona}
          disabled={isAssessing}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-violet-300 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-500/20 dark:border-violet-700 dark:text-violet-400 disabled:opacity-50 transition-colors"
        >
          {isAssessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Users className="h-3.5 w-3.5" />
          )}
          {isAssessing ? 'Assessing…' : currentPersonaId ? 'Re-assess persona' : 'Assess persona'}
        </button>
      </div>

      {/* Inline persona match result panel */}
      {(matchState.status === 'done' || matchState.status === 'persona_created' || matchState.status === 'error') && (
        <div className="shrink-0 border-b border-border bg-background">
          <div className="flex items-start justify-between px-6 py-3">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              {matchState.status === 'done' && (
                <>
                  <div className="flex-1 min-w-0">
                    {matchState.personaId && matchState.personaName ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-500" />
                        <span className="text-sm font-medium text-foreground">
                          Matched: <span className="text-violet-700 dark:text-violet-400">{matchState.personaName}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">—</span>
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">{matchState.score}% confidence</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                        <span className="text-sm font-medium text-foreground">No strong persona match</span>
                        <span className="text-xs text-muted-foreground">({matchState.score}% — below threshold)</span>
                      </div>
                    )}
                    {/* Score bar */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            matchState.score >= 80 ? 'bg-violet-500' :
                            matchState.score >= 60 ? 'bg-blue-500' :
                            matchState.score >= 45 ? 'bg-amber-500' : 'bg-red-500',
                          )}
                          style={{ width: `${matchState.score}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{matchState.reasoning}</p>
                    {matchState.suggestNew && matchState.newPersonaDraft && (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                          New persona suggested: <span className="font-semibold">{String(matchState.newPersonaDraft.name ?? '')}</span>
                        </p>
                        {matchState.newPersonaDraft.tagline && (
                          <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">{String(matchState.newPersonaDraft.tagline)}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCreateSuggestedPersona(matchState.newPersonaDraft!)}
                          className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Create persona in Company
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {matchState.status === 'persona_created' && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-foreground">
                    Persona <span className="font-medium">{matchState.name}</span> created in Company → Personas.
                  </span>
                </div>
              )}
              {matchState.status === 'error' && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{matchState.message}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMatchState({ status: 'idle' })}
              className="ml-3 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Inline generate email panel */}
      {generateState.status !== 'idle' && (
        <div className="shrink-0 border-b border-border bg-background shadow-sm">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {(generateState.status === 'generating' || generateState.status === 'saving') && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {generateState.status === 'reviewing' && (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {generateState.status === 'form' && 'Generate email draft'}
                {generateState.status === 'generating' && 'Generating…'}
                {(generateState.status === 'reviewing' || generateState.status === 'saving') && (isRefining ? 'Refining…' : 'Review & refine')}
                {generateState.status === 'saving' && !isRefining && 'Saving…'}
                {generateState.status === 'error' && 'Generation failed'}
              </span>
            </div>
            <button
              type="button"
              onClick={dismissGenerate}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {generateState.status === 'error' && (
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-destructive">{generateState.message}</p>
              <button
                type="button"
                onClick={() => setGenerateState({ status: 'form' })}
                className="text-xs font-medium text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {generateState.status === 'form' && (
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  What's the purpose of this email? <span className="text-destructive">*</span>
                </label>
                <textarea
                  maxLength={1000}
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Follow up on their onboarding question, share new feature announcement…"
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Additional context or info to include
                  <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g. They asked about CSV export last week — mention it's now live in v2.3…"
                  rows={3}
                  maxLength={10000}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!purpose.trim()}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate
                </button>
                <button
                  type="button"
                  onClick={dismissGenerate}
                  className="rounded-md border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(generateState.status === 'reviewing' || generateState.status === 'saving') && (
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Subject</label>
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  disabled={isRefining || generateState.status === 'saving'}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Body</label>
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={10}
                  disabled={isRefining || generateState.status === 'saving'}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={generateState.status === 'saving' || isRefining || !draftSubject.trim() || !draftBody.trim()}
                  className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {generateState.status === 'saving' ? 'Saving…' : 'Save as pending'}
                </button>
                <button
                  type="button"
                  onClick={() => setGenerateState({ status: 'form' })}
                  disabled={generateState.status === 'saving' || isRefining}
                  className="flex items-center gap-1 rounded-md border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <ChevronDown className="h-3 w-3 -rotate-90" />
                  Start over
                </button>
                <button
                  type="button"
                  onClick={dismissGenerate}
                  disabled={generateState.status === 'saving' || isRefining}
                  className="rounded-md border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <label className="block text-xs font-medium text-foreground">Refine with AI</label>
                <textarea
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRefine() }}
                  placeholder="e.g. Make it sound stronger, add a point about their onboarding, shorten it…"
                  rows={2}
                  maxLength={5000}
                  disabled={isRefining || generateState.status === 'saving'}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeChatContext}
                      onChange={(e) => setIncludeChatContext(e.target.checked)}
                      disabled={isRefining || generateState.status === 'saving'}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    Include AI chat context
                  </label>
                  <button
                    type="button"
                    onClick={handleRefine}
                    disabled={!refineInstruction.trim() || isRefining || generateState.status === 'saving'}
                    className="flex items-center gap-1.5 rounded-md bg-muted px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    {isRefining ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Refining…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Refine
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-border px-6">
        {([
          { id: 'communications', label: `Communications (${communications.length})` },
          { id: 'insights', label: `Insights (${insights.length})` },
          { id: 'chat', label: 'Chat' },
        ] as Array<{ id: Tab; label: string }>).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-1 py-3 mr-6 text-xs font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={cn('flex-1 min-h-0', activeTab === 'chat' ? 'overflow-hidden' : 'overflow-y-auto px-6 py-4')}>
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
                <CommunicationCard comm={comm} onDelete={handleDeleteComm} onUpdated={onCommunicationUpdated} />
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

        {activeTab === 'chat' && (
          <HubChatPanel
            contactId={contact.id}
            placeholder={`Ask about ${contact.name} — what's their biggest issue, how to help them, what to say next…`}
            onInsightsExtracted={(saved) => {
              saved.forEach((insight) => onInsightAdded(insight))
            }}
          />
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
