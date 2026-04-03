'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, Loader2, Trash2, CheckCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { ChatSessionRow, ChatMessageRow } from '@/lib/queries/chat'
import type { CustomerInsightRow, InsightCategory, InsightImpact } from '@/lib/queries/customer-insights'

interface DraftInsight {
  content: string
  category: InsightCategory
  impact: InsightImpact
  source_contact_id?: string | null
  source_segment?: string | null
}

interface HubChatPanelProps {
  /** contact ID — pass one of contactId or segment, not both */
  contactId?: string
  /** segment key e.g. 'beta_user' */
  segment?: string
  placeholder?: string
  onInsightsExtracted: (insights: CustomerInsightRow[]) => void
}

type PanelStatus =
  | 'loading'
  | 'ready'
  | 'sending'
  | 'extracting'
  | 'reviewing'
  | 'saving'
  | 'error'

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  pain_point: 'Pain Point',
  feature_request: 'Feature Request',
  praise: 'Praise',
  objection: 'Objection',
  churn_signal: 'Churn Signal',
  usage_pattern: 'Usage Pattern',
  market_insight: 'Market Insight',
}

const IMPACT_BADGE: Record<InsightImpact, string> = {
  high: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  low: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
}

export function HubChatPanel({ contactId, segment, placeholder, onInsightsExtracted }: HubChatPanelProps) {
  const [status, setStatus] = useState<PanelStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<ChatSessionRow | null>(null)
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [input, setInput] = useState('')
  const [drafts, setDrafts] = useState<DraftInsight[]>([])
  const [sourceContactId, setSourceContactId] = useState<string | null>(null)
  const [sourceSegment, setSourceSegment] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let cancelled = false
    async function initSession() {
      setStatus('loading')
      setError(null)
      try {
        const url = contactId
          ? `/api/contacts/${contactId}/chat-session`
          : `/api/cohort-segments/${segment}/chat-session`

        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to load session')
        const data = await res.json()

        if (cancelled) return

        if (data.session) {
          setSession(data.session)
          setMessages(data.messages ?? [])
        } else {
          // No session yet — create one on first message
          setSession(null)
          setMessages([])
        }
        setStatus('ready')
      } catch {
        if (!cancelled) {
          setError('Failed to load conversation.')
          setStatus('error')
        }
      }
    }
    initSession()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, segment])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function ensureSession(): Promise<ChatSessionRow | null> {
    if (session) return session

    const url = contactId
      ? `/api/contacts/${contactId}/chat-session`
      : `/api/cohort-segments/${segment}/chat-session`

    const res = await fetch(url, { method: 'POST' })
    if (!res.ok) return null
    const data = await res.json()
    setSession(data.session)
    setMessages(data.messages ?? [])
    return data.session
  }

  async function handleSend() {
    const content = input.trim()
    if (!content || status === 'sending') return
    setInput('')
    setError(null)
    setStatus('sending')

    try {
      const activeSession = await ensureSession()
      if (!activeSession) {
        setError('Failed to start conversation.')
        setStatus('ready')
        return
      }

      const tempUser: ChatMessageRow = {
        id: `temp-user-${Date.now()}`,
        session_id: activeSession.id,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempUser])

      const res = await fetch(`/api/chat/sessions/${activeSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      const data = await res.json()
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
        setInput(content)
        setError(data.error ?? 'Send failed.')
        setStatus('ready')
        return
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUser.id),
        data.userMessage,
        data.assistantMessage,
      ])
      setStatus('ready')
    } catch {
      setError('Something went wrong.')
      setStatus('ready')
    } finally {
      textareaRef.current?.focus()
    }
  }

  async function handleExtract() {
    if (!session) return
    setStatus('extracting')
    setError(null)

    try {
      const res = await fetch(`/api/chat/sessions/${session.id}/extract-insights`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Extraction failed.')
        setStatus('ready')
        return
      }

      setDrafts(data.drafts ?? [])
      setSourceContactId(data.source_contact_id ?? null)
      setSourceSegment(data.source_segment ?? null)
      setStatus('reviewing')
    } catch {
      setError('Extraction failed.')
      setStatus('ready')
    }
  }

  async function handleSaveInsights() {
    if (drafts.length === 0) return
    setStatus('saving')

    try {
      const saved: CustomerInsightRow[] = []
      for (const draft of drafts) {
        const res = await fetch('/api/customer-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: draft.content,
            category: draft.category,
            impact: draft.impact,
            source_contact_id: sourceContactId ?? undefined,
            source_segment: sourceSegment ?? undefined,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.insight) saved.push(data.insight)
        }
      }

      onInsightsExtracted(saved)
      setDrafts([])
      setStatus('ready')
    } catch {
      setError('Failed to save insights.')
      setStatus('ready')
    }
  }

  function updateDraft(index: number, field: keyof DraftInsight, value: string) {
    setDrafts((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isWorking = status === 'sending' || status === 'extracting' || status === 'saving'

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === 'reviewing') {
    return (
      <div className="flex flex-col h-full">
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-semibold text-foreground">
            Review {drafts.length} extracted insight{drafts.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {drafts.map((draft, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <div className="flex-1 space-y-1.5">
                <textarea
                  value={draft.content}
                  onChange={(e) => updateDraft(i, 'content', e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-wrap gap-1.5">
                  <select
                    value={draft.category}
                    onChange={(e) => updateDraft(i, 'category', e.target.value)}
                    className="rounded border border-input bg-background px-2 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <select
                    value={draft.impact}
                    onChange={(e) => updateDraft(i, 'impact', e.target.value)}
                    className={cn(
                      'rounded border px-2 py-0.5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-ring',
                      IMPACT_BADGE[draft.impact],
                    )}
                  >
                    <option value="high">High impact</option>
                    <option value="medium">Medium impact</option>
                    <option value="low">Low impact</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeDraft(i)}
                className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Saved insights will be tagged and included in AI context across the OS.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setDrafts([]); setStatus('ready') }}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveInsights}
              disabled={drafts.length === 0}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Save {drafts.length} insight{drafts.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && status !== 'sending' && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">
              {placeholder ?? 'Ask anything about this data — blockers, patterns, what to do next.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground',
              )}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {status === 'sending' && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-muted px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="shrink-0 px-4 pb-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={handleExtract}
              disabled={isWorking}
              className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isWorking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Extract insights
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            rows={2}
            disabled={isWorking}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isWorking}
            className="shrink-0 rounded-lg bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
