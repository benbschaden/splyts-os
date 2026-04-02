import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProductRoadmapItems, createProductRoadmapItem } from '@/lib/queries/product-roadmap'
import { indexContent } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(2000).nullable().optional(),
  phase: z.enum(['now', 'next', 'later', 'shipped']),
  status: z.enum(['planned', 'in_progress', 'shipped', 'cut']).default('planned'),
  category: z.string().max(100).nullable().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const items = await getProductRoadmapItems(org.id)
    return Response.json({ data: items })
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

    const { item, error } = await createProductRoadmapItem({
      organizationId: org.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      phase: parsed.data.phase,
      status: parsed.data.status,
      category: parsed.data.category ?? null,
      userId: user.id,
    })

    if (error || !item) return Response.json({ error }, { status: 500 })

    indexContent('product_roadmap_item', item, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: item }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
