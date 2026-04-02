'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowUpRight, CheckCircle2, ChevronUp, FileText, Loader2 } from 'lucide-react'
import type { DiscussionRow, DiscussionMessageRow, DiscussionResolutionData, DiscussionParticipantRow } from '@/lib/queries/discussions'
import type { UserProfileSummary } from '@/lib/queries/user-profile'
import { DiscussionMessageStream } from './discussion-message-stream'
import { ResolveDiscussionDialog } from './resolve-discussion-dialog'
import { CreateDocFromDiscussionDialog } from './create-doc-from-discussion-dialog'

const POLL_INTERVAL_MS = 15_000

interface DiscussionDetailProps {
  discussion: DiscussionRow
  organizationId: string
  currentUserId?: string
  onUpdated: (discussion: DiscussionRow) => void
}

export function DiscussionDetail({
  discussion: initialDiscussion,
  organizationId: _organizationId,
  currentUserId = '',
  onUpdated,
}: DiscussionDetailProps) {
  const [discussion, setDiscussion] = useState(initialDiscussion)
  const [messages, setMessages] = useState<DiscussionMessageRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, UserProfileSummary>>({})
  const [resolution, setResolution] = useState<DiscussionResolutionData | null>(null)
  const [participants, setParticipants] = useState<DiscussionParticipantRow[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [showResolve, setShowResolve] = useState(false)
  const [showCreateDoc, setShowCreateDoc] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFirstLoad = useRef(true)

  const loadMessages = useCallback(async (isInitial = false): Promise<void> => {
    if (isInitial) setIsLoadingMessages(true)

    const [messagesRes, participantsRes] = await Promise.all([
      fetch(`/api/discussions/${discussion.id}/messages`),
      fetch(`/api/discussions/${discussion.id}/participants`),
    ])

    if (messagesRes.ok) {
      const data = (await messagesRes.json()) as {
        messages: DiscussionMessageRow[]
        profiles: Record<string, UserProfileSummary>
      }
      setMessages(data.messages ?? [])
      setProfiles((prev) => ({ ...prev, ...(data.profiles ?? {}) }))
    }
    if (participantsRes.ok) {
      const data = (await participantsRes.json()) as {
        participants: DiscussionParticipantRow[]
        profiles?: Record<string, UserProfileSummary>
      }
      setParticipants(data.participants ?? [])
      if (data.profiles) {
        setProfiles((prev) => ({ ...prev, ...data.profiles }))
      }
    }

    if (discussion.status === 'resolved') {
      const detailRes = await fetch(`/api/discussions/${discussion.id}`)
      if (detailRes.ok) {
        const data = (await detailRes.json()) as {
          discussion: DiscussionRow
          resolution: DiscussionResolutionData | null
        }
        setResolution(data.resolution ?? null)
      }
    }

    // Mark this discussion as read
    void fetch(`/api/discussions/${discussion.id}/mark-read`, { method: 'POST' })

    if (isInitial) setIsLoadingMessages(false)
  }, [discussion.id, discussion.status])

  useEffect(() => {
    isFirstLoad.current = true
    void loadMessages(true).then(() => { isFirstLoad.current = false })

    pollRef.current = setInterval(() => {
      void loadMessages(false)
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [loadMessages])

  useEffect(() => {
    if (!isFirstLoad.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  async function handleSend(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!messageText.trim() || isSending) return
    setIsSending(true)
    const res = await fetch(`/api/discussions/${discussion.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: messageText.trim() }),
    })
    if (res.ok) {
      const data = (await res.json()) as { message: DiscussionMessageRow }
      setMessages((prev) => [...prev, data.message])
      setMessageText('')
    }
    setIsSending(false)
  }

  async function handlePromote(): Promise<void> {
    setIsPromoting(true)
    const res = await fetch(`/api/discussions/${discussion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'structured' }),
    })
    if (res.ok) {
      const data = (await res.json()) as { discussion: DiscussionRow }
      setDiscussion(data.discussion)
      onUpdated(data.discussion)
    }
    setIsPromoting(false)
  }

  function handleResolved(resolved: DiscussionRow, resolutionData: DiscussionResolutionData): void {
    setDiscussion(resolved)
    setResolution(resolutionData)
    setShowResolve(false)
    onUpdated(resolved)
  }

  const isResolved = discussion.status === 'resolved'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{discussion.title}</h2>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                discussion.mode === 'structured'
                  ? 'bg-foreground/10 text-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {discussion.mode === 'structured' ? 'Structured' : 'Lightweight'}
            </span>
            {isResolved && (
              <span className="flex shrink-0 items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Started {new Date(discussion.created_at).toLocaleDateString()}
            {discussion.resolved_at && (
              <> · Resolved {new Date(discussion.resolved_at).toLocaleDateString()}</>
            )}
          </p>
          {participants.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {participants.slice(0, 5).map((p) => {
                  const pProfile = profiles[p.user_id]
                  const pName = pProfile?.full_name ?? null
                  const pAvatar = pProfile?.avatar_url ?? null
                  const pInitials = pName
                    ? pName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                    : '?'
                  return (
                    <div
                      key={p.user_id}
                      title={pName ?? p.user_id}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-foreground/10 text-[9px] font-semibold text-foreground ring-1 ring-border overflow-hidden"
                    >
                      {pAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pAvatar} alt={pName ?? ''} className="h-full w-full object-cover" />
                      ) : (
                        pInitials
                      )}
                    </div>
                  )
                })}
              </div>
              {participants.length > 5 && (
                <span className="text-xs text-muted-foreground">+{participants.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-2">
          {!isResolved && discussion.mode === 'lightweight' && (
            <button
              onClick={() => void handlePromote()}
              disabled={isPromoting}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Make Structured
            </button>
          )}
          <button
            onClick={() => setShowCreateDoc(true)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            <FileText className="h-3.5 w-3.5" />
            Create Doc
          </button>
          {!isResolved && (
            <button
              onClick={() => setShowResolve(true)}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-80"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolve
            </button>
          )}
        </div>
      </div>

      {/* Resolution summary */}
      {isResolved && resolution && (
        <div className="space-y-3 border-b border-border bg-accent/30 px-4 py-3">
          {discussion.ai_summary && (
            <div>
              <p className="mb-1 text-xs font-semibold text-foreground">Summary</p>
              <p className="text-xs text-muted-foreground">{discussion.ai_summary}</p>
            </div>
          )}
          {resolution.decisions.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-foreground">Decisions</p>
              <ul className="space-y-0.5">
                {resolution.decisions.map((d) => (
                  <li key={d.id} className="flex gap-1.5 text-xs text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                    {d.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resolution.learnings.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-foreground">Learnings</p>
              <ul className="space-y-0.5">
                {resolution.learnings.map((l) => (
                  <li key={l.id} className="flex gap-1.5 text-xs text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                    {l.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resolution.nextSteps.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-foreground">Next Steps</p>
              <ul className="space-y-0.5">
                {resolution.nextSteps.map((ns) => (
                  <li key={ns.id} className="flex gap-1.5 text-xs text-muted-foreground">
                    <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    {ns.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DiscussionMessageStream messages={messages} currentUserId={currentUserId} profiles={profiles} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isResolved && (
        <form onSubmit={(e) => void handleSend(e)} className="flex gap-2 border-t border-border px-4 py-3">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Add to the discussion…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </button>
        </form>
      )}

      {showResolve && (
        <ResolveDiscussionDialog
          discussion={discussion}
          onResolved={handleResolved}
          onClose={() => setShowResolve(false)}
        />
      )}
      {showCreateDoc && (
        <CreateDocFromDiscussionDialog
          discussion={discussion}
          onClose={() => setShowCreateDoc(false)}
        />
      )}
    </div>
  )
}
