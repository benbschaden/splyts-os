'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Plus, Trash2, Globe } from 'lucide-react'
import type { ChatSessionRow, ContextConfig } from '@/lib/queries/chat'
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/ai/models'

interface ChatSessionsListProps {
  sessions: ChatSessionRow[]
}

const DEFAULT_CONTEXT: ContextConfig = {
  brand: true,
  business_plan: false,
  personas: false,
  browser: false,
}

export function ChatSessionsList({ sessions: initialSessions }: ChatSessionsListProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState(initialSessions)
  const [isCreating, setIsCreating] = useState(false)
  const [contextConfig, setContextConfig] = useState<ContextConfig>(DEFAULT_CONTEXT)
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL.id)
  const [showNewChat, setShowNewChat] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreateSession() {
    setIsCreating(true)
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_config: contextConfig, model_id: selectedModelId }),
      })
      const data = await res.json()
      if (res.ok && data.session) {
        router.push(`/dashboard/chat/${data.session.id}`)
      }
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(id)
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  function toggleContext(key: keyof ContextConfig) {
    setContextConfig((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Chat</h1>
          <p className="text-sm text-muted-foreground">
            Think through ideas with AI using your company context
          </p>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* New chat setup panel */}
      {showNewChat && (
        <div className="border-b border-border bg-muted/30 px-6 py-5 space-y-4">
          {/* Model selector */}
          <div>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Model</h2>
            <div className="flex flex-wrap gap-2">
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedModelId === model.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {model.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {AI_MODELS.find((m) => m.id === selectedModelId)?.description}
            </p>
          </div>

          {/* Context selector */}
          <div>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Company knowledge</h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'brand' as const, label: 'Brand & Voice' },
                  { key: 'business_plan' as const, label: 'Business Plan' },
                  { key: 'personas' as const, label: 'Personas' },
                ]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleContext(key)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    contextConfig[key]
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Browser toggle */}
          <div>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tools</h2>
            <button
              onClick={() => toggleContext('browser')}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                contextConfig.browser
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/40'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Allow browser
            </button>
            {contextConfig.browser && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                AI can search the web for up-to-date information during this chat.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreateSession}
              disabled={isCreating}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {isCreating ? 'Starting…' : 'Start Chat'}
            </button>
            <button
              onClick={() => setShowNewChat(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MessageSquare className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No chats yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Start a chat to think through ideas with your company context
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/dashboard/chat/${session.id}`}
                  className="group flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-accent"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {AI_MODELS.find((m) => m.id === session.model_id)?.label ?? session.model_id}
                        {' · '}
                        {new Date(session.updated_at).toLocaleDateString()}
                        {session.context_config.browser && ' · Browser'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    disabled={deletingId === session.id}
                    aria-label="Delete chat"
                    className="ml-2 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
