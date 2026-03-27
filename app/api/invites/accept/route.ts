import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPendingInviteByEmail, acceptInviteById } from '@/lib/queries/team'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const invite = await getPendingInviteByEmail(user.email)
  if (!invite) {
    return NextResponse.json({ error: 'No pending invite found for this account' }, { status: 404 })
  }

  const { error } = await acceptInviteById(invite.id, user.id)
  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
