import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getDiscussionById,
  getDiscussionResolution,
  updateDiscussion,
} from '@/lib/queries/discussions'
import { indexContent } from '@/lib/indexing/index-content'

const PatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  mode: z.enum(['lightweight', 'structured']).optional(),
}).refine((d) => d.title !== undefined || d.mode !== undefined, {
  message: 'At least one field required',
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

    const resolution = discussion.status === 'resolved'
      ? await getDiscussionResolution(id, org.id)
      : null

    return Response.json({ discussion, resolution })
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

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const existing = await getDiscussionById(id, org.id)
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { discussion, error } = await updateDiscussion(id, org.id, parsed.data)
    if (error || !discussion) {
      return Response.json({ error: 'Failed to update discussion' }, { status: 500 })
    }

    indexContent('discussion', discussion, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ discussion })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
