import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getRisks, createRisk } from '@/lib/queries/risks'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().default(null),
  category: z.enum(['strategic', 'operational', 'financial', 'legal', 'reputational', 'technical']).default('operational'),
  likelihood: z.number().int().min(1).max(5).default(3),
  impact: z.number().int().min(1).max(5).default(3),
  owner: z.string().max(200).nullable().default(null),
  mitigation: z.string().max(2000).nullable().default(null),
  status: z.enum(['open', 'monitoring', 'mitigated', 'closed']).default('open'),
  lastReviewedAt: z.string().datetime({ offset: true }).nullable().default(null),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

  const risks = await getRisks(org.id)
  return Response.json({ risks })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
  if (org.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { risk, error } = await createRisk({
    organizationId: org.id,
    userId: user.id,
    ...parsed.data,
  })

  if (error || !risk) return Response.json({ error: error ?? 'Failed to create risk' }, { status: 500 })
  return Response.json({ risk }, { status: 201 })
}
