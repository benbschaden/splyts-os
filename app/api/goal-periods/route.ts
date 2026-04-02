import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getGoalPeriods, createGoalPeriod } from '@/lib/queries/goal-periods'
import { indexContent } from '@/lib/indexing/index-content'

const createSchema = z.object({
  period_label: z.string().min(1).max(100),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const periods = await getGoalPeriods(org.id)
    return Response.json({ data: periods })
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
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { period, error } = await createGoalPeriod({
      organizationId: org.id,
      periodLabel: parsed.data.period_label,
      periodStart: parsed.data.period_start,
      periodEnd: parsed.data.period_end,
      userId: user.id,
    })

    if (error || !period) return Response.json({ error: error ?? 'Failed to create period' }, { status: 400 })

    indexContent('goal_period', period, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: period }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
