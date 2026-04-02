import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateCompetitor, deleteCompetitor } from '@/lib/queries/competitors'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const patchSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  website: z.string().max(2000).nullable().optional(),
  positioning: z.string().max(20000).nullable().optional(),
  strengths: z.string().max(20000).nullable().optional(),
  weaknesses: z.string().max(20000).nullable().optional(),
  pricing_notes: z.string().max(20000).nullable().optional(),
  battle_card: z.string().max(20000).nullable().optional(),
  include_in_ai: z.boolean().optional(),
})

export async function PATCH(
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
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { competitor, error } = await updateCompetitor(id, org.id, parsed.data, user.id)
    if (error || !competitor) return Response.json({ error }, { status: 500 })

    indexContent('competitor', competitor, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: competitor })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteCompetitor(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    removeFromIndex('competitor', id).catch(err =>
      console.error('[content-index] Remove failed:', err)
    )

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
