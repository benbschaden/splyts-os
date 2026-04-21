'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Sparkles, FileText, ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/ai/models'
import type { ChatMessageRow } from '@/lib/queries/chat'
import type { DiscoveryStudyRow } from '@/lib/queries/discovery-studies'

interface DiscoveryStudyChatProps {
  study: DiscoveryStudyRow
  onStudyUpdated: (study: DiscoveryStudyRow) => void
}

export function DiscoveryStudyChat({ study, onStudyUpdated }: DiscoveryStudyChatProps) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const [modelId, setModelId] = useState(DEFAULT_MODEL.id)
  const [error, setError] = useState<string | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportSaved, setReportSaved] = useState(false)
  const [reportInstruction, setReportInstruction] = useState('')
  const [showReportOptions, setShowReportOptions] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load or create the persistent session on mount
  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/discovery-studies/${study.id}/chat/session`)
        if (!res.ok) {
          setError('Failed to load chat session.')
          return
        }
        const json = await res.json() as {
          data: { session_id: string; messages: ChatMessageRow[]; is_new: boolean }
        }
        if (!cancelled) {
          setSessionId(json.data.session_id)
          setMessages(json.data.messages)
        }
      } catch {
        if (!cancelled) setError('Failed to load chat session.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [study.id])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !sessionId) return

    setInput('')
    setSending(true)
    setError(null)

    // Optimistic user message
    const tempUser: ChatMessageRow = {
      id: `temp-user-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUser])

    try {
      const res = await fetch(`/api/discovery-studies/${study.id}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, model_id: modelId }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        setError(json.error ?? 'Failed to get a response. Please try again.')
        setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
        return
      }

      const json = await res.json() as {
        data: { userMessage: ChatMessageRow; assistantMessage: ChatMessageRow }
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUser.id),
        json.data.userMessage,
        json.data.assistantMessage,
      ])
    } catch {
      setError('Failed to get a response. Please try again.')
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function handleGenerateReport() {
    setGeneratingReport(true)
    setError(null)
    setReportSaved(false)

    try {
      const res = await fetch(`/api/discovery-studies/${study.id}/chat/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          instruction: reportInstruction.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        setError(json.error ?? 'Failed to generate report.')
        return
      }

      const json = await res.json() as { data: { report_markdown: string } }
      onStudyUpdated({ ...study, report_markdown: json.data.report_markdown })
      setReportSaved(true)
      setShowReportOptions(false)
      setTimeout(() => setReportSaved(false), 3000)
    } catch {
      setError('Failed to generate report.')
    } finally {
      setGeneratingReport(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Chat reads all {study.name} transcripts, notes, and analysis. Everything is saved — pick up where you left off any time.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Model"
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          {/* Generate report */}
          <div className="relative">
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={generatingReport || messages.length === 0}
                title={messages.length === 0 ? 'Chat first, then generate a report' : undefined}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                {generatingReport ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                ) : reportSaved ? (
                  <><FileText className="h-3.5 w-3.5 text-green-600" /> Saved ✓</>
                ) : (
                  <><FileText className="h-3.5 w-3.5" /> Save as report</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowReportOptions((v) => !v)}
                disabled={generatingReport}
                className="px-1.5 py-1 text-muted-foreground hover:bg-accent border-l border-border transition-colors disabled:opacity-50"
                aria-label="Report options"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', showReportOptions && 'rotate-180')} />
              </button>
            </div>

            {showReportOptions && (
              <div className="absolute right-0 top-full mt-1 z-20 w-72 rounded-md border border-border bg-background p-3 shadow-lg space-y-2">
                <p className="text-xs font-medium text-foreground">Report instruction (optional)</p>
                <textarea
                  value={reportInstruction}
                  onChange={(e) => setReportInstruction(e.target.value)}
                  placeholder="e.g. Focus on pricing signals and WTP. Keep it under 1 page."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="w-full rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {generatingReport ? 'Generating…' : 'Generate report'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message thread */}
      <div className="rounded-lg border border-border bg-background">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-6">
            <Sparkles className="h-7 w-7 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-foreground">Ask anything about this study</p>
              <p className="text-xs text-muted-foreground mt-1">
                Probe transcripts, compare participants, identify patterns, or draft a report.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {[
                'What were the most common pain points across participants?',
                'Which participant showed the strongest willingness to pay?',
                'Draft an executive summary of this study',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'px-5 py-4',
                  msg.role === 'user' ? 'bg-muted/30' : 'bg-background',
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {msg.role === 'user' ? 'You' : 'AI'}
                </p>
                {msg.role === 'user' ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none text-foreground prose-headings:font-semibold prose-headings:text-foreground prose-h1:text-base prose-h1:mt-0 prose-h2:text-sm prose-h2:mt-4 prose-h3:text-sm prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-foreground prose-blockquote:border-border prose-blockquote:text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="px-5 py-4 bg-background">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">AI</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about transcripts, findings, patterns… (Enter to send, Shift+Enter for new line)"
          rows={3}
          disabled={sending || loading}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending || loading}
          className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
