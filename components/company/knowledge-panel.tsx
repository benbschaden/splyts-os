'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload, Trash2, AlertTriangle, CheckCircle, Clock,
  XCircle, ChevronDown, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgeFile {
  id: string
  file_name: string
  file_mime: string
  file_size_bytes: number | null
  processing_status: 'pending' | 'processing' | 'ready' | 'failed'
  processing_error: string | null
  created_at: string
}

interface ConflictFile {
  file_name: string
}

interface KnowledgeConflict {
  id: string
  topic: string
  description: string
  excerpt_a: string | null
  excerpt_b: string | null
  file_a: ConflictFile | null
  file_b: ConflictFile | null
  created_at: string
}

interface KnowledgePanelProps {
  initialFiles: KnowledgeFile[]
  initialConflicts: KnowledgeConflict[]
  isAdmin: boolean
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: KnowledgeFile['processing_status'] }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle className="h-3 w-3" /> Ready
      </span>
    )
  }
  if (status === 'processing' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
        <Clock className="h-3 w-3" /> Processing…
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      <XCircle className="h-3 w-3" /> Failed
    </span>
  )
}

export function KnowledgePanel({ initialFiles, initialConflicts, isAdmin }: KnowledgePanelProps) {
  const [files, setFiles] = useState<KnowledgeFile[]>(initialFiles)
  const [conflicts, setConflicts] = useState<KnowledgeConflict[]>(initialConflicts)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [conflictsOpen, setConflictsOpen] = useState(initialConflicts.length > 0)
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/company-knowledge/upload', {
      method: 'POST',
      body: formData,
    })

    setUploading(false)

    if (fileInputRef.current) fileInputRef.current.value = ''

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Upload failed' }))
      setUploadError((body as { error?: string }).error ?? 'Upload failed')
      return
    }

    const { file: newFile } = await res.json() as { file: KnowledgeFile }
    setFiles((prev) => [newFile, ...prev])

    // Reload conflicts after upload (new conflicts may have been created)
    fetch('/api/company-knowledge/conflicts')
      .then((r) => r.json())
      .then((data: unknown) => {
        const d = data as { conflicts?: KnowledgeConflict[] }
        if (Array.isArray(d.conflicts)) {
          setConflicts(d.conflicts)
          if (d.conflicts.length > 0) setConflictsOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  async function handleDelete(fileId: string) {
    const res = await fetch(`/api/company-knowledge/${fileId}`, { method: 'DELETE' })
    if (!res.ok) return
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  async function handleResolveConflict(conflictId: string, trust?: 'a' | 'b') {
    setResolvingConflict(conflictId)
    const res = await fetch(`/api/company-knowledge/conflicts/${conflictId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trust ? { trust } : {}),
    })
    setResolvingConflict(null)
    if (!res.ok) return
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Upload zone */}
      {isAdmin && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">Upload company documents</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              PDF, DOCX, TXT, or MD · max 50MB · used only to suggest field values,
              never referenced in content generation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground',
                'hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload company knowledge file"
            />
          </div>

          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
        </div>
      )}

      {/* File list */}
      {files.length > 0 ? (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3 bg-background">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <StatusBadge status={file.processing_status} />
                  {file.file_size_bytes && (
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(file.file_size_bytes)}
                    </span>
                  )}
                  {file.processing_status === 'failed' && file.processing_error && (
                    <span className="text-xs text-destructive truncate max-w-[200px]">
                      {file.processing_error}
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(file.id)}
                  aria-label={`Delete ${file.file_name}`}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isAdmin && (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        )
      )}

      {/* Conflicts panel */}
      {conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 overflow-hidden">
          <button
            onClick={() => setConflictsOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-200">
              {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} detected in uploaded documents
            </span>
            {conflictsOpen ? (
              <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
          </button>

          {conflictsOpen && (
            <div className="divide-y divide-amber-200 dark:divide-amber-900 border-t border-amber-200 dark:border-amber-900">
              {conflicts.map((conflict) => {
                const isResolving = resolvingConflict === conflict.id
                return (
                  <div key={conflict.id} className="px-4 py-3 space-y-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        {conflict.topic}
                      </p>
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        {conflict.description}
                      </p>
                    </div>

                    {(conflict.excerpt_a || conflict.excerpt_b) && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {conflict.excerpt_a && (
                          <div className="rounded bg-amber-100 dark:bg-amber-900/40 p-2 space-y-2">
                            <p className="font-medium text-amber-700 dark:text-amber-300">
                              {conflict.file_a?.file_name}
                            </p>
                            <p className="text-amber-800 dark:text-amber-200 line-clamp-3">
                              {conflict.excerpt_a}
                            </p>
                            {isAdmin && (
                              <button
                                onClick={() => handleResolveConflict(conflict.id, 'a')}
                                disabled={isResolving}
                                className="mt-1 inline-flex items-center gap-1 rounded border border-amber-400 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/40 disabled:opacity-50 transition-colors"
                              >
                                {isResolving ? 'Saving…' : 'Trust this version'}
                              </button>
                            )}
                          </div>
                        )}
                        {conflict.excerpt_b && (
                          <div className="rounded bg-amber-100 dark:bg-amber-900/40 p-2 space-y-2">
                            <p className="font-medium text-amber-700 dark:text-amber-300">
                              {conflict.file_b?.file_name}
                            </p>
                            <p className="text-amber-800 dark:text-amber-200 line-clamp-3">
                              {conflict.excerpt_b}
                            </p>
                            {isAdmin && (
                              <button
                                onClick={() => handleResolveConflict(conflict.id, 'b')}
                                disabled={isResolving}
                                className="mt-1 inline-flex items-center gap-1 rounded border border-amber-400 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/40 disabled:opacity-50 transition-colors"
                              >
                                {isResolving ? 'Saving…' : 'Trust this version'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleResolveConflict(conflict.id)}
                          disabled={isResolving}
                          className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                        >
                          Dismiss without resolving
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
