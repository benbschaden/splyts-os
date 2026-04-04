'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Check, X, Trash2, Sparkles, Loader2, User,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { PlaybookWithOwner } from '@/lib/queries/playbooks'

interface PlaybookEditorProps {
  playbook: PlaybookWithOwner
  canEdit: boolean
}

export function PlaybookEditor({ playbook: initialPlaybook, canEdit }: PlaybookEditorProps) {
  const router = useRouter()
  const [playbook, setPlaybook] = useState(initialPlaybook)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(initialPlaybook.title)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editContent, setEditContent] = useState(initialPlaybook.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isPolishing, setIsPolishing] = useState(false)
  const [polishedSuggestion, setPolishedSuggestion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function patch(updates: Partial<Pick<PlaybookWithOwner, 'title' | 'category' | 'content'>>) {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/playbooks/${playbook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save')
        return false
      }
      setPlaybook((prev) => ({ ...prev, ...data.playbook }))
      return true
    } catch {
      setError('Failed to save')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveTitle() {
    const ok = await patch({ title: editTitle.trim() })
    if (ok) setIsEditingTitle(false)
  }

  async function handleSaveContent() {
    const ok = await patch({ content: editContent })
    if (ok) {
      setIsEditingContent(false)
      setPolishedSuggestion(null)
    }
  }

  async function handleCancelContent() {
    setIsEditingContent(false)
    setEditContent(playbook.content)
    setPolishedSuggestion(null)
    setError(null)
  }

  async function handlePolish() {
    setIsPolishing(true)
    setError(null)
    setPolishedSuggestion(null)
    try {
      const res = await fetch(`/api/playbooks/${playbook.id}/polish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'AI polish failed')
        return
      }
      setPolishedSuggestion(data.polished)
    } catch {
      setError('AI polish failed')
    } finally {
      setIsPolishing(false)
    }
  }

  function handleAcceptPolish() {
    if (!polishedSuggestion) return
    setEditContent(polishedSuggestion)
    setPolishedSuggestion(null)
  }

  function handleDiscardPolish() {
    setPolishedSuggestion(null)
  }

  async function handleDelete() {
    if (!confirm('Delete this playbook? This cannot be undone.')) return
    const res = await fetch(`/api/playbooks/${playbook.id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      router.push('/dashboard/playbooks')
    }
  }

  const isEmpty = !playbook.content.trim()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/playbooks"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to playbooks"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {playbook.category}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleDelete}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              aria-label="Delete playbook"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Title */}
          <div className="mb-2 flex items-start gap-2">
            {isEditingTitle ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle()
                    if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitle(playbook.title) }
                  }}
                  autoFocus
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-2xl font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={isSaving}
                  aria-label="Save title"
                  className="rounded-md bg-foreground p-2 text-background hover:opacity-80"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setIsEditingTitle(false); setEditTitle(playbook.title) }}
                  aria-label="Cancel"
                  className="rounded-md border border-border p-2 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-1 items-start justify-between">
                <h1 className="text-2xl font-bold text-foreground">{playbook.title}</h1>
                {canEdit && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    aria-label="Edit title"
                    className="ml-2 mt-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="mb-6 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{playbook.owner_name ?? 'Unknown'}</span>
            <span>·</span>
            <span>Updated {new Date(playbook.updated_at).toLocaleDateString()}</span>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* AI polish suggestion */}
          {polishedSuggestion && (
            <div className="mb-4 rounded-xl border border-border bg-accent/30 p-4">
              <p className="mb-2 text-xs font-semibold text-foreground">AI suggestion — review before accepting</p>
              <div className="prose prose-sm max-w-none dark:prose-invert text-foreground mb-3 rounded-lg border border-border bg-background p-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{polishedSuggestion}</ReactMarkdown>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptPolish}
                  className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept
                </button>
                <button
                  onClick={handleDiscardPolish}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {isEditingContent ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePolish}
                  disabled={isPolishing || !editContent.trim()}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {isPolishing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {isPolishing ? 'Polishing…' : 'Polish with AI'}
                </button>
                <span className="text-xs text-muted-foreground">
                  Markdown supported
                </span>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
                rows={24}
                placeholder="Write your playbook here. Use markdown for headings (##), bullets (-), and numbered lists (1.)."
                className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveContent}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleCancelContent}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-muted-foreground">No content yet</p>
                  {canEdit && (
                    <button
                      onClick={() => { setIsEditingContent(true); setEditContent(playbook.content) }}
                      className="mt-3 flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                    >
                      <Pencil className="h-4 w-4" />
                      Start writing
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {playbook.content}
                    </ReactMarkdown>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => { setIsEditingContent(true); setEditContent(playbook.content) }}
                      className="absolute right-0 top-0 flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
