import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateContentCalendarItem, deleteContentCalendarItem } from '@/lib/queries/content-calendar'
import { createServiceClient } from '@/lib/supabase/service'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'

const patchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(3000).nullable().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  content_type_id: z.string().uuid().nullable().optional(),
  platform: z.string().max(100).nullable().optional(),
  author_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  output_id: z.string().uuid().nullable().optional(),
  status: z.enum(['idea', 'scheduled', 'in_progress', 'generated', 'published', 'cancelled']).optional(),
  notes: z.string().max(2000).nullable().optional(),
})

async function isCreatorOrAdmin(itemId: string, orgId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin') return true
  const db = createServiceClient()
  const { data } = await db
    .from('content_calendar')
    .select('created_by')
    .eq('id', itemId)
    .eq('organization_id', orgId)
    .maybeSingle()
  return data?.created_by === userId
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

    const canEdit = await isCreatorOrAdmin(id, org.id, user.id, org.role)
    if (!canEdit) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { item, error } = await updateContentCalendarItem(id, org.id, parsed.data, user.id)
    if (error || !item) return Response.json({ error }, { status: 500 })

    indexContent('content_calendar', item, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: item })
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

    const canEdit = await isCreatorOrAdmin(id, org.id, user.id, org.role)
    if (!canEdit) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteContentCalendarItem(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    removeFromIndex('content_calendar', id).catch(err =>
      console.error('[content-index] Remove failed:', err)
    )

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
