import { createClient } from '@/lib/supabase/server'
import { markDiscussionRead } from '@/lib/queries/discussions'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    await markDiscussionRead(id, user.id)
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
