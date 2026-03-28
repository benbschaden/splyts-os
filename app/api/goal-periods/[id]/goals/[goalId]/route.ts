import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updatePeriodGoal, deletePeriodGoal } from '@/lib/queries/goal-periods'

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).nullable().optional(),
  outcome: z.enum(['achieved', 'partial', 'missed']).nullable().optional(),
  outcome_notes: z.string().max(2000).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { goalId } = await params
    const { goal, error } = await updatePeriodGoal(goalId, org.id, parsed.data)
    if (error || !goal) return Response.json({ error: error ?? 'Failed to update goal' }, { status: 400 })

    return Response.json({ data: goal })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const { goalId } = await params
    const { error } = await deletePeriodGoal(goalId, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
