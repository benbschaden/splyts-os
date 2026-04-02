import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getKpiDefinitions, createKpiDefinition } from '@/lib/queries/kpi-definitions'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(300),
  unit: z.enum(['count', 'currency', 'percent', 'ratio']).default('count'),
  category: z.enum(['growth', 'revenue', 'engagement', 'funnel', 'custom']).default('custom'),
  description: z.string().max(5000).nullable().optional(),
  is_highlighted: z.boolean().default(false),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const definitions = await getKpiDefinitions(org.id)
    return Response.json({ data: definitions })
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
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { definition, error } = await createKpiDefinition({
      organizationId: org.id,
      name: parsed.data.name,
      unit: parsed.data.unit,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      isHighlighted: parsed.data.is_highlighted,
      userId: user.id,
    })

    if (error || !definition) return Response.json({ error }, { status: 500 })
    return Response.json({ data: definition }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
