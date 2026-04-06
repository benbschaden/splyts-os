import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingById } from '@/lib/queries/meetings'
import {
  getMeetingDocumentById,
  publishMeetingDocument,
  validateProjectIdsInOrg,
} from '@/lib/queries/meeting-documents'

const publishSchema = z.object({
  project_ids: z.array(z.string().uuid()).max(100),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id: meetingId, docId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const meeting = await getMeetingById(meetingId, org.id, user.id)
    if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 })

    const doc = await getMeetingDocumentById(docId, org.id)
    if (!doc || doc.meeting_id !== meetingId) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    if (doc.created_by !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = publishSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const ok = await validateProjectIdsInOrg(org.id, parsed.data.project_ids)
    if (!ok) {
      return Response.json({ error: 'One or more projects are invalid' }, { status: 400 })
    }

    const { error } = await publishMeetingDocument({
      documentId: docId,
      orgId: org.id,
      userId: user.id,
      projectIds: parsed.data.project_ids,
    })

    if (error) return Response.json({ error }, { status: 500 })

    const updated = await getMeetingDocumentById(docId, org.id)
    return Response.json({ data: updated })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
