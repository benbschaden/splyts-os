import { NextRequest, NextResponse } from 'next/server'
import { accessTokenIndicatesPasswordRecovery } from '@/lib/auth/recovery-session'
import { createClient } from '@/lib/supabase/server'
import { acceptInvite } from '@/lib/queries/team'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite_token')
  const next = searchParams.get('next')

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

      // New invited user — send to welcome to set their name before dashboard
      return NextResponse.redirect(new URL('/welcome', request.url))
    }

    if (!error && data.session) {
      const token = data.session.access_token
      const recoveryFromQuery = next === 'recovery' || searchParams.get('type') === 'recovery'
      const recoveryFromJwt = accessTokenIndicatesPasswordRecovery(token)
      if (recoveryFromQuery || recoveryFromJwt) {
        return NextResponse.redirect(new URL('/auth/update-password', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
