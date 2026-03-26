'use client'

import { useState } from 'react'
import { Sparkles, Copy, Pencil, Trash2, Check, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GenerateContentDialog } from '@/components/marketing/generate-content-dialog'

interface Output {
  id: string
  brief: string
  content: string
  content_type_id: string
  created_at: string
  updated_at: string
  content_types: { name: string } | null
}

interface Author {
  id: string
  name: string
}

interface ContentType {
  id: string
  name: string
}

interface OutputsListProps {
  projectId: string
  initialOutputs: Output[]
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function OutputCard({
  output,
  onUpdated,
  onDeleted,
}: {
  output: Output
  onUpdated: (updated: Output) => void
  onDeleted: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(output.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!editContent.trim()) return
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/outputs/${output.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    const { output: updated } = await res.json()
    onUpdated({ ...output, content: updated.content, updated_at: updated.updated_at })
    setEditing(false)
  }

  async function handleDelete() {
    setDeleting(true)

    const res = await fetch(`/api/outputs/${output.id}`, { method: 'DELETE' })

    if (!res.ok) {
      setError('Failed to delete. Please try again.')
      setDeleting(false)
      setConfirmDelete(false)
      return
    }

    onDeleted(output.id)
  }

  function handleCopy() {
    navigator.clipboard.writeText(output.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const preview = output.content.slice(0, 180) + (output.content.length > 180 ? '…' : '')

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
            {output.content_types?.name ?? 'Unknown type'}
          </span>
          <span className="text-xs text-muted-foreground truncate hidden sm:block">
            {formatDate(output.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => { setEditing(true); setExpanded(true) }}
            title="Edit"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Brief */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Brief</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{output.brief}</p>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 pt-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Content</p>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              autoFocus
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                error ? 'border-destructive' : 'border-input',
              )}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !editContent.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(output.content); setError(null) }}
                disabled={saving}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {expanded ? output.content : preview}
            </p>
            {output.content.length > 180 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setConfirmDelete(false)} />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-foreground mb-2">Delete output</h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently remove this piece of content. This cannot be undone.
            </p>
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function OutputsList({
  projectId,
  initialOutputs,
  authors,
  contentTypes,
  hasBrandContext,
}: OutputsListProps) {
  const [outputs, setOutputs] = useState<Output[]>(initialOutputs)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleGenerated(newOutput: { id: string; content: string; brief: string }) {
    // The API returns the output without content_types joined — we find the type name locally
    const ct = contentTypes.find((c) => outputs.some((o) => o.content_type_id === c.id)) ?? contentTypes[0]
    const full: Output = {
      id: newOutput.id,
      brief: newOutput.brief,
      content: newOutput.content,
      content_type_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content_types: ct ? { name: ct.name } : null,
    }
    setOutputs((prev) => [full, ...prev])
  }

  function handleUpdated(updated: Output) {
    setOutputs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
  }

  function handleDeleted(id: string) {
    setOutputs((prev) => prev.filter((o) => o.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">Content</h2>
          <p className="text-sm text-muted-foreground">
            {outputs.length === 0 ? 'No content yet.' : `${outputs.length} piece${outputs.length === 1 ? '' : 's'} generated.`}
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate
        </button>
      </div>

      {outputs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No content yet. Generate your first piece.</p>
            <p className="text-sm text-muted-foreground">Use a brief to tell the AI what to write.</p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate content
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {outputs.map((output) => (
            <OutputCard
              key={output.id}
              output={output}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      <GenerateContentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGenerated={handleGenerated}
        projectId={projectId}
        authors={authors}
        contentTypes={contentTypes}
        hasBrandContext={hasBrandContext}
      />
    </div>
  )
}
