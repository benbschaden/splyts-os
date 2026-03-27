'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OutputsList } from '@/components/projects/outputs-list'

interface Project {
  id: string
  name: string
  description: string | null
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
}

interface Author {
  id: string
  name: string
}

interface ContentType {
  id: string
  name: string
}

interface ProjectDetailProps {
  project: Project
  isAdmin: boolean
  outputs: Output[]
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
}

export function ProjectDetail({
  project,
  isAdmin,
  outputs,
  authors,
  contentTypes,
  hasBrandContext,
}: ProjectDetailProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [editDescription, setEditDescription] = useState(project.description ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          <h1 className="text-sm font-semibold text-foreground">{project.name}</h1>
        )}

        {isAdmin && (
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <button
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
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title="Edit project"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {editing ? (
          <div className="max-w-xl space-y-4">
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
          <div className="max-w-2xl space-y-6">
            {project.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {project.description}
              </p>
            )}

            <OutputsList
              projectId={project.id}
              initialOutputs={outputs}
              authors={authors}
              contentTypes={contentTypes}
              hasBrandContext={hasBrandContext}
            />
          </div>
        )}
      </div>

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
