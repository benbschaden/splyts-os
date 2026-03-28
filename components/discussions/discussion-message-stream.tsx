'use client'

import type { DiscussionMessageRow } from '@/lib/queries/discussions'

interface DiscussionMessageStreamProps {
  messages: DiscussionMessageRow[]
  currentUserId: string
}

export function DiscussionMessageStream({ messages, currentUserId }: DiscussionMessageStreamProps) {
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
        return (
          <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium text-foreground">
              {msg.user_id.slice(0, 2).toUpperCase()}
            </div>
            <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
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
