'use client'

import { useState } from 'react'
import { Sparkles, Copy, Pencil, Trash2, Check, X, FileText, BarChart2, Send, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  GenerationSessionDialog,
  type GeneratedOutputPayload,
} from '@/components/marketing/generation-session-dialog'
import { getModelById } from '@/lib/ai/models'

interface Output {
  id: string
  brief: string
  content: string
  content_type_id: string
  model_id: string
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
  content_types: { name: string } | null
  projects: { name: string } | null
  creator_full_name: string | null
  published_at: string | null
  reach: number | null
  reach_metric: string | null
  engagement: number | null
  performance_notes: string | null
  metadata?: Record<string, unknown> | null
}

export type OutputCardAttachment = {
  id: string
  file_url: string
  file_name: string
  file_mime: string
  caption: string | null
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
  outputAttachmentsByOutputId: Record<string, OutputCardAttachment[]>
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const REACH_METRICS = ['impressions', 'views', 'reach', 'plays', 'opens', 'clicks']

function safeMetadataString(meta: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = meta?.[key]
  return typeof v === 'string' && v.trim() ? v : undefined
}

function safeMetadataStringArray(meta: Record<string, unknown> | null | undefined, key: string): string[] {
  const v = meta?.[key]
  if (!Array.isArray(v)) return []
  return v.filter((item): item is string => typeof item === 'string')
}

function OutputCard({
  output,
  attachments,
  onUpdated,
  onDeleted,
}: {
  output: Output
  attachments?: OutputCardAttachment[]
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
  const [showPerf, setShowPerf] = useState(false)
  const [perfForm, setPerfForm] = useState({
    reach: output.reach?.toString() ?? '',
    reach_metric: output.reach_metric ?? 'impressions',
    engagement: output.engagement?.toString() ?? '',
    performance_notes: output.performance_notes ?? '',
  })
  const [perfSaving, setPerfSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

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

  async function handlePublish() {
    if (output.published_at) return
    setPublishing(true)
    const res = await fetch(`/api/outputs/${output.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish: true }),
    })
    setPublishing(false)
    if (!res.ok) return
    const { output: updated } = await res.json()
    onUpdated({ ...output, published_at: updated.published_at })
  }

  async function handleSavePerf() {
    setPerfSaving(true)
    const res = await fetch(`/api/outputs/${output.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reach: perfForm.reach ? parseInt(perfForm.reach, 10) : null,
        reach_metric: perfForm.reach_metric || null,
        engagement: perfForm.engagement ? parseInt(perfForm.engagement, 10) : null,
        performance_notes: perfForm.performance_notes.trim() || null,
      }),
    })
    setPerfSaving(false)
    if (!res.ok) return
    const { output: updated } = await res.json()
    onUpdated({
      ...output,
      reach: updated.reach,
      reach_metric: updated.reach_metric,
      engagement: updated.engagement,
      performance_notes: updated.performance_notes,
    })
    setShowPerf(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(output.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const preview = output.content.slice(0, 180) + (output.content.length > 180 ? '…' : '')
  const modelLabel = getModelById(output.model_id)?.label ?? output.model_id
  const hasPerf = output.reach !== null || output.engagement !== null || output.performance_notes
  const showExpandedContent = expanded || output.content.length <= 180
  const meta = output.metadata
  const abstractText = safeMetadataString(meta, 'abstract')
  const keyFindings = safeMetadataStringArray(meta, 'key_findings')
  const chartDescriptions = safeMetadataStringArray(meta, 'chart_descriptions')
  const referenceItems = safeMetadataStringArray(meta, 'references')
  const hasAttachments = (attachments?.length ?? 0) > 0

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Card header */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
            {output.content_types?.name ?? 'Unknown type'}
          </span>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground shrink-0 hidden sm:inline-flex">
            {modelLabel}
          </span>
          {output.published_at && (
            <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 shrink-0">
              Published {formatDateTime(output.published_at)}
            </span>
          )}
          <span className="text-xs text-muted-foreground shrink-0 sm:ml-auto max-w-full sm:max-w-[14rem] sm:text-right">
            {output.creator_full_name ?? 'Unknown user'} · {formatDateTime(output.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!output.published_at && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              title="Mark as published"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-green-500/10 hover:text-green-600 transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowPerf(!showPerf)}
            title="Performance stats"
            className={cn(
              'rounded-md p-1.5 transition-colors',
              hasPerf ? 'text-violet-600 hover:bg-violet-500/10' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            <BarChart2 className="h-3.5 w-3.5" />
          </button>
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

      {/* Performance stats panel */}
      {showPerf && (
        <div className="border-b border-border bg-muted/10 px-4 py-4 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-600">Performance</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Reach / views</label>
              <input
                type="number"
                value={perfForm.reach}
                onChange={(e) => setPerfForm((p) => ({ ...p, reach: e.target.value }))}
                placeholder="e.g. 4200"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Metric type</label>
              <select
                value={perfForm.reach_metric}
                onChange={(e) => setPerfForm((p) => ({ ...p, reach_metric: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {REACH_METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Engagement (likes, saves, clicks)</label>
            <input
              type="number"
              value={perfForm.engagement}
              onChange={(e) => setPerfForm((p) => ({ ...p, engagement: e.target.value }))}
              placeholder="e.g. 312"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Notes</label>
            <textarea
              value={perfForm.performance_notes}
              onChange={(e) => setPerfForm((p) => ({ ...p, performance_notes: e.target.value }))}
              rows={2}
              placeholder="What worked, what didn't, any context…"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSavePerf}
              disabled={perfSaving}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {perfSaving ? 'Saving…' : 'Save stats'}
            </button>
            <button
              onClick={() => setShowPerf(false)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Performance summary (when stats exist and panel is closed) */}
      {!showPerf && hasPerf && (
        <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-2 bg-violet-500/5">
          {output.reach !== null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{output.reach.toLocaleString()}</span>{' '}
              {output.reach_metric ?? 'reach'}
            </p>
          )}
          {output.engagement !== null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{output.engagement.toLocaleString()}</span>{' '}
              engagement
            </p>
          )}
          {output.performance_notes && (
            <p className="text-xs text-muted-foreground truncate max-w-xs">{output.performance_notes}</p>
          )}
        </div>
      )}

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
          <div className="space-y-3">
            {showExpandedContent && abstractText && (
              <blockquote className="border-l-2 border-muted-foreground/25 pl-3 text-sm text-muted-foreground italic leading-relaxed">
                {abstractText}
              </blockquote>
            )}
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {expanded || output.content.length <= 180 ? output.content : preview}
            </p>
            {showExpandedContent && keyFindings.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key findings</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {keyFindings.map((line, i) => (
                    <li key={i} className="leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {showExpandedContent && chartDescriptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Charts</p>
                <div className="flex flex-col gap-3">
                  {chartDescriptions.map((caption, i) => (
                    <figure key={i} className="space-y-1.5">
                      <div
                        className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-xs text-muted-foreground"
                        aria-hidden
                      >
                        Chart
                      </div>
                      <figcaption className="text-xs text-muted-foreground leading-relaxed">{caption}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
            {showExpandedContent && referenceItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">References</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
                  {referenceItems.map((line, i) => (
                    <li key={i} className="leading-relaxed pl-1">
                      {line}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {showExpandedContent && hasAttachments && attachments && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attachments</p>
                <div className="flex flex-col gap-4">
                  {attachments.map((a) =>
                    a.file_mime.startsWith('image/') ? (
                      <figure key={a.id} className="space-y-1.5">
                        <img
                          src={a.file_url}
                          alt={a.caption?.trim() ? a.caption : a.file_name}
                          className="max-h-96 max-w-full rounded-md border border-border object-contain"
                        />
                        {a.caption && (
                          <figcaption className="text-xs text-muted-foreground leading-relaxed">{a.caption}</figcaption>
                        )}
                      </figure>
                    ) : (
                      <a
                        key={a.id}
                        href={a.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/40"
                      >
                        <File className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 break-words">{a.file_name}</span>
                      </a>
                    ),
                  )}
                </div>
              </div>
            )}
            {output.content.length > 180 && (
              <button
                type="button"
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
  outputAttachmentsByOutputId,
  authors,
  contentTypes,
  hasBrandContext,
}: OutputsListProps) {
  const [outputs, setOutputs] = useState<Output[]>(initialOutputs)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleGenerated(newOutput: GeneratedOutputPayload) {
    const ct =
      contentTypes.find((c) => c.id === newOutput.content_type_id) ??
      contentTypes.find((c) => outputs.some((o) => o.content_type_id === c.id)) ??
      contentTypes[0]
    const full: Output = {
      id: newOutput.id,
      brief: newOutput.brief,
      content: newOutput.content,
      content_type_id: newOutput.content_type_id,
      model_id: newOutput.model_id,
      project_id: projectId,
      created_by: newOutput.created_by,
      created_at: newOutput.created_at,
      updated_at: newOutput.updated_at,
      content_types: ct ? { name: ct.name } : null,
      projects: null,
      creator_full_name: newOutput.creator_full_name,
      published_at: null,
      reach: null,
      reach_metric: null,
      engagement: null,
      performance_notes: null,
      metadata: null,
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
              attachments={outputAttachmentsByOutputId[output.id]}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      <GenerationSessionDialog
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
