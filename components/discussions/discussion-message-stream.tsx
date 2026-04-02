'use client'

import type { DiscussionMessageRow } from '@/lib/queries/discussions'
import type { UserProfileSummary } from '@/lib/queries/user-profile'

function getInitials(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface DiscussionMessageStreamProps {
  messages: DiscussionMessageRow[]
  currentUserId: string
  profiles?: Record<string, UserProfileSummary>
}

export function DiscussionMessageStream({
  messages,
  currentUserId,
  profiles = {},
}: DiscussionMessageStreamProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No messages yet. Start the discussion.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {messages.map((msg) => {
        const isOwn = msg.user_id === currentUserId
        const profile = profiles[msg.user_id]
        const initials = getInitials(profile?.full_name)
        const avatarUrl = profile?.avatar_url

        return (
          <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium text-foreground overflow-hidden ring-1 ring-border">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={profile?.full_name ?? ''} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
              {!isOwn && profile?.full_name && (
                <span className="px-1 text-[11px] font-medium text-muted-foreground">
                  {profile.full_name.split(' ')[0]}
                </span>
              )}
              <div
                className={`rounded-xl px-3 py-2 text-sm ${
                  isOwn ? 'bg-foreground text-background' : 'bg-accent text-foreground'
                }`}
              >
                {msg.content}
              </div>
              <span className="px-1 text-xs text-muted-foreground">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
