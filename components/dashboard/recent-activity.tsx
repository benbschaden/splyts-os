'use client'

import Link from 'next/link'
import { FileText, Calendar, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActivityItem {
  id: string
  type: 'output' | 'calendar' | 'project'
  label: string
  detail: string
  href: string
  date: string
}

interface RecentActivityProps {
  items: ActivityItem[]
}

const ICONS = {
  output: Sparkles,
  calendar: Calendar,
  project: FileText,
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-xs text-muted-foreground">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.type]
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
              'hover:bg-accent',
            )}
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {item.detail}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground/60 mt-0.5">
              {timeAgo(item.date)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
