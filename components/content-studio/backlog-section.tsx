'use client'

import { useState } from 'react'
import { ChevronDown, Plus, ArrowRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContentIdeaRow } from '@/lib/queries/content-ideas'

interface Author {
  id: string
  name: string
}

interface ContentType {
  id: string
  name: string
}

interface BacklogSectionProps {
  projectId: string
  initialIdeas: ContentIdeaRow[]
  contentTypes: ContentType[]
  authors: Author[]
  onBuildIdea: (idea: ContentIdeaRow) => void
}

export function BacklogSection({ projectId, initialIdeas, contentTypes, authors, onBuildIdea }: BacklogSectionProps) {
  const [open, setOpen] = useState(true)
  const [ideas, setIdeas] = useState<ContentIdeaRow[]>(initialIdeas)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentTypeId, setContentTypeId] = useState(contentTypes[0]?.id ?? '')
  // 'company' sentinel or a user UUID
  const [authorValue, setAuthorValue] = useState<string>('company')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allAuthorOptions = [
    { id: 'company', name: 'Company page' },
    ...authors.map((a) => ({ id: a.id, name: `${a.name}'s page` })),
  ]

  function resolveContentTypeName(idea: ContentIdeaRow): string {
    if (idea.content_type_id) {
      return contentTypes.find((ct) => ct.id === idea.content_type_id)?.name ?? 'Unknown type'
    }
    return idea.platform ?? 'No type'
  }

  function resolveAuthorName(idea: ContentIdeaRow): string {
    if (!idea.author_user_id) return 'Company page'
    const author = authors.find((a) => a.id === idea.author_user_id)
    return author ? `${author.name}'s page` : 'Personal page'
  }

  async function handleAdd() {
    if (!title.trim() || !contentTypeId) return
    setSaving(true)
    setError(null)

    const res = await fetch('/api/content-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title: title.trim(),
        description: description.trim() || null,
        contentTypeId,
        authorUserId: authorValue === 'company' ? null : authorValue,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save idea. Please try again.')
      return
    }

    const { idea } = await res.json()
    setIdeas((prev) => [idea, ...prev])
    setTitle('')
    setDescription('')
    setContentTypeId(contentTypes[0]?.id ?? '')
    setAuthorValue('company')
    setShowForm(false)
  }

  function handleCancel() {
    setShowForm(false)
    setTitle('')
    setDescription('')
    setContentTypeId(contentTypes[0]?.id ?? '')
    setAuthorValue('company')
    setError(null)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/content-ideas/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setIdeas((prev) => prev.filter((i) => i.id !== id))
    }
  }

  function handleBuild(idea: ContentIdeaRow) {
    // Remove from backlog immediately — it has been promoted to Generate
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id))
    fetch(`/api/content-ideas/${idea.id}`, { method: 'DELETE' }).catch(() => {
      // Non-critical: if the API call fails the idea may reappear on next page load,
      // but the generation session has already started
    })
    onBuildIdea(idea)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <section className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Backlog</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {ideas.length}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open ? 'rotate-0' : '-rotate-90',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-3">
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add idea
            </button>
          )}

          {showForm && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="idea-title" className="text-xs font-medium text-foreground">
                  Idea
                </label>
                <input
                  id="idea-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What's the content idea?"
                  autoFocus
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="idea-desc" className="text-xs font-medium text-foreground">
                  Notes{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="idea-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Any angle, talking points, or context…"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="idea-content-type" className="text-xs font-medium text-foreground">
                    Content type
                  </label>
                  {contentTypes.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">
                      No content types configured.{' '}
                      <a href="/dashboard/company/content-types" className="underline">Set up content types</a>
                    </p>
                  ) : (
                    <select
                      id="idea-content-type"
                      value={contentTypeId}
                      onChange={(e) => setContentTypeId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {contentTypes.map((ct) => (
                        <option key={ct.id} value={ct.id}>
                          {ct.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="idea-author" className="text-xs font-medium text-foreground">
                    Publish on
                  </label>
                  <select
                    id="idea-author"
                    value={authorValue}
                    onChange={(e) => setAuthorValue(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {allAuthorOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!title.trim() || !contentTypeId || saving}
                  className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Save idea'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {ideas.length === 0 && !showForm && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No ideas yet. Add the first one.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{idea.title}</p>
                  {idea.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {idea.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {resolveContentTypeName(idea)}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {resolveAuthorName(idea)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleBuild(idea)}
                    title="Build this idea"
                    className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity"
                  >
                    Create
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idea.id)}
                    title="Delete idea"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
