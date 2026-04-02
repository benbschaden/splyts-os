'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import type { DiscussionInboxRow } from '@/lib/queries/discussions'
import { DiscussionDetail } from './discussion-detail'

const POLL_INTERVAL_MS = 30_000

interface DiscussionsInboxProps {
  currentUserId: string
  organizationId: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function DiscussionsInbox({ currentUserId, organizationId }: DiscussionsInboxProps) {
  const [discussions, setDiscussions] = useState<DiscussionInboxRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadInbox = useCallback(async (isInitial = false): Promise<void> => {
    if (isInitial) setIsLoading(true)
    const res = await fetch('/api/discussions/inbox')
    if (res.ok) {
      const data = (await res.json()) as { discussions: DiscussionInboxRow[] }
      setDiscussions(data.discussions ?? [])
    }
    if (isInitial) setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadInbox(true)
    const poll = setInterval(() => void loadInbox(false), POLL_INTERVAL_MS)
    return () => clearInterval(poll)
  }, [loadInbox])

  const selected = discussions.find((d) => d.id === selectedId) ?? null

  function handleDiscussionUpdated(): void {
    void loadInbox(false)
  }

  return (
    <div className="flex h-full">
      {/* Left panel — discussion list */}
      <div className={`flex flex-col border-r border-border bg-background ${selected ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0`}>
        <div className="flex items-center border-b border-border px-4 py-3">
          <h1 className="text-sm font-semibold text-foreground">Discussions</h1>
          {discussions.filter((d) => d.has_unread).length > 0 && (
            <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
              {discussions.filter((d) => d.has_unread).length}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : discussions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <MessageCircle className="mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">No active discussions</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Discussions you participate in will appear here.
              </p>
            </div>
          ) : (
            discussions.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full border-b border-border px-4 py-3 text-left transition-colors last:border-0 ${
                  selectedId === d.id ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {d.has_unread && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-label="Unread" />
                  )}
                  <div className={`min-w-0 flex-1 ${!d.has_unread ? 'pl-3.5' : ''}`}>
                    <p className="truncate text-sm font-medium text-foreground leading-snug">
                      {d.title}
                    </p>
                    {d.parent_name && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {d.parent_name}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        d.mode === 'structured'
                          ? 'bg-foreground/10 text-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {d.mode === 'structured' ? 'Structured' : 'Light'}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(d.updated_at)}</span>
                    </div>
                  </div>
                  {d.status === 'resolved' && (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — discussion detail */}
      <div className={`flex min-w-0 flex-1 flex-col ${selected ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <>
            {/* Mobile back button */}
            <div className="flex items-center border-b border-border px-3 py-2 md:hidden">
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                All discussions
              </button>
            </div>
            <DiscussionDetail
              discussion={selected}
              organizationId={organizationId}
              currentUserId={currentUserId}
              onUpdated={handleDiscussionUpdated}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Select a discussion to read and reply</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
