'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Handles invite links from Supabase which use the implicit/hash flow.
// Server routes cannot read hash fragments — this client page processes
// the #access_token from the URL, establishes the session, then accepts
// the invite and routes the user onward.
export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function confirm() {
      const supabase = createClient()

      // getSession() processes any hash fragment (#access_token=...) automatically
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setError('Invalid or expired invite link. Please ask to be re-invited.')
        return
      }

      const inviteToken = searchParams.get('invite_token')

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

    confirm()
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
