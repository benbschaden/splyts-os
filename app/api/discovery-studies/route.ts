import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createDiscoveryStudy } from '@/lib/queries/discovery-studies'

const createSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(200),
  goal: z.string().max(1000).nullable().optional(),
  method: z
    .enum(['interview', 'review', 'survey', 'observation', 'email', 'mixed'])
    .nullable()
    .optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const d = parsed.data
    const { study, error } = await createDiscoveryStudy({
      organizationId: org.id,
      projectId: d.project_id,
      userId: user.id,
      name: d.name,
      goal: d.goal ?? null,
      method: d.method ?? null,
    })

    if (error || !study) return Response.json({ error: 'Failed to create study' }, { status: 500 })
    return Response.json({ data: study }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
