import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateBrandNarrative, deleteBrandNarrative } from '@/lib/queries/brand-narratives'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  narrative: z.string().min(1).max(100000).optional(),
  usage_context: z.string().max(20000).nullable().optional(),
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
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { narrative, error } = await updateBrandNarrative(id, org.id, parsed.data, user.id)
    if (error || !narrative) return Response.json({ error }, { status: 500 })

    indexContent('brand_narrative', narrative, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: narrative })
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
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteBrandNarrative(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    removeFromIndex('brand_narrative', id).catch(err =>
      console.error('[content-index] Remove failed:', err)
    )

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
