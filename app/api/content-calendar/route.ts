import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getContentCalendarItems, createContentCalendarItem } from '@/lib/queries/content-calendar'
import { indexContent } from '@/lib/indexing/index-content'

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(3000).nullable().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  content_type_id: z.string().uuid().nullable().optional(),
  platform: z.string().max(100).nullable().optional(),
  author_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined

    const items = await getContentCalendarItems(org.id, year && month ? { year, month } : undefined)
    return Response.json({ data: items })
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

    const { item, error } = await createContentCalendarItem({
      organizationId: org.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      scheduledDate: parsed.data.scheduled_date,
      contentTypeId: parsed.data.content_type_id ?? null,
      platform: parsed.data.platform ?? null,
      authorId: parsed.data.author_id ?? null,
      assignedTo: parsed.data.assigned_to ?? null,
      notes: parsed.data.notes ?? null,
      userId: user.id,
    })

    if (error || !item) return Response.json({ error }, { status: 500 })

    indexContent('content_calendar', item, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: item }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
