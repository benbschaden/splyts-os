'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, FileDown, FileText, Loader2, ChevronDown, Globe } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatSessionRow, ChatMessageRow } from '@/lib/queries/chat'
import { CaptureDocumentDialog } from '@/components/chat/capture-document-dialog'
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/ai/models'

interface ChatInterfaceProps {
  session: ChatSessionRow
  initialMessages: ChatMessageRow[]
  initialPrompt?: string
}

/** ~3 lines of text-sm; composer grows with content up to max, then scrolls */
const COMPOSER_MIN_HEIGHT_PX = 72
const COMPOSER_MAX_HEIGHT_PX = 160

function syncComposerHeight(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return
  textarea.style.height = 'auto'
  const target = Math.min(
    Math.max(textarea.scrollHeight, COMPOSER_MIN_HEIGHT_PX),
    COMPOSER_MAX_HEIGHT_PX,
  )
  textarea.style.height = `${target}px`
  textarea.style.overflowY = textarea.scrollHeight > COMPOSER_MAX_HEIGHT_PX ? 'auto' : 'hidden'
}

export function ChatInterface({ session, initialMessages, initialPrompt }: ChatInterfaceProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessageRow[]>(initialMessages)
  // Resolve stored model_id against the current model list — fall back to default
  // if the stored ID no longer exists (e.g. deprecated model).
  const resolvedInitialModelId =
    AI_MODELS.find((m) => m.id === session.model_id)?.id ?? DEFAULT_MODEL.id
  const [currentModelId, setCurrentModelId] = useState(resolvedInitialModelId)
  const [input, setInput] = useState(initialPrompt ?? '')
  const [isSending, setIsSending] = useState(false)
  const [isSwitchingModel, setIsSwitchingModel] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCapture, setShowCapture] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractSuccess, setExtractSuccess] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustComposerHeight = useCallback(() => {
    syncComposerHeight(textareaRef.current)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    adjustComposerHeight()
  }, [input, adjustComposerHeight])

  async function handleSwitchModel(modelId: string) {
    if (modelId === currentModelId) { setShowModelPicker(false); return }
    setIsSwitchingModel(true)
    try {
      const res = await fetch(`/api/chat/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId }),
      })
      if (res.ok) setCurrentModelId(modelId)
    } finally {
      setIsSwitchingModel(false)
      setShowModelPicker(false)
    }
  }

  async function handleSend() {
    const content = input.trim()
    if (!content || isSending) return

    setInput('')
    setError(null)
    setIsSending(true)

    // Optimistic user message
    const tempUserMsg: ChatMessageRow = {
      id: `temp-user-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const res = await fetch(`/api/chat/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
        setInput(content)
        setError(data.error ?? 'Failed to send message')
        return
      }

      // Replace optimistic with real messages
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        data.userMessage,
        data.assistantMessage,
      ])
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
      setInput(content)
      setError('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  async function handleExtractToNote() {
    setIsExtracting(true)
    setError(null)
    setExtractSuccess(false)

    try {
      const res = await fetch(`/api/chat/sessions/${session.id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to extract note')
        return
      }

      setExtractSuccess(true)
      setTimeout(() => setExtractSuccess(false), 3000)
    } catch {
      setError('Failed to extract note. Please try again.')
    } finally {
      setIsExtracting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const currentModel = AI_MODELS.find((m) => m.id === currentModelId) ?? AI_MODELS[0]
  const contextLabels = [
    session.context_config.customer_hub_contact_id && 'Contact file loaded',
    session.context_config.customer_insights && !session.context_config.customer_hub_contact_id && 'Customer insights',
    session.context_config.brand && 'Brand',
    session.context_config.business_plan && 'Business Plan',
    session.context_config.personas && 'Personas',
    session.context_config.product && 'Product',
    session.context_config.current_goals && 'Goals',
    session.context_config.competitors && 'Competitors',
    session.context_config.social_proof && 'Social Proof',
    session.context_config.kpis && 'KPIs',
    session.context_config.filed_documents && 'Docs',
    session.context_config.browser && 'Browser',
    session.context_config.project_materials && 'Project Materials',
  ].filter(Boolean)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/chat"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to assistant"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-foreground">{session.title}</h1>
            {contextLabels.length > 0 && (
              <p className="text-xs text-muted-foreground">{contextLabels.join(' · ')}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model switcher */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker((v) => !v)}
              disabled={isSwitchingModel}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {session.context_config.browser && <Globe className="h-3 w-3" />}
              {isSwitchingModel ? 'Switching…' : currentModel.label}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showModelPicker && (
              <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-background shadow-lg">
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSwitchModel(model.id)}
                    className={`flex w-full flex-col items-start px-3 py-2.5 text-left transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-accent ${
                      model.id === currentModelId ? 'bg-accent' : ''
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{model.label}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <>
              {session.project_id && (
                <button
                  onClick={handleExtractToNote}
                  disabled={isExtracting}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {isExtracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {extractSuccess ? 'Extracted!' : 'Extract to Note'}
                </button>
              )}
              <button
                onClick={() => setShowCapture(true)}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <FileDown className="h-4 w-4" />
                Capture as Document
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Start the conversation — ask anything about your work or company.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-background/60 prose-pre:text-xs prose-strong:font-semibold prose-a:text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="border-t border-border bg-destructive/10 px-6 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-end gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:border-foreground/30 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="min-h-[4.5rem] flex-1 resize-none overflow-y-hidden bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              aria-label="Send message"
              className="shrink-0 rounded-lg bg-foreground p-2 text-background transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Capture dialog */}
      {showCapture && (
        <CaptureDocumentDialog
          sessionId={session.id}
          onClose={() => setShowCapture(false)}
          onCaptured={(documentId) => {
            router.push(`/dashboard/documents/${documentId}`)
          }}
        />
      )}
    </div>
  )
}
