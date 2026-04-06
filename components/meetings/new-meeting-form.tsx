'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MeetingRow } from '@/lib/queries/meetings'

interface OrgMember {
  user_id: string
  full_name: string | null
}

interface NewMeetingFormProps {
  organizationId: string
  currentUserId: string
  orgMembers: OrgMember[]
  onCreated: (meeting: MeetingRow) => void
  onClose: () => void
}

export function NewMeetingForm({
  orgMembers,
  currentUserId,
  onCreated,
  onClose,
}: NewMeetingFormProps) {
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [transcript, setTranscript] = useState('')
  const [visibility, setVisibility] = useState<'attendees_only' | 'org_wide'>('attendees_only')
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(
    new Set([currentUserId]),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleAttendee(userId: string) {
    if (userId === currentUserId) return // creator is always included
    setSelectedAttendees((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !transcript.trim()) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          meeting_date: meetingDate || null,
          raw_transcript: transcript,
          visibility,
          attendee_user_ids: Array.from(selectedAttendees),
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ? String(data.error) : 'Failed to create meeting')
        setSaving(false)
        return
      }

      const { data } = await res.json() as { data: MeetingRow }
      onCreated(data)
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  const otherMembers = orgMembers.filter((m) => m.user_id !== currentUserId)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-start sm:justify-end">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">New meeting</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div className="space-y-1.5">
            <label htmlFor="meeting-title" className="text-sm font-medium text-foreground">
              Title
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q2 planning sync"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="meeting-date" className="text-sm font-medium text-foreground">
              Date <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="meeting-date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="meeting-transcript" className="text-sm font-medium text-foreground">
              Transcript
            </label>
            <textarea
              id="meeting-transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your meeting transcript here…"
              required
              rows={12}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {otherMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Attendees
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  (you are always included)
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {orgMembers.map((member) => {
                  const isSelected = selectedAttendees.has(member.user_id)
                  const isCreator = member.user_id === currentUserId
                  return (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => toggleAttendee(member.user_id)}
                      disabled={isCreator}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-foreground/30',
                        isCreator && 'opacity-60 cursor-default',
                      )}
                    >
                      {member.full_name ?? member.user_id.slice(0, 8)}
                      {isCreator && ' (you)'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Visibility</p>
            <div className="flex gap-3">
              {(['attendees_only', 'org_wide'] as const).map((v) => (
                <label
                  key={v}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                    visibility === v
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30',
                  )}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={visibility === v}
                    onChange={() => setVisibility(v)}
                    className="sr-only"
                  />
                  {v === 'attendees_only' ? 'Attendees only' : 'Whole company'}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !title.trim() || !transcript.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {saving ? 'Saving…' : 'Save meeting'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
