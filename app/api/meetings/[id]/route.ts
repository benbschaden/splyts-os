import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingById, softDeleteMeeting } from '@/lib/queries/meetings'
import { createUntypedServiceClient } from '@/lib/supabase/service'

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  visibility: z.enum(['attendees_only', 'org_wide']).optional(),
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

    const meeting = await getMeetingById(id, org.id, user.id)
    if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 })

    return Response.json({ data: meeting })
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

    const meeting = await getMeetingById(id, org.id, user.id)
    if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 })

    // Only creator can edit
    if (meeting.created_by !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) updates.title = parsed.data.title
    if (parsed.data.meeting_date !== undefined) updates.meeting_date = parsed.data.meeting_date
    if (parsed.data.visibility !== undefined) updates.visibility = parsed.data.visibility

    if (Object.keys(updates).length === 0) {
      return Response.json({ data: meeting })
    }

    const service = createUntypedServiceClient()
    const { data, error } = await service
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', org.id)
      .select('id, title, meeting_date, visibility, updated_at')
      .single()

    if (error) {
      console.error('[meetings] PATCH error:', error)
      return Response.json({ error: 'Failed to update meeting' }, { status: 500 })
    }

    return Response.json({ data })
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

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await softDeleteMeeting(id, org.id, user.id)
    if (error) return Response.json({ error: 'Not found' }, { status: 404 })

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
