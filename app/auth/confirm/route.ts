import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acceptInvite } from '@/lib/queries/team'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const inviteToken = url.searchParams.get('invite_token')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/invite/invalid?reason=${encodeURIComponent(error)}`, url.origin))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/invite/invalid?reason=no_code', url.origin))
  }

  const supabase = await createClient()
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data.session) {
    return NextResponse.redirect(
      new URL(`/invite/invalid?reason=${encodeURIComponent(exchangeError?.message ?? 'session_failed')}`, url.origin),
    )
  }

  if (inviteToken) {
    const { error: acceptError } = await acceptInvite(inviteToken, data.user.id)
    if (acceptError) {
      return NextResponse.redirect(
        new URL(`/invite/invalid?reason=${encodeURIComponent(acceptError)}`, url.origin),
      )
    }
  }

  return NextResponse.redirect(new URL('/welcome', url.origin))
}
