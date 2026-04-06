'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Video, Plus, Clock, CheckCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MeetingRow } from '@/lib/queries/meetings'
import { NewMeetingForm } from '@/components/meetings/new-meeting-form'

interface OrgMember {
  user_id: string
  full_name: string | null
}

interface MeetingsListProps {
  initialMeetings: MeetingRow[]
  currentUserId: string
  organizationId: string
  orgMembers: OrgMember[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function MeetingStatusBadge({ meeting }: { meeting: MeetingRow }) {
  if (meeting.accepted_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
        <CheckCircle className="h-3 w-3" aria-hidden />
        Routed
      </span>
    )
  }
  if (meeting.processed_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
        <Clock className="h-3 w-3" aria-hidden />
        Pending review
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Circle className="h-3 w-3" aria-hidden />
      Unprocessed
    </span>
  )
}

export function MeetingsList({
  initialMeetings,
  currentUserId,
  organizationId,
  orgMembers,
}: MeetingsListProps) {
  const router = useRouter()
  const [meetings, setMeetings] = useState<MeetingRow[]>(initialMeetings)
  const [showForm, setShowForm] = useState(false)

  function handleMeetingCreated(meeting: MeetingRow) {
    setMeetings((prev) => [meeting, ...prev])
    setShowForm(false)
    router.push(`/dashboard/meetings/${meeting.id}`)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Video className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-semibold text-foreground">Meetings</h1>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {meetings.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New meeting
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Video className="mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden />
            <p className="text-sm font-medium text-muted-foreground">No meetings yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Paste a transcript and let AI extract decisions, actions, and routing suggestions.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New meeting
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border" role="list">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <Link
                  href={`/dashboard/meetings/${meeting.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {meeting.title}
                      </span>
                      {meeting.created_by === currentUserId && (
                        <span className="shrink-0 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">
                          yours
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(meeting.meeting_date ?? meeting.created_at)}</span>
                      {meeting.processed_summary && (
                        <span className="truncate max-w-xs">{meeting.processed_summary.slice(0, 100)}{meeting.processed_summary.length > 100 ? '…' : ''}</span>
                      )}
                    </div>
                  </div>
                  <MeetingStatusBadge meeting={meeting} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* New meeting form modal */}
      {showForm && (
        <NewMeetingForm
          organizationId={organizationId}
          currentUserId={currentUserId}
          orgMembers={orgMembers}
          onCreated={handleMeetingCreated}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
