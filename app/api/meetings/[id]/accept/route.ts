import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingById, acceptMeetingRoutingSuggestions } from '@/lib/queries/meetings'

const acceptSchema = z.object({
  accepted_project_ids: z.array(z.string().uuid()).max(50),
})

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

    const meeting = await getMeetingById(id, org.id, user.id)
    if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 })

    // Only creator can accept
    if (meeting.created_by !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    if (!meeting.processed_at || !meeting.suggested_project_links) {
      return Response.json(
        { error: 'Meeting has not been processed yet' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const parsed = acceptSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { accepted_project_ids } = parsed.data

    // Build the accepted links using the stored suggestions for the relevant_summary text
    const suggestionMap = new Map(
      meeting.suggested_project_links.map((s) => [s.project_id, s]),
    )

    const acceptedProjectLinks = accepted_project_ids
      .filter((pid) => suggestionMap.has(pid))
      .map((pid) => ({
        projectId: pid,
        relevantSummary: suggestionMap.get(pid)!.rationale,
      }))

    const { error } = await acceptMeetingRoutingSuggestions({
      meetingId: id,
      orgId: org.id,
      userId: user.id,
      acceptedProjectLinks,
    })

    if (error) {
      return Response.json({ error }, { status: 500 })
    }

    const updated = await getMeetingById(id, org.id, user.id)
    return Response.json({ data: updated })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
