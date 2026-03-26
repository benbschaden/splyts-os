'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface WelcomeFormProps {
  email: string
}

export function WelcomeForm({ email }: WelcomeFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('Please enter your name.')
      return
    }

    setSaving(true)
    setError(null)

    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName.trim(),
        role: role.trim() || null,
        avatar_url: null,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email (read-only context) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Email</label>
        <p className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
          {email}
        </p>
      </div>

      {/* Full name */}
      <div className="space-y-1.5">
        <label htmlFor="full-name" className="text-sm font-medium text-foreground">
          Your name <span className="text-destructive">*</span>
        </label>
        <input
          id="full-name"
          type="text"
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); setError(null) }}
          autoFocus
          disabled={saving}
          placeholder="Your full name"
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
            error ? 'border-destructive' : 'border-input',
          )}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Role / title */}
      <div className="space-y-1.5">
        <label htmlFor="role" className="text-sm font-medium text-foreground">
          Role or title <span className="text-muted-foreground text-xs font-normal">(optional)</span>
        </label>
        <input
          id="role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={saving}
          placeholder="Your role or title"
          className={cn(
            'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
          )}
        />
      </div>

      <button
        type="submit"
        disabled={saving || !fullName.trim()}
        className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Get started'}
      </button>
    </form>
  )
}
