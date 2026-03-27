import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages, deleteChatSession, updateChatSession } from '@/lib/queries/chat'
import { getModelById } from '@/lib/ai/models'

const patchSchema = z.object({
  model_id: z.string().optional(),
  title: z.string().min(1).max(255).optional(),
})

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getChatSessionById(id, user.id)
    if (!session) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }

    const updates: Parameters<typeof updateChatSession>[2] = {}
    if (parsed.data.title) updates.title = parsed.data.title
    if (parsed.data.model_id) {
      const model = getModelById(parsed.data.model_id)
      if (!model) return Response.json({ error: 'Unknown model' }, { status: 400 })
      updates.model_id = model.id
    }

    const { error } = await updateChatSession(id, user.id, updates)
    if (error) return Response.json({ error }, { status: 500 })

    const updated = await getChatSessionById(id, user.id)
    return Response.json({ session: updated })
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
