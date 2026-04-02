'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FileText,
  Upload,
  Link2,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  File,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Material {
  id: string
  material_type: 'note' | 'file' | 'link'
  title: string | null
  content: string | null
  file_url: string | null
  file_name: string | null
  file_mime: string | null
  link_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

interface ProjectMaterialsProps {
  projectId: string
  initialMaterials: Material[]
}

type FormMode = null | 'note' | 'link'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function mimeBadge(mime: string | null): string {
  if (!mime) return 'File'
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
    'image/svg+xml': 'SVG',
    'text/csv': 'CSV',
    'text/plain': 'TXT',
    'application/json': 'JSON',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  }
  return map[mime] ?? mime.split('/').pop()?.toUpperCase() ?? 'File'
}

const MD_PATTERN = /(?:^#{1,6}\s|\*\*[^*]|\*[^*\s]|__[^_]|_[^_\s]|^\s*[-*+]\s|\d+\.\s|```|`[^`]|\[.+?\]\(.+?\)|^>\s|^---$)/m

function hasMarkdown(text: string): boolean {
  return MD_PATTERN.test(text)
}

function stripMarkdownForPreview(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^-{3,}$/gm, '')
    .trim()
}

function NoteCard({
  material,
  onEdit,
  onDelete,
}: {
  material: Material
  onEdit: (id: string, updates: { title?: string; content?: string }) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(material.title ?? '')
  const [editContent, setEditContent] = useState(material.content ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isMarkdown = material.content ? hasMarkdown(material.content) : false
  const previewSource = material.content
    ? (isMarkdown ? stripMarkdownForPreview(material.content) : material.content)
    : ''
  const preview = previewSource
    ? previewSource.slice(0, 160) + (previewSource.length > 160 ? '…' : '')
    : ''

  async function handleSave(): Promise<void> {
    setSaving(true)
    await onEdit(material.id, {
      title: editTitle.trim() || undefined,
      content: editContent.trim() || undefined,
    })
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete(): Promise<void> {
    setDeleting(true)
    await onDelete(material.id)
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Note content…"
          rows={5}
          autoFocus
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || (!editTitle.trim() && !editContent.trim())}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false)
              setEditTitle(material.title ?? '')
              setEditContent(material.content ?? '')
            }}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-start justify-between gap-2 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-start gap-2 text-left min-w-0 flex-1"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            {material.title && (
              <p className="text-sm font-medium text-foreground truncate">{material.title}</p>
            )}
            {!expanded && preview && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                {preview}
              </p>
            )}
            {!material.title && !preview && (
              <p className="text-xs text-muted-foreground italic">Empty note</p>
            )}
          </div>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-[11px] text-muted-foreground mr-2 hidden sm:inline">
            {formatDate(material.created_at)}
          </span>
          <button
            onClick={() => setEditing(true)}
            title="Edit note"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Confirm delete"
                className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                title="Cancel delete"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete note"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {expanded && material.content && (
        <div className="border-t border-border px-4 py-3">
          {isMarkdown ? (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1 text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {material.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {material.content}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FileCard({
  material,
  onDelete,
}: {
  material: Material
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete(): Promise<void> {
    setDeleting(true)
    await onDelete(material.id)
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
        <File className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {material.file_name ?? 'Uploaded file'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {mimeBadge(material.file_mime)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatDate(material.created_at)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {confirmDelete ? (
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Confirm delete"
              className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              title="Cancel delete"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete file"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function LinkCard({
  material,
  onEdit,
  onDelete,
}: {
  material: Material
  onEdit: (id: string, updates: { title?: string; content?: string }) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(material.title ?? '')
  const [editContent, setEditContent] = useState(material.content ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave(): Promise<void> {
    setSaving(true)
    await onEdit(material.id, {
      title: editTitle.trim() || undefined,
      content: editContent.trim() || undefined,
    })
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete(): Promise<void> {
    setDeleting(true)
    await onDelete(material.id)
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Link title (optional)"
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false)
              setEditTitle(material.title ?? '')
              setEditContent(material.content ?? '')
            }}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
        <Link2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground truncate">
            {material.title ?? material.link_url ?? 'Link'}
          </p>
          {material.link_url && (
            <a
              href={material.link_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open link"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        {material.link_url && material.title && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {material.link_url}
          </p>
        )}
        {material.content && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
            {material.content}
          </p>
        )}
        <span className="text-[11px] text-muted-foreground mt-1 inline-block">
          {formatDate(material.created_at)}
        </span>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => setEditing(true)}
          title="Edit link"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Confirm delete"
              className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              title="Cancel delete"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete link"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function mapMaterialsPayload(list: unknown[]): Material[] {
  return list.map((row) => {
    const m = row as Record<string, unknown>
    const rawContent = (m.content as string | null) ?? null
    return {
      id: String(m.id),
      material_type: m.material_type as Material['material_type'],
      title: (m.title as string | null) ?? null,
      // Truncate to 500 chars for display — full content lives server-side for AI.
      // Storing tens of thousands of chars in client state for uploaded docs causes
      // memory spikes that freeze Safari when re-rendering the list.
      content: rawContent ? rawContent.slice(0, 500) : null,
      file_url: (m.file_url as string | null) ?? null,
      file_name: (m.file_name as string | null) ?? null,
      file_mime: (m.file_mime as string | null) ?? null,
      link_url: (m.link_url as string | null) ?? null,
      sort_order: typeof m.sort_order === 'number' ? m.sort_order : 0,
      created_at: String(m.created_at ?? ''),
      updated_at: String(m.updated_at ?? ''),
    }
  })
}

export function ProjectMaterials({ projectId, initialMaterials }: ProjectMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkDescription, setLinkDescription] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)

  const loadMaterials = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/materials`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data: unknown = await res.json().catch(() => null)
      if (!data || typeof data !== 'object' || !('materials' in data)) return
      const list = (data as { materials: unknown }).materials
      if (!Array.isArray(list)) return
      setMaterials(mapMaterialsPayload(list))
    } catch {
      // keep existing state
    }
  }, [projectId])

  useEffect(() => {
    loadMaterials()
    // Refetch on bfcache restore (browser back/forward). visibilitychange is
    // intentionally excluded — it fires when native dialogs (like the file picker)
    // open/close and triggers redundant fetches that can freeze Safari.
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) loadMaterials()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const notes = materials.filter((m) => m.material_type === 'note')
  const files = materials.filter((m) => m.material_type === 'file')
  const links = materials.filter((m) => m.material_type === 'link')

  function resetForms(): void {
    setFormMode(null)
    setNoteTitle('')
    setNoteContent('')
    setLinkUrl('')
    setLinkTitle('')
    setLinkDescription('')
    setError(null)
  }

  async function handleAddNote(): Promise<void> {
    if (!noteContent.trim() && !noteTitle.trim()) return
    setNoteSaving(true)
    setError(null)

    const res = await fetch(`/api/projects/${projectId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material_type: 'note',
        title: noteTitle.trim() || null,
        content: noteContent.trim() || null,
      }),
    })

    if (!res.ok) {
      setError('Failed to add note. Please try again.')
      setNoteSaving(false)
      return
    }

    const { material } = await res.json()
    setMaterials((prev) => [...prev, material])
    setNoteSaving(false)
    resetForms()
  }

  async function handleAddLink(): Promise<void> {
    if (!linkUrl.trim()) return
    setLinkSaving(true)
    setError(null)

    const res = await fetch(`/api/projects/${projectId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material_type: 'link',
        title: linkTitle.trim() || null,
        content: linkDescription.trim() || null,
        link_url: linkUrl.trim(),
      }),
    })

    if (!res.ok) {
      setError('Failed to add link. Please try again.')
      setLinkSaving(false)
      return
    }

    const { material } = await res.json()
    setMaterials((prev) => [...prev, material])
    setLinkSaving(false)
    resetForms()
  }

  async function handleUploadFile(file: globalThis.File): Promise<void> {
    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`/api/projects/${projectId}/materials/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'Failed to upload file. Please try again.')
      setUploading(false)
      return
    }

    const { material } = await res.json()
    setMaterials((prev) => [...prev, material])
    setUploading(false)
  }

  async function handleEdit(id: string, updates: { title?: string; content?: string }): Promise<void> {
    const res = await fetch(`/api/projects/${projectId}/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!res.ok) return

    const { material } = await res.json()
    setMaterials((prev) => prev.map((m) => (m.id === id ? material : m)))
  }

  async function handleDelete(id: string): Promise<void> {
    const res = await fetch(`/api/projects/${projectId}/materials/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok) return

    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFormMode(formMode === 'note' ? null : 'note')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
            formMode === 'note'
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-foreground hover:bg-accent',
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Add note
        </button>
        <button
          onClick={() => {
            if (uploading) return
            fileInputRef.current?.click()
          }}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload file
        </button>
        <button
          onClick={() => setFormMode(formMode === 'link' ? null : 'link')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
            formMode === 'link'
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-foreground hover:bg-accent',
          )}
        >
          <Link2 className="h-3.5 w-3.5" />
          Add link
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.svg"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUploadFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Note form */}
      {formMode === 'note' && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <label htmlFor="note-title" className="sr-only">Note title</label>
          <input
            id="note-title"
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label htmlFor="note-content" className="sr-only">Note content</label>
          <textarea
            id="note-content"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write your note…"
            rows={5}
            autoFocus
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddNote}
              disabled={noteSaving || (!noteTitle.trim() && !noteContent.trim())}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {noteSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Add note
            </button>
            <button
              onClick={resetForms}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Link form */}
      {formMode === 'link' && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <label htmlFor="link-url" className="sr-only">Link URL</label>
          <input
            id="link-url"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            autoFocus
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label htmlFor="link-title" className="sr-only">Link title</label>
          <input
            id="link-title"
            type="text"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label htmlFor="link-description" className="sr-only">Link description</label>
          <textarea
            id="link-description"
            value={linkDescription}
            onChange={(e) => setLinkDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddLink}
              disabled={linkSaving || !linkUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {linkSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Add link
            </button>
            <button
              onClick={resetForms}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {materials.length === 0 && formMode === null && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No materials yet</p>
            <p className="text-sm text-muted-foreground">
              Add notes, upload files, or save links for this project.
            </p>
          </div>
        </div>
      )}

      {/* Notes section */}
      {notes.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Notes ({notes.length})
          </h3>
          <div className="flex flex-col gap-2">
            {notes.map((m) => (
              <NoteCard key={m.id} material={m} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {/* Files section */}
      {files.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Files ({files.length})
          </h3>
          <div className="flex flex-col gap-2">
            {files.map((m) => (
              <FileCard key={m.id} material={m} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {/* Links section */}
      {links.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Links ({links.length})
          </h3>
          <div className="flex flex-col gap-2">
            {links.map((m) => (
              <LinkCard key={m.id} material={m} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
