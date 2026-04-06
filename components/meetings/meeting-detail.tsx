'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  CheckCircle,
  Circle,
  Users,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MeetingRow, MeetingAttendee, SuggestedProjectLink } from '@/lib/queries/meetings'

interface OrgMember {
  user_id: string
  full_name: string | null
}

interface MeetingDetailProps {
  meeting: MeetingRow
  attendees: MeetingAttendee[]
  isCreator: boolean
  organizationId: string
  orgMembers: OrgMember[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground">
          {title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{count}</span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
      </button>
      {open && (
        <div className="divide-y divide-border border-t border-border">{children}</div>
      )}
    </div>
  )
}

function ProjectSuggestionCard({
  suggestion,
  accepted,
  onToggle,
  disabled,
}: {
  suggestion: SuggestedProjectLink
  accepted: boolean
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'w-full text-left rounded-lg border p-4 transition-all',
        accepted
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:border-foreground/30',
        disabled && 'opacity-50 cursor-default',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors',
            accepted ? 'border-primary bg-primary' : 'border-muted-foreground/40',
          )}
          aria-hidden
        >
          {accepted && (
            <CheckCircle className="h-3 w-3 text-primary-foreground translate-x-[1px]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{suggestion.project_name}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {suggestion.rationale}
          </p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            {suggestion.relevant_decisions.length > 0 && (
              <span>{suggestion.relevant_decisions.length} decision{suggestion.relevant_decisions.length !== 1 ? 's' : ''}</span>
            )}
            {suggestion.relevant_actions.length > 0 && (
              <span>{suggestion.relevant_actions.length} action{suggestion.relevant_actions.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export function MeetingDetail({
  meeting: initialMeeting,
  attendees,
  isCreator,
}: MeetingDetailProps) {
  const router = useRouter()
  const [meeting, setMeeting] = useState<MeetingRow>(initialMeeting)
  const [processing, setProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [acceptedProjectIds, setAcceptedProjectIds] = useState<Set<string>>(
    new Set(meeting.suggested_project_links?.map((s) => s.project_id) ?? []),
  )
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [showTranscript, setShowTranscript] = useState(!meeting.processed_at)

  const suggestions = meeting.suggested_project_links ?? []
  const isProcessed = !!meeting.processed_at
  const isAccepted = !!meeting.accepted_at

  async function handleProcess() {
    setProcessing(true)
    setProcessError(null)
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/process`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setProcessError(data.error ?? 'Processing failed')
        setProcessing(false)
        return
      }
      const { data } = await res.json() as { data: MeetingRow }
      setMeeting(data)
      setAcceptedProjectIds(new Set(data.suggested_project_links?.map((s) => s.project_id) ?? []))
      setShowTranscript(false)
    } catch {
      setProcessError('Something went wrong. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  async function handleAccept() {
    setAccepting(true)
    setAcceptError(null)
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted_project_ids: Array.from(acceptedProjectIds) }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setAcceptError(data.error ?? 'Failed to accept')
        setAccepting(false)
        return
      }
      const { data } = await res.json() as { data: MeetingRow }
      setMeeting(data)
      router.refresh()
    } catch {
      setAcceptError('Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  function toggleProjectAcceptance(projectId: string) {
    if (isAccepted) return
    setAcceptedProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Link
          href="/dashboard/meetings"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
          aria-label="Back to meetings"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{meeting.title}</h1>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {formatDate(meeting.meeting_date ?? meeting.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden />
              {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}:&nbsp;
              {attendees.map((a) => a.full_name ?? 'Unknown').join(', ')}
            </span>
          </div>
        </div>

        {isCreator && !isProcessed && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            )}
            {processing ? 'Processing…' : 'Process'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {processError && (
            <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {processError}
            </p>
          )}

          {/* Summary */}
          {meeting.processed_summary && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Summary
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {meeting.processed_summary}
              </p>
            </div>
          )}

          {/* Decisions */}
          {isProcessed && (
            <Section title="Decisions" count={meeting.extracted_decisions?.length ?? 0}>
              {(meeting.extracted_decisions ?? []).length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No decisions recorded.</p>
              ) : (
                meeting.extracted_decisions!.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{d.text}</p>
                      {d.owner && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Owner: {d.owner}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </Section>
          )}

          {/* Action Items */}
          {isProcessed && (
            <Section title="Action items" count={meeting.extracted_action_items?.length ?? 0}>
              {(meeting.extracted_action_items ?? []).length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No action items recorded.</p>
              ) : (
                meeting.extracted_action_items!.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{a.text}</p>
                      {a.assignee_name && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Assigned to: {a.assignee_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </Section>
          )}

          {/* Open Questions */}
          {isProcessed && (meeting.extracted_open_questions?.length ?? 0) > 0 && (
            <Section title="Open questions" count={meeting.extracted_open_questions!.length}>
              {meeting.extracted_open_questions!.map((q, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 text-xs font-bold text-muted-foreground">?</span>
                  <p className="text-sm text-foreground">{q.text}</p>
                </div>
              ))}
            </Section>
          )}

          {/* Project routing suggestions */}
          {isProcessed && suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isAccepted ? 'Routed to projects' : 'Suggested project routing'}
                  </p>
                  {!isAccepted && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select which projects should see this meeting&apos;s content, then confirm.
                    </p>
                  )}
                </div>
                {isAccepted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" aria-hidden />
                    Confirmed
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <ProjectSuggestionCard
                    key={suggestion.project_id}
                    suggestion={suggestion}
                    accepted={acceptedProjectIds.has(suggestion.project_id)}
                    onToggle={() => toggleProjectAcceptance(suggestion.project_id)}
                    disabled={isAccepted}
                  />
                ))}
              </div>

              {!isAccepted && isCreator && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {accepting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                    {accepting ? 'Confirming…' : `Confirm routing${acceptedProjectIds.size > 0 ? ` (${acceptedProjectIds.size})` : ''}`}
                  </button>
                  {acceptError && (
                    <p className="text-sm text-destructive">{acceptError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transcript toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowTranscript((p) => !p)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showTranscript ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              )}
              {showTranscript ? 'Hide transcript' : 'Show transcript'}
            </button>
            {showTranscript && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed font-mono">
                  {meeting.raw_transcript}
                </pre>
              </div>
            )}
          </div>

          {/* Unprocessed state prompt */}
          {!isProcessed && isCreator && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Sparkles className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" aria-hidden />
              <p className="text-sm font-medium text-muted-foreground">Ready to process</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Click &ldquo;Process&rdquo; to extract decisions, actions, and project suggestions from the transcript.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
