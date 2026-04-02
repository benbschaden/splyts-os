import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscussionById, resolveDiscussion } from '@/lib/queries/discussions'
import { indexContent } from '@/lib/indexing/index-content'

const ResolveSchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(z.string().min(1)),
  learnings: z.array(z.string().min(1)),
  nextSteps: z.array(
    z.object({
      text: z.string().min(1),
      ownerId: z.string().uuid().optional(),
    }),
  ),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })
    if (discussion.status === 'resolved') {
      return Response.json({ error: 'Already resolved' }, { status: 422 })
    }

    const body = await request.json()
    const parsed = ResolveSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { discussion: resolved, error } = await resolveDiscussion({
      id,
      organizationId: org.id,
      resolvedBy: user.id,
      aiSummary: parsed.data.summary,
      decisions: parsed.data.decisions,
      learnings: parsed.data.learnings,
      nextSteps: parsed.data.nextSteps,
    })

    if (error || !resolved) {
      return Response.json({ error: 'Failed to resolve discussion' }, { status: 500 })
    }

    indexContent('discussion', resolved, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ discussion: resolved })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
