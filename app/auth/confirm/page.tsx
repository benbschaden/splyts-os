'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleConfirm() {
      const hash = window.location.hash
      if (!hash) {
        setError('Invalid invite link — no session token found.')
        return
      }

      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setError('Invalid invite link — missing tokens.')
        return
      }

      const supabase = createClient()
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError || !data.session) {
        setError('Invite link has expired. Please ask your admin to send a new one.')
        return
      }

      // Session is now set in cookies — call server to accept the invite by email
      const res = await fetch('/api/invites/accept', { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to accept invite.')
        return
      }

      router.replace('/welcome')
    }

    handleConfirm()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="max-w-md w-full mx-auto px-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white">Invite link is no longer valid</h1>
          <p className="text-sm text-zinc-400">{error}</p>
          <a
            href="/login"
            className="inline-block mt-2 text-sm text-zinc-400 hover:text-white underline underline-offset-4 transition-colors"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="max-w-md w-full mx-auto px-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto">
          <svg className="w-5 h-5 text-zinc-300 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-white">Setting up your account…</h1>
        <p className="text-sm text-zinc-500">You'll be redirected in a moment.</p>
      </div>
    </div>
  )
}
