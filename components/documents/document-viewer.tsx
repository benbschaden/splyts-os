'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Share2, Building2, Lock, Trash2, Pencil, Check, X } from 'lucide-react'
import type { DocumentRow, DocumentVisibility } from '@/lib/queries/documents'

interface DocumentViewerProps {
  document: DocumentRow
  isOwner: boolean
}

const VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  private: 'Private',
  shared: 'Shared with team',
  filed: 'Filed to company',
}

export function DocumentViewer({ document: initialDocument, isOwner }: DocumentViewerProps) {
  const router = useRouter()
  const [document, setDocument] = useState(initialDocument)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(initialDocument.title)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editContent, setEditContent] = useState(initialDocument.content)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function patch(updates: Partial<Pick<DocumentRow, 'title' | 'content' | 'visibility'>>) {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save')
        return false
      }
      setDocument(data.document)
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
    if (ok) setIsEditingContent(false)
  }

  async function handleVisibilityChange(visibility: DocumentVisibility) {
    await patch({ visibility })
  }

  async function handleDelete() {
    if (!confirm('Delete this document? This cannot be undone.')) return
    const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/dashboard/documents')
    }
  }

  function handleDownload() {
    window.location.href = `/api/documents/${document.id}/download`
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/documents"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to documents"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs text-muted-foreground">
            {VISIBILITY_LABELS[document.visibility]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              {document.visibility === 'private' && (
                <button
                  onClick={() => handleVisibilityChange('shared')}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share with team
                </button>
              )}
              {document.visibility !== 'filed' && (
                <button
                  onClick={() => handleVisibilityChange('filed')}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  File to company
                </button>
              )}
              {document.visibility === 'shared' && (
                <button
                  onClick={() => handleVisibilityChange('private')}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Make private
                </button>
              )}
            </>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          {isOwner && (
            <button
              onClick={handleDelete}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              aria-label="Delete document"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Document body */}
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
                    if (e.key === 'Escape') setIsEditingTitle(false)
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
                  onClick={() => { setIsEditingTitle(false); setEditTitle(document.title) }}
                  aria-label="Cancel"
                  className="rounded-md border border-border p-2 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-1 items-start justify-between">
                <h1 className="text-2xl font-bold text-foreground">{document.title}</h1>
                {isOwner && (
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

          <p className="mb-6 text-xs text-muted-foreground">
            {document.doc_type} · Last updated {new Date(document.updated_at).toLocaleDateString()}
            {document.source_session_id && (
              <>
                {' · '}
                <Link
                  href={`/dashboard/chat/${document.source_session_id}`}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  View chat
                </Link>
              </>
            )}
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Content */}
          {isEditingContent ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
                rows={20}
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
                  onClick={() => { setIsEditingContent(false); setEditContent(document.content) }}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <div className="prose prose-sm max-w-none text-foreground">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {document.content}
                </pre>
              </div>
              {isOwner && (
                <button
                  onClick={() => setIsEditingContent(true)}
                  className="absolute right-0 top-0 flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
