'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Plus, Trash2, Globe, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatSessionRow, ContextConfig } from '@/lib/queries/chat'
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/ai/models'

interface ChatSessionsListProps {
  sessions: ChatSessionRow[]
}

const DEFAULT_CONTEXT: ContextConfig = {
  brand: true,
  business_plan: false,
  personas: false,
  product: false,
  product_roadmap: false,
  company_milestones: false,
  current_goals: false,
  filed_documents: false,
  competitors: false,
  social_proof: false,
  kpis: false,
  browser: false,
  project_materials: false,
  discovery_entries: false,
  discovery_participant: null,
  customer_insights: false,
  customer_hub_contact_id: null,
  customer_hub_segment: null,
}

// Category definitions — each category owns a set of context keys
const CONTEXT_CATEGORIES = [
  {
    label: 'Strategy',
    description: 'Business plan, goals, milestones, competitors, KPIs',
    keys: ['business_plan', 'current_goals', 'company_milestones', 'competitors', 'kpis'] as const,
    items: [
      { key: 'business_plan' as const, label: 'Business plan' },
      { key: 'current_goals' as const, label: 'Current goals' },
      { key: 'company_milestones' as const, label: 'Milestones' },
      { key: 'competitors' as const, label: 'Competitors' },
      { key: 'kpis' as const, label: 'KPIs & Metrics' },
    ],
  },
  {
    label: 'Product',
    description: 'Product context, features, roadmap',
    keys: ['product', 'product_roadmap'] as const,
    items: [
      { key: 'product' as const, label: 'Product context' },
      { key: 'product_roadmap' as const, label: 'Roadmap' },
    ],
  },
  {
    label: 'Branding',
    description: 'Brand voice, personas, social proof',
    keys: ['brand', 'personas', 'social_proof'] as const,
    items: [
      { key: 'brand' as const, label: 'Brand & voice' },
      { key: 'personas' as const, label: 'Personas' },
      { key: 'social_proof' as const, label: 'Social proof' },
    ],
  },
  {
    label: 'Docs',
    description: 'Shared and filed documents',
    keys: ['filed_documents'] as const,
    items: [
      { key: 'filed_documents' as const, label: 'Filed documents' },
    ],
  },
  {
    label: 'Research',
    description: 'Customer discovery entries (interviews, emails, surveys)',
    keys: ['discovery_entries'] as const,
    items: [
      { key: 'discovery_entries' as const, label: 'Customer discovery' },
    ],
  },
]

type ContextKey = keyof Omit<ContextConfig, 'browser' | 'discovery_participant' | 'customer_hub_contact_id' | 'customer_hub_segment' | 'discovery_study_id'>

