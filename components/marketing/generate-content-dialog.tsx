'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Author {
  id: string
  name: string
}

interface ContentType {
  id: string
  name: string
}

interface GenerateContentDialogProps {
  open: boolean
  onClose: () => void
  onGenerated: (output: { id: string; content: string; brief: string }) => void
  projectId: string
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
}

export function GenerateContentDialog({
  open,
  onClose,
  onGenerated,
  projectId,
  authors,
  contentTypes,
  hasBrandContext,
}: GenerateContentDialogProps) {
  const [authorId, setAuthorId] = useState('company')
  const [contentTypeId, setContentTypeId] = useState('')
  const [brief, setBrief] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAuthorId('company')
      setContentTypeId(contentTypes[0]?.id ?? '')
      setBrief('')
      setError(null)
    }
  }, [open, contentTypes])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!brief.trim()) {
      setError('Please enter a brief before generating.')
      return
    }
    if (!contentTypeId) {
      setError('Please select a content type.')
      return
    }

    setGenerating(true)
    setError(null)

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, contentTypeId, authorId, brief: brief.trim() }),
    })

    const data = await res.json()
    setGenerating(false)

    if (!res.ok) {
      setError(data.error ?? 'Generation failed. Please try again.')
      return
    }

    onGenerated(data.output)
    onClose()
  }

  if (!open) return null

  const allAuthors = [{ id: 'company', name: 'Company (brand)' }, ...authors]
  const noBrandContext = !hasBrandContext
  const noContentTypes = contentTypes.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-12">
      <div className="absolute inset-0 bg-black/20" onClick={generating ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">Generate content</h2>
          <button
            onClick={onClose}
            disabled={generating}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Blocking states */}
        {noBrandContext && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            Brand context must be configured before generating content.{' '}
            <a href="/dashboard/marketing/brand" className="font-medium underline">
              Set up brand context →
            </a>
          </div>
        )}

        {!noBrandContext && noContentTypes && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            No content types have been set up yet.{' '}
            <a href="/dashboard/marketing/content-types" className="font-medium underline">
              Add a content type →
            </a>
          </div>
        )}

        {!noBrandContext && !noContentTypes && (
          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Author */}
            <div className="space-y-1.5">
              <label htmlFor="gen-author" className="text-sm font-medium text-foreground">
                Author
              </label>
              <select
                id="gen-author"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                disabled={generating}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
                )}
              >
                {allAuthors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Content type */}
            <div className="space-y-1.5">
              <label htmlFor="gen-content-type" className="text-sm font-medium text-foreground">
                Content type
              </label>
              <select
                id="gen-content-type"
                value={contentTypeId}
                onChange={(e) => setContentTypeId(e.target.value)}
                disabled={generating}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
                )}
              >
                {contentTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>{ct.name}</option>
                ))}
              </select>
            </div>

            {/* Brief */}
            <div className="space-y-1.5">
              <label htmlFor="gen-brief" className="text-sm font-medium text-foreground">
                Brief
              </label>
              <p className="text-xs text-muted-foreground">
                What should the AI write about? Be specific — better brief, better output.
              </p>
              <textarea
                id="gen-brief"
                value={brief}
                onChange={(e) => { setBrief(e.target.value); setError(null) }}
                rows={4}
                disabled={generating}
                placeholder="e.g. Announce our new training load feature for coaches. Key message: coaches can now see individual athlete load scores in real time."
                className={cn(
                  'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
                  error ? 'border-destructive' : 'border-input',
                )}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={generating}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating || !brief.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
