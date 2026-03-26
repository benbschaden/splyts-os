'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function OrgSetupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
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

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="text-sm font-medium text-foreground"
        >
          Company name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Splyts"
          className={cn(
            'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:opacity-50',
          )}
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className={cn(
          'w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
          'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
        )}
      >
        {loading ? 'Setting up…' : 'Set up workspace'}
      </button>
    </form>
  )
}
