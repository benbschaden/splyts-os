'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send, FileText, Save, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/ai/models'
import type { MeetingDocumentWithProjects } from '@/lib/queries/meeting-documents'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface ProjectOption {
  id: string
  name: string
}

interface MeetingDiscussPanelProps {
  meetingId: string
  meetingTitle: string
  currentUserId: string
  initialDocuments: MeetingDocumentWithProjects[]
  linkedProjectIds: string[]
  projectOptions: ProjectOption[]
}

export function MeetingDiscussPanel({
  meetingId,
  meetingTitle,
  currentUserId,
  initialDocuments,
  linkedProjectIds,
  projectOptions,
}: MeetingDiscussPanelProps) {
  const router = useRouter()
  const [modelId, setModelId] = useState(DEFAULT_MODEL.id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const [documents, setDocuments] = useState<MeetingDocumentWithProjects[]>(initialDocuments)

  const [saveOpen, setSaveOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveContent, setSaveContent] = useState('')
  const [saving, setSaving] = useState(false)

  const [publishDocId, setPublishDocId] = useState<string | null>(null)
  const [publishSelected, setPublishSelected] = useState<Set<string>>(new Set())
  const [publishing, setPublishing] = useState(false)

  const refreshDocuments = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingId}/documents`)
    if (res.ok) {
      const { data } = (await res.json()) as { data: MeetingDocumentWithProjects[] }
      setDocuments(data)
    }
    router.refresh()
  }, [meetingId, router])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setChatError(null)
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')

    try {
      const res = await fetch(`/api/meetings/${meetingId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          messages: nextMessages,
        }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setChatError(data.error ?? 'Chat failed')
        setMessages(messages)
        setSending(false)
        return
      }
      const { data } = (await res.json()) as { data: { content: string } }
      setMessages([...nextMessages, { role: 'assistant', content: data.content }])
    } catch {
      setChatError('Something went wrong')
      setMessages(messages)
    } finally {
      setSending(false)
    }
  }

  function openSaveFromLast() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    setSaveTitle(`Notes — ${meetingTitle}`)
    setSaveContent(lastAssistant?.content ?? '')
    setSaveOpen(true)
  }

  async function handleSaveDocument() {
    if (!saveTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: saveTitle.trim(), content: saveContent }),
      })
      if (!res.ok) {
        setSaving(false)
        return
      }
      setSaveOpen(false)
      await refreshDocuments()
    } finally {
      setSaving(false)
    }
  }

  function openPublish(doc: MeetingDocumentWithProjects) {
    if (doc.created_by !== currentUserId) return
    setPublishDocId(doc.id)
    const preset = new Set<string>([
      ...linkedProjectIds,
      ...(doc.project_ids ?? []),
    ])
    setPublishSelected(preset)
  }

  function togglePublishProject(pid: string) {
    setPublishSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  async function confirmPublish() {
    if (!publishDocId) return
    setPublishing(true)
    try {
      const res = await fetch(
        `/api/meetings/${meetingId}/documents/${publishDocId}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_ids: Array.from(publishSelected) }),
        },
      )
      if (!res.ok) return
      setPublishDocId(null)
      await refreshDocuments()
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="meeting-chat-model" className="text-xs font-medium text-muted-foreground">
            Model
          </label>
          <select
            id="meeting-chat-model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-[200px] max-h-[360px] overflow-y-auto rounded-md border border-border bg-muted/20 p-3 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ask questions about the meeting notes, request a summary, or draft follow-up content.
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'text-sm rounded-md px-3 py-2',
                  m.role === 'user'
                    ? 'bg-primary/10 text-foreground ml-4'
                    : 'bg-background border border-border mr-4',
                )}
              >
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
            ))
          )}
        </div>

        {chatError && <p className="text-sm text-destructive">{chatError}</p>}

        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder="Message…"
            rows={3}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
            className="self-end shrink-0 rounded-md bg-primary px-3 py-2 text-primary-foreground"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openSaveFromLast}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm"
          >
            <Save className="h-3.5 w-3.5" />
            Save as document
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documents from this meeting
        </h3>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved documents yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="rounded-lg border border-border p-3 flex flex-wrap items-start justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.status === 'published' ? 'Published' : 'Draft'}
                    {doc.status === 'published' && doc.project_ids.length > 0 && (
                      <span>
                        {' '}
                        · {doc.project_ids.length} project
                        {doc.project_ids.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                    {doc.content.slice(0, 200)}
                    {doc.content.length > 200 ? '…' : ''}
                  </p>
                </div>
                {doc.created_by === currentUserId && doc.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => openPublish(doc)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
                  >
                    <Megaphone className="h-3 w-3" />
                    Publish
                  </button>
                )}
                {doc.created_by === currentUserId && doc.status === 'published' && (
                  <button
                    type="button"
                    onClick={() => openPublish(doc)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                  >
                    Routing
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSaveOpen(false)} aria-hidden />
          <div className="relative w-full max-w-lg rounded-lg border border-border bg-background p-5 shadow-lg">
            <h4 className="text-sm font-semibold mb-3">Save document</h4>
            <label className="block text-xs font-medium mb-1" htmlFor="doc-title">
              Title
            </label>
            <input
              id="doc-title"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm mb-3"
            />
            <label className="block text-xs font-medium mb-1" htmlFor="doc-body">
              Content
            </label>
            <textarea
              id="doc-body"
              value={saveContent}
              onChange={(e) => setSaveContent(e.target.value)}
              rows={10}
              className="w-full rounded-md border px-3 py-2 text-sm font-mono"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => void handleSaveDocument()}
                disabled={saving || !saveTitle.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" onClick={() => setSaveOpen(false)} className="text-sm text-muted-foreground">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {publishDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPublishDocId(null)} aria-hidden />
          <div className="relative w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg max-h-[80vh] overflow-y-auto">
            <h4 className="text-sm font-semibold mb-1">Publish to projects</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Projects linked to this meeting are pre-selected. Add others from your org.
            </p>
            <ul className="space-y-2 mb-4">
              {projectOptions.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publishSelected.has(p.id)}
                      onChange={() => togglePublishProject(p.id)}
                    />
                    {p.name}
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void confirmPublish()}
                disabled={publishing}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
              <button type="button" onClick={() => setPublishDocId(null)} className="text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
