import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateGoalPeriod } from '@/lib/queries/goal-periods'
import { indexContent } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const patchSchema = z.object({
  focus_areas: z.string().nullable().optional(),
  what_to_push: z.string().nullable().optional(),
  what_to_defer: z.string().nullable().optional(),
  status: z.enum(['active', 'reviewing', 'closed']).optional(),
  review_summary: z.string().nullable().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { id } = await params
    const updates: Record<string, unknown> = { ...parsed.data }

    if (parsed.data.status === 'closed') {
      updates.reviewed_at = new Date().toISOString()
      updates.reviewed_by = user.id
    }

    const { period, error } = await updateGoalPeriod(id, org.id, updates)
    if (error || !period) return Response.json({ error: error ?? 'Failed to update period' }, { status: 400 })

    indexContent('goal_period', period, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: period })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
