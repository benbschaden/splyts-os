'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Share2, Building2, Lock, Trash2, Pencil, Check, X,
  History, AlertTriangle, Loader2, Users,
} from 'lucide-react'
import type { DocumentRow, DocumentVisibility } from '@/lib/queries/documents'
import { DocumentVersionsDrawer } from './document-versions-drawer'
import { DiscussionsPanel } from '@/components/discussions/discussions-panel'

interface DocumentViewerProps {
  document: DocumentRow
  isOwner: boolean
  isAdmin: boolean
  canFile: boolean
}

const VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  private: 'Private',
  shared: 'Shared with team',
  filed: 'Filed to company',
}

export function DocumentViewer({ document: initialDocument, isOwner, isAdmin, canFile }: DocumentViewerProps) {
  const router = useRouter()
  const [document, setDocument] = useState(initialDocument)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(initialDocument.title)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editContent, setEditContent] = useState(initialDocument.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isFiling, setIsFiling] = useState(false)
  const [isRequestingReview, setIsRequestingReview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflictVersion, setConflictVersion] = useState<number | null>(null)
  const [lockWarning, setLockWarning] = useState<string | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [activeView, setActiveView] = useState<'content' | 'discussions'>('content')

  // Unlock on page unload
  const unlock = useCallback(async () => {
    await fetch(`/api/documents/${document.id}/unlock`, { method: 'POST' })
  }, [document.id])

  useEffect(() => {
    window.addEventListener('beforeunload', unlock)
    return () => window.removeEventListener('beforeunload', unlock)
  }, [unlock])

  async function handleEnterEditContent() {
    // Attempt soft lock
    const res = await fetch(`/api/documents/${document.id}/lock`, { method: 'POST' })
    if (res.status === 423) {
      const data = await res.json()
      // Still allow editing but show warning
      setLockWarning(`Someone else may be editing this document.`)
      console.info('[document-viewer] Lock unavailable:', data)
    }
    setIsEditingContent(true)
    setEditContent(document.content)
    setConflictVersion(null)
    setError(null)
  }

  async function handleCancelEditContent() {
    setIsEditingContent(false)
    setLockWarning(null)
    setConflictVersion(null)
    setError(null)
    setEditContent(document.content)
    await unlock()
  }

  async function patch(
    updates: Partial<Pick<DocumentRow, 'title' | 'content' | 'doc_type' | 'visibility'>>,
    withVersion?: number,
  ) {
    setIsSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { ...updates }
      if (withVersion !== undefined) body.version = withVersion

      const res = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.status === 409) {
        setConflictVersion(data.currentVersion as number)
        setError('This document was modified by someone else. Reload to see the latest version before saving.')
        return false
      }

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
    const ok = await patch({ title: editTitle.trim() }, document.version)
    if (ok) setIsEditingTitle(false)
  }

  async function handleSaveContent() {
    const ok = await patch({ content: editContent }, document.version)
    if (ok) {
      setIsEditingContent(false)
      setLockWarning(null)
      setConflictVersion(null)
      await unlock()
    }
  }

  async function handleVisibilityChange(visibility: DocumentVisibility) {
    if (visibility === 'filed') {
      // Use the dedicated /file endpoint which generates summary and records audit trail
      setIsFiling(true)
      setError(null)
      try {
        const res = await fetch(`/api/documents/${document.id}/file`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Failed to file document')
        } else {
          setDocument(data.document)
        }
      } catch {
        setError('Failed to file document')
      } finally {
        setIsFiling(false)
      }
      return
    }

    await patch({ visibility })
  }

  async function handleRequestReview() {
    setIsRequestingReview(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${document.id}/request-review`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to request review')
      } else {
        setDocument(data.document)
      }
    } catch {
      setError('Failed to request review')
    } finally {
      setIsRequestingReview(false)
    }
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

  function handleVersionRestored(restoredDoc: DocumentRow) {
    setDocument(restoredDoc)
    setShowVersions(false)
    setEditContent(restoredDoc.content)
    setEditTitle(restoredDoc.title)
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {VISIBILITY_LABELS[document.visibility]}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">v{document.version}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(isOwner || canFile) && (
            <>
              {document.visibility === 'private' && (
                <button
                  onClick={() => handleVisibilityChange('shared')}
                  disabled={isSaving || isFiling || !isOwner}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share with team
                </button>
              )}
              {document.visibility !== 'filed' && canFile && (
                <button
                  onClick={() => handleVisibilityChange('filed')}
                  disabled={isSaving || isFiling}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {isFiling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5" />
                  )}
                  {isFiling ? 'Filing…' : 'File to company'}
                </button>
              )}
              {document.visibility === 'shared' && !canFile && isOwner && !document.review_requested_at && (
                <button
                  onClick={handleRequestReview}
                  disabled={isSaving || isRequestingReview}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {isRequestingReview ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Users className="h-3.5 w-3.5" />
                  )}
                  {isRequestingReview ? 'Requesting…' : 'Request review'}
                </button>
              )}
              {document.visibility === 'shared' && !canFile && isOwner && !!document.review_requested_at && (
                <button
                  disabled
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-70"
                >
                  <Users className="h-3.5 w-3.5" />
                  Review requested
                </button>
              )}
              {document.visibility === 'shared' && (
                <button
                  onClick={() => handleVisibilityChange('private')}
                  disabled={isSaving || isFiling || !isOwner}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Make private
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => setShowVersions(true)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <History className="h-3.5 w-3.5" />
                  History
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

      {/* View tabs */}
      <div className="flex border-b border-border px-6">
        {(['content', 'discussions'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`mr-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeView === v
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Document body */}
      {activeView === 'content' && (
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

          <p className="mb-2 text-xs text-muted-foreground">
            {document.doc_type} · Last updated {new Date(document.updated_at).toLocaleDateString()}
            {document.filed_at && document.visibility === 'filed' && (
              <> · Filed {new Date(document.filed_at).toLocaleDateString()}</>
            )}
            {document.review_requested_at && document.visibility !== 'filed' && (
              <> · Review requested {new Date(document.review_requested_at).toLocaleDateString()}</>
            )}
            {document.source_session_id && (
              <>
                {' · '}
                <Link
                  href={`/dashboard/chat/${document.source_session_id}`}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  View conversation
                </Link>
              </>
            )}
          </p>

          {document.summary && document.visibility === 'filed' && (
            <p className="mb-6 rounded-lg border border-border bg-accent/30 px-4 py-2 text-xs text-muted-foreground italic">
              {document.summary}
            </p>
          )}

          {!canFile && !isAdmin && isOwner && document.visibility === 'shared' && !document.review_requested_at && (
            <p className="mb-4 rounded-lg border border-border bg-accent/30 px-4 py-2 text-xs text-muted-foreground">
              Only admins or team reviewers can file documents to company knowledge. Request a review to continue.
            </p>
          )}

          {/* Lock warning */}
          {lockWarning && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-amber-700 dark:text-amber-300">{lockWarning}</p>
            </div>
          )}

          {/* Conflict warning */}
          {conflictVersion !== null && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-medium text-destructive">Version conflict</p>
                <p className="text-xs text-muted-foreground">
                  This document was modified (now at v{conflictVersion}). Reload to see the latest version before saving your changes.
                </p>
              </div>
            </div>
          )}

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
                  onClick={handleCancelEditContent}
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
                  onClick={handleEnterEditContent}
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
      )}

      {activeView === 'discussions' && (
        <div className="flex h-[calc(100vh-160px)]">
          <DiscussionsPanel
            parentType="document"
            parentId={document.id}
            organizationId={document.organization_id}
          />
        </div>
      )}

      {/* Version history drawer */}
      {showVersions && (
        <DocumentVersionsDrawer
          documentId={document.id}
          onClose={() => setShowVersions(false)}
          onRestored={handleVersionRestored}
        />
      )}
    </div>
  )
}
