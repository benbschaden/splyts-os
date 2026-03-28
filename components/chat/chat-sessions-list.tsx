'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Plus, Trash2, Globe, ChevronDown } from 'lucide-react'
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
]

type ContextKey = keyof Omit<ContextConfig, 'browser'>

export function ChatSessionsList({ sessions: initialSessions }: ChatSessionsListProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState(initialSessions)
  const [isCreating, setIsCreating] = useState(false)
  const [contextConfig, setContextConfig] = useState<ContextConfig>(DEFAULT_CONTEXT)
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL.id)
  const [showNewChat, setShowNewChat] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Track which categories are expanded to show sub-items
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

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

  function isCategoryAllOn(keys: readonly ContextKey[]) {
    return keys.every((k) => contextConfig[k])
  }

  function toggleCategory(label: string, keys: readonly ContextKey[]) {
    const allOn = isCategoryAllOn(keys)
    if (allOn) {
      // Turn all off and collapse
      setContextConfig((prev) => {
        const next = { ...prev }
        keys.forEach((k) => { next[k] = false })
        return next
      })
      setExpandedCategories((prev) => ({ ...prev, [label]: false }))
    } else {
      // Turn all on and expand to show sub-items
      setContextConfig((prev) => {
        const next = { ...prev }
        keys.forEach((k) => { next[k] = true })
        return next
      })
      setExpandedCategories((prev) => ({ ...prev, [label]: true }))
    }
  }

  function toggleSubItem(key: ContextKey) {
    setContextConfig((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleExpanded(label: string) {
    setExpandedCategories((prev) => ({ ...prev, [label]: !prev[label] }))
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

      {/* New conversation setup panel */}
      {showNewChat && (
        <div className="border-b border-border bg-muted/30 px-6 py-5 space-y-5">
          {/* Model selector */}
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</h2>
            <div className="flex flex-wrap gap-2">
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    selectedModelId === model.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/40',
                  )}
                >
                  {model.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {AI_MODELS.find((m) => m.id === selectedModelId)?.description}
            </p>
          </div>

          {/* Context selector — two-tier */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company knowledge</h2>
            <div className="space-y-2">
              {CONTEXT_CATEGORIES.map((cat) => {
                const anyOn = isCategoryOn(cat.keys)
                const allOn = isCategoryAllOn(cat.keys)
                const isExpanded = expandedCategories[cat.label] ?? false
                const showExpand = cat.items.length > 1

                return (
                  <div key={cat.label} className={cn(
                    'rounded-lg border transition-colors',
                    anyOn ? 'border-foreground/20 bg-background' : 'border-border bg-background',
                  )}>
                    {/* Category row */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      {/* Category toggle button */}
                      <button
                        onClick={() => toggleCategory(cat.label, cat.keys)}
                        className={cn(
                          'flex-1 flex items-center gap-2.5 text-left',
                        )}
                      >
                        {/* Checkbox-style indicator */}
                        <span className={cn(
                          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors',
                          allOn
                            ? 'border-foreground bg-foreground text-background'
                            : anyOn
                              ? 'border-foreground/50 bg-foreground/10 text-foreground'
                              : 'border-border bg-transparent text-transparent',
                        )}>
                          {allOn ? '✓' : anyOn ? '–' : '✓'}
                        </span>
                        <div>
                          <p className={cn(
                            'text-sm font-medium leading-none',
                            anyOn ? 'text-foreground' : 'text-muted-foreground',
                          )}>
                            {cat.label}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground/70">{cat.description}</p>
                        </div>
                      </button>

                      {/* Expand/collapse for sub-items */}
                      {showExpand && (
                        <button
                          onClick={() => toggleExpanded(cat.label)}
                          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent transition-colors"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          <ChevronDown className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            isExpanded ? 'rotate-0' : '-rotate-90',
                          )} />
                        </button>
                      )}
                    </div>

                    {/* Sub-items — shown when expanded */}
                    {isExpanded && (
                      <div className="border-t border-border px-3 py-2 space-y-1">
                        {cat.items.map((item) => (
                          <label
                            key={item.key}
                            className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 hover:bg-accent transition-colors"
                          >
                            <span className={cn(
                              'inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px] font-bold transition-colors',
                              contextConfig[item.key]
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-transparent',
                            )}>
                              {contextConfig[item.key] ? '✓' : ''}
                            </span>
                            <span
                              className={cn(
                                'text-xs transition-colors',
                                contextConfig[item.key] ? 'text-foreground font-medium' : 'text-muted-foreground',
                              )}
                              onClick={() => toggleSubItem(item.key)}
                            >
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Browser toggle */}
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tools</h2>
            <button
              onClick={() => setContextConfig((prev) => ({ ...prev, browser: !prev.browser }))}
              className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                contextConfig.browser
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/40',
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              Allow browser
            </button>
            {contextConfig.browser && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                AI can search the web for up-to-date information during this conversation.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreateSession}
              disabled={isCreating}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {isCreating ? 'Starting…' : 'Start'}
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
            <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Start a conversation to think through ideas with your company context
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
                    aria-label="Delete conversation"
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
