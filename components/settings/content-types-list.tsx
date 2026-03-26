'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, LayoutTemplate } from 'lucide-react'
import { ContentTypeDialog } from './content-type-dialog'
import { cn } from '@/lib/utils'

interface Template {
  id: string
  slug: string
  name: string
  description: string
}

interface ContentType {
  id: string
  name: string
  custom_rules: string
  is_active: boolean
  template_id: string
  content_type_templates: { slug: string; name: string } | null
}

interface ContentTypesListProps {
  contentTypes: ContentType[]
  templates: Template[]
  isAdmin: boolean
}

export function ContentTypesList({ contentTypes, templates, isAdmin }: ContentTypesListProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContentType | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openAdd() { setEditing(null); setDialogOpen(true) }
  function openEdit(ct: ContentType) { setEditing(ct); setDialogOpen(true) }
  function handleSaved() { router.refresh() }

  async function handleToggle(ct: ContentType) {
    setTogglingId(ct.id)
    const res = await fetch(`/api/content-types/${ct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !ct.is_active }),
    })
    setTogglingId(null)
    if (!res.ok) { setError('Failed to update. Please try again.'); return }
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/content-types/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (!res.ok) { setError('Failed to delete. Please try again.'); return }
    router.refresh()
  }

  const confirmTarget = contentTypes.find((c) => c.id === confirmDeleteId)

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Content types</h2>
            <p className="text-sm text-muted-foreground">
              Each type defines a platform and its rules. The AI applies them exactly when generating.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New content type
            </button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {contentTypes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No content types yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first content type to enable AI generation.
            </p>
            {isAdmin && (
              <button
                onClick={openAdd}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                New content type
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {contentTypes.map((ct) => (
              <div key={ct.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{ct.name}</p>
                    <span className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      ct.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground',
                    )}>
                      {ct.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {ct.content_type_templates && (
                    <p className="text-xs text-muted-foreground truncate">
                      {ct.content_type_templates.name}
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(ct)}
                      disabled={togglingId === ct.id}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {togglingId === ct.id ? '…' : ct.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEdit(ct)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setConfirmDeleteId(ct.id); setError(null) }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ContentTypeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        templates={templates}
        editing={editing}
      />

      {confirmDeleteId && confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-foreground mb-2">Delete content type</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete{' '}
              <span className="font-medium text-foreground">{confirmTarget.name}</span>.
              Existing outputs are not affected.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId === confirmDeleteId}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deletingId === confirmDeleteId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
