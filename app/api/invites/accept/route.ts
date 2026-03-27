import { createClient } from '@/lib/supabase/server'
import { acceptInvite } from '@/lib/queries/team'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return Response.json({ error: 'Missing invite token' }, { status: 400 })

  const { error } = await acceptInvite(token, user.id)
  if (error) return Response.json({ error }, { status: 400 })

  return Response.json({ ok: true })
}
