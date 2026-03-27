import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getTerminology, createTerminology } from '@/lib/queries/terminology'

const categorySchema = z.enum(['product', 'brand', 'audience', 'general'])

const createSchema = z.object({
  term: z.string().min(1, 'Term is required').max(500),
  preferred: z.string().min(1, 'Preferred wording is required').max(2000),
  avoid: z.string().max(2000).nullable().optional(),
  context: z.string().max(20000).nullable().optional(),
  category: categorySchema.optional().default('general'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const terms = await getTerminology(org.id)
    return Response.json({ data: terms })
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

    const { row, error } = await createTerminology({
      organizationId: org.id,
      term: parsed.data.term.trim(),
      preferred: parsed.data.preferred.trim(),
      avoid: parsed.data.avoid?.trim() ? parsed.data.avoid.trim() : null,
      context: parsed.data.context?.trim() ? parsed.data.context.trim() : null,
      category: parsed.data.category,
      userId: user.id,
    })

    if (error || !row) return Response.json({ error }, { status: 500 })
    return Response.json({ data: row }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
