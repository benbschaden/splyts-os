'use client'

import { useState } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'

const DOCUMENT_TYPES = [
  'Planning Brief',
  'Decision Document',
  'Meeting Notes',
  'Strategy Doc',
  'Research Summary',
  'Action Plan',
  'Spec',
]

interface CaptureDocumentDialogProps {
  sessionId: string
  onClose: () => void
  onCaptured: (documentId: string) => void
}

export function CaptureDocumentDialog({
  sessionId,
  onClose,
  onCaptured,
}: CaptureDocumentDialogProps) {
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0])
  const [customType, setCustomType] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedType = documentType === 'Other' ? customType : documentType

  async function handleCapture() {
    if (!title.trim() || !resolvedType.trim()) return

    setIsCapturing(true)
    setError(null)

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          document_type: resolvedType.trim(),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to capture document')
        return
      }

      onCaptured(data.document.id)
    } catch {
      setError('Failed to capture document. Please try again.')
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Capture as Document</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            The AI will draft a document from your conversation. You can review and edit it before it saves.
          </p>

          {/* Title */}
          <div>
            <label htmlFor="doc-title" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Document title
            </label>
            <input
              id="doc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Memo Book Planning Brief"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
          </div>

          {/* Document type */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Document type
            </label>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setDocumentType(type)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    documentType === type
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {type}
                </button>
              ))}
              <button
                onClick={() => setDocumentType('Other')}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  documentType === 'Other'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:border-foreground/40'
                }`}
              >
                Other
              </button>
            </div>
            {documentType === 'Other' && (
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Describe the document type…"
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
              />
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleCapture}
            disabled={!title.trim() || !resolvedType.trim() || isCapturing}
            className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {isCapturing && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCapturing ? 'Generating…' : 'Generate Document'}
          </button>
        </div>
      </div>
    </div>
  )
}
