'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { X, Loader2 } from 'lucide-react'

interface MaterialMarkdownDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  materialId: string
  title: string
  /** Extracted text from DB when available (may be empty if extraction failed). */
  contentFromDb: string | null
}

export function MaterialMarkdownDialog({
  open,
  onClose,
  projectId,
  materialId,
  title,
  contentFromDb,
}: MaterialMarkdownDialogProps) {
  const [body, setBody] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const fromDb = contentFromDb?.trim() ?? ''
    if (fromDb.length > 0) {
      setBody(fromDb)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadFromStorage(): Promise<void> {
      setLoading(true)
      setError(null)
      setBody('')
      try {
        const res = await fetch(
          `/api/projects/${projectId}/materials/${materialId}/file?format=json`,
          { credentials: 'include' },
        )
        if (!res.ok) {
          setError('Could not load file.')
          return
        }
        const data = (await res.json()) as { url?: string; error?: string }
        if (data.error || !data.url) {
          setError('Could not load file.')
          return
        }
        const fileRes = await fetch(data.url)
        if (!fileRes.ok) {
          setError('Could not load file.')
          return
        }
        const text = await fileRes.text()
        if (!cancelled) setBody(text)
      } catch {
        if (!cancelled) setError('Could not load file.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadFromStorage()
    return () => {
      cancelled = true
    }
  }, [open, projectId, materialId, contentFromDb])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close document"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-md-title"
        className="relative z-10 flex h-[min(92vh,calc(100vh-2rem))] w-full max-w-[min(96vw,56rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="material-md-title" className="min-w-0 truncate text-sm font-semibold text-foreground">
            {title || 'Document'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8 sm:py-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}
          {error && !loading && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && body.length === 0 && (
            <p className="text-sm text-muted-foreground">This file is empty.</p>
          )}
          {!loading && !error && body.length > 0 && (
            <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-4 prose-p:leading-relaxed prose-pre:max-w-full prose-pre:overflow-x-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
