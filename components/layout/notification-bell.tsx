'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

const POLL_INTERVAL_MS = 30_000

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function fetchUnread(): Promise<void> {
      try {
        const res = await fetch('/api/discussions/inbox?count_only=true')
        if (res.ok) {
          const data = (await res.json()) as { unread_count: number }
          setUnreadCount(data.unread_count ?? 0)
        }
      } catch {
        // silently ignore
      }
    }

    void fetchUnread()
    const poll = setInterval(() => void fetchUnread(), POLL_INTERVAL_MS)
    return () => clearInterval(poll)
  }, [])

  return (
    <Link
      href="/dashboard/discussions"
      className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label={unreadCount > 0 ? `${unreadCount} unread discussions` : 'Discussions'}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-0.5 text-[9px] font-bold text-background">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
