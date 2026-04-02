import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getCohortDocumentById, updateCohortDocument } from '@/lib/queries/cohort-documents'
import { createInsight } from '@/lib/queries/customer-insights'

const bodySchema = z.object({
  insights: z.array(
    z.object({
      content: z.string().min(1).max(10000),
      category: z.enum([
        'pain_point', 'feature_request', 'praise', 'objection',
        'churn_signal', 'usage_pattern', 'market_insight',
      ]),
      impact: z.enum(['high', 'medium', 'low']),
    }),
  ).min(1).max(20),
})

export async function POST(
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

    const doc = await getCohortDocumentById(id, org.id)
    if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const savedInsights = []
    for (const draft of parsed.data.insights) {
      const { insight, error } = await createInsight({
        organizationId: org.id,
        userId: user.id,
        content: draft.content,
        category: draft.category,
        impact: draft.impact,
        source_segment: doc.segment,
        include_in_ai: true,
      })
      if (insight) savedInsights.push(insight)
      if (error) console.error('[cohort-documents/confirm] createInsight error:', error)
    }

    await updateCohortDocument(id, org.id, {
      status: 'processed',
      insights_extracted: savedInsights.length,
    })

    return Response.json({ saved: savedInsights.length, insights: savedInsights }, { status: 201 })
  } catch (error) {
    console.error('[cohort-documents/[id]/confirm POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
