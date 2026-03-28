import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  createDiscussion,
  getDiscussionsForParent,
  addDiscussionParticipants,
} from '@/lib/queries/discussions'
import type { DiscussionParentType, DiscussionMode, DiscussionStatus } from '@/lib/queries/discussions'

const CreateSchema = z.object({
  parent_type: z.enum(['project', 'document', 'section']),
  parent_id: z.string().uuid(),
  section_key: z.string().min(1).optional(),
  mode: z.enum(['lightweight', 'structured']),
  title: z.string().min(1).max(300),
  participant_ids: z.array(z.string().uuid()).default([]),
})

const ListSchema = z.object({
  parent_type: z.enum(['project', 'document', 'section']),
  parent_id: z.string().uuid(),
  status: z.enum(['active', 'resolved', 'all']).optional().default('all'),
  section_key: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const url = new URL(request.url)
    const parsed = ListSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const { parent_type, parent_id, status, section_key } = parsed.data
    const discussions = await getDiscussionsForParent(
      parent_type as DiscussionParentType,
      parent_id,
      org.id,
      { status: status as DiscussionStatus | 'all', sectionKey: section_key },
    )

    return Response.json({ discussions })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { parent_type, parent_id, section_key, mode, title, participant_ids } = parsed.data
    const { discussion, error } = await createDiscussion({
      organizationId: org.id,
      userId: user.id,
      parentType: parent_type as DiscussionParentType,
      parentId: parent_id,
      sectionKey: section_key,
      mode: mode as DiscussionMode,
      title,
    })

    if (error || !discussion) {
      return Response.json({ error: 'Failed to create discussion' }, { status: 500 })
    }

    // Creator + all selected participants
    const allParticipants = Array.from(new Set([user.id, ...participant_ids]))
    await addDiscussionParticipants(discussion.id, allParticipants, user.id)

    return Response.json({ discussion }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
