'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const sessionLinkError = searchParams.get('error') === 'session'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgotPassword() {
    setError(null)
    setResetSent(false)
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Enter your email above, then use forgot password.')
      return
    }
    setResetLoading(true)
    const supabase = createClient()
    const origin = window.location.origin
    const redirectTo = `${origin}/auth/callback?next=recovery`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    })
    setResetLoading(false)
    if (resetError) {
      setError(resetError.message || 'Could not send reset email. Try again.')
      return
    }
    setResetSent(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {sessionLinkError && (
        <p className="text-sm text-muted-foreground rounded-md border border-border bg-muted/50 px-3 py-2">
          Sign in again, or open the password reset link from your email on this device.
        </p>
      )}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@company.com"
          className={cn(
            'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:opacity-50',
          )}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
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

      {resetSent && (
        <p className="text-sm text-muted-foreground rounded-md border border-border bg-muted/50 px-3 py-2">
          Check your email for a reset link. If it does not arrive, check spam or try again.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          'w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
          'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
        )}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => void handleForgotPassword()}
          disabled={loading || resetLoading}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        >
          {resetLoading ? 'Sending…' : 'Forgot password?'}
        </button>
      </div>
    </form>
  )
}
