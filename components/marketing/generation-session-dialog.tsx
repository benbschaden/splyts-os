'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Loader2, Send, Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/ai/models'

export interface GeneratedOutputPayload {
  id: string
  brief: string
  content: string
  content_type_id: string
  model_id: string
  created_by: string
  created_at: string
  updated_at: string
  creator_full_name: string | null
  status: 'draft' | 'published'
}

interface Author {
  id: string
  name: string
}

interface ContentType {
  id: string
  name: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ResumeDraft {
  id: string
  contentTypeId: string
  authorId: string
  modelId: string
  messages: ChatMessage[]
}

type Phase = 'setup' | 'chat'

interface GenerationSessionDialogProps {
  open: boolean
  onClose: () => void
  onGenerated: (output: GeneratedOutputPayload) => void
  onDraftDiscarded?: (id: string) => void
  projectId: string
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
  initialUserMessage?: string
  initialAuthorId?: string
  resumeDraft?: ResumeDraft | null
}

export function GenerationSessionDialog({
  open,
  onClose,
  onGenerated,
  onDraftDiscarded,
  projectId,
  authors,
  contentTypes,
  hasBrandContext,
  initialUserMessage,
  initialAuthorId,
  resumeDraft,
}: GenerationSessionDialogProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('setup')

  const [contentTypeId, setContentTypeId] = useState('')
  const [authorId, setAuthorId] = useState('company')
  const [modelId, setModelId] = useState(DEFAULT_MODEL.id)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [pendingInitialMessage, setPendingInitialMessage] = useState('')

  const [draftId, setDraftId] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      if (resumeDraft) {
        setPhase('chat')
        setContentTypeId(resumeDraft.contentTypeId)
        setAuthorId(resumeDraft.authorId)
        setModelId(resumeDraft.modelId)
        setMessages(resumeDraft.messages)
        setDraftId(resumeDraft.id)
      } else {
        setPhase('setup')
        setContentTypeId(contentTypes[0]?.id ?? '')
        setAuthorId(initialAuthorId ?? 'company')
        setModelId(DEFAULT_MODEL.id)
        setMessages([])
        setDraftId(null)
        setPendingInitialMessage(initialUserMessage ?? '')
      }
      setInput('')
      setSending(false)
      setChatError(null)
      setPublishError(null)
      setDiscarding(false)
    }
  }, [open, contentTypes, initialUserMessage, initialAuthorId, resumeDraft])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function callSession(newMessages: ChatMessage[]): Promise<{ text: string; draftId: string | null } | null> {
    const res = await fetch('/api/generate/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        contentTypeId,
        authorId,
        modelId,
        ...(draftId ? { draftId } : {}),
        messages: newMessages,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return null
    const text = data.assistantMessage as string | undefined
    if (typeof text !== 'string') return null
    return { text, draftId: typeof data.draftId === 'string' ? data.draftId : null }
  }

  function handleStart() {
    if (!contentTypeId) return
    setPhase('chat')
    if (pendingInitialMessage) {
      setInput(pendingInitialMessage)
      setPendingInitialMessage('')
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setSending(true)
    setChatError(null)

    const result = await callSession(updatedMessages)
    setSending(false)

    if (!result) {
      setChatError('Response failed. Please try again.')
      return
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: result.text }])
    if (result.draftId && !draftId) {
      setDraftId(result.draftId)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handlePublish() {
    if (!draftId || publishing) return
    setPublishing(true)
    setPublishError(null)

    const res = await fetch(`/api/outputs/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish: true }),
    })

    const data = await res.json().catch(() => ({}))
    setPublishing(false)

    if (!res.ok) {
      setPublishError(typeof data.error === 'string' ? data.error : 'Failed to publish. Please try again.')
      return
    }

    if (!data.output) {
      setPublishError('Failed to publish. Please try again.')
      return
    }

    onGenerated({ ...data.output, status: 'published' } as GeneratedOutputPayload)
    router.refresh()
    onClose()
  }

  async function handleDiscard() {
    if (!draftId || discarding) return
    setDiscarding(true)

    const res = await fetch(`/api/outputs/${draftId}`, { method: 'DELETE' })
    setDiscarding(false)

    if (!res.ok) return

    onDraftDiscarded?.(draftId)
    router.refresh()
    onClose()
  }

  if (!open) return null

  const noBrandContext = !hasBrandContext
  const noContentTypes = contentTypes.length === 0
  const allAuthors = [{ id: 'company', name: 'Company (brand)' }, ...authors]
  const hasMessages = messages.length > 0
  const hasAiResponse = messages.some((m) => m.role === 'assistant')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="absolute inset-0 bg-black/20" onClick={phase === 'chat' && sending ? undefined : onClose} />

      <div
        className={cn(
          'relative w-full rounded-lg border border-border bg-background shadow-lg flex flex-col',
          phase === 'chat' ? 'max-w-2xl' : 'max-w-lg',
        )}
        style={phase === 'chat' ? { maxHeight: '85vh' } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {phase === 'setup' ? 'Generate content' : 'Content generation'}
            </h2>
            {phase === 'chat' && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {contentTypes.find((ct) => ct.id === contentTypeId)?.name ?? ''}
              </span>
            )}
            {phase === 'chat' && draftId && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Draft
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {phase === 'chat' && (
              <>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  disabled={sending}
                  aria-label="Switch AI model"
                  className={cn(
                    'rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground',
                    'focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50',
                  )}
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                {draftId && (
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={discarding || publishing || sending}
                    aria-label="Discard draft"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                    title="Discard draft"
                  >
                    {discarding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {hasAiResponse && draftId && (
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing || sending || discarding}
                    className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Publishing…
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" />
                        Publish
                      </>
                    )}
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              disabled={publishing || discarding || (phase === 'chat' && sending)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Setup phase */}
        {phase === 'setup' && (
          <div className="p-5 space-y-4">
            {noBrandContext && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Brand context must be configured before generating content.{' '}
                <a href="/dashboard/company/brand" className="font-medium underline">
                  Set up brand context →
                </a>
              </div>
            )}

            {!noBrandContext && noContentTypes && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                No content types have been set up yet.{' '}
                <a href="/dashboard/company/content-types" className="font-medium underline">
                  Add a content type →
                </a>
              </div>
            )}

            {!noBrandContext && !noContentTypes && (
              <>
                <p className="text-xs text-muted-foreground">
                  Your draft is saved automatically — close at any time and resume later.
                </p>
                <div className="space-y-1.5">
                  <label htmlFor="gen-content-type" className="text-sm font-medium text-foreground">
                    Content type
                  </label>
                  <select
                    id="gen-content-type"
                    value={contentTypeId}
                    onChange={(e) => setContentTypeId(e.target.value)}
                    className={cn(
                      'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    )}
                  >
                    {contentTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>{ct.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="gen-author" className="text-sm font-medium text-foreground">
                    Author
                  </label>
                  <select
                    id="gen-author"
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className={cn(
                      'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    )}
                  >
                    {allAuthors.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="gen-model" className="text-sm font-medium text-foreground">
                    AI model
                  </label>
                  <select
                    id="gen-model"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className={cn(
                      'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    )}
                  >
                    {AI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.description}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    You can switch models at any point during the conversation.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={!contentTypeId}
                    className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Start
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chat phase */}
        {phase === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {!hasMessages && !sending && (
                <div className="flex justify-center py-8">
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Describe what you want to create. Include as much detail as you have — the AI will only ask about what&apos;s genuinely missing.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-4 py-3 text-sm leading-relaxed max-w-[85%]',
                      msg.role === 'user'
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground',
                      msg.role === 'assistant' && 'prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1',
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              {chatError && (
                <p className="text-center text-xs text-destructive">{chatError}</p>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border px-5 py-3 shrink-0">
              {publishError && (
                <p className="mb-2 text-xs text-destructive">{publishError}</p>
              )}
              {!hasAiResponse && hasMessages && !sending && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Keep going — the AI will produce a draft once it has what it needs.
                </p>
              )}
              {hasAiResponse && !publishError && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Draft saved automatically. Close any time and resume later, or{' '}
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing || sending}
                    className="font-medium text-foreground underline underline-offset-2 hover:no-underline disabled:opacity-50"
                  >
                    publish now
                  </button>
                  .
                </p>
              )}
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending || publishing || discarding}
                  rows={2}
                  placeholder={hasMessages ? 'Reply… (Enter to send, Shift+Enter for new line)' : 'Describe what you want to create…'}
                  aria-label="Your message"
                  className={cn(
                    'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
                  )}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sending || publishing || discarding}
                  aria-label="Send message"
                  className="self-end rounded-md bg-foreground p-2 text-background hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
