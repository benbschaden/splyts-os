'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Sparkles, Loader2, Send, Save, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
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

type Phase = 'setup' | 'chat' | 'save'

interface GenerationSessionDialogProps {
  open: boolean
  onClose: () => void
  onGenerated: (output: GeneratedOutputPayload) => void
  projectId: string
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
  initialUserMessage?: string
}

export function GenerationSessionDialog({
  open,
  onClose,
  onGenerated,
  projectId,
  authors,
  contentTypes,
  hasBrandContext,
  initialUserMessage,
}: GenerationSessionDialogProps) {
  const [phase, setPhase] = useState<Phase>('setup')

  // Setup selections
  const [contentTypeId, setContentTypeId] = useState('')
  const [authorId, setAuthorId] = useState('company')
  const [modelId, setModelId] = useState(DEFAULT_MODEL.id)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [pendingInitialMessage, setPendingInitialMessage] = useState('')

  // Save state
  const [brief, setBrief] = useState('')
  const [saveContent, setSaveContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setPhase('setup')
      setContentTypeId(contentTypes[0]?.id ?? '')
      setAuthorId('company')
      setModelId(DEFAULT_MODEL.id)
      setMessages([])
      setInput('')
      setSending(false)
      setChatError(null)
      setBrief('')
      setSaveContent('')
      setSaveError(null)
      setPendingInitialMessage(initialUserMessage ?? '')
    }
  }, [open, contentTypes, initialUserMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function callSession(newMessages: ChatMessage[]): Promise<string | null> {
    const res = await fetch('/api/generate/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        contentTypeId,
        authorId,
        modelId,
        messages: newMessages,
      }),
    })
    const data = await res.json()
    if (!res.ok) return null
    return data.assistantMessage as string
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

    const assistantMessage = await callSession(updatedMessages)
    setSending(false)

    if (!assistantMessage) {
      setChatError('Response failed. Please try again.')
      return
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleModelChange(newModelId: string) {
    setModelId(newModelId)
  }

  function openSave() {
    // Pre-populate with the last assistant message as the draft content
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    const rawContent = lastAssistant?.content ?? ''

    // Strip leading "Here's your draft:" / "Here's your updated draft:" marker if present
    const stripped = rawContent.replace(/^Here's your (?:updated )?draft:\n?/i, '').trim()

    // Pre-populate brief from the first user message
    const firstUser = messages.find((m) => m.role === 'user')
    setBrief(firstUser?.content ?? '')
    setSaveContent(stripped)
    setSaveError(null)
    setPhase('save')
  }

  async function handleConfirmSave() {
    if (!brief.trim() || !saveContent.trim()) return
    setSaving(true)
    setSaveError(null)

    const res = await fetch('/api/generate/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        contentTypeId,
        brief: brief.trim(),
        content: saveContent.trim(),
        modelId,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setSaveError(data.error ?? 'Failed to save. Please try again.')
      return
    }

    onGenerated(data.output)
    onClose()
  }

  if (!open) return null

  const noBrandContext = !hasBrandContext
  const noContentTypes = contentTypes.length === 0
  const allAuthors = [{ id: 'company', name: 'Company (brand)' }, ...authors]
  const hasMessages = messages.length > 0
  const hasDraft = messages.some(
    (m) => m.role === 'assistant' && /here's your (updated )?draft:/i.test(m.content),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="absolute inset-0 bg-black/20" onClick={phase === 'chat' && sending ? undefined : onClose} />

      <div
        className={cn(
          'relative w-full rounded-lg border border-border bg-background shadow-lg flex flex-col',
          phase === 'chat' || phase === 'save' ? 'max-w-2xl' : 'max-w-lg',
        )}
        style={phase === 'chat' ? { maxHeight: '85vh' } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            {phase === 'save' && (
              <button
                onClick={() => setPhase('chat')}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
                aria-label="Back to chat"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-foreground">
              {phase === 'setup' && 'Generate content'}
              {phase === 'chat' && 'Content generation'}
              {phase === 'save' && 'Save output'}
            </h2>
            {phase === 'chat' && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {contentTypes.find((ct) => ct.id === contentTypeId)?.name ?? ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {phase === 'chat' && (
              <>
                {/* Inline model switcher */}
                <select
                  value={modelId}
                  onChange={(e) => handleModelChange(e.target.value)}
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
                {hasDraft && (
                  <button
                    onClick={openSave}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    <Save className="h-3 w-3" />
                    Save as output
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              disabled={saving || (phase === 'chat' && sending)}
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
                {/* Empty state prompt */}
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
                      'rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-w-[85%]',
                      msg.role === 'user'
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Sending indicator */}
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

            {/* Input area */}
            <div className="border-t border-border px-5 py-3 shrink-0">
              {!hasDraft && hasMessages && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Keep going — the AI will produce a draft once it has what it needs.
                </p>
              )}
              {hasDraft && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Draft ready. Keep refining or{' '}
                  <button
                    onClick={openSave}
                    className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                  >
                    save as output
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
                  disabled={sending}
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
                  disabled={!input.trim() || sending}
                  aria-label="Send message"
                  className="self-end rounded-md bg-foreground p-2 text-background hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Save phase */}
        {phase === 'save' && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Review and edit the brief and content before saving.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="save-brief" className="text-sm font-medium text-foreground">
                Brief
              </label>
              <p className="text-xs text-muted-foreground">
                A short description of what was requested.
              </p>
              <textarea
                id="save-brief"
                value={brief}
                onChange={(e) => { setBrief(e.target.value); setSaveError(null) }}
                rows={2}
                className={cn(
                  'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  saveError ? 'border-destructive' : 'border-input',
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="save-content" className="text-sm font-medium text-foreground">
                Content
              </label>
              <textarea
                id="save-content"
                value={saveContent}
                onChange={(e) => { setSaveContent(e.target.value); setSaveError(null) }}
                rows={10}
                className={cn(
                  'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  saveError ? 'border-destructive' : 'border-input',
                )}
              />
            </div>

            {saveError && <p className="text-xs text-destructive">{saveError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPhase('chat')}
                disabled={saving}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Back to chat
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={saving || !brief.trim() || !saveContent.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Confirm save
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
