import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getCompanyMilestones, createCompanyMilestone } from '@/lib/queries/company-milestones'
import { indexContent } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(2000).nullable().optional(),
  milestone_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  category: z.enum(['fundraising', 'hiring', 'launch', 'revenue', 'partnership', 'product', 'other']).default('other'),
  status: z.enum(['planned', 'achieved', 'missed', 'pushed']).default('planned'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const milestones = await getCompanyMilestones(org.id)
    return Response.json({ data: milestones })
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

    const { milestone, error } = await createCompanyMilestone({
      organizationId: org.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      milestoneDate: parsed.data.milestone_date,
      category: parsed.data.category,
      status: parsed.data.status,
      userId: user.id,
    })

    if (error || !milestone) return Response.json({ error }, { status: 500 })

    indexContent('company_milestone', milestone, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: milestone }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
