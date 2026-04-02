'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const POLL_INTERVAL_MS = 30_000

export function DiscussionsNavItem() {
  const pathname = usePathname()
  const isActive = pathname === '/dashboard/discussions'
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
        // silently ignore — not critical
      }
    }

    void fetchUnread()
    const poll = setInterval(() => void fetchUnread(), POLL_INTERVAL_MS)
    return () => clearInterval(poll)
  }, [])

  // When page becomes active, reset count (the inbox page marks items read)
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setUnreadCount(0), 2000)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  return (
    <Link
      href="/dashboard/discussions"
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <MessageCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">Discussions</span>
      {unreadCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
