import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingById, acceptMeetingRoutingSuggestions } from '@/lib/queries/meetings'
import { validateProjectIdsInOrg } from '@/lib/queries/meeting-documents'

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

    if (!meeting.processed_at) {
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

    const valid = await validateProjectIdsInOrg(org.id, accepted_project_ids)
    if (!valid) {
      return Response.json({ error: 'One or more projects are invalid' }, { status: 400 })
    }

    const suggestionMap = new Map(
      (meeting.suggested_project_links ?? []).map((s) => [s.project_id, s]),
    )

    const manualSummary = 'Linked manually — not from AI suggestions.'

    const acceptedProjectLinks = accepted_project_ids.map((pid) => {
      const sug = suggestionMap.get(pid)
      return {
        projectId: pid,
        relevantSummary: sug?.rationale?.trim() ? sug.rationale : manualSummary,
      }
    })

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
