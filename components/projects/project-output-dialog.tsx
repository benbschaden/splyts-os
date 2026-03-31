'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Loader2, Send, Save, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/ai/models'

const OUTPUT_TYPES = [
  'Brief',
  'Report',
  'Analysis',
  'Strategy',
  'Plan',
  'Summary',
  'Proposal',
  'Email draft',
  'Meeting notes',
  'Specification',
  'Other',
]

interface GeneratedOutput {
  id: string
  brief: string
  content: string
  content_type_id: string | null
  model_id: string
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
  published_at: string | null
  reach: number | null
  reach_metric: string | null
  engagement: number | null
  performance_notes: string | null
  creator_full_name: string | null
}

interface ProjectOutputDialogProps {
  open: boolean
  projectId: string
  onClose: () => void
  onGenerated: (output: GeneratedOutput) => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type Phase = 'setup' | 'chat' | 'save'

export function ProjectOutputDialog({
  open,
  projectId,
  onClose,
  onGenerated,
}: ProjectOutputDialogProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('setup')
  const [outputType, setOutputType] = useState('Brief')
  const [modelId, setModelId] = useState(DEFAULT_MODEL.id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [brief, setBrief] = useState('')
  const [saveContent, setSaveContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setPhase('setup')
      setOutputType('Brief')
      setModelId(DEFAULT_MODEL.id)
      setMessages([])
      setInput('')
      setSending(false)
      setChatError(null)
      setBrief('')
      setSaveContent('')
      setSaveError(null)
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function callSession(newMessages: ChatMessage[]): Promise<
    { ok: true; text: string } | { ok: false; error?: string }
  > {
    const res = await fetch(`/api/projects/${projectId}/generate/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outputType,
        modelId,
        messages: newMessages,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = typeof data.error === 'string' ? data.error : undefined
      return { ok: false, error: msg }
    }
    const text = data.assistantMessage as string | undefined
    if (typeof text !== 'string') return { ok: false }
    return { ok: true, text }
  }

  function handleStart() {
    setPhase('chat')
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

    if (!result.ok) {
      setChatError(result.error ?? 'Response failed. Please try again.')
      return
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: result.text }])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function openSave() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    const rawContent = lastAssistant?.content ?? ''
    const stripped = rawContent.replace(/^Here's your (?:updated )?draft:\n?/i, '').trim()
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

    const res = await fetch(`/api/projects/${projectId}/generate/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: brief.trim(),
        content: saveContent.trim(),
        outputType,
        modelId,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setSaveError(typeof data.error === 'string' ? data.error : 'Failed to save. Please try again.')
      return
    }

    if (!data.output) {
      setSaveError('Failed to save. Please try again.')
      return
    }

    onGenerated({ ...data.output, project_id: projectId } as GeneratedOutput)
    router.refresh()
    onClose()
  }

  function handleDialogClose() {
    if (sending || saving) return
    onClose()
  }

  if (!open) return null

  const hasMessages = messages.length > 0
  const hasDraft = messages.some(
    (m) => m.role === 'assistant' && /here's your (?:updated )?draft:/i.test(m.content),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={phase === 'chat' && sending ? undefined : handleDialogClose}
      />

      <div
        className={cn(
          'relative w-full rounded-lg border border-border bg-background shadow-lg flex flex-col',
          phase === 'chat' || phase === 'save' ? 'max-w-2xl' : 'max-w-lg',
        )}
        style={phase === 'chat' ? { maxHeight: '85vh' } : undefined}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            {phase === 'save' && (
              <button
                type="button"
                onClick={() => setPhase('chat')}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
                aria-label="Back to chat"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-foreground">
              {phase === 'setup' && 'Create a project output'}
              {phase === 'chat' && 'Project output'}
              {phase === 'save' && 'Save to project'}
            </h2>
            {phase === 'chat' && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {outputType}
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
                {hasDraft && (
                  <button
                    type="button"
                    onClick={openSave}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    <Save className="h-3 w-3" />
                    Save to project
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={handleDialogClose}
              disabled={saving || (phase === 'chat' && sending)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {phase === 'setup' && (
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              Choose a deliverable type, then chat with the AI until you are ready to save. The AI may ask questions before drafting.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="project-output-type" className="text-xs font-medium text-foreground">
                Output type
              </label>
              <select
                id="project-output-type"
                value={outputType}
                onChange={(e) => setOutputType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {OUTPUT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="project-output-model" className="text-xs font-medium text-foreground">
                AI model
              </label>
              <select
                id="project-output-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleDialogClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Start
              </button>
            </div>
          </div>
        )}

        {phase === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {!hasMessages && !sending && (
                <div className="flex justify-center py-8">
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Describe what you need — goals, audience, and constraints. The AI will only ask about what is still missing.
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
              {!hasDraft && hasMessages && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Keep going — the AI will produce a draft once it has what it needs.
                </p>
              )}
              {hasDraft && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Draft ready. Keep refining or{' '}
                  <button
                    type="button"
                    onClick={openSave}
                    className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                  >
                    save to project
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
                  placeholder={hasMessages ? 'Reply… (Enter to send, Shift+Enter for new line)' : 'Describe what you need…'}
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

        {phase === 'save' && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Review the brief and content, then save as a project deliverable.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="project-save-brief" className="text-sm font-medium text-foreground">
                Brief
              </label>
              <p className="text-xs text-muted-foreground">
                Short description of what you asked for (editable).
              </p>
              <textarea
                id="project-save-brief"
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
              <label htmlFor="project-save-content" className="text-sm font-medium text-foreground">
                Content
              </label>
              <textarea
                id="project-save-content"
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
