import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBrandNarratives, createBrandNarrative } from '@/lib/queries/brand-narratives'
import { indexContent } from '@/lib/indexing/index-content'

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  narrative: z.string().min(1, 'Narrative is required').max(100000),
  usage_context: z.string().max(20000).nullable().optional(),
  include_in_ai: z.boolean().default(true),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const narratives = await getBrandNarratives(org.id)
    return Response.json({ data: narratives })
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
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { narrative, error } = await createBrandNarrative({
      organizationId: org.id,
      title: parsed.data.title,
      narrative: parsed.data.narrative,
      usageContext: parsed.data.usage_context ?? null,
      includeInAi: parsed.data.include_in_ai,
      userId: user.id,
    })

    if (error || !narrative) return Response.json({ error }, { status: 500 })

    indexContent('brand_narrative', narrative, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: narrative }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
