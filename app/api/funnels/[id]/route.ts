import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateFunnel, deleteFunnel } from '@/lib/queries/funnels'

const stageSchema = z.object({
  kpi_definition_id: z.string().uuid(),
  stage_order: z.number().int().min(0),
  label_override: z.string().max(300).nullable().optional(),
})

const patchSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  is_dashboard_default: z.boolean().optional(),
  stages: z.array(stageSchema).min(2, 'At least 2 stages are required'),
})

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
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { stages: stageData, ...updates } = parsed.data

    const { funnel, error } = await updateFunnel(
      id,
      org.id,
      updates,
      stageData.map((s) => ({
        kpiDefinitionId: s.kpi_definition_id,
        stageOrder: s.stage_order,
        labelOverride: s.label_override ?? null,
      })),
      user.id,
    )

    if (error || !funnel) return Response.json({ error }, { status: 500 })
    return Response.json({ data: funnel })
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
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteFunnel(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
