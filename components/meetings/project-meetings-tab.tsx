'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Video, CheckCircle, Circle, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import type { MeetingRow } from '@/lib/queries/meetings'
import type { PublishedMeetingDocForProject } from '@/lib/queries/meeting-documents'

type ProjectMeeting = MeetingRow & { relevant_summary: string | null }

interface ProjectMeetingsTabProps {
  projectMeetings: ProjectMeeting[]
  projectMeetingDocuments: PublishedMeetingDocForProject[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function MeetingCard({ meeting }: { meeting: ProjectMeeting }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails =
    (meeting.extracted_decisions?.length ?? 0) > 0 ||
    (meeting.extracted_action_items?.length ?? 0) > 0

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/meetings/${meeting.id}`}
            className="text-sm font-medium text-foreground hover:underline"
          >
            {meeting.title}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(meeting.meeting_date ?? meeting.created_at)}
          </p>
          {meeting.relevant_summary && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {meeting.relevant_summary}
            </p>
          )}
        </div>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {(meeting.extracted_decisions ?? []).map((d, i) => (
            <div key={`d-${i}`} className="flex items-start gap-2.5 px-4 py-2.5">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">{d.text}</p>
                {d.owner && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Owner: {d.owner}</p>
                )}
              </div>
            </div>
          ))}
          {(meeting.extracted_action_items ?? []).map((a, i) => (
            <div key={`a-${i}`} className="flex items-start gap-2.5 px-4 py-2.5">
              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">{a.text}</p>
                {a.assignee_name && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Assigned to: {a.assignee_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentCard({ doc }: { doc: PublishedMeetingDocForProject }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium text-foreground">{doc.title}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            From{' '}
            <Link href={`/dashboard/meetings/${doc.meeting_id}`} className="underline hover:text-foreground">
              {doc.meeting_title}
            </Link>
            {doc.published_at && (
              <span> · {formatDate(doc.published_at)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          aria-expanded={open}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans max-h-[240px] overflow-y-auto">
            {doc.content}
          </pre>
        </div>
      )}
    </div>
  )
}

export function ProjectMeetingsTab({
  projectMeetings,
  projectMeetingDocuments,
}: ProjectMeetingsTabProps) {
  const emptyMeetings = projectMeetings.length === 0
  const emptyDocs = projectMeetingDocuments.length === 0

  if (emptyMeetings && emptyDocs) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Video className="mb-3 h-7 w-7 text-muted-foreground/40" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">Nothing here yet</p>
        <p className="mt-1 text-xs text-muted-foreground/70 max-w-sm">
          When meetings are routed to this project, or published notes from Discuss are routed here,
          they will appear in this tab.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {!emptyMeetings && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Meetings
          </h3>
          <div className="space-y-3">
            {projectMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </section>
      )}

      {!emptyDocs && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Published notes
          </h3>
          <div className="space-y-3">
            {projectMeetingDocuments.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
