'use client'

import { useEffect, useState } from 'react'
import { X, RotateCcw, Loader2 } from 'lucide-react'
import type { DocumentRow, DocumentVersionRow } from '@/lib/queries/documents'

interface DocumentVersionsDrawerProps {
  documentId: string
  onClose: () => void
  onRestored: (document: DocumentRow) => void
}

export function DocumentVersionsDrawer({
  documentId,
  onClose,
  onRestored,
}: DocumentVersionsDrawerProps) {
  const [versions, setVersions] = useState<DocumentVersionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersionRow | null>(null)

  useEffect(() => {
    async function loadVersions() {
      try {
        const res = await fetch(`/api/documents/${documentId}/versions`)
        const data = await res.json()
        if (res.ok) {
          setVersions(data.versions ?? [])
        } else {
          setError('Failed to load version history')
        }
      } catch {
        setError('Failed to load version history')
      } finally {
        setLoading(false)
      }
    }
    loadVersions()
  }, [documentId])

  async function handleRestore(version: number) {
    if (!confirm(`Restore to version ${version}? The current content will be saved as a new version first.`)) return

    setRestoring(version)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/${version}/restore`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        onRestored(data.document as DocumentRow)
      } else {
        setError(data.error ?? 'Failed to restore version')
      }
    } catch {
      setError('Failed to restore version')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Version history</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="border-b border-border px-4 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Version list */}
          <div className="flex w-1/2 flex-col overflow-y-auto border-r border-border">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground">No version history yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Versions are saved automatically when you edit.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className={`cursor-pointer px-4 py-3 transition-colors hover:bg-accent ${
                      selectedVersion?.id === v.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedVersion(v)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">v{v.version}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestore(v.version) }}
                        disabled={restoring !== null}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
                        title="Restore this version"
                      >
                        {restoring === v.version ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Restore
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString()} {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {v.title && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{v.title}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Content preview */}
          <div className="flex flex-1 flex-col overflow-y-auto p-4">
            {selectedVersion ? (
              <>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  v{selectedVersion.version} preview
                </p>
                <pre className="flex-1 whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
                  {selectedVersion.content}
                </pre>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-xs text-muted-foreground">Select a version to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
