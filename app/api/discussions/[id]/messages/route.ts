import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getDiscussionById,
  getDiscussionMessages,
  createDiscussionMessage,
} from '@/lib/queries/discussions'
import { getUserDisplayNamesAndAvatarsByIds } from '@/lib/queries/user-profile'

const SendSchema = z.object({
  content: z.string().min(1).max(10000),
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

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })

    const messages = await getDiscussionMessages(id, org.id)
    const userIds = [...new Set(messages.map((m) => m.user_id))]
    const profiles = await getUserDisplayNamesAndAvatarsByIds(userIds)
    return Response.json({ messages, profiles })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })
    if (discussion.status === 'resolved') {
      return Response.json({ error: 'Cannot message a resolved discussion' }, { status: 422 })
    }

    const body = await request.json()
    const parsed = SendSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { message, error } = await createDiscussionMessage({
      discussionId: id,
      userId: user.id,
      content: parsed.data.content,
    })

    if (error || !message) {
      return Response.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return Response.json({ message }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
