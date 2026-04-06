'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const MIN_PASSWORD = 8

export function UpdatePasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) {
        router.replace('/login?error=session')
        return
      }
      setCheckingSession(false)
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [router])

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

    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: pwError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (pwError) {
      setError(pwError.message || 'Could not update password. Try a stronger password.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const canSubmit =
    password.length >= MIN_PASSWORD &&
    password === confirmPassword

  if (checkingSession) {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="reset-password" className="text-sm font-medium text-foreground">
          New password <span className="text-destructive">*</span>
        </label>
        <input
          id="reset-password"
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
        <label htmlFor="reset-confirm" className="text-sm font-medium text-foreground">
          Confirm new password <span className="text-destructive">*</span>
        </label>
        <input
          id="reset-confirm"
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

      <button
        type="submit"
        disabled={saving || !canSubmit}
        className={cn(
          'w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
          'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
        )}
      >
        {saving ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}
