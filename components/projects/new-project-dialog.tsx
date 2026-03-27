'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  defaultCategory?: string
}

const KNOWN_CATEGORIES = ['Marketing', 'Engineering', 'HR', 'Sales', 'Operations', 'Finance', 'Product', 'Design', 'Legal', 'Customer Success']

export function NewProjectDialog({ open, onClose, defaultCategory }: NewProjectDialogProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(defaultCategory ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setCategory(defaultCategory ?? '')
    }
  }, [open, defaultCategory])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null, category: category || null }),
      })

      if (!res.ok) {
        let message = 'Something went wrong. Please try again.'
        try {
          const json = await res.json()
          if (typeof json.error === 'string') message = json.error
        } catch {}
        setError(message)
        setLoading(false)
        return
      }

      const json = await res.json()
      onClose()
      setName('')
      setDescription('')
      router.push(`/dashboard/projects/${json.data.id}`)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setName('')
    setDescription('')
    setCategory('')
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">New project</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Q2 Content Campaign"
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:opacity-50',
              )}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="project-category" className="text-sm font-medium text-foreground">
              Category
              <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="project-category"
              type="text"
              list="project-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Marketing, Engineering"
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:opacity-50',
              )}
              disabled={loading}
            />
            <datalist id="project-categories">
              {KNOWN_CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="project-description" className="text-sm font-medium text-foreground">
              Description
              <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:opacity-50',
              )}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium text-muted-foreground',
                'hover:bg-accent hover:text-accent-foreground transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className={cn(
                'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                'hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
