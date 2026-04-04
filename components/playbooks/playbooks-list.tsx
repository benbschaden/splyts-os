'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Plus, Loader2, User } from 'lucide-react'
import type { PlaybookWithOwner } from '@/lib/queries/playbooks'

interface PlaybooksListProps {
  playbooks: PlaybookWithOwner[]
}

const SUGGESTED_CATEGORIES = ['Content', 'Operations', 'Sales', 'Marketing', 'Product', 'HR', 'General']

export function PlaybooksList({ playbooks: initialPlaybooks }: PlaybooksListProps) {
  const router = useRouter()
  const [playbooks, setPlaybooks] = useState(initialPlaybooks)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [customCategory, setCustomCategory] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const category = newCategory === '__custom__' ? customCategory.trim() : newCategory

  async function handleCreate() {
    if (!newTitle.trim() || !category) return
    setIsCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), category }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create playbook')
        return
      }
      router.push(`/dashboard/playbooks/${data.playbook.id}`)
    } catch {
      setError('Failed to create playbook')
    } finally {
      setIsCreating(false)
    }
  }

  // Group by category, sorted alphabetically
  const grouped = playbooks.reduce<Record<string, PlaybookWithOwner[]>>((acc, p) => {
    const key = p.category || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})
  const sortedCategories = Object.keys(grouped).sort()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Playbooks</h1>
          <p className="text-sm text-muted-foreground">Team SOPs and process guides</p>
        </div>
        <button
          onClick={() => { setShowNew(true); setError(null) }}
          className="flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Playbook
        </button>
      </div>

      {/* New playbook form */}
      {showNew && (
        <div className="border-b border-border bg-accent/30 px-6 py-4">
          <p className="mb-3 text-sm font-medium text-foreground">New Playbook</p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="playbook-title" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Title
                </label>
                <input
                  id="playbook-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  placeholder="e.g. How to record a Loom"
                  autoFocus
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>
              <div className="w-48">
                <label htmlFor="playbook-category" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Category
                </label>
                <select
                  id="playbook-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                >
                  {SUGGESTED_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__custom__">Custom…</option>
                </select>
              </div>
            </div>
            {newCategory === '__custom__' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Category name"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
              />
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isCreating || !newTitle.trim() || !category}
                className="flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isCreating ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setShowNew(false); setNewTitle(''); setNewCategory('General'); setCustomCategory(''); setError(null) }}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {playbooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No playbooks yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Create your first playbook to document a process or SOP
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCategories.map((cat) => (
              <div key={cat}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat}
                </h2>
                <ul className="space-y-1">
                  {grouped[cat].map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/dashboard/playbooks/${p.id}`}
                        className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-accent"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Updated {new Date(p.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="max-w-[120px] truncate">{p.owner_name ?? 'Unknown'}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
