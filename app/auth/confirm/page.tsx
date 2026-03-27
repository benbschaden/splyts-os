'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Supabase invite links use OTP verification which puts session tokens
// in the URL hash fragment (#access_token=...). Hash fragments are never
// sent to the server, so this MUST be a client component. We listen for
// the SIGNED_IN auth state change event which fires automatically when
// the Supabase browser client detects and processes the hash tokens.
function ConfirmInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const inviteToken = searchParams.get('invite_token')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()

          if (inviteToken) {
            const res = await fetch('/api/invites/accept', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: inviteToken }),
            })

            if (!res.ok) {
              const data = await res.json()
              setError(data.error ?? 'Failed to accept invite. Please try again.')
              return
            }
          }

          router.replace('/welcome')
        }
      },
    )

    // Timeout fallback — if no SIGNED_IN fires after 10s, the token is bad
    const timeout = setTimeout(() => {
      setError('Invalid or expired invite link. Please ask to be re-invited.')
      subscription.unsubscribe()
    }, 10000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a
            href="/login"
            className="inline-block text-sm text-foreground underline underline-offset-4 hover:opacity-70"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Setting up your account…</p>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Setting up your account…</p>
        </div>
      }
    >
      <ConfirmInner />
    </Suspense>
  )
}
