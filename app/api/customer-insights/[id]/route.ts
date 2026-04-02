import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateInsight, deleteInsight } from '@/lib/queries/customer-insights'

const patchSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  category: z
    .enum([
      'pain_point',
      'feature_request',
      'praise',
      'objection',
      'churn_signal',
      'usage_pattern',
      'market_insight',
    ])
    .optional(),
  impact: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['new', 'validated', 'actioned', 'archived']).optional(),
  source_contact_id: z.string().uuid().nullable().optional(),
  source_communication_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  include_in_ai: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { insight, error } = await updateInsight(id, org.id, parsed.data)
    if (error || !insight) return Response.json({ error: 'Failed to update insight' }, { status: 500 })

    return Response.json({ data: insight })
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteInsight(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
