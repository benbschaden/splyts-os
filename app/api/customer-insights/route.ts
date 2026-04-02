import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createInsight } from '@/lib/queries/customer-insights'
import { indexContent } from '@/lib/indexing/index-content'

const createSchema = z.object({
  content: z.string().min(1).max(10000),
  category: z.enum([
    'pain_point',
    'feature_request',
    'praise',
    'objection',
    'churn_signal',
    'usage_pattern',
    'market_insight',
  ]),
  impact: z.enum(['high', 'medium', 'low']).default('medium'),
  status: z.enum(['new', 'validated', 'actioned', 'archived']).default('new'),
  source_contact_id: z.string().uuid().nullable().optional(),
  source_communication_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).default([]),
  include_in_ai: z.boolean().default(true),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const d = parsed.data
    const { insight, error } = await createInsight({
      organizationId: org.id,
      userId: user.id,
      content: d.content,
      category: d.category,
      impact: d.impact,
      status: d.status,
      source_contact_id: d.source_contact_id ?? null,
      source_communication_id: d.source_communication_id ?? null,
      tags: d.tags,
      include_in_ai: d.include_in_ai,
    })

    if (error || !insight) return Response.json({ error: 'Failed to create insight' }, { status: 500 })

    indexContent('customer_insight', insight, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: insight }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
