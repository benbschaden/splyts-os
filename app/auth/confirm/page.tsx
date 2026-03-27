'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ConfirmInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function confirm() {
      const supabase = createClient()

      // Supabase invite links return tokens as hash fragments (#access_token=...).
      // Parse and call setSession explicitly — getSession() won't see the hash.
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setError('Invalid or expired invite link. Please ask to be re-invited.')
        return
      }

      const { data: { session }, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

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