export function ChatSessionsList({ sessions: initialSessions }: ChatSessionsListProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState(initialSessions)
  const [isCreating, setIsCreating] = useState(false)
  const [contextConfig, setContextConfig] = useState<ContextConfig>(DEFAULT_CONTEXT)
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL.id)
  const [showNewChat, setShowNewChat] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCaptured, setShowCaptured] = useState(false)

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

  function isCategoryOn(keys: readonly ContextKey[]) {
    return keys.some((k) => contextConfig[k])
  }

  function setCategoryKeys(keys: readonly ContextKey[], value: boolean) {
    setContextConfig((prev) => {
      const next = { ...prev }
      keys.forEach((k) => {
        next[k] = value
      })
      return next
    })
  }

  function toggleContextKey(key: ContextKey) {
    setContextConfig((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Think through ideas with AI using your company context
          </p>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          <Plus className="h-4 w-4" />
          New conversation
        </button>
      </div>

      {/* New conversation setup — scrollable body, sticky actions */}
      {showNewChat && (
        <div className="flex max-h-[min(520px,calc(100dvh-10rem))] flex-col overflow-hidden border-b border-border bg-muted/30">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
            <div>
              <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Model
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModelId(model.id)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      selectedModelId === model.id
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/40',
                    )}
                  >
                    {model.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                {AI_MODELS.find((m) => m.id === selectedModelId)?.description}
              </p>
            </div>

            <div>
              <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Company knowledge
              </h2>
              <div className="space-y-1.5">
                {CONTEXT_CATEGORIES.map((cat) => {
                  const anyOn = isCategoryOn(cat.keys)
                  const multi = cat.keys.length > 1

                  return (
                    <div
                      key={cat.label}
                      className={cn(
                        'rounded-md border px-2 py-1.5 transition-colors',
                        anyOn ? 'border-foreground/20 bg-background' : 'border-border bg-background',
                      )}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight text-foreground">{cat.label}</p>
                          <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                            {cat.description}
                          </p>
                        </div>
                        {multi && (
                          <div className="flex shrink-0 gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setCategoryKeys(cat.keys, true)}
                              className="text-[10px] font-medium text-primary hover:underline"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryKeys(cat.keys, false)}
                              className="text-[10px] font-medium text-muted-foreground hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-0">
                        {cat.items.map((item) => {
                          const id = `ctx-${item.key}`
                          return (
                            <label
                              key={item.key}
                              htmlFor={id}
                              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent/60"
                            >
                              <input
                                id={id}
                                type="checkbox"
                                checked={contextConfig[item.key]}
                                onChange={() => toggleContextKey(item.key)}
                                className="h-3.5 w-3.5 shrink-0 rounded border border-input bg-background text-foreground accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              />
                              <span
                                className={cn(
                                  'text-[11px] leading-tight',
                                  contextConfig[item.key]
                                    ? 'font-medium text-foreground'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {item.label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tools
              </h2>
              <button
                type="button"
                onClick={() => setContextConfig((prev) => ({ ...prev, browser: !prev.browser }))}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  contextConfig.browser
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:border-foreground/40',
                )}
              >
                <Globe className="h-3 w-3" />
                Allow browser
              </button>
              {contextConfig.browser && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  AI can search the web during this conversation.
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-border bg-muted/50 px-4 py-2">
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={isCreating}
              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {isCreating ? 'Starting…' : 'Start'}
            </button>
            <button
              type="button"
              onClick={() => setShowNewChat(false)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
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
            <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Start a conversation to think through ideas with your company context
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active sessions */}
            {(() => {
              const active = sessions.filter((s) => !s.captured_at)
              if (active.length === 0) return null
              return (
                <ul className="space-y-1">
                  {active.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      deletingId={deletingId}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              )
            })()}

            {/* Captured sessions — collapsible */}
            {(() => {
              const captured = sessions.filter((s) => !!s.captured_at)
              if (captured.length === 0) return null
              return (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowCaptured((v) => !v)}
                    className="flex w-full items-center gap-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCaptured ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    <FileText className="h-3.5 w-3.5" />
                    Captured ({captured.length})
                  </button>
                  {showCaptured && (
                    <ul className="mt-1 space-y-1">
                      {captured.map((session) => (
                        <SessionItem
                          key={session.id}
                          session={session}
                          deletingId={deletingId}
                          onDelete={handleDelete}
                          isCaptured
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

interface SessionItemProps {
  session: ChatSessionRow
  deletingId: string | null
  onDelete: (id: string, e: React.MouseEvent) => void
  isCaptured?: boolean
}

function SessionItem({ session, deletingId, onDelete, isCaptured }: SessionItemProps) {
  return (
    <li>
      <Link
        href={`/dashboard/chat/${session.id}`}
        className={cn(
          'group flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-accent',
          isCaptured
            ? 'border-border/50 bg-muted/30 opacity-70 hover:opacity-100'
            : 'border-border bg-background',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {isCaptured ? (
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {session.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {AI_MODELS.find((m) => m.id === session.model_id)?.label ?? session.model_id}
              {' · '}
              {new Date(session.updated_at).toLocaleDateString()}
              {session.context_config.browser && ' · Browser'}
              {isCaptured && session.captured_at && (
                <> · Captured {new Date(session.captured_at).toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => onDelete(session.id, e)}
          disabled={deletingId === session.id}
          aria-label="Delete conversation"
          className="ml-2 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </Link>
    </li>
  )
}
