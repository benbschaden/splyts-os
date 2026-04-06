import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingsForUser, createMeeting } from '@/lib/queries/meetings'
import { getOrgMembersWithProfiles } from '@/lib/queries/teams'

const createSchema = z.object({
  title: z.string().min(1).max(500),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  raw_transcript: z.string().min(1).max(500000),
  visibility: z.enum(['attendees_only', 'org_wide']).default('attendees_only'),
  attendee_user_ids: z.array(z.string().uuid()).max(100).default([]),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const meetings = await getMeetingsForUser(org.id, user.id)
    return Response.json({ data: meetings })
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
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { title, meeting_date, raw_transcript, visibility, attendee_user_ids } = parsed.data

    // Verify that all supplied attendee IDs are actual org members
    const orgMembers = await getOrgMembersWithProfiles(org.id)
    const orgMemberIds = new Set(orgMembers.map((m) => m.user_id))
    const validAttendeeIds = attendee_user_ids.filter((id) => orgMemberIds.has(id))

    const { meeting, error } = await createMeeting({
      organizationId: org.id,
      createdBy: user.id,
      title,
      meetingDate: meeting_date ?? null,
      rawTranscript: raw_transcript,
      visibility,
      attendeeUserIds: validAttendeeIds,
    })

    if (error || !meeting) {
      return Response.json({ error: 'Failed to create meeting' }, { status: 500 })
    }

    return Response.json({ data: meeting }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
