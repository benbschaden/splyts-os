import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createPeriodGoal } from '@/lib/queries/goal-periods'
import { indexContent } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).nullable().optional(),
  carried_from_goal_id: z.string().uuid().nullable().optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { id } = await params
    const { goal, error } = await createPeriodGoal({
      goalPeriodId: id,
      organizationId: org.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      carriedFromGoalId: parsed.data.carried_from_goal_id ?? null,
    })

    if (error || !goal) return Response.json({ error: error ?? 'Failed to create goal' }, { status: 400 })

    indexContent('period_goal', goal, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: goal }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
