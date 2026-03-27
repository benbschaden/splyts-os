import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateContentCalendarItem } from '@/lib/queries/content-calendar'
import { createServiceClient } from '@/lib/supabase/service'

const schema = z.object({
  output_id: z.string().uuid(),
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

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'output_id is required' }, { status: 400 })

    // Verify output belongs to this org
    const db = createServiceClient()
    const { data: output } = await db
      .from('outputs')
      .select('id')
      .eq('id', parsed.data.output_id)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!output) return Response.json({ error: 'Not found' }, { status: 404 })

    // Link output and advance status to 'generated'
    const { item, error } = await updateContentCalendarItem(
      id,
      org.id,
      { output_id: parsed.data.output_id, status: 'generated' },
      user.id,
    )

    if (error || !item) return Response.json({ error }, { status: 500 })
    return Response.json({ data: item })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
