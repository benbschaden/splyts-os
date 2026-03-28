'use client'

import { useState } from 'react'
import { X, ExternalLink, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { DiscussionRow } from '@/lib/queries/discussions'

const DOC_TYPES = ['brief', 'report', 'strategy', 'note', 'decision record', 'research', 'plan']

interface CreateDocFromDiscussionDialogProps {
  discussion: DiscussionRow
  onClose: () => void
}

export function CreateDocFromDiscussionDialog({
  discussion,
  onClose,
}: CreateDocFromDiscussionDialogProps) {
  const router = useRouter()
  const [docType, setDocType] = useState('brief')
  const [customType, setCustomType] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdDocId, setCreatedDocId] = useState<string | null>(null)

  async function handleGenerate(): Promise<void> {
    const type = customType.trim() || docType
    setIsGenerating(true)
    setError(null)
    const res = await fetch(`/api/discussions/${discussion.id}/create-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_type: type }),
    })
    const data = (await res.json()) as { document?: { id: string }; error?: string }
    if (!res.ok) {
      setError(data.error ?? 'Failed to generate document')
      setIsGenerating(false)
      return
    }
    setCreatedDocId(data.document!.id)
    setIsGenerating(false)
  }

  if (createdDocId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="mx-auto w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400">
            <ExternalLink className="h-5 w-5" />
          </div>
          <h2 className="mb-1 text-base font-semibold text-foreground">Document Created</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Saved as shared. All org members can access it.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/dashboard/documents/${createdDocId}`)}
              className="flex-1 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-80"
            >
              View Document
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Create Document</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          AI will draft a document from{' '}
          <span className="font-medium text-foreground">"{discussion.title}"</span>.
        </p>
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-foreground">Document type</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {DOC_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setDocType(t)
                  setCustomType('')
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  docType === t && !customType
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Or type a custom document type…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
        </div>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate Document'
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
