import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages, deleteChatSession } from '@/lib/queries/chat'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const session = await getChatSessionById(id, user.id)
    if (!session) return Response.json({ error: 'Not found' }, { status: 404 })

    // Verify session belongs to this org (defence in depth)
    if (session.organization_id !== org.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const messages = await getChatMessages(id)
    return Response.json({ session, messages })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getChatSessionById(id, user.id)
    if (!session) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteChatSession(id, user.id)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
