import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acceptInvite } from '@/lib/queries/team'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite_token')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user && inviteToken) {
      // Link the new user to the organisation via the invite token
      const { error: acceptError } = await acceptInvite(inviteToken, data.user.id)

      if (acceptError) {
        return NextResponse.redirect(
          new URL(`/invite/invalid?reason=${encodeURIComponent(acceptError)}`, request.url),
        )
      }

      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
