import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingById } from '@/lib/queries/meetings'
import {
  getMeetingDocumentsForMeetingWithProjects,
  createMeetingDocument,
} from '@/lib/queries/meeting-documents'

const createSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().max(200_000).default(''),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: meetingId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const meeting = await getMeetingById(meetingId, org.id, user.id)
    if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 })

    const documents = await getMeetingDocumentsForMeetingWithProjects(meetingId, org.id)
    return Response.json({ data: documents })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: meetingId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const meeting = await getMeetingById(meetingId, org.id, user.id)
    if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 })

    if (!meeting.processed_at) {
      return Response.json({ error: 'Process the meeting first' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { document, error } = await createMeetingDocument({
      meetingId,
      orgId: org.id,
      userId: user.id,
      title: parsed.data.title,
      content: parsed.data.content,
    })

    if (error || !document) {
      return Response.json({ error: error ?? 'Failed to create' }, { status: 500 })
    }

    return Response.json({ data: document }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
