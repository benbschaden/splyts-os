import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getCompetitors, createCompetitor } from '@/lib/queries/competitors'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(300),
  website: z.string().max(2000).nullable().optional(),
  positioning: z.string().max(20000).nullable().optional(),
  strengths: z.string().max(20000).nullable().optional(),
  weaknesses: z.string().max(20000).nullable().optional(),
  pricing_notes: z.string().max(20000).nullable().optional(),
  battle_card: z.string().max(20000).nullable().optional(),
  include_in_ai: z.boolean().default(true),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const competitors = await getCompetitors(org.id)
    return Response.json({ data: competitors })
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

    const { competitor, error } = await createCompetitor({
      organizationId: org.id,
      name: parsed.data.name,
      website: parsed.data.website ?? null,
      positioning: parsed.data.positioning ?? null,
      strengths: parsed.data.strengths ?? null,
      weaknesses: parsed.data.weaknesses ?? null,
      pricing_notes: parsed.data.pricing_notes ?? null,
      battle_card: parsed.data.battle_card ?? null,
      includeInAi: parsed.data.include_in_ai,
      userId: user.id,
    })

    if (error || !competitor) return Response.json({ error }, { status: 500 })
    return Response.json({ data: competitor }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
