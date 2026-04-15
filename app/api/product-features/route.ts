import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProductFeatures, createProductFeature } from '@/lib/queries/product-features'
import { indexContent } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  tagline: z.string().max(300).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  related_features: z.string().max(500).nullable().optional(),
  category: z.string().min(1).max(100).default('other'),
  surfaces: z.array(z.string().max(100)).default([]),
  status: z.enum(['live', 'beta', 'planned', 'deprecated']).default('live'),
  include_in_ai: z.boolean().default(true),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const features = await getProductFeatures(org.id)
    return Response.json({ data: features })
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

    const { feature, error } = await createProductFeature({
      organizationId: org.id,
      name: parsed.data.name,
      tagline: parsed.data.tagline ?? null,
      description: parsed.data.description ?? null,
      relatedFeatures: parsed.data.related_features ?? null,
      category: parsed.data.category,
      surfaces: parsed.data.surfaces,
      status: parsed.data.status,
      includeInAi: parsed.data.include_in_ai,
      userId: user.id,
    })

    if (error || !feature) return Response.json({ error }, { status: 500 })

    indexContent('product_feature', feature, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: feature }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
