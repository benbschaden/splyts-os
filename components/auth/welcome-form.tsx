'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const MIN_PASSWORD = 8

interface WelcomeFormProps {
  email: string
}

export function WelcomeForm({ email }: WelcomeFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!fullName.trim()) {
      setError('Please enter your name.')
      return
    }

    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      setSaving(false)
      setError(pwError.message || 'Could not set password. Try a stronger password.')
      return
    }

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
      setError('Failed to save your profile. Please try again.')
      return
    }

    router.push('/dashboard')
  }

  const canSubmit =
    password.length >= MIN_PASSWORD &&
    password === confirmPassword &&
    fullName.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Email (read-only context) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Email</label>
        <p className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
          {email}
        </p>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="welcome-password" className="text-sm font-medium text-foreground">
          Password <span className="text-destructive">*</span>
        </label>
        <input
          id="welcome-password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(null)
          }}
          autoComplete="new-password"
          autoFocus
          disabled={saving}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          className={cn(
            'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
          )}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="welcome-confirm" className="text-sm font-medium text-foreground">
          Confirm password <span className="text-destructive">*</span>
        </label>
        <input
          id="welcome-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            setError(null)
          }}
          autoComplete="new-password"
          disabled={saving}
          placeholder="Repeat password"
          className={cn(
            'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
          )}
        />
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
          onChange={(e) => {
            setFullName(e.target.value)
            setError(null)
          }}
          disabled={saving}
          placeholder="Your full name"
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
            'border-input',
          )}
        />
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
        disabled={saving || !canSubmit}
        className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Get started'}
      </button>
    </form>
  )
}
