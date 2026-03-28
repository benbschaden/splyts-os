'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Pencil,
  Trash2,
  X,
  Check,
  FileText,
  Paperclip,
  MessageCircle,
  Archive,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { OutputsList } from '@/components/projects/outputs-list'
import { ProjectMaterials } from '@/components/projects/project-materials'

interface Project {
  id: string
  name: string
  description: string | null
  /** DB row uses string; normalized in component state */
  status?: string | null
  visibility?: string | null
  tags?: string[] | null
}

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

type OutputAttachmentListItem = {
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

type Tab = 'content' | 'materials' | 'chat'

interface ProjectDetailProps {
  project: Project
  isAdmin: boolean
  outputs: Output[]
  outputAttachmentsByOutputId: Record<string, OutputAttachmentListItem[]>
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
  materials: Material[]
}

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'materials', label: 'Materials', icon: Paperclip },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
]

export function ProjectDetail({
  project,
  isAdmin,
  outputs,
  outputAttachmentsByOutputId,
  authors,
  contentTypes,
  hasBrandContext,
  materials,
}: ProjectDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('content')
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [editDescription, setEditDescription] = useState(project.description ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [projectStatus, setProjectStatus] = useState<'active' | 'archived'>(() =>
    project.status === 'archived' ? 'archived' : 'active',
  )
  const [error, setError] = useState<string | null>(null)

  const isArchived = projectStatus === 'archived'

  useEffect(() => {
    const s = project.status === 'archived' ? 'archived' : 'active'
    setProjectStatus(s)
    if (s === 'archived') setEditing(false)
  }, [project.status])

  async function handleArchive() {
    setArchiving(true)
    setError(null)

    const res = await fetch(`/api/projects/${project.id}/archive`, {
      method: 'POST',
    })

    if (!res.ok) {
      let message = 'Failed to archive project. Please try again.'
      try {
        const data = (await res.json()) as { error?: string }
        if (data.error) message = data.error
      } catch {
        /* ignore */
      }
      setError(message)
      setArchiving(false)
      return
    }

    setProjectStatus('archived')
    setConfirmArchive(false)
    setArchiving(false)
    router.refresh()
  }

  async function handleSave() {
    if (!editName.trim()) return
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        description: editDescription || null,
      }),
    })

    if (!res.ok) {
      setError('Failed to save changes. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)

    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      setError('Failed to delete project. Please try again.')
      setDeleting(false)
      setConfirmDelete(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        {editing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
            className={cn(
              'flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-semibold text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'max-w-xs',
            )}
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-foreground">{project.name}</h1>
            {isArchived && (
              <span
                className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                aria-label="Archived"
              >
                Archived
              </span>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="flex shrink-0 items-center gap-1">
            {!isArchived && editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setEditName(project.name)
                    setEditDescription(project.description ?? '')
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className={cn(
                    'rounded-md p-1.5 text-foreground hover:bg-accent transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  title="Save"
                >
                  <Check className="h-4 w-4" />
                </button>
              </>
            ) : !isArchived ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmArchive(true)
                    setError(null)
                  }}
                  disabled={archiving}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
                    'text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  title="Archive project and extract knowledge document"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive & Extract
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title="Edit project"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Delete project"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-2">
          {(project.visibility ?? 'shared') === 'private' ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Private
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Shared with team</span>
          )}
          {(project.tags ?? []).filter(Boolean).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {editing ? (
          <div className="max-w-xl space-y-4 p-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={4}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                )}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setEditName(project.name)
                  setEditDescription(project.description ?? '')
                  setError(null)
                }}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {project.description && (
              <p className="text-sm text-muted-foreground leading-relaxed px-6 pt-4">
                {project.description}
              </p>
            )}

            {/* Tab bar */}
            <nav className="flex gap-0 border-b border-border px-6 mt-2" aria-label="Project tabs">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2',
                      isActive
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                    )}
                    aria-selected={isActive}
                    role="tab"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>

            {/* Tab content */}
            <div className="p-6 max-w-2xl">
              {activeTab === 'content' && (
                <OutputsList
                  projectId={project.id}
                  initialOutputs={outputs}
                  outputAttachmentsByOutputId={outputAttachmentsByOutputId}
                  authors={authors}
                  contentTypes={contentTypes}
                  hasBrandContext={hasBrandContext}
                />
              )}

              {activeTab === 'materials' && (
                <ProjectMaterials
                  projectId={project.id}
                  initialMaterials={materials}
                />
              )}

              {activeTab === 'chat' && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Project chat coming soon</p>
                    <p className="text-sm text-muted-foreground">
                      Discuss this project with your team and AI.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Archive confirmation modal */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => !archiving && setConfirmArchive(false)}
          />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-foreground mb-2">Archive and extract</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This will archive the project and extract a knowledge summary into company documents.
              Continue?
            </p>
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmArchive(false)
                  setError(null)
                }}
                disabled={archiving}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {archiving ? 'Archiving…' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setConfirmDelete(false)}
          />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-foreground mb-2">Delete project</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete <span className="font-medium text-foreground">{project.name}</span> and all its outputs. This cannot be undone.
            </p>
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
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
