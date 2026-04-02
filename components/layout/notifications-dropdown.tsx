'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Bell, FileUp, FileText, Link2, MessageCircle, CheckCircle2, Zap, X } from 'lucide-react'
import type { ProjectActivityRow, ActivityActionType } from '@/lib/queries/project-activity'

const POLL_INTERVAL_MS = 30_000

const ACTION_META: Record<
  ActivityActionType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  output_generated: { label: 'generated an output', icon: Zap },
  file_uploaded:    { label: 'uploaded a file',     icon: FileUp },
  note_added:       { label: 'added a note',         icon: FileText },
  link_added:       { label: 'added a link',         icon: Link2 },
  discussion_started: { label: 'started a discussion', icon: MessageCircle },
  discussion_resolved: { label: 'resolved a discussion', icon: CheckCircle2 },
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

function getInitials(name: string | null): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface NotificationData {
  activity: ProjectActivityRow[]
  unread_count: number
  activity_unread: number
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [data, setData] = useState<NotificationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchCount = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/notifications?count_only=true')
      if (res.ok) {
        const json = (await res.json()) as { unread_count: number }
        setUnreadCount(json.unread_count ?? 0)
      }
    } catch {
      // silently ignore
    }
  }, [])

  const fetchFull = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const json = (await res.json()) as NotificationData
        setData(json)
        setUnreadCount(json.unread_count ?? 0)
      }
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Poll for count
  useEffect(() => {
    void fetchCount()
    const poll = setInterval(() => void fetchCount(), POLL_INTERVAL_MS)
    return () => clearInterval(poll)
  }, [fetchCount])

  // Load full data when opened, mark as read
  useEffect(() => {
    if (!open) return
    void fetchFull()
    void fetch('/api/notifications', { method: 'POST' }).then(() => {
      setTimeout(() => setUnreadCount(0), 500)
    })
  }, [open, fetchFull])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={unreadCount > 0 ? `${unreadCount} new notifications` : 'Notifications'}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-0.5 text-[9px] font-bold text-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Activity</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>
            ) : !data || data.activity.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground">All caught up</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Activity from teammates will appear here.
                </p>
              </div>
            ) : (
              data.activity.map((item) => {
                const meta = ACTION_META[item.action_type] ?? ACTION_META.output_generated
                const Icon = meta.icon
                const initials = getInitials(item.actor_name)

                return (
                  <div
                    key={item.id}
                    className="flex gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-accent/40 transition-colors"
                  >
                    {/* Actor avatar */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-semibold text-foreground overflow-hidden ring-1 ring-border">
                      {item.actor_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.actor_avatar} alt={item.actor_name ?? ''} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground leading-snug">
                        <span className="font-medium">
                          {item.actor_name?.split(' ')[0] ?? 'Someone'}
                        </span>{' '}
                        {meta.label}
                        {item.entity_name && (
                          <span className="text-muted-foreground"> — {item.entity_name}</span>
                        )}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Icon className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        {item.project_name && (
                          <span className="truncate text-[10px] text-muted-foreground">
                            {item.project_name}
                          </span>
                        )}
                        <span className="shrink-0 text-[10px] text-muted-foreground/60">
                          · {timeAgo(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {data && data.activity.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <Link
                href="/dashboard/discussions"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all discussions →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
