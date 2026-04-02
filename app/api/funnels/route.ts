import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getFunnels, createFunnel } from '@/lib/queries/funnels'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const stageSchema = z.object({
  kpi_definition_id: z.string().uuid(),
  stage_order: z.number().int().min(0),
  label_override: z.string().max(300).nullable().optional(),
})

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(300),
  description: z.string().max(5000).nullable().optional(),
  is_dashboard_default: z.boolean().default(false),
  stages: z.array(stageSchema).min(2, 'At least 2 stages are required'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const funnels = await getFunnels(org.id)
    return Response.json({ data: funnels })
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

    const { funnel, error } = await createFunnel({
      organizationId: org.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      isDashboardDefault: parsed.data.is_dashboard_default,
      stages: parsed.data.stages.map((s) => ({
        kpiDefinitionId: s.kpi_definition_id,
        stageOrder: s.stage_order,
        labelOverride: s.label_override ?? null,
      })),
      userId: user.id,
    })

    if (error || !funnel) return Response.json({ error }, { status: 500 })
    return Response.json({ data: funnel }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
