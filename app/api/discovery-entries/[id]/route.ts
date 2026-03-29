import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateDiscoveryEntry, deleteDiscoveryEntry } from '@/lib/queries/discovery-entries'

const patchSchema = z.object({
  entry_type: z.enum(['interview', 'review', 'survey', 'observation', 'email']).optional(),
  source: z.string().max(500).nullable().optional(),
  entry_date: z.string().nullable().optional(),
  raw_content: z.string().min(1).max(100000).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  include_in_ai: z.boolean().optional(),
  user_segment: z.enum(['new', 'active', 'power', 'churned', 'free', 'paid']).nullable().optional(),
  key_quote_1: z.string().max(2000).nullable().optional(),
  key_quote_2: z.string().max(2000).nullable().optional(),
  key_quote_3: z.string().max(2000).nullable().optional(),
  jtbd: z.string().max(2000).nullable().optional(),
  star_rating: z.number().int().min(1).max(5).nullable().optional(),
  platform: z.enum(['app_store', 'product_hunt', 'g2', 'reddit', 'twitter', 'other']).nullable().optional(),
  source_material_id: z.string().uuid().nullable().optional(),
  study_id: z.string().uuid().nullable().optional(),
  participant: z.string().max(200).nullable().optional(),
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

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { entry, error } = await updateDiscoveryEntry(id, org.id, parsed.data)
    if (error || !entry) return Response.json({ error: 'Failed to update entry' }, { status: 500 })

    return Response.json({ data: entry })
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

    const { error } = await deleteDiscoveryEntry(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
