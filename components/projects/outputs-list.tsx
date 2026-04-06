'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Copy, Pencil, Trash2, Check, X, FileText, Send, File, RotateCcw, Loader2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  GenerationSessionDialog,
  type GeneratedOutputPayload,
  type ResumeDraft as GenerationResumeDraft,
} from '@/components/marketing/generation-session-dialog'
import { ProjectOutputDialog, type ResumeDraft as ProjectResumeDraft } from '@/components/projects/project-output-dialog'
import { getModelById } from '@/lib/ai/models'

interface Output {
  id: string
  brief: string
  content: string
  content_type_id: string | null
  model_id: string
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
  content_types: { name: string } | null
  projects: { name: string } | null
  creator_full_name: string | null
  published_at: string | null
  status?: 'draft' | 'generated' | 'published'
  draft_messages?: Array<{ role: 'user' | 'assistant'; content: string }> | null
  reach: number | null
  reach_metric: string | null
  engagement: number | null
  performance_notes: string | null
  metadata?: Record<string, unknown> | null
}

export type OutputCardAttachment = {
  id: string
  file_url: string
  file_name: string
  file_mime: string
  caption: string | null
}

interface Author {
  id: string
  name: string
}

interface ContentType {
  id: string
  name: string
}

interface OutputsListProps {
  projectId: string
  initialOutputs: Output[]
  outputAttachmentsByOutputId: Record<string, OutputCardAttachment[]>
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
  showPublish?: boolean
  pendingOutput?: Output | null
  currentUserId?: string
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


function safeMetadataString(meta: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = meta?.[key]
  return typeof v === 'string' && v.trim() ? v : undefined
}

function safeMetadataStringArray(meta: Record<string, unknown> | null | undefined, key: string): string[] {
  const v = meta?.[key]
  if (!Array.isArray(v)) return []
  return v.filter((item): item is string => typeof item === 'string')
}

interface OutputChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function extractReplacement(text: string): string | null {
  const match = text.match(/<replacement>([\s\S]*?)<\/replacement>/)
  return match ? match[1].trim() : null
}

function stripReplacementTags(text: string): string {
  return text.replace(/<replacement>[\s\S]*?<\/replacement>/, '').trim()
}

function OutputChatPanel({
  outputId,
  onApply,
  onClose,
}: {
  outputId: string
  onApply: (content: string) => void
  onClose: () => void
}) {
  const [messages, setMessages] = useState<OutputChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: OutputChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/outputs/${outputId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Something went wrong. Please try again.')
        return
      }

      const data = await res.json() as { response: string }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleApply(replacement: string) {
    onApply(replacement)
    setApplied(replacement)
  }

  return (
    <div className="border-t border-border bg-muted/10">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">Discuss with AI</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat panel"
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 overflow-y-auto px-4 py-3" style={{ maxHeight: '320px' }}>
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Ask questions, request edits, or ask for a full rewrite.
          </p>
        )}

