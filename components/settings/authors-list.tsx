'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, User } from 'lucide-react'
import { AuthorProfileDialog } from './author-profile-dialog'
import { cn } from '@/lib/utils'

interface AuthorProfile {
  id: string
  name: string
  role: string | null
  voice: string | null
  tone: string | null
  writing_style: string | null
  personal_pillars: string | null
  platform_notes: string | null
}

interface AuthorsListProps {
  authors: AuthorProfile[]
  isAdmin: boolean
}

export function AuthorsList({ authors, isAdmin }: AuthorsListProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AuthorProfile | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(author: AuthorProfile) {
    setEditing(author)
    setDialogOpen(true)
  }

  function handleSaved() {
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError(null)

    const res = await fetch(`/api/author-profiles/${id}`, { method: 'DELETE' })

    setDeletingId(null)
    setConfirmDeleteId(null)

    if (!res.ok) {
      setDeleteError('Failed to delete. Please try again.')
      return
    }

    router.refresh()
  }

  const confirmTarget = authors.find((a) => a.id === confirmDeleteId)

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Author profiles</h2>
            <p className="text-sm text-muted-foreground">
              Each author's voice is injected into AI generation when selected. Only name is required.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openAdd}
              className={cn(
                'flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground',
                'hover:bg-primary/90 transition-colors shrink-0',
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add author
            </button>
          )}
        </div>

        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
        )}

        {authors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No authors yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first author profile to enable per-person content generation.
            </p>
            {isAdmin && (
              <button
                onClick={openAdd}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Add author
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {authors.map((author) => (
              <div key={author.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{author.name}</p>
                  {author.role && (
                    <p className="text-xs text-muted-foreground truncate">{author.role}</p>
                  )}
                  {author.voice && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70 truncate">
                      Voice: {author.voice}
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(author)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDeleteId(author.id)
                        setDeleteError(null)
                      }}
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

      <AuthorProfileDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        editing={editing}
      />

      {/* Delete confirmation */}
      {confirmDeleteId && confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-foreground mb-2">Delete author</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete{' '}
              <span className="font-medium text-foreground">{confirmTarget.name}</span>.
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId === confirmDeleteId}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
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