        {messages.map((msg, i) => {
          if (msg.role === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg bg-foreground px-3 py-2 text-xs text-background leading-relaxed">
                  {msg.content}
                </div>
              </div>
            )
          }

          const replacement = extractReplacement(msg.content)
          const displayText = replacement ? stripReplacementTags(msg.content) : msg.content
          const alreadyApplied = applied === replacement

          return (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="max-w-[92%] rounded-lg border border-border bg-background px-3 py-2">
                {displayText && (
                  <div className="text-xs text-foreground leading-relaxed prose prose-xs max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-xs prose-headings:font-semibold prose-headings:mt-1.5 prose-headings:mb-0.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
                  </div>
                )}
                {replacement && (
                  <div className="mt-2 rounded-md border border-border bg-muted/40 px-2.5 py-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Revised version
                    </p>
                    <div className="text-xs text-foreground leading-relaxed prose prose-xs max-w-none dark:prose-invert prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0 line-clamp-6">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{replacement}</ReactMarkdown>
                    </div>
                    <div className="mt-2">
                      {alreadyApplied ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-green-500" />
                          Applied
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApply(replacement)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background hover:opacity-80 transition-opacity"
                        >
                          <Check className="h-3 w-3" />
                          Accept
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking…
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-2.5 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or request a change… (Enter to send)"
          rows={2}
          disabled={loading}
          aria-label="Message to AI about this output"
          className={cn(
            'flex-1 resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:opacity-50',
          )}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          aria-label="Send message"
          className="shrink-0 inline-flex items-center justify-center rounded-md bg-foreground p-1.5 text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

function OutputCard({
  output,
  attachments,
  onUpdated,
  onDeleted,
  showPublish,
}: {
  output: Output
  attachments?: OutputCardAttachment[]
  onUpdated: (updated: Output) => void
  onDeleted: (id: string) => void
  showPublish: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(output.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showPublishForm, setShowPublishForm] = useState(false)
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [showBrief, setShowBrief] = useState(false)

  async function handleSave() {
    if (!editContent.trim()) return
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/outputs/${output.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    const { output: updated } = await res.json()
    onUpdated({ ...output, content: updated.content, updated_at: updated.updated_at })
    setEditing(false)
  }

  async function handleDelete() {
    setDeleting(true)

    const res = await fetch(`/api/outputs/${output.id}`, { method: 'DELETE' })

    if (!res.ok) {
      setError('Failed to delete. Please try again.')
      setDeleting(false)
      setConfirmDelete(false)
      return
    }

    onDeleted(output.id)
  }

  async function handlePublish() {
    if (output.published_at) return
    setPublishing(true)
    // Convert date-only string to ISO timestamp at start of day UTC
    const publishedAt = publishDate ? new Date(publishDate + 'T00:00:00.000Z').toISOString() : undefined
    const res = await fetch(`/api/outputs/${output.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish: true, publishedAt }),
    })
    setPublishing(false)
    if (!res.ok) return
    const { output: updated } = await res.json()
    onUpdated({ ...output, published_at: updated.published_at, status: 'published' })
    setShowPublishForm(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(output.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const preview = output.content.slice(0, 180) + (output.content.length > 180 ? '…' : '')
  const modelLabel = getModelById(output.model_id)?.label ?? output.model_id
  const showExpandedContent = expanded || output.content.length <= 180
  const meta = output.metadata
  const abstractText = safeMetadataString(meta, 'abstract')
  const keyFindings = safeMetadataStringArray(meta, 'key_findings')
  const chartDescriptions = safeMetadataStringArray(meta, 'chart_descriptions')
  const referenceItems = safeMetadataStringArray(meta, 'references')
  const hasAttachments = (attachments?.length ?? 0) > 0

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Card header */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
            {output.content_types?.name ?? (output.brief.includes(': ') ? output.brief.split(': ')[0] : 'Output')}
          </span>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground shrink-0 hidden sm:inline-flex">
            {modelLabel}
          </span>
          {output.published_at && (
            <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 shrink-0">
              Published {formatDateTime(output.published_at)}
            </span>
          )}
          <span className="text-xs text-muted-foreground shrink-0 sm:ml-auto max-w-full sm:max-w-[14rem] sm:text-right">
            {output.creator_full_name ?? 'Unknown user'} · {formatDateTime(output.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showPublish && !output.published_at && (
            <button
              onClick={() => setShowPublishForm((v) => !v)}
              disabled={publishing}
              title="Move to Published"
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50',
                showPublishForm
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'text-muted-foreground hover:bg-green-500/10 hover:text-green-600',
              )}
            >
              Publish
            </button>
          )}
          <button
            onClick={() => setShowChat((v) => !v)}
            title="Discuss with AI"
            className={cn(
              'rounded-md p-1.5 transition-colors',
              showChat
                ? 'bg-foreground text-background hover:opacity-80'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowBrief((v) => !v)}
            title="View brief"
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              showBrief
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            Brief
          </button>
          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => { setEditing(true); setExpanded(true) }}
            title="Edit"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Publish date form */}
      {showPublish && showPublishForm && !output.published_at && (
        <div className="border-b border-border bg-green-500/5 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-green-600 mb-2">
            Mark as published
          </p>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <label htmlFor={`publish-date-${output.id}`} className="text-xs font-medium text-foreground">
                Publish date
              </label>
              <input
                id={`publish-date-${output.id}`}
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || !publishDate}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {publishing ? 'Publishing…' : 'Confirm publish'}
              </button>
              <button
                type="button"
                onClick={() => setShowPublishForm(false)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brief — hidden by default, revealed on demand */}
      {showBrief && (
        <div className="px-4 pt-3 pb-1 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Brief</p>
            <button
              onClick={() => setShowBrief(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Hide
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{output.brief}</p>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-3 pt-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Content</p>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              autoFocus
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                error ? 'border-destructive' : 'border-input',
              )}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !editContent.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(output.content); setError(null) }}
                disabled={saving}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {showExpandedContent && abstractText && (
              <blockquote className="border-l-2 border-muted-foreground/25 pl-3 text-sm text-muted-foreground italic leading-relaxed">
                {abstractText}
              </blockquote>
            )}
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1 text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {expanded || output.content.length <= 180 ? output.content : preview}
              </ReactMarkdown>
            </div>
            {showExpandedContent && keyFindings.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key findings</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {keyFindings.map((line, i) => (
                    <li key={i} className="leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {showExpandedContent && chartDescriptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Charts</p>
                <div className="flex flex-col gap-3">
                  {chartDescriptions.map((caption, i) => (
                    <figure key={i} className="space-y-1.5">
                      <div
                        className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-xs text-muted-foreground"
                        aria-hidden
                      >
                        Chart
                      </div>
                      <figcaption className="text-xs text-muted-foreground leading-relaxed">{caption}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
            {showExpandedContent && referenceItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">References</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
                  {referenceItems.map((line, i) => (
                    <li key={i} className="leading-relaxed pl-1">
                      {line}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {showExpandedContent && hasAttachments && attachments && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attachments</p>
                <div className="flex flex-col gap-4">
                  {attachments.map((a) =>
                    a.file_mime.startsWith('image/') ? (
                      <figure key={a.id} className="space-y-1.5">
                        <img
                          src={a.file_url}
                          alt={a.caption?.trim() ? a.caption : a.file_name}
                          className="max-h-96 max-w-full rounded-md border border-border object-contain"
                        />
                        {a.caption && (
                          <figcaption className="text-xs text-muted-foreground leading-relaxed">{a.caption}</figcaption>
                        )}
                      </figure>
                    ) : (
                      <a
                        key={a.id}
                        href={a.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/40"
                      >
                        <File className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 break-words">{a.file_name}</span>
                      </a>
                    ),
                  )}
                </div>
              </div>
            )}
            {output.content.length > 180 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* AI chat panel */}
      {showChat && (
        <OutputChatPanel
          outputId={output.id}
          onApply={async (content) => {
            setSaving(true)
            setError(null)
            const res = await fetch(`/api/outputs/${output.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content }),
            })
            setSaving(false)
            if (!res.ok) {
              setError('Failed to save. Please try again.')
              return
            }
            const { output: updated } = await res.json()
            onUpdated({ ...output, content: updated.content, updated_at: updated.updated_at })
            setEditContent(updated.content)
          }}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setConfirmDelete(false)} />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-foreground mb-2">Delete output</h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently remove this piece of content. This cannot be undone.
            </p>
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function OutputsList({
  projectId,
  initialOutputs,
  outputAttachmentsByOutputId,
  authors,
  contentTypes,
  hasBrandContext,
  showPublish = false,
  pendingOutput,
  currentUserId,
}: OutputsListProps) {
  const [outputs, setOutputs] = useState<Output[]>(initialOutputs)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resumeProjectDraft, setResumeProjectDraft] = useState<ProjectResumeDraft | null>(null)
  const [resumeGenerationDraft, setResumeGenerationDraft] = useState<GenerationResumeDraft | null>(null)

  // Server props and client cache can be stale after tab switch, bfcache, or router cache.
  const loadOutputs = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/outputs`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data: unknown = await res.json().catch(() => null)
      if (!data || typeof data !== 'object' || !('outputs' in data)) return
      const list = (data as { outputs: unknown }).outputs
      if (!Array.isArray(list)) return
      setOutputs(list as Output[])
    } catch {
      // keep existing state
    }
  }, [projectId])

  useEffect(() => {
    loadOutputs()
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) loadOutputs()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!pendingOutput) return
    setOutputs((prev) => {
      if (prev.some((o) => o.id === pendingOutput.id)) return prev
      return [pendingOutput, ...prev]
    })
  }, [pendingOutput])

  function handleGenerated(newOutput: GeneratedOutputPayload) {
    const ct =
      contentTypes.find((c) => c.id === newOutput.content_type_id) ??
      contentTypes.find((c) => outputs.some((o) => o.content_type_id === c.id)) ??
      contentTypes[0]
    const full: Output = {
      id: newOutput.id,
      brief: newOutput.brief,
      content: newOutput.content,
      content_type_id: newOutput.content_type_id,
      model_id: newOutput.model_id,
      project_id: projectId,
      created_by: newOutput.created_by,
      created_at: newOutput.created_at,
      updated_at: newOutput.updated_at,
      content_types: ct ? { name: ct.name } : null,
      projects: null,
      creator_full_name: newOutput.creator_full_name,
      published_at: newOutput.status === 'published' ? (newOutput.published_at ?? null) : null,
      status: newOutput.status === 'published' ? 'published' : 'generated',
      draft_messages: null,
      reach: null,
      reach_metric: null,
      engagement: null,
      performance_notes: null,
      metadata: null,
    }
    // Replace the draft row if it exists, otherwise prepend
    setOutputs((prev) => {
      const existing = prev.find((o) => o.id === newOutput.id)
      if (existing) return prev.map((o) => (o.id === newOutput.id ? full : o))
      return [full, ...prev]
    })
    setResumeProjectDraft(null)
    setResumeGenerationDraft(null)
  }

  function handleDraftDiscarded(id: string) {
    setOutputs((prev) => prev.filter((o) => o.id !== id))
    setResumeProjectDraft(null)
    setResumeGenerationDraft(null)
  }

  function handleProjectOutputGenerated(newOutput: {
    id: string
    brief: string
    content: string
    content_type_id: string | null
    model_id: string
    created_by: string
    created_at: string
    updated_at: string
    published_at: string | null
    reach: number | null
    reach_metric: string | null
    engagement: number | null
    performance_notes: string | null
    creator_full_name: string | null
  }) {
    const full: Output = {
      ...newOutput,
      project_id: projectId,
      content_types: null,
      projects: null,
      metadata: null,
    }
    setOutputs((prev) => [full, ...prev])
  }

  function handleUpdated(updated: Output) {
    setOutputs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
  }

  function handleDeleted(id: string) {
    setOutputs((prev) => prev.filter((o) => o.id !== id))
  }

  const myDrafts = outputs.filter(
    (o) => o.status === 'draft' && o.created_by === currentUserId,
  )
  const publishedOutputs = outputs.filter((o) => o.status !== 'draft')

  function openResume(draft: Output) {
    const messages = draft.draft_messages ?? []
    if (showPublish) {
      const rd: GenerationResumeDraft = {
        id: draft.id,
        contentTypeId: draft.content_type_id ?? '',
        authorId: 'company',
        modelId: draft.model_id,
        messages,
      }
      setResumeGenerationDraft(rd)
    } else {
      const outputType = draft.brief.startsWith('Brief:') ? 'Brief'
        : draft.brief.split(':')[0] ?? 'Brief'
      const rd: ProjectResumeDraft = {
        id: draft.id,
        outputType,
        modelId: draft.model_id,
        messages,
      }
      setResumeProjectDraft(rd)
    }
    setDialogOpen(true)
  }

  function closeDraftDialog() {
    setDialogOpen(false)
    setResumeProjectDraft(null)
    setResumeGenerationDraft(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">{showPublish ? 'Content' : 'Outputs'}</h2>
          <p className="text-sm text-muted-foreground">
            {publishedOutputs.length === 0
              ? showPublish ? 'No content yet.' : 'No outputs yet.'
              : `${publishedOutputs.length} ${showPublish ? `piece${publishedOutputs.length === 1 ? '' : 's'}` : `output${publishedOutputs.length === 1 ? '' : 's'}`} generated.`}
          </p>
        </div>
        <button
          onClick={() => { setResumeProjectDraft(null); setResumeGenerationDraft(null); setDialogOpen(true) }}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate
        </button>
      </div>

      {/* In-progress drafts — only visible to their creator */}
      {myDrafts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            In progress
          </p>
          {myDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onResume={openResume}
              onDiscarded={handleDraftDiscarded}
            />
          ))}
        </div>
      )}

      {publishedOutputs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {showPublish ? 'No content yet. Generate your first piece.' : 'No outputs yet. Generate your first deliverable.'}
            </p>
            <p className="text-sm text-muted-foreground">
              {showPublish ? 'Use a brief to tell the AI what to write.' : 'Briefs, reports, analyses, plans — all generated from your project materials.'}
            </p>
          </div>
          <button
            onClick={() => { setResumeProjectDraft(null); setResumeGenerationDraft(null); setDialogOpen(true) }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {showPublish ? 'Generate content' : 'Generate output'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {publishedOutputs.map((output) => (
            <OutputCard
              key={output.id}
              output={output}
              attachments={outputAttachmentsByOutputId[output.id]}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              showPublish={showPublish}
            />
          ))}
        </div>
      )}

      {showPublish ? (
        <GenerationSessionDialog
          open={dialogOpen}
          onClose={closeDraftDialog}
          onGenerated={handleGenerated}
          onDraftDiscarded={handleDraftDiscarded}
          projectId={projectId}
          authors={authors}
          contentTypes={contentTypes}
          hasBrandContext={hasBrandContext}
          resumeDraft={resumeGenerationDraft}
        />
      ) : (
        <ProjectOutputDialog
          open={dialogOpen}
          projectId={projectId}
          onClose={closeDraftDialog}
          onGenerated={handleProjectOutputGenerated}
          onDraftDiscarded={handleDraftDiscarded}
          resumeDraft={resumeProjectDraft}
        />
      )}
    </div>
  )
}

function DraftCard({
  draft,
  onResume,
  onDiscarded,
}: {
  draft: Output
  onResume: (draft: Output) => void
  onDiscarded: (id: string) => void
}) {
  const [discarding, setDiscarding] = useState(false)

  async function handleDiscard() {
    setDiscarding(true)
    const res = await fetch(`/api/outputs/${draft.id}`, { method: 'DELETE' })
    setDiscarding(false)
    if (res.ok) onDiscarded(draft.id)
  }

  const label = draft.brief.trim() || 'Untitled draft'
  const messageCount = draft.draft_messages?.length ?? 0
  const lastUpdated = new Date(draft.updated_at).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/20">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {messageCount > 0 ? `${messageCount} message${messageCount === 1 ? '' : 's'}` : 'Not started'} · {lastUpdated}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onResume(draft)}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Resume
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={discarding}
          aria-label="Discard draft"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
        >
          {discarding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
